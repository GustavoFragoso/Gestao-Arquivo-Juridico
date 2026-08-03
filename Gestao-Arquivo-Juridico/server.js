/**
 * ============================================================================
 * SISTEMA DE GESTÃO DE ARQUIVO JURÍDICO & DIGITALIZAÇÃO CONTÍNUA
 * Servidor Backend Node.js de Alta Performance
 * ============================================================================
 * 
 * Este servidor Node.js fornece:
 * 1. Servidor de arquivos estáticos (HTML5, CSS3, JS).
 * 2. API RESTful para acionamento remoto do scanner via scripts PowerShell (WIA 300 DPI).
 * 3. Gerenciamento seguro do fluxo de arquivos temporários e limpeza automática de memória.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const crypto = require('crypto');

// Diretório raiz da aplicação
const root = __dirname;

// Pasta para armazenamento temporário das digitalizações de imagem
const scanFolder = path.join(root, '.digitalizacoes-temporarias');

// Tabela de tipos MIME suportados para entrega de assets estáticos
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf'
};

// Garante que a pasta temporária de digitalização existe
fs.mkdirSync(scanFolder, { recursive: true });

/**
 * Servidor HTTP Principal
 */
const server = http.createServer((req, res) => {
  
  // --------------------------------------------------------------------------
  // ENDPOINT 1: POST /api/digitalizar
  // Aciona o scanner de documentos corporativo utilizando PowerShell e WIA COM API
  // --------------------------------------------------------------------------
  if (req.method === 'POST' && req.url === '/api/digitalizar') {
    const id = `${crypto.randomUUID()}.jpg`;
    const outputPath = path.join(scanFolder, id);
    const psScriptPath = path.join(root, 'digitalizar-scanner.ps1');

    // Executa o script PowerShell em thread separada de forma assíncrona
    return execFile(
      'powershell.exe',
      ['-STA', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `& "${psScriptPath}" -OutputPath "${outputPath}"`],
      { windowsHide: true },
      (error, stdout) => {
        if (error || !fs.existsSync(outputPath)) {
          const wasCancelled = stdout && stdout.includes('CANCELADO');
          res.writeHead(wasCancelled ? 409 : 500, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({
            error: wasCancelled 
              ? 'Digitalização cancelada pelo usuário.' 
              : 'Não foi possível se comunicar com o scanner. Verifique se o scanner está ligado e configurado no Windows.'
          }));
        }

        // Sucesso na captura do documento
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ arquivo: `/api/digitalizacoes/${id}` }));
      }
    );
  }

  // --------------------------------------------------------------------------
  // ENDPOINT 2: GET /api/digitalizacoes/:id
  // Serve a imagem capturada e executa a remoção automática do arquivo temporário
  // --------------------------------------------------------------------------
  if (req.method === 'GET' && req.url.startsWith('/api/digitalizacoes/')) {
    const id = path.basename(req.url);
    const scanFilePath = path.join(scanFolder, id);

    // Proteção contra Directory Traversal e verificação de existência
    if (!scanFilePath.startsWith(scanFolder) || !fs.existsSync(scanFilePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Arquivo temporário não encontrado.');
    }

    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    const stream = fs.createReadStream(scanFilePath);
    stream.pipe(res);

    // Limpeza automática de disco após a leitura concluída
    stream.on('close', () => {
      fs.unlink(scanFilePath, () => {});
    });
    return;
  }

  // --------------------------------------------------------------------------
  // SERVIDOR DE ASSETS ESTÁTICOS (HTML, CSS, JS, PDF libs)
  // --------------------------------------------------------------------------
  const requestedUrl = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
  const filePath = path.resolve(root, `.${requestedUrl}`);

  // Proteção de Segurança: Impede acesso a arquivos fora do diretório raiz
  if (!filePath.startsWith(root)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Acesso Negado.');
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Arquivo Não Encontrado.');
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    res.end(content);
  });
});

// Inicialização do servidor na porta 3000
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` Servidor de Arquivo Jurídico Rodando!`);
  console.log(` Acesse no seu navegador: http://localhost:${PORT}`);
  console.log(`===================================================`);
});
