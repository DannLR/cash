import React, { createContext, useContext, useState } from 'react';

const MonthContext = createContext();

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function hoje() {
  const d = new Date();
  return { ano: d.getFullYear(), mes: d.getMonth() }; // mes: 0-11
}

// Todas as telas que precisam saber "qual mês estamos vendo" (Início,
// Planejamento, Insights, e o status de "pago" das contas recorrentes em
// qualquer tela) usam este contexto. Ele sempre nasce no mês/ano atual de
// verdade — não é salvo entre sessões, então reabrir o app sempre volta
// para o mês real, mesmo que você tenha navegado para outro mês antes.
export function MonthProvider({ children }) {
  const [{ ano, mes }, setEstado] = useState(hoje());

  function mesAnterior() {
    setEstado((atual) => {
      const novoMes = atual.mes === 0 ? 11 : atual.mes - 1;
      const novoAno = atual.mes === 0 ? atual.ano - 1 : atual.ano;
      return { ano: novoAno, mes: novoMes };
    });
  }

  function proximoMes() {
    setEstado((atual) => {
      const novoMes = atual.mes === 11 ? 0 : atual.mes + 1;
      const novoAno = atual.mes === 11 ? atual.ano + 1 : atual.ano;
      return { ano: novoAno, mes: novoMes };
    });
  }

  // Pula direto para um ano/mês específico — usado pela tela de
  // seleção de mês/ano.
  function irPara(ano, mes) {
    setEstado({ ano, mes });
  }

  // "YYYY-MM", usado como chave em contas_pagamentos e nas comparações de mês.
  const referencia = `${ano}-${String(mes + 1).padStart(2, '0')}`;
  const label = `${NOMES_MESES[mes]} ${ano}`;
  const ehMesAtual = ano === hoje().ano && mes === hoje().mes;

  return (
    <MonthContext.Provider value={{ ano, mes, referencia, label, ehMesAtual, mesAnterior, proximoMes, irPara }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMes() {
  return useContext(MonthContext);
}