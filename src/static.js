import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMimeType } from './utils/mime.js';

// Needed for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve files from ./public
const publicDir = path.join(__dirname, '../public');

export function serveStatic(requestPath, socket) {
  // Normalize and resolve to prevent directory traversal
  const filePath = path.normalize(path.join(publicDir, requestPath));

  if (!filePath.startsWith(publicDir)) {
    // Prevent access outside 'public'
    const body = '<h1>403 Forbidden</h1>';
    const response =
      `HTTP/1.1 403 Forbidden\r\n` +
      `Content-Type: text/html\r\n` +
      `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n` +
      body;
    socket.write(response);
    socket.end();
    return;
  }

  // Try to read the file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      const body = '<h1>404 Not Found</h1>';
      const response =
        `HTTP/1.1 404 Not Found\r\n` +
        `Content-Type: text/html\r\n` +
        `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n` +
        body;
      socket.write(response);
      socket.end();
      return;
    }

    const mimeType = getMimeType(path.extname(filePath));
    const response =
      `HTTP/1.1 200 OK\r\n` +
      `Content-Type: ${mimeType}\r\n` +
      `Content-Length: ${data.length}\r\n\r\n`;
    socket.write(response);
    socket.write(data);
    socket.end();
  });
}
