import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Platform } from 'react-native';

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

  useEffect(() => {
    if (Platform.OS !== 'web' || document.getElementById('cash-global-glass')) return;
    const style = document.createElement('style');
    style.id = 'cash-global-glass';
    style.textContent = [
      '[data-cash-glass="true"],[style*="rgba(255, 255, 255"],[style*="rgba(48, 43, 55"]{backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}',
    ].join('');
    document.head.appendChild(style);
  }, []);

  function alternarTema() {
    setModoEscuro((atual) => !atual);
  }

  // Sem o useMemo, esse objeto (e o value do Provider) eram recriados em
  // TODO render do ThemeProvider, fazendo cada componente que usa o tema
  // em qualquer tela do app re-renderizar sempre que qualquer coisa mudava
  // — não só quando o tema de fato mudava. Isso deixava a troca de tema
  // pesada, já que o app tem muitas telas.
  const cores = useMemo(() => {
    const paleta = modoEscuro ? CORES_ESCURO : CORES_CLARO;
    if (Platform.OS !== 'web') return paleta;

    return {
      ...paleta,
      fundo: modoEscuro ? '#1A1720' : '#E4DDEC',
      card: modoEscuro ? 'rgba(48, 43, 55, 0.52)' : 'rgba(255, 255, 255, 0.38)',
      borda: modoEscuro ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.62)',
    };
  }, [modoEscuro]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // O navegador deixa visível o fundo do documento atrás da barra inferior.
    // Mantém essa área na mesma cor da página quando o tema muda.
    document.documentElement.style.backgroundColor = cores.fundo;
    document.body.style.backgroundColor = cores.fundo;
  }, [cores.fundo]);

  const value = useMemo(() => ({ modoEscuro, alternarTema, cores }), [modoEscuro, cores]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTema() {
  return useContext(ThemeContext);
}
