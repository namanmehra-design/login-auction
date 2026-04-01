import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIME = { '.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon' };

createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  const file = join(__dirname, url === '/' ? 'index.html' : url);
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'text/plain' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}).listen(8080, () => console.log('Serving on http://localhost:8080'));
