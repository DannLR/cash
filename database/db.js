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
  conta_recorrente_id TEXT NOT NULL,
  mes_referencia TEXT NOT NULL
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

const USUARIO_ID = 'usuario-1';

let dbInstance = null;

export function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function buscarOuCriarCategoria(db, nome, tipo) {
  let categoria = await db.getFirstAsync(
    'SELECT id FROM categorias WHERE usuario_id = ? AND nome = ? AND tipo = ?',
    [USUARIO_ID, nome, tipo]
  );
  if (categoria) return categoria.id;
  const id = gerarId();
  await db.runAsync(
    'INSERT INTO categorias (id, usuario_id, nome, tipo, padrao) VALUES (?, ?, ?, ?, 0)',
    [id, USUARIO_ID, nome, tipo]
  );
  return id;
}

// Cada "ensure" abaixo é independente e idempotente: roda toda vez que o
// app abre, mas só insere dados se ainda não existirem. Isso permite
// completar o banco de quem já usou o app antes, sem duplicar nada
// nem apagar o que a pessoa já lançou manualmente.

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

async function ensureMovimentacoesExemplo(db) {
  const alguma = await db.getFirstAsync(
    'SELECT id FROM movimentacoes WHERE usuario_id = ? LIMIT 1',
    [USUARIO_ID]
  );
  if (alguma) return; // já existem lançamentos (seus ou de exemplo) — não mexe

  const hoje = new Date();
  const exemplos = [
    { dia: 1, nome: 'Salário', tipo: 'entrada', valor: 5000, forma: 'pix' },
    { dia: 5, nome: 'Internet', tipo: 'saida', valor: 120, forma: 'debito' },
    { dia: 10, nome: 'Aluguel', tipo: 'saida', valor: 1000, forma: 'pix' },
    { dia: 18, nome: 'Mercado', tipo: 'saida', valor: 187.4, forma: 'debito' },
    { dia: 20, nome: 'Restaurantes', tipo: 'saida', valor: 45.9, forma: 'credito' },
  ];
  for (const ex of exemplos) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth(), ex.dia);
    const categoriaId = await buscarOuCriarCategoria(db, ex.nome, ex.tipo);
    await db.runAsync(
      'INSERT INTO movimentacoes (id, usuario_id, categoria_id, tipo, valor, data, forma_pagamento, origem) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [gerarId(), USUARIO_ID, categoriaId, ex.tipo, ex.valor, data.toISOString(), ex.forma, 'avulsa']
    );
  }
}

async function ensureMovimentacoesMesAnterior(db) {
  const hoje = new Date();
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59);

  const alguma = await db.getFirstAsync(
    'SELECT id FROM movimentacoes WHERE usuario_id = ? AND data BETWEEN ? AND ? LIMIT 1',
    [USUARIO_ID, inicioMesAnterior.toISOString(), fimMesAnterior.toISOString()]
  );
  if (alguma) return; // já tem dado do mês anterior — não mexe

  const exemplos = [
    { dia: 3, nome: 'Mercado', tipo: 'saida', valor: 850, forma: 'debito' },
    { dia: 8, nome: 'Lazer', tipo: 'saida', valor: 300, forma: 'credito' },
    { dia: 14, nome: 'Restaurantes', tipo: 'saida', valor: 420, forma: 'credito' },
    { dia: 22, nome: 'Combustível', tipo: 'saida', valor: 500, forma: 'debito' },
  ];
  for (const ex of exemplos) {
    const data = new Date(inicioMesAnterior.getFullYear(), inicioMesAnterior.getMonth(), ex.dia);
    const categoriaId = await buscarOuCriarCategoria(db, ex.nome, ex.tipo);
    await db.runAsync(
      'INSERT INTO movimentacoes (id, usuario_id, categoria_id, tipo, valor, data, forma_pagamento, origem) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [gerarId(), USUARIO_ID, categoriaId, ex.tipo, ex.valor, data.toISOString(), ex.forma, 'avulsa']
    );
  }
}

async function ensureContasRecorrentes(db) {
  const existentes = await db.getAllAsync(
    'SELECT tipo FROM contas_recorrentes WHERE usuario_id = ?',
    [USUARIO_ID]
  );
  const tiposExistentes = new Set(existentes.map((c) => c.tipo));

  if (!tiposExistentes.has('fixa')) {
    const fixas = [
      { nome: 'Aluguel', valor: 1000, dia: 10 },
      { nome: 'Energia', valor: 180, dia: 15 },
      { nome: 'Internet', valor: 120, dia: 5 },
      { nome: 'Academia', valor: 90, dia: 8 },
    ];
    for (const f of fixas) {
      const categoriaId = await buscarOuCriarCategoria(db, f.nome, 'saida');
      await db.runAsync(
        'INSERT INTO contas_recorrentes (id, usuario_id, categoria_id, tipo, nome, valor, dia_vencimento, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [gerarId(), USUARIO_ID, categoriaId, 'fixa', f.nome, f.valor, f.dia, 'ativa']
      );
    }
  }

  if (!tiposExistentes.has('parcela')) {
    const categoriaId = await buscarOuCriarCategoria(db, 'Compras', 'saida');
    await db.runAsync(
      'INSERT INTO contas_recorrentes (id, usuario_id, categoria_id, tipo, nome, valor, dia_vencimento, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [gerarId(), USUARIO_ID, categoriaId, 'parcela', 'Notebook', 350, 15, 'ativa']
    );
  }

  if (!tiposExistentes.has('assinatura')) {
    const categoriaId = await buscarOuCriarCategoria(db, 'Assinaturas', 'saida');
    const assinaturas = [
      { nome: 'Streaming de vídeo', valor: 45, dia: 12 },
      { nome: 'Streaming de música', valor: 22, dia: 20 },
    ];
    for (const a of assinaturas) {
      await db.runAsync(
        'INSERT INTO contas_recorrentes (id, usuario_id, categoria_id, tipo, nome, valor, dia_vencimento, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [gerarId(), USUARIO_ID, categoriaId, 'assinatura', a.nome, a.valor, a.dia, 'ativa']
      );
    }
  }
}

// Contas fixas/assinaturas criadas antes desta atualização não tinham
// "mes_inicio" registrado (só parcelas tinham). Preenche com a data de
// hoje como aproximação, para que passem a existir só a partir de agora
// (e não em meses passados, onde ainda não faziam sentido).
async function ensureMesInicioContasAntigas(db) {
  await db.runAsync(
    `UPDATE contas_recorrentes SET mes_inicio = ? WHERE mes_inicio IS NULL`,
    [new Date().toISOString()]
  );
}

// Remove uma categoria de teste criada por engano ("G g"). Se por acaso
// alguma conta tiver ficado vinculada a ela, ela simplesmente passa a não
// ter categoria (aparece sem ícone específico) — não é uma categoria com
// uso real, então não há necessidade de reatribuir pra outra.
async function ensureLimparCategoriaTeste(db) {
  await db.runAsync(`DELETE FROM categorias WHERE nome = 'G g' AND padrao = 0`);
}

export async function getDb() {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('app-financeiro.db');
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
  await ensureUsuario(dbInstance);
  await ensureCategoriasPadrao(dbInstance);
  await ensureMovimentacoesExemplo(dbInstance);
  await ensureMovimentacoesMesAnterior(dbInstance);
  await ensureContasRecorrentes(dbInstance);
  await ensureMesInicioContasAntigas(dbInstance);
  await ensureLimparCategoriaTeste(dbInstance);
  return dbInstance;
}

export { USUARIO_ID };