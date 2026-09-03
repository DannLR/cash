// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite usa wa-sqlite (WebAssembly) para funcionar na web.
// Sem isso, o metro não sabe empacotar arquivos .wasm como asset.
config.resolver.assetExts.push('wasm');

// Necessário para SharedArrayBuffer / persistência via OPFS do SQLite na web.
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    return middleware(req, res, next);
  };
};

module.exports = config;
