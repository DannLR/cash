import React, { createContext, useContext, useState, useMemo } from 'react';

const ThemeContext = createContext();

const CORES_CLARO = {
  fundo: '#F0EDF2',
  card: '#FFFFFF',
  texto: '#1C1C1E',
  textoSecundario: '#88838F',
  borda: '#E7E2EB',
  primario: '#8665B5',
  fundoIcone: '#F1EBF8',
};

const CORES_ESCURO = {
  fundo: '#1D1A22',
  card: '#2A2630',
  texto: '#FFFFFF',
  textoSecundario: '#B0AAB8',
  borda: '#3A3443',
  primario: '#B59ADE',
  fundoIcone: '#393044',
};

export function ThemeProvider({ children }) {
  const [modoEscuro, setModoEscuro] = useState(false);

  function alternarTema() {
    setModoEscuro((atual) => !atual);
  }

  // Sem o useMemo, esse objeto (e o value do Provider) eram recriados em
  // TODO render do ThemeProvider, fazendo cada componente que usa o tema
  // em qualquer tela do app re-renderizar sempre que qualquer coisa mudava
  // — não só quando o tema de fato mudava. Isso deixava a troca de tema
  // pesada, já que o app tem muitas telas.
  const cores = useMemo(() => (modoEscuro ? CORES_ESCURO : CORES_CLARO), [modoEscuro]);
  const value = useMemo(() => ({ modoEscuro, alternarTema, cores }), [modoEscuro, cores]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTema() {
  return useContext(ThemeContext);
}
