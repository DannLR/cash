import { AppState } from 'react-native';
import {
  definirAplicacaoRemota,
  getDb,
  registrarAgendadorDeSync,
} from '../database/db';
import { supabase } from './supabase';

const ENTIDADES = {
  usuarios: ['usuarios', ['id', 'nome', 'saldo_inicial', 'onboarding_visto', 'notificacoes_ativas']],
  categorias: ['categorias', ['id', 'usuario_id', 'nome', 'tipo', 'padrao', 'icone', 'cor']],
  movimentacoes: ['movimentacoes', ['id', 'usuario_id', 'categoria_id', 'tipo', 'valor', 'data', 'forma_pagamento', 'origem', 'cartao_id', 'paga_referencia', 'descricao']],
  contas_recorrentes: ['contas_recorrentes', ['id', 'usuario_id', 'categoria_id', 'tipo', 'nome', 'valor', 'dia_vencimento', 'status', 'cartao_id', 'quantidade_parcelas', 'mes_inicio', 'paga_referencia']],
  cartoes: ['cartoes', ['id', 'usuario_id', 'apelido', 'bandeira', 'ultimos_digitos', 'limite', 'dia_vencimento', 'dia_fechamento']],
  contas_pagamentos: ['contas_pagamentos', ['id', 'usuario_id', 'conta_recorrente_id', 'mes_referencia']],
  metas: ['metas', ['id', 'usuario_id', 'nome', 'icone', 'valor_objetivo', 'valor_guardado', 'aporte_mensal']],
};

let timer = null;
let sincronizacaoAtual = null;
let usuarioEmSincronizacao = null;
let usuarioAgendado = null;

function chaveCursor(userId) { return `cursor_remoto:${userId}`; }
function chaveFotoInicial(userId) { return `foto_inicial:${userId}`; }
function chaveImportacaoLegada(userId) { return `importacao_legada:${userId}`; }

async function salvarEstado(db, chave, valor) {
  await db.runAsync(
    'INSERT INTO sync_state (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor',
    [chave, String(valor)]
  );
}

async function obterEstado(db, chave) {
  const linha = await db.getFirstAsync('SELECT valor FROM sync_state WHERE chave = ?', [chave]);
  return linha?.valor ?? null;
}

async function prepararImportacaoInicial(db, userId) {
  if (await obterEstado(db, chaveFotoInicial(userId))) return;

  for (const [entidade, [tabela, campos]] of Object.entries(ENTIDADES)) {
    const colunaUsuario = entidade === 'usuarios' ? 'id' : 'usuario_id';
    const linhas = await db.getAllAsync(`SELECT ${campos.join(', ')} FROM ${tabela} WHERE ${colunaUsuario} = ?`, [userId]);
    for (const linha of linhas) {
      await db.runAsync(
        `INSERT INTO sync_outbox (id, usuario_id, entidade, registro_id, operacao, payload, criado_em)
         VALUES (?, ?, ?, ?, 'upsert', ?, ?)`,
        [
          `snapshot-${userId}-${entidade}-${linha.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          userId,
          entidade,
          linha.id,
          JSON.stringify(linha),
          new Date().toISOString(),
        ]
      );
    }
  }
  await salvarEstado(db, chaveFotoInicial(userId), '1');
  await salvarEstado(db, chaveImportacaoLegada(userId), '0');
}

async function enviarPendencias(db, userId) {
  while (true) {
    const pendencias = await db.getAllAsync(
      `SELECT seq, id, usuario_id, entidade, registro_id, operacao, payload, criado_em
       FROM sync_outbox WHERE usuario_id = ? ORDER BY seq ASC LIMIT 100`,
      [userId]
    );
    if (!pendencias.length) return;

    const registros = pendencias.map((item) => ({
      event_id: item.id,
      user_id: item.usuario_id,
      entity: item.entidade,
      record_id: item.registro_id,
      operation: item.operacao,
      payload: item.payload ? JSON.parse(item.payload) : null,
      created_at: item.criado_em,
    }));
    const { error } = await supabase
      .from('cash_sync_events')
      .upsert(registros, { onConflict: 'event_id', ignoreDuplicates: true });
    if (error) throw error;

    const ids = pendencias.map((item) => item.id);
    await db.runAsync(`DELETE FROM sync_outbox WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  }
}

async function aplicarEvento(db, evento, userId) {
  const config = ENTIDADES[evento.entity];
  if (!config) return;
  const [tabela, campos] = config;
  if (evento.operation === 'delete') {
    if (evento.entity === 'categorias') {
      const padrao = await db.getFirstAsync('SELECT padrao FROM categorias WHERE id = ? AND usuario_id = ?', [evento.record_id, userId]);
      if (padrao?.padrao) return;
    }
    await db.runAsync(`DELETE FROM ${tabela} WHERE id = ?`, [evento.record_id]);
    return;
  }

  const registro = typeof evento.payload === 'string' ? JSON.parse(evento.payload) : { ...(evento.payload || {}) };
  if (evento.entity === 'categorias' && Number(registro.padrao) === 1) {
    const local = await db.getFirstAsync(
      'SELECT id FROM categorias WHERE usuario_id = ? AND nome = ? AND tipo = ? AND padrao = 1 LIMIT 1',
      [userId, registro.nome, registro.tipo]
    );
    if (local) {
      await salvarEstado(db, `mapa_categoria:${userId}:${registro.id}`, local.id);
      return;
    }
  }

  if (evento.entity === 'movimentacoes' || evento.entity === 'contas_recorrentes') {
    if (registro.categoria_id) {
      registro.categoria_id = await obterEstado(db, `mapa_categoria:${userId}:${registro.categoria_id}`) || registro.categoria_id;
    }
  }

  const valores = campos.map((campo) => registro[campo] ?? null);
  await db.runAsync(
    `INSERT OR REPLACE INTO ${tabela} (${campos.join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`,
    valores
  );
}

async function receberAtualizacoes(db, userId) {
  let cursor = Number(await obterEstado(db, chaveCursor(userId)) || 0);
  while (true) {
    const { data, error } = await supabase
      .from('cash_sync_events')
      .select('sequence,event_id,user_id,entity,record_id,operation,payload,created_at')
      .eq('user_id', userId)
      .gt('sequence', cursor)
      .order('sequence', { ascending: true })
      .limit(500);
    if (error) throw error;
    if (!data?.length) return;

    definirAplicacaoRemota(true);
    try {
      await salvarEstado(db, 'aplicando_remoto', '1');
      for (const evento of data) {
        await aplicarEvento(db, evento, userId);
        cursor = Number(evento.sequence);
      }
      await salvarEstado(db, chaveCursor(userId), cursor);
    } finally {
      await salvarEstado(db, 'aplicando_remoto', '0');
      definirAplicacaoRemota(false);
    }
    if (data.length < 500) return;
  }
}

async function sincronizar(userId) {
  if (sincronizacaoAtual) {
    if (usuarioEmSincronizacao === userId) return sincronizacaoAtual;
    await sincronizacaoAtual.catch(() => {});
    return sincronizar(userId);
  }

  usuarioEmSincronizacao = userId;
  const tarefa = (async () => {
    const db = await getDb();
    const importacaoLegada = await obterEstado(db, chaveImportacaoLegada(userId));
    if (!await obterEstado(db, chaveFotoInicial(userId))) {
      const { data: historico, error } = await supabase
        .from('cash_sync_events')
        .select('sequence')
        .eq('user_id', userId)
        .order('sequence', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;

      if (historico && importacaoLegada !== '1') {
        await receberAtualizacoes(db, userId);
        // O usuário recém-criado não deve sobrepor preferências do perfil da nuvem.
        // Categorias padrão são publicadas para que seus IDs locais possam ser mapeados.
        const criacoesPadrao = await db.getAllAsync(
          `SELECT id FROM sync_outbox
           WHERE usuario_id = ? AND entidade = 'usuarios'`,
          [userId]
        );
        if (criacoesPadrao.length) {
          await db.runAsync(`DELETE FROM sync_outbox WHERE id IN (${criacoesPadrao.map(() => '?').join(',')})`, criacoesPadrao.map((item) => item.id));
        }
        await salvarEstado(db, chaveFotoInicial(userId), '1');
      } else {
        await prepararImportacaoInicial(db, userId);
      }
    }
    await enviarPendencias(db, userId);
    await receberAtualizacoes(db, userId);
  })();
  sincronizacaoAtual = tarefa;
  try {
    return await tarefa;
  } finally {
    if (sincronizacaoAtual === tarefa) {
      sincronizacaoAtual = null;
      usuarioEmSincronizacao = null;
    }
  }
}

function agendarSincronizacao(userId, atraso = 700) {
  usuarioAgendado = userId;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    sincronizar(userId).catch((erro) => console.warn('Sincronização do Cash pendente:', erro.message));
  }, atraso);
}

export async function sincronizarAgora(userId) {
  await sincronizar(userId);
}

export function iniciarSincronizacao(userId) {
  usuarioAgendado = userId;
  registrarAgendadorDeSync((idAtual) => agendarSincronizacao(idAtual));
  const primeiraSync = sincronizar(userId).catch((erro) => {
    console.warn('Sincronização do Cash pendente:', erro.message);
    return erro;
  });
  const intervalo = setInterval(() => agendarSincronizacao(userId, 0), 30000);
  const assinaturaApp = AppState.addEventListener('change', (estado) => {
    if (estado === 'active') agendarSincronizacao(userId, 0);
  });
  const parar = () => {
    clearInterval(intervalo);
    assinaturaApp.remove();
    if (usuarioAgendado === userId) {
      usuarioAgendado = null;
      registrarAgendadorDeSync(null);
      if (timer) clearTimeout(timer);
      timer = null;
    }
  };
  return { primeiraSync, parar };
}
