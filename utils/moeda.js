/** Converte valores digitados em pt-BR (ex.: "1.310,00") para número. */
export function parseValorMoeda(texto) {
  const valor = String(texto ?? '').trim().replace(/[^\d,.-]/g, '');
  if (!valor) return 0;

  let normalizado = valor;
  if (valor.includes(',')) {
    normalizado = valor.replace(/\./g, '').replace(',', '.');
  } else {
    const ultimoPonto = valor.lastIndexOf('.');
    const casasDecimais = ultimoPonto >= 0 ? valor.length - ultimoPonto - 1 : 0;
    if (casasDecimais === 1 || casasDecimais === 2) {
      normalizado = `${valor.slice(0, ultimoPonto).replace(/\./g, '')}.${valor.slice(ultimoPonto + 1)}`;
    } else {
      normalizado = valor.replace(/\./g, '');
    }
  }

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}
