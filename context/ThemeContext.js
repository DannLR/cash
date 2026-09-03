import React, { createContext, useContext, useState, useMemo } from 'react';

const ThemeContext = createContext();

const CORES_CLARO = {
  fundo: '#F2F2F7',
  card: '#FFFFFF',
  texto: '#1C1C1E',
  textoSecundario: '#8A8A8E',
  borda: '#E5E5EA',
  primario: '#0F766E',
  fundoIcone: '#E6F4F3',
};

const CORES_ESCURO = {
  fundo: '#1C1C1E',
  card: '#2C2C2E',
  texto: '#FFFFFF',
  textoSecundario: '#A1A1A6',
  borda: '#3A3A3C',
  primario: '#14B8A6',
  fundoIcone: '#263F3D',
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