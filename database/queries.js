import { getDb, USUARIO_ID } from './db';

// ---- Helpers de mês/data ----

// Primeiro e último dia de um mês específico (ano, mes 0-11), no formato
// ISO usado na coluna "data". Sem argumentos, usa o mês real de agora —
// é o que as telas que ainda não navegam por mês continuam usando.
function limitesDoMes(ano, mes) {
  const base = ano !== undefined ? { ano, mes } : { ano: new Date().getFullYear(), mes: new Date().getMonth() };
  const inicio = new Date(base.ano, base.mes, 1);
  const fim = new Date(base.ano, base.mes + 1, 0, 23, 59, 59);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

function limitesDoMesAtual() {
  return limitesDoMes();
}

// "YYYY-MM" a partir de ano/mes (mes 0-11). Sem argumentos, usa agora.
function referenciaMes(ano, mes) {
  if (ano === undefined) {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  }
  return `${ano}-${String(mes + 1).padStart(2, '0')}`;
}

function referenciaMesAtual() {
  return referenciaMes();
}

// Dado um mês anterior a partir de um "YYYY-MM".
function referenciaAnterior(referencia) {
  const [anoStr, mesStr] = referencia.split('-');
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10) - 1; // 0-11
  const anoAnterior = mes === 0 ? ano - 1 : ano;
  const mesAnterior = mes === 0 ? 11 : mes - 1;
  return referenciaMes(anoAnterior, mesAnterior);
}

function referenciaDe(dataIso) {
  const d = new Date(dataIso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Número da parcela atual (1, 2, 3...) relativo ao mês que está sendo
// visualizado — não ao mês real de hoje, já que agora dá pra navegar
// para meses futuros também.
function calcularParcelaAtual(mesInicio, quantidadeParcelas, referencia) {
  if (!mesInicio || !quantidadeParcelas || !referencia) return null;
  const [anoCriacao, mesCriacao] = referenciaDe(mesInicio).split('-').map(Number);
  const [anoRef, mesRef] = referencia.split('-').map(Number);
  const decorridos = (anoRef - anoCriacao) * 12 + (mesRef - mesCriacao);
  return Math.max(1, decorridos + 1);
}

// Uma conta recorrente só aparece a partir do mês em que foi cadastrada
// (mes_inicio) — nunca em meses anteriores a ele. Parcelas também param
// de aparecer depois que a última parcela passa, relativo ao mês visto.
function contaVisivelNoMes(conta, referencia) {
  if (conta.mes_inicio) {
    const criacaoRef = referenciaDe(conta.mes_inicio);
    if (referencia < criacaoRef) return false; // "YYYY-MM" compara certo como texto
  }
  if (conta.tipo === 'parcela' && conta.quantidade_parcelas) {
    const parcelaAtual = calcularParcelaAtual(conta.mes_inicio, conta.quantidade_parcelas, referencia);
    if (parcelaAtual && parcelaAtual > conta.quantidade_parcelas) return false;
  }
  return true;
}

function gerarIdLocal() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---- Pagamentos por mês ----
// "Marcar como paga" agora vale por mês específico (agosto pago não
// significa setembro pago) — guardado numa tabela própria, não mais num
// único campo que se sobrescrevia a cada mês.

async function idsContasPagasNoMes(db, mesReferencia) {
  const linhas = await db.getAllAsync(
    'SELECT conta_recorrente_id FROM contas_pagamentos WHERE mes_referencia = ?',
    [mesReferencia]
  );
  return new Set(linhas.map((l) => l.conta_recorrente_id));
}

export async function alternarContaPaga(contaId, mesReferencia, estaPagaAtualmente) {
  const db = await getDb();
  if (estaPagaAtualmente) {
    await db.runAsync(
      'DELETE FROM contas_pagamentos WHERE conta_recorrente_id = ? AND mes_referencia = ?',
      [contaId, mesReferencia]
    );
  } else {
    await db.runAsync(
      'INSERT OR IGNORE INTO contas_pagamentos (id, conta_recorrente_id, mes_referencia) VALUES (?, ?, ?)',
      [gerarIdLocal(), contaId, mesReferencia]
    );
  }
}

// Calcula tudo que a tela inicial precisa: saldo disponível, quanto entrou,
// quanto saiu, quanto ainda está previsto, e o Saldo Livre Real — tudo
// referente ao mês/ano informados.
export async function calcularResumoMensal(ano, mes) {
  const db = await getDb();
  const { inicio, fim } = limitesDoMes(ano, mes);
  const referencia = referenciaMes(ano, mes);

  const somaEntradas = await db.getFirstAsync(
    `SELECT COALESCE(SUM(valor), 0) AS total FROM movimentacoes
     WHERE usuario_id = ? AND tipo = 'entrada' AND data BETWEEN ? AND ?`,
    [USUARIO_ID, inicio, fim]
  );
  const somaSaidas = await db.getFirstAsync(
    `SELECT COALESCE(SUM(valor), 0) AS total FROM movimentacoes
     WHERE usuario_id = ? AND tipo = 'saida' AND data BETWEEN ? AND ?`,
    [USUARIO_ID, inicio, fim]
  );

  const entrou = somaEntradas.total;
  const gasto = somaSaidas.total;
  // Saldo disponível é só o que entrou menos o que saiu neste mês — sem
  // saldo inicial manual. Como "entrou"/"gasto" são somas do mês em
  // questão, o saldo zera sozinho a cada novo mês.
  const saldoDisponivel = entrou - gasto;

  // "Previsto": soma das contas recorrentes ativas, excluindo parcelas que
  // já terminaram.
  const recorrentesRaw = await db.getAllAsync(
    `SELECT id, valor, tipo, quantidade_parcelas, mes_inicio FROM contas_recorrentes
     WHERE usuario_id = ? AND status = 'ativa'`,
    [USUARIO_ID]
  );
  const recorrentesAtivas = recorrentesRaw.filter((c) => contaVisivelNoMes(c, referencia));
  const previsto = recorrentesAtivas.reduce((soma, c) => soma + c.valor, 0);

  const saldoLivreReal = saldoDisponivel - previsto;

  const pagasIds = await idsContasPagasNoMes(db, referencia);
  const contasPagas = recorrentesAtivas
    .filter((c) => pagasIds.has(c.id))
    .reduce((soma, c) => soma + c.valor, 0);
  const gastosPagos = await db.getFirstAsync(
    `SELECT COALESCE(SUM(valor), 0) AS total FROM movimentacoes
     WHERE usuario_id = ? AND tipo = 'saida' AND paga_referencia = ?`,
    [USUARIO_ID, referencia]
  );

  return { saldoDisponivel, entrou, gasto, previsto, saldoLivreReal, contasPagas: contasPagas + gastosPagos.total };
}

// ---- Contas recorrentes: agora só Fixas (tela "Contas") ----

export async function getContasFixas(mesReferencia) {
  const db = await getDb();
  const referencia = mesReferencia || referenciaMesAtual();
  const linhas = await db.getAllAsync(
    `SELECT cr.id, cr.nome, cr.valor, cr.dia_vencimento, cr.mes_inicio, c.nome AS categoriaNome
     FROM contas_recorrentes cr LEFT JOIN categorias c ON c.id = cr.categoria_id
     WHERE cr.usuario_id = ? AND cr.tipo = 'fixa' AND cr.status = 'ativa' ORDER BY cr.dia_vencimento ASC`,
    [USUARIO_ID]
  );
  const pagasIds = await idsContasPagasNoMes(db, referencia);
  const itens = linhas
    .filter((l) => contaVisivelNoMes(l, referencia))
    .map((l) => ({
      id: l.id, nome: l.nome, valor: l.valor, diaVencimento: l.dia_vencimento,
      categoriaNome: l.categoriaNome,
      estaPaga: pagasIds.has(l.id),
    }));
  const total = itens.reduce((soma, i) => soma + i.valor, 0);
  return { itens, total };
}

// ---- Cartões ----

export async function getCartoes() {
  const db = await getDb();
  return db.getAllAsync(
    'SELECT id, apelido, bandeira, ultimos_digitos, limite, dia_vencimento, dia_fechamento FROM cartoes WHERE usuario_id = ? ORDER BY apelido ASC',
    [USUARIO_ID]
  );
}

export async function salvarCartao({ apelido, bandeira, ultimosDigitos, limite, diaVencimento, diaFechamento }) {
  const db = await getDb();
  const id = gerarIdLocal();
  await db.runAsync(
    'INSERT INTO cartoes (id, usuario_id, apelido, bandeira, ultimos_digitos, limite, dia_vencimento, dia_fechamento) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, USUARIO_ID, apelido, bandeira, ultimosDigitos || null, limite || 0, diaVencimento || null, diaFechamento || null]
  );
}

export async function atualizarDadosCartao(id, { limite, diaVencimento, diaFechamento }) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE cartoes SET limite = ?, dia_vencimento = ?, dia_fechamento = ? WHERE id = ?',
    [limite, diaVencimento, diaFechamento, id]
  );
}

export async function getResumoCartoes(mesReferencia) {
  const cartoes = await getCartoes();
  return Promise.all(cartoes.map(async (cartao) => {
    const dados = await getDadosCartao(cartao.id, mesReferencia);
    return { ...cartao, total: dados.total };
  }));
}

// Parcelas, assinaturas e compras no débito vinculadas a um cartão
// específico, com o status de "paga" referente ao mês informado.
export async function getDadosCartao(cartaoId, mesReferencia) {
  const db = await getDb();
  const referencia = mesReferencia || referenciaMesAtual();
  const [anoRef, mesRef] = referencia.split('-').map(Number);
  const { inicio, fim } = limitesDoMes(anoRef, mesRef - 1);

  const parcelasRaw = await db.getAllAsync(
    `SELECT id, nome, valor, dia_vencimento, quantidade_parcelas, mes_inicio FROM contas_recorrentes WHERE cartao_id = ? AND tipo = 'parcela' AND status = 'ativa' ORDER BY dia_vencimento ASC`,
    [cartaoId]
  );
  const assinaturasRaw = await db.getAllAsync(
    `SELECT id, nome, valor, dia_vencimento, mes_inicio FROM contas_recorrentes WHERE cartao_id = ? AND tipo = 'assinatura' AND status = 'ativa' ORDER BY dia_vencimento ASC`,
    [cartaoId]
  );
  const debitoRaw = await db.getAllAsync(
    `SELECT m.id, m.valor, m.data, c.nome AS categoriaNome
     FROM movimentacoes m LEFT JOIN categorias c ON c.id = m.categoria_id
     WHERE m.cartao_id = ? AND m.tipo = 'saida' AND m.forma_pagamento IN ('debito', 'credito') AND m.data BETWEEN ? AND ?
     ORDER BY m.data DESC`,
    [cartaoId, inicio, fim]
  );

  const pagasIds = await idsContasPagasNoMes(db, referencia);

  const parcelas = parcelasRaw
    .filter((l) => contaVisivelNoMes(l, referencia))
    .map((l) => ({
      id: l.id, nome: l.nome, valor: l.valor, diaVencimento: l.dia_vencimento,
      quantidadeParcelas: l.quantidade_parcelas,
      parcelaAtual: calcularParcelaAtual(l.mes_inicio, l.quantidade_parcelas, referencia),
      estaPaga: pagasIds.has(l.id),
    }));
  const assinaturas = assinaturasRaw
    .filter((l) => contaVisivelNoMes(l, referencia))
    .map((l) => ({
      id: l.id, nome: l.nome, valor: l.valor, diaVencimento: l.dia_vencimento,
      estaPaga: pagasIds.has(l.id),
    }));
  const debito = debitoRaw.map((l) => ({ id: l.id, nome: l.categoriaNome || 'Outros', valor: l.valor, data: l.data }));
  const total = [...parcelas, ...assinaturas].reduce((soma, i) => soma + i.valor, 0);

  return { parcelas, assinaturas, debito, total };
}

// Gastos avulsos do mês informado: Pix, dinheiro e compras no débito.
export async function getGastosAvulsos(mesReferencia) {
  const db = await getDb();
  const referencia = mesReferencia || referenciaMesAtual();
  const [anoRef, mesRef] = referencia.split('-').map(Number);
  const { inicio, fim } = limitesDoMes(anoRef, mesRef - 1);
  const linhas = await db.getAllAsync(
    `SELECT m.id, m.valor, m.data, m.forma_pagamento, m.paga_referencia, c.nome AS categoriaNome, cart.apelido AS cartaoApelido
     FROM movimentacoes m LEFT JOIN categorias c ON c.id = m.categoria_id
     LEFT JOIN cartoes cart ON cart.id = m.cartao_id
     WHERE m.usuario_id = ? AND m.tipo = 'saida' AND m.forma_pagamento IN ('pix', 'dinheiro', 'debito', 'boleto')
       AND m.data BETWEEN ? AND ?
     ORDER BY m.data DESC`,
    [USUARIO_ID, inicio, fim]
  );
  return linhas.map((l) => ({ id: l.id, nome: l.categoriaNome || 'Outros', valor: l.valor, data: l.data, formaPagamento: l.forma_pagamento, cartaoApelido: l.cartaoApelido, estaPaga: l.paga_referencia === referencia }));
}

// ---- Planejamento ----

export async function getProximosLancamentos(mesReferencia) {
  const db = await getDb();
  const referencia = mesReferencia || referenciaMesAtual();
  const linhas = await db.getAllAsync(
    `SELECT nome, valor, dia_vencimento, tipo, quantidade_parcelas, mes_inicio FROM contas_recorrentes
     WHERE usuario_id = ? AND status = 'ativa' ORDER BY dia_vencimento ASC`,
    [USUARIO_ID]
  );
  return linhas
    .filter((l) => contaVisivelNoMes(l, referencia))
    .map((l) => ({
      dia: String(l.dia_vencimento).padStart(2, '0'),
      nome: l.nome,
      tipo: l.tipo,
      valor: -l.valor,
    }));
}

// ---- Insights ----

export async function getTotalAssinaturas() {
  const db = await getDb();
  const resultado = await db.getFirstAsync(
    `SELECT COALESCE(SUM(valor), 0) AS total FROM contas_recorrentes
     WHERE usuario_id = ? AND tipo = 'assinatura' AND status = 'ativa'`,
    [USUARIO_ID]
  );
  return resultado.total;
}

// Lista as assinaturas ativas (visíveis no mês informado) com o cartão a
// que cada uma está vinculada — usada na tela de detalhe das assinaturas.
export async function getAssinaturasComCartao(mesReferencia) {
  const db = await getDb();
  const referencia = mesReferencia || referenciaMesAtual();
  const linhas = await db.getAllAsync(
    `SELECT cr.id, cr.nome, cr.valor, cr.dia_vencimento, cr.mes_inicio, cart.apelido AS cartaoApelido
     FROM contas_recorrentes cr
     LEFT JOIN cartoes cart ON cart.id = cr.cartao_id
     WHERE cr.usuario_id = ? AND cr.tipo = 'assinatura' AND cr.status = 'ativa'
     ORDER BY cr.valor DESC`,
    [USUARIO_ID]
  );
  return linhas
    .filter((l) => contaVisivelNoMes(l, referencia))
    .map((l) => ({
      id: l.id,
      nome: l.nome,
      valor: l.valor,
      diaVencimento: l.dia_vencimento,
      cartaoApelido: l.cartaoApelido,
    }));
}

// Compara o mês informado (ano, mes) com o mês imediatamente anterior a ele.
export async function getComparacaoCategorias(ano, mes) {
  const db = await getDb();
  const mesAtual = limitesDoMes(ano, mes);
  const referenciaAtual = referenciaMes(ano, mes);
  const anteriorRef = referenciaAnterior(referenciaAtual);
  const [anoAnt, mesAntStr] = anteriorRef.split('-');
  const mesAnterior = limitesDoMes(parseInt(anoAnt, 10), parseInt(mesAntStr, 10) - 1);

  const atual = await db.getAllAsync(
    `SELECT c.nome AS nome, COALESCE(SUM(m.valor), 0) AS total
     FROM movimentacoes m JOIN categorias c ON c.id = m.categoria_id
     WHERE m.usuario_id = ? AND m.tipo = 'saida' AND m.data BETWEEN ? AND ?
     GROUP BY c.nome`,
    [USUARIO_ID, mesAtual.inicio, mesAtual.fim]
  );
  const anterior = await db.getAllAsync(
    `SELECT c.nome AS nome, COALESCE(SUM(m.valor), 0) AS total
     FROM movimentacoes m JOIN categorias c ON c.id = m.categoria_id
     WHERE m.usuario_id = ? AND m.tipo = 'saida' AND m.data BETWEEN ? AND ?
     GROUP BY c.nome`,
    [USUARIO_ID, mesAnterior.inicio, mesAnterior.fim]
  );

  const mapaAtual = Object.fromEntries(atual.map((l) => [l.nome, l.total]));
  const mapaAnterior = Object.fromEntries(anterior.map((l) => [l.nome, l.total]));
  const nomes = new Set([...Object.keys(mapaAtual), ...Object.keys(mapaAnterior)]);

  const comparacao = [...nomes].map((nome) => ({
    nome,
    atual: mapaAtual[nome] || 0,
    anterior: mapaAnterior[nome] || 0,
  }));

  comparacao.sort((a, b) => Math.abs(b.atual - b.anterior) - Math.abs(a.atual - a.anterior));
  return comparacao.slice(0, 5);
}

export async function getSugestoesEconomia(ano, mes) {
  const comparacao = await getComparacaoCategorias(ano, mes);
  const sugestoes = [];

  for (const c of comparacao) {
    if (c.anterior > 0 && c.atual > c.anterior) {
      const economia = c.atual - c.anterior;
      sugestoes.push(
        `Se reduzir ${c.nome.toLowerCase()} para a média do mês passado, você economiza aproximadamente ${economia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} este mês.`
      );
    }
    if (c.anterior > 0 && c.atual >= c.anterior * 2) {
      sugestoes.push(`${c.nome} mais que dobrou em relação ao mês passado — vale revisar antes de fechar o mês.`);
    }
  }

  return sugestoes.slice(0, 3);
}

// ---- Editar/excluir movimentações e contas recorrentes ----

export async function getMovimentacoesPorTipo(tipo, mesReferencia) {
  const db = await getDb();
  const referencia = mesReferencia || referenciaMesAtual();
  const [anoRef, mesRef] = referencia.split('-').map(Number);
  const { inicio, fim } = limitesDoMes(anoRef, mesRef - 1);
  const linhas = await db.getAllAsync(
    `SELECT m.id, m.valor, m.data, c.nome AS categoriaNome
     FROM movimentacoes m LEFT JOIN categorias c ON c.id = m.categoria_id
     WHERE m.usuario_id = ? AND m.tipo = ? AND m.data BETWEEN ? AND ?
     ORDER BY m.data DESC`,
    [USUARIO_ID, tipo, inicio, fim]
  );
  return linhas.map((l) => ({
    id: l.id,
    nome: l.categoriaNome || 'Outros',
    valor: l.valor,
    data: l.data,
  }));
}

export async function atualizarMovimentacao(id, { valor, data, categoriaNome, tipo }) {
  const db = await getDb();
  let categoria = await db.getFirstAsync(
    'SELECT id FROM categorias WHERE usuario_id = ? AND nome = ? AND tipo = ?',
    [USUARIO_ID, categoriaNome, tipo]
  );
  let categoriaId;
  if (categoria) {
    categoriaId = categoria.id;
  } else {
    categoriaId = gerarIdLocal();
    await db.runAsync(
      'INSERT INTO categorias (id, usuario_id, nome, tipo, padrao) VALUES (?, ?, ?, ?, 0)',
      [categoriaId, USUARIO_ID, categoriaNome, tipo]
    );
  }
  await db.runAsync(
    'UPDATE movimentacoes SET categoria_id = ?, valor = ?, data = ? WHERE id = ?',
    [categoriaId, valor, data, id]
  );
}

export async function excluirMovimentacao(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM movimentacoes WHERE id = ?', [id]);
}

export async function alternarMovimentacaoPaga(id, estaPaga) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE movimentacoes SET paga_referencia = ? WHERE id = ?',
    [estaPaga ? null : referenciaMesAtual(), id]
  );
}

export async function getContasRecorrentesEditaveis(mesReferencia) {
  const db = await getDb();
  const referencia = mesReferencia || referenciaMesAtual();
  const linhas = await db.getAllAsync(
    `SELECT cr.id, cr.nome, cr.valor, cr.dia_vencimento, cr.tipo, cr.quantidade_parcelas, cr.mes_inicio, c.nome AS categoriaNome
     FROM contas_recorrentes cr LEFT JOIN categorias c ON c.id = cr.categoria_id
     WHERE cr.usuario_id = ? AND cr.status = 'ativa' ORDER BY cr.dia_vencimento ASC`,
    [USUARIO_ID]
  );
  const pagasIds = await idsContasPagasNoMes(db, referencia);
  return linhas
    .filter((l) => contaVisivelNoMes(l, referencia))
    .map((l) => ({
      id: l.id,
      nome: l.nome,
      valor: l.valor,
      diaVencimento: l.dia_vencimento,
      tipo: l.tipo,
      quantidadeParcelas: l.quantidade_parcelas,
      categoriaNome: l.categoriaNome,
      estaPaga: pagasIds.has(l.id),
    }));
}

export async function atualizarContaRecorrente(id, { nome, valor, diaVencimento, quantidadeParcelas = null, categoriaNome = null }) {
  const db = await getDb();

  if (categoriaNome) {
    let categoria = await db.getFirstAsync(
      'SELECT id FROM categorias WHERE usuario_id = ? AND nome = ? AND tipo = ?',
      [USUARIO_ID, categoriaNome, 'saida']
    );
    let categoriaId;
    if (categoria) {
      categoriaId = categoria.id;
    } else {
      categoriaId = gerarIdLocal();
      await db.runAsync(
        'INSERT INTO categorias (id, usuario_id, nome, tipo, padrao) VALUES (?, ?, ?, ?, 0)',
        [categoriaId, USUARIO_ID, categoriaNome, 'saida']
      );
    }
    await db.runAsync(
      'UPDATE contas_recorrentes SET nome = ?, valor = ?, dia_vencimento = ?, quantidade_parcelas = ?, categoria_id = ? WHERE id = ?',
      [nome, valor, diaVencimento, quantidadeParcelas, categoriaId, id]
    );
  } else {
    await db.runAsync(
      'UPDATE contas_recorrentes SET nome = ?, valor = ?, dia_vencimento = ?, quantidade_parcelas = ? WHERE id = ?',
      [nome, valor, diaVencimento, quantidadeParcelas, id]
    );
  }
}

export async function excluirContaRecorrente(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM contas_recorrentes WHERE id = ?', [id]);
}

// ---- Gerenciar categorias ----

export async function getCategorias() {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT id, nome, tipo, padrao, icone, cor FROM categorias WHERE usuario_id = ?
     ORDER BY padrao DESC, CASE WHEN nome = 'Outros' THEN 1 ELSE 0 END ASC, nome ASC`,
    [USUARIO_ID]
  );
}

export async function renomearCategoria(categoriaId, novoNome) {
  const db = await getDb();
  await db.runAsync('UPDATE categorias SET nome = ? WHERE id = ?', [novoNome, categoriaId]);
}

export async function atualizarIconeCorCategoria(categoriaId, { icone, cor }) {
  const db = await getDb();
  await db.runAsync('UPDATE categorias SET icone = ?, cor = ? WHERE id = ?', [icone, cor, categoriaId]);
}

// Todas as categorias com ícone/cor, indexadas por nome+tipo — usado pra
// telas que só têm o nome da categoria (ex: contas recorrentes) acharem o
// ícone certo sem precisar de outra query.
export async function getMapaCategorias() {
  const categorias = await getCategorias();
  const mapa = {};
  for (const c of categorias) {
    mapa[`${c.tipo}:${c.nome}`] = { icone: c.icone, cor: c.cor };
  }
  return mapa;
}

export async function getContasVinculadasACategoria(categoriaId) {
  const db = await getDb();
  return db.getAllAsync(
    'SELECT id, nome FROM contas_recorrentes WHERE categoria_id = ? AND status = ?',
    [categoriaId, 'ativa']
  );
}

export async function reatribuirContasRecorrentes(categoriaAntigaId, categoriaNovaId) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE contas_recorrentes SET categoria_id = ? WHERE categoria_id = ?',
    [categoriaNovaId, categoriaAntigaId]
  );
}

export async function excluirCategoria(categoriaId) {
  const db = await getDb();
  const categoria = await db.getFirstAsync('SELECT * FROM categorias WHERE id = ?', [categoriaId]);
  if (!categoria) return;
  if (categoria.padrao) {
    throw new Error('Categorias padrão não podem ser excluídas.');
  }

  let outros = await db.getFirstAsync(
    'SELECT id FROM categorias WHERE usuario_id = ? AND nome = ? AND tipo = ?',
    [USUARIO_ID, 'Outros', categoria.tipo]
  );
  let outrosId;
  if (outros) {
    outrosId = outros.id;
  } else {
    outrosId = gerarIdLocal();
    await db.runAsync(
      'INSERT INTO categorias (id, usuario_id, nome, tipo, padrao) VALUES (?, ?, ?, ?, 1)',
      [outrosId, USUARIO_ID, 'Outros', categoria.tipo]
    );
  }

  await db.runAsync('UPDATE movimentacoes SET categoria_id = ? WHERE categoria_id = ?', [outrosId, categoriaId]);
  await db.runAsync('DELETE FROM categorias WHERE id = ?', [categoriaId]);
}

// Lista simples de contas recorrentes ativas (visíveis no mês atual), usada
// para agendar os lembretes de vencimento — sem status de paga, só o
// essencial pra notificação.
export async function getContasParaLembretes() {
  const db = await getDb();
  const referencia = referenciaMesAtual();
  const linhas = await db.getAllAsync(
    `SELECT id, nome, valor, dia_vencimento, tipo, quantidade_parcelas, mes_inicio FROM contas_recorrentes
     WHERE usuario_id = ? AND status = 'ativa'`,
    [USUARIO_ID]
  );
  return linhas
    .filter((l) => contaVisivelNoMes(l, referencia))
    .map((l) => ({ id: l.id, nome: l.nome, valor: l.valor, diaVencimento: l.dia_vencimento }));
}

export async function excluirCartao(id) {
  const db = await getDb();
  // Não apaga o histórico — as parcelas, assinaturas e gastos que estavam
  // vinculados a esse cartão continuam existindo, só perdem o vínculo.
  await db.runAsync('UPDATE contas_recorrentes SET cartao_id = NULL WHERE cartao_id = ?', [id]);
  await db.runAsync('UPDATE movimentacoes SET cartao_id = NULL WHERE cartao_id = ?', [id]);
  await db.runAsync('DELETE FROM cartoes WHERE id = ?', [id]);
}

// ---- Configurações ----

export async function getNotificacoesAtivas() {
  const db = await getDb();
  const usuario = await db.getFirstAsync('SELECT notificacoes_ativas FROM usuarios WHERE id = ?', [USUARIO_ID]);
  return usuario ? !!usuario.notificacoes_ativas : true;
}

export async function definirNotificacoesAtivas(ativo) {
  const db = await getDb();
  await db.runAsync('UPDATE usuarios SET notificacoes_ativas = ? WHERE id = ?', [ativo ? 1 : 0, USUARIO_ID]);
}

// Junta os dados principais do usuário num único objeto, pra exportar como
// backup. Não inclui IDs internos irrelevantes pro usuário, só o essencial.
export async function getExportCompleto() {
  const db = await getDb();
  const [categorias, movimentacoes, contasRecorrentes, cartoes, metas] = await Promise.all([
    db.getAllAsync('SELECT nome, tipo, padrao FROM categorias WHERE usuario_id = ?', [USUARIO_ID]),
    db.getAllAsync('SELECT tipo, valor, data, forma_pagamento FROM movimentacoes WHERE usuario_id = ?', [USUARIO_ID]),
    db.getAllAsync('SELECT tipo, nome, valor, dia_vencimento, quantidade_parcelas, mes_inicio, status FROM contas_recorrentes WHERE usuario_id = ?', [USUARIO_ID]),
    db.getAllAsync('SELECT apelido, bandeira, ultimos_digitos, limite, dia_vencimento, dia_fechamento FROM cartoes WHERE usuario_id = ?', [USUARIO_ID]),
    db.getAllAsync('SELECT nome, icone, valor_objetivo, valor_guardado, aporte_mensal FROM metas WHERE usuario_id = ?', [USUARIO_ID]),
  ]);
  return {
    exportadoEm: new Date().toISOString(),
    categorias,
    movimentacoes,
    contasRecorrentes,
    cartoes,
    metas,
  };
}

// ---- Onboarding ----

export async function getOnboardingVisto() {
  const db = await getDb();
  const usuario = await db.getFirstAsync('SELECT onboarding_visto FROM usuarios WHERE id = ?', [USUARIO_ID]);
  return !!(usuario && usuario.onboarding_visto);
}

export async function marcarOnboardingVisto() {
  const db = await getDb();
  await db.runAsync('UPDATE usuarios SET onboarding_visto = 1 WHERE id = ?', [USUARIO_ID]);
}

// Usado só pra testar o onboarding de novo (segurar a marca "cash" na Home).
export async function resetarOnboarding() {
  const db = await getDb();
  await db.runAsync('UPDATE usuarios SET onboarding_visto = 0 WHERE id = ?', [USUARIO_ID]);
}

// ---- Metas ----

export async function getMetas() {
  const db = await getDb();
  const linhas = await db.getAllAsync(
    'SELECT rowid AS ordem, id, nome, icone, valor_objetivo, valor_guardado, aporte_mensal FROM metas WHERE usuario_id = ? ORDER BY ordem ASC',
    [USUARIO_ID]
  );
  return linhas.map((l) => ({
    id: l.id,
    nome: l.nome,
    icone: l.icone,
    valorObjetivo: l.valor_objetivo,
    valorGuardado: l.valor_guardado,
    aporteMensal: l.aporte_mensal,
  }));
}

export async function salvarMeta({ nome, icone, valorObjetivo, valorGuardado = 0, aporteMensal }) {
  const db = await getDb();
  const id = gerarIdLocal();
  await db.runAsync(
    'INSERT INTO metas (id, usuario_id, nome, icone, valor_objetivo, valor_guardado, aporte_mensal) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, USUARIO_ID, nome, icone, valorObjetivo, valorGuardado, aporteMensal]
  );
}

export async function atualizarMeta(id, { nome, valorObjetivo, aporteMensal }) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE metas SET nome = ?, valor_objetivo = ?, aporte_mensal = ? WHERE id = ?',
    [nome, valorObjetivo, aporteMensal, id]
  );
}

export async function adicionarAporteMeta(id, valor) {
  const db = await getDb();
  await db.runAsync('UPDATE metas SET valor_guardado = valor_guardado + ? WHERE id = ?', [valor, id]);
}

export async function atualizarValoresMeta(id, { valorGuardado, valorObjetivo }) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE metas SET valor_guardado = ?, valor_objetivo = ? WHERE id = ?',
    [valorGuardado, valorObjetivo, id]
  );
}

export async function excluirMeta(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM metas WHERE id = ?', [id]);
}
export async function salvarContaRecorrente({ tipo, nome, valor, diaVencimento, categoriaNome, cartaoId = null, quantidadeParcelas = null, mesInicio = null }) {
  const db = await getDb();

  let categoria = await db.getFirstAsync(
    'SELECT id FROM categorias WHERE usuario_id = ? AND nome = ? AND tipo = ?',
    [USUARIO_ID, categoriaNome, 'saida']
  );
  let categoriaId;
  if (categoria) {
    categoriaId = categoria.id;
  } else {
    categoriaId = gerarIdLocal();
    await db.runAsync(
      'INSERT INTO categorias (id, usuario_id, nome, tipo, padrao) VALUES (?, ?, ?, ?, 0)',
      [categoriaId, USUARIO_ID, categoriaNome, 'saida']
    );
  }

  const id = gerarIdLocal();
  await db.runAsync(
    'INSERT INTO contas_recorrentes (id, usuario_id, categoria_id, tipo, nome, valor, dia_vencimento, status, cartao_id, quantidade_parcelas, mes_inicio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, USUARIO_ID, categoriaId, tipo, nome, valor, diaVencimento, 'ativa', cartaoId, tipo === 'parcela' ? quantidadeParcelas : null, mesInicio || new Date().toISOString()]
  );
}

// Insere uma nova movimentação no banco.
export async function salvarMovimentacao({ tipo, valor, categoriaNome, data, formaPagamento, cartaoId = null }) {
  const db = await getDb();

  let categoria = await db.getFirstAsync(
    'SELECT id FROM categorias WHERE usuario_id = ? AND nome = ? AND tipo = ?',
    [USUARIO_ID, categoriaNome, tipo]
  );
  let categoriaId;
  if (categoria) {
    categoriaId = categoria.id;
  } else {
    categoriaId = gerarIdLocal();
    await db.runAsync(
      'INSERT INTO categorias (id, usuario_id, nome, tipo, padrao) VALUES (?, ?, ?, ?, 0)',
      [categoriaId, USUARIO_ID, categoriaNome, tipo]
    );
  }

  const id = gerarIdLocal();
  await db.runAsync(
    'INSERT INTO movimentacoes (id, usuario_id, categoria_id, tipo, valor, data, forma_pagamento, origem, cartao_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, USUARIO_ID, categoriaId, tipo, valor, data, formaPagamento, 'avulsa', cartaoId]
  );
}