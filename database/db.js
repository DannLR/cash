import * as SQLite from 'expo-sqlite';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  saldo_inicial REAL NOT NULL DEFAULT 0,
  onboarding_visto INTEGER NOT NULL DEFAULT 0,
  notificacoes_ativas INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categorias (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  padrao INTEGER NOT NULL DEFAULT 0,
  icone TEXT NOT NULL DEFAULT 'pricetag-outline',
  cor TEXT NOT NULL DEFAULT '#0F766E'
);

CREATE TABLE IF NOT EXISTS movimentacoes (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  categoria_id TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  valor REAL NOT NULL,
  data TEXT NOT NULL,
  forma_pagamento TEXT NOT NULL,
  origem TEXT NOT NULL DEFAULT 'avulsa'
);

CREATE TABLE IF NOT EXISTS contas_recorrentes (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  categoria_id TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('fixa', 'parcela', 'assinatura')),
  nome TEXT NOT NULL,
  valor REAL NOT NULL,
  dia_vencimento INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativa'
);

CREATE TABLE IF NOT EXISTS cartoes (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  apelido TEXT NOT NULL,
  bandeira TEXT NOT NULL,
  ultimos_digitos TEXT
);

CREATE TABLE IF NOT EXISTS contas_pagamentos (
  id TEXT PRIMARY KEY,
  usuario_id TEXT,
  conta_recorrente_id TEXT NOT NULL,
  mes_referencia TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_state (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_outbox (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  usuario_id TEXT NOT NULL,
  entidade TEXT NOT NULL,
  registro_id TEXT NOT NULL,
  operacao TEXT NOT NULL,
  payload TEXT,
  criado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_migrations (
  id TEXT PRIMARY KEY,
  executada_em TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contas_pagamentos_unico
  ON contas_pagamentos (conta_recorrente_id, mes_referencia);

CREATE TABLE IF NOT EXISTS metas (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  icone TEXT NOT NULL,
  valor_objetivo REAL NOT NULL,
  valor_guardado REAL NOT NULL DEFAULT 0,
  aporte_mensal REAL NOT NULL DEFAULT 0
);
`;

// Adiciona colunas novas em bancos já existentes, sem apagar nada.
// SQLite não tem "ADD COLUMN IF NOT EXISTS", então tentamos e ignoramos
// o erro caso a coluna já exista (banco de quem já usou o app antes).
async function ensureColuna(db, tabela, coluna, tipoSql) {
  try {
    await db.execAsync(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${tipoSql}`);
  } catch (erro) {
    // "duplicate column name" é esperado quando a coluna já existe — ignora.
  }
}

export let USUARIO_ID = 'usuario-1';

let dbInstance = null;
let estruturaPreparada = false;
const usuariosInicializados = new Set();
let syncScheduler = null;
let aplicandoDadosRemotos = false;

export function setUsuarioAtual(id) {
  USUARIO_ID = id || 'usuario-1';
}

export function registrarAgendadorDeSync(agendador) {
  syncScheduler = agendador;
}

export function definirAplicacaoRemota(ativa) {
  aplicandoDadosRemotos = ativa;
}

export function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function ensureUsuario(db) {
  const usuario = await db.getFirstAsync('SELECT * FROM usuarios WHERE id = ?', [USUARIO_ID]);
  if (usuario) return;
  await db.runAsync(
    'INSERT INTO usuarios (id, nome, saldo_inicial) VALUES (?, ?, ?)',
    [USUARIO_ID, 'Você', 0]
  );
}

async function ensureCategoriasPadrao(db) {
  const categoriasPadrao = [
    ['Salário', 'entrada', 'cash-outline', '#16803C'],
    ['Comissão', 'entrada', 'trending-up-outline', '#16803C'],
    ['Renda extra', 'entrada', 'gift-outline', '#16803C'],
    ['Aluguel', 'saida', 'home-outline', '#0F766E'],
    ['Energia', 'saida', 'flash-outline', '#B25E09'],
    ['Internet', 'saida', 'wifi-outline', '#2563EB'],
    ['Água', 'saida', 'water-outline', '#0891B2'],
    ['Academia', 'saida', 'barbell-outline', '#7C3AED'],
    ['Assinaturas', 'saida', 'refresh-outline', '#DB2777'],
    ['Mercado', 'saida', 'cart-outline', '#EA580C'],
    ['Combustível', 'saida', 'car-outline', '#4B5563'],
    ['Restaurantes', 'saida', 'restaurant-outline', '#DC2626'],
    ['Lazer', 'saida', 'game-controller-outline', '#9333EA'],
    ['Compras', 'saida', 'bag-outline', '#C026D3'],
    ['Outros', 'saida', 'pricetag-outline', '#6B7280'],
  ];
  for (const [nome, tipo, icone, cor] of categoriasPadrao) {
    const existente = await db.getFirstAsync(
      'SELECT id, icone FROM categorias WHERE usuario_id = ? AND nome = ? AND tipo = ?',
      [USUARIO_ID, nome, tipo]
    );
    if (!existente) {
      await db.runAsync(
        'INSERT INTO categorias (id, usuario_id, nome, tipo, padrao, icone, cor) VALUES (?, ?, ?, ?, 1, ?, ?)',
        [gerarId(), USUARIO_ID, nome, tipo, icone, cor]
      );
    } else if (!existente.icone || existente.icone === 'pricetag-outline') {
      // Categoria padrão já existia de antes da coluna icone/cor existir —
      // atualiza pro ícone certo em vez de deixar o genérico.
      await db.runAsync('UPDATE categorias SET icone = ?, cor = ? WHERE id = ?', [icone, cor, existente.id]);
    }
  }
}

// Contas fixas/assinaturas criadas antes desta atualização não tinham
// "mes_inicio" registrado (só parcelas tinham). Preenche com a data de
// hoje como aproximação, para que passem a existir só a partir de agora
// (e não em meses passados, onde ainda não faziam sentido).
async function ensureMesInicioContasAntigas(db) {
  await db.runAsync(
    `UPDATE contas_recorrentes SET mes_inicio = ? WHERE usuario_id = ? AND mes_inicio IS NULL`,
    [new Date().toISOString(), USUARIO_ID]
  );
}

// Remove uma categoria de teste criada por engano ("G g"). Se por acaso
// alguma conta tiver ficado vinculada a ela, ela simplesmente passa a não
// ter categoria (aparece sem ícone específico) — não é uma categoria com
// uso real, então não há necessidade de reatribuir pra outra.
async function ensureLimparCategoriaTeste(db) {
  await db.runAsync(`DELETE FROM categorias WHERE usuario_id = ? AND nome = 'G g' AND padrao = 0`, [USUARIO_ID]);
}

// Remove uma assinatura de demonstração criada por versões antigas. A
// migração roda uma única vez para não afetar uma assinatura legítima que
// o usuário cadastre com os mesmos dados depois desta atualização.
async function ensureRemoverAssinaturaDemonstracao(db) {
  const idMigracao = `remove-demo-video-subscription-v1:${USUARIO_ID}`;
  const executada = await db.getFirstAsync('SELECT id FROM app_migrations WHERE id = ?', [idMigracao]);
  if (executada) return;

  const exemplo = await db.getFirstAsync(
    `SELECT id FROM contas_recorrentes
     WHERE usuario_id = ? AND tipo = 'assinatura' AND nome = ? AND valor = ? AND dia_vencimento = ?`,
    [USUARIO_ID, 'Streaming de vídeo', 45, 12]
  );
  if (exemplo) {
    await db.runAsync('DELETE FROM contas_pagamentos WHERE conta_recorrente_id = ?', [exemplo.id]);
    await db.runAsync('DELETE FROM contas_recorrentes WHERE id = ?', [exemplo.id]);
  }

  await db.runAsync('INSERT INTO app_migrations (id, executada_em) VALUES (?, ?)', [idMigracao, new Date().toISOString()]);
}

// Remove os lançamentos de exemplo das versões antigas (incluindo a saída
// de R$ 45,90 que aparecia no resumo). A lista é restrita aos valores, dias,
// categorias e formas usados pelo seed original; só roda uma vez por banco.
async function ensureRemoverMovimentacoesDemonstracao(db) {
  const idMigracao = `remove-demo-transactions-v1:${USUARIO_ID}`;
  const executada = await db.getFirstAsync('SELECT id FROM app_migrations WHERE id = ?', [idMigracao]);
  if (executada) return;

  const exemplos = [
    { dia: 1, nome: 'Salário', tipo: 'entrada', valor: 5000, forma: 'pix' },
    { dia: 5, nome: 'Internet', tipo: 'saida', valor: 120, forma: 'debito' },
    { dia: 10, nome: 'Aluguel', tipo: 'saida', valor: 1000, forma: 'pix' },
    { dia: 18, nome: 'Mercado', tipo: 'saida', valor: 187.4, forma: 'debito' },
    { dia: 20, nome: 'Restaurantes', tipo: 'saida', valor: 45.9, forma: 'credito' },
    { dia: 3, nome: 'Mercado', tipo: 'saida', valor: 850, forma: 'debito' },
    { dia: 8, nome: 'Lazer', tipo: 'saida', valor: 300, forma: 'credito' },
    { dia: 14, nome: 'Restaurantes', tipo: 'saida', valor: 420, forma: 'credito' },
    { dia: 22, nome: 'Combustível', tipo: 'saida', valor: 500, forma: 'debito' },
  ];
  const hoje = new Date();
  const referenciaAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const mesAnteriorData = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const referenciaAnterior = `${mesAnteriorData.getFullYear()}-${String(mesAnteriorData.getMonth() + 1).padStart(2, '0')}`;

  for (const exemplo of exemplos) {
    await db.runAsync(
      `DELETE FROM movimentacoes
       WHERE usuario_id = ? AND tipo = ? AND valor = ? AND forma_pagamento = ?
         AND strftime('%Y-%m', data) IN (?, ?)
         AND CAST(strftime('%d', data) AS INTEGER) = ?
         AND categoria_id IN (
           SELECT id FROM categorias WHERE usuario_id = ? AND nome = ? AND tipo = ?
         )`,
      [USUARIO_ID, exemplo.tipo, exemplo.valor, exemplo.forma, referenciaAtual, referenciaAnterior, exemplo.dia, USUARIO_ID, exemplo.nome, exemplo.tipo]
    );
  }

  await db.runAsync('INSERT INTO app_migrations (id, executada_em) VALUES (?, ?)', [idMigracao, new Date().toISOString()]);
}

const TABELAS_SINCRONIZAVEIS = [
  { tabela: 'usuarios', entidade: 'usuarios', usuario: 'id', campos: ['id', 'nome', 'saldo_inicial', 'onboarding_visto', 'notificacoes_ativas'] },
  { tabela: 'categorias', entidade: 'categorias', usuario: 'usuario_id', campos: ['id', 'usuario_id', 'nome', 'tipo', 'padrao', 'icone', 'cor'] },
  { tabela: 'movimentacoes', entidade: 'movimentacoes', usuario: 'usuario_id', campos: ['id', 'usuario_id', 'categoria_id', 'tipo', 'valor', 'data', 'forma_pagamento', 'origem', 'cartao_id', 'paga_referencia'] },
  { tabela: 'contas_recorrentes', entidade: 'contas_recorrentes', usuario: 'usuario_id', campos: ['id', 'usuario_id', 'categoria_id', 'tipo', 'nome', 'valor', 'dia_vencimento', 'status', 'cartao_id', 'quantidade_parcelas', 'mes_inicio', 'paga_referencia'] },
  { tabela: 'cartoes', entidade: 'cartoes', usuario: 'usuario_id', campos: ['id', 'usuario_id', 'apelido', 'bandeira', 'ultimos_digitos', 'limite', 'dia_vencimento', 'dia_fechamento'] },
  { tabela: 'contas_pagamentos', entidade: 'contas_pagamentos', usuario: 'usuario_id', campos: ['id', 'usuario_id', 'conta_recorrente_id', 'mes_referencia'] },
  { tabela: 'metas', entidade: 'metas', usuario: 'usuario_id', campos: ['id', 'usuario_id', 'nome', 'icone', 'valor_objetivo', 'valor_guardado', 'aporte_mensal'] },
];

async function criarTriggersDeSync(db) {
  for (const config of TABELAS_SINCRONIZAVEIS) {
    for (const acao of ['INSERT', 'UPDATE', 'DELETE']) {
      const evento = acao.toLowerCase();
      const linha = acao === 'DELETE' ? 'OLD' : 'NEW';
      const nomes = config.campos.map((campo) => `'${campo}', ${linha}.${campo}`).join(', ');
      await db.execAsync(`
        CREATE TRIGGER IF NOT EXISTS sync_${config.entidade}_${evento}
        AFTER ${acao} ON ${config.tabela}
        WHEN COALESCE((SELECT valor FROM sync_state WHERE chave = 'aplicando_remoto'), '0') <> '1'
        BEGIN
          INSERT INTO sync_outbox (id, usuario_id, entidade, registro_id, operacao, payload, criado_em)
          VALUES (
            lower(hex(randomblob(16))), ${linha}.${config.usuario}, '${config.entidade}', ${linha}.id,
            '${acao === 'DELETE' ? 'delete' : 'upsert'}',
            ${acao === 'DELETE' ? 'NULL' : `json_object(${nomes})`},
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          );
        END;
      `);
    }
  }
}

async function migrarDadosLegados(db) {
  if (USUARIO_ID === 'usuario-1') return;
  const donoLegado = await db.getFirstAsync("SELECT valor FROM sync_state WHERE chave = 'dono_legado'");
  if (donoLegado) return;

  const dadosLegados = await db.getFirstAsync(
    `SELECT
      (SELECT COUNT(*) FROM movimentacoes WHERE usuario_id = 'usuario-1') +
      (SELECT COUNT(*) FROM contas_recorrentes WHERE usuario_id = 'usuario-1') +
      (SELECT COUNT(*) FROM cartoes WHERE usuario_id = 'usuario-1') +
      (SELECT COUNT(*) FROM metas WHERE usuario_id = 'usuario-1') AS total`
  );

  await db.runAsync('UPDATE usuarios SET id = ? WHERE id = ?', [USUARIO_ID, 'usuario-1']);
  for (const tabela of ['categorias', 'movimentacoes', 'contas_recorrentes', 'cartoes', 'metas', 'contas_pagamentos']) {
    await db.runAsync(`UPDATE ${tabela} SET usuario_id = ? WHERE usuario_id = ?`, [USUARIO_ID, 'usuario-1']);
  }
  await db.runAsync("INSERT INTO sync_state (chave, valor) VALUES ('dono_legado', ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor", [USUARIO_ID]);
  if (dadosLegados?.total > 0) {
    await db.runAsync(
      'INSERT INTO sync_state (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor',
      [`importacao_legada:${USUARIO_ID}`, '1']
    );
  }
}

export async function getDb() {
  if (!dbInstance) dbInstance = await SQLite.openDatabaseAsync('app-financeiro.db');

  if (!estruturaPreparada) {
    await dbInstance.execAsync(SCHEMA_SQL);
    await ensureColuna(dbInstance, 'contas_recorrentes', 'cartao_id', 'TEXT');
    await ensureColuna(dbInstance, 'contas_recorrentes', 'quantidade_parcelas', 'INTEGER');
    await ensureColuna(dbInstance, 'contas_recorrentes', 'mes_inicio', 'TEXT');
    await ensureColuna(dbInstance, 'contas_recorrentes', 'paga_referencia', 'TEXT');
    await ensureColuna(dbInstance, 'movimentacoes', 'cartao_id', 'TEXT');
    await ensureColuna(dbInstance, 'movimentacoes', 'paga_referencia', 'TEXT');
    await ensureColuna(dbInstance, 'cartoes', 'limite', 'REAL');
    await ensureColuna(dbInstance, 'cartoes', 'dia_vencimento', 'INTEGER');
    await ensureColuna(dbInstance, 'cartoes', 'dia_fechamento', 'INTEGER');
    await ensureColuna(dbInstance, 'usuarios', 'onboarding_visto', 'INTEGER DEFAULT 0');
    await ensureColuna(dbInstance, 'usuarios', 'notificacoes_ativas', 'INTEGER DEFAULT 1');
    await ensureColuna(dbInstance, 'categorias', 'icone', "TEXT DEFAULT 'pricetag-outline'");
    await ensureColuna(dbInstance, 'categorias', 'cor', "TEXT DEFAULT '#0F766E'");
    await ensureColuna(dbInstance, 'contas_pagamentos', 'usuario_id', 'TEXT');
    await dbInstance.runAsync(
      `UPDATE contas_pagamentos SET usuario_id = (
        SELECT usuario_id FROM contas_recorrentes WHERE contas_recorrentes.id = contas_pagamentos.conta_recorrente_id
      ) WHERE usuario_id IS NULL`
    );
    await dbInstance.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_state (chave TEXT PRIMARY KEY, valor TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sync_outbox (
        seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, usuario_id TEXT NOT NULL,
        entidade TEXT NOT NULL, registro_id TEXT NOT NULL, operacao TEXT NOT NULL, payload TEXT, criado_em TEXT NOT NULL
      );
    `);
    await criarTriggersDeSync(dbInstance);
    const runAsyncOriginal = dbInstance.runAsync.bind(dbInstance);
    dbInstance.runAsync = async (...args) => {
      const result = await runAsyncOriginal(...args);
      if (!aplicandoDadosRemotos && syncScheduler) syncScheduler(USUARIO_ID);
      return result;
    };
    estruturaPreparada = true;
  }

  if (!usuariosInicializados.has(USUARIO_ID)) {
    await migrarDadosLegados(dbInstance);
    await ensureUsuario(dbInstance);
    await ensureCategoriasPadrao(dbInstance);
    await ensureMesInicioContasAntigas(dbInstance);
    await ensureLimparCategoriaTeste(dbInstance);
    await ensureRemoverAssinaturaDemonstracao(dbInstance);
    await ensureRemoverMovimentacoesDemonstracao(dbInstance);
    usuariosInicializados.add(USUARIO_ID);
  }

  return dbInstance;
}

