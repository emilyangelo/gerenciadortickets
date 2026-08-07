const http = require('http');
const { ensureDataDirectory } = require('./src/db');
const { handleRouter } = require('./src/router');

const PORT = process.env.PORT || 3000;

// Garantir inicialização dos diretórios e arquivos de banco JSON
ensureDataDirectory();

const server = http.createServer((req, res) => {
  handleRouter(req, res);
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  BluePoint — Sistema de Gerenciamento de Chamados`);
  console.log(`  Servidor rodando em: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
