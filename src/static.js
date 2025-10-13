import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { getMimeType } from './utils/mime.js';

// Needed for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve files from ./public
const publicDir = path.join(__dirname, '../public');

const compressibleTypes = [
  'text/', 'application/json', 'application/javascript', 'application/xml', 'image/svg+xml'
];

function shouldCompress(type) {
  return compressibleTypes.some(t => type.startsWith(t));
}

export function serveStatic(requestPath, socket, headers = {}) {
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
    const acceptEncoding = headers['accept-encoding'] || '';

    if (shouldCompress(mimeType) && acceptEncoding.includes('gzip')) {
      zlib.gzip(data, (err, gzipped) => {
        if (err) {
          const body = '<h1>500 Internal Server Error</h1>';
          const response =
            `HTTP/1.1 500 Internal Server Error\r\n` +
            `Content-Type: text/html\r\n` +
            `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n` +
            body;
          socket.write(response);
          socket.end();
          return;
        }
        const response =
          `HTTP/1.1 200 OK\r\n` +
          `Content-Encoding: gzip\r\n` +
          `Vary: Accept-Encoding\r\n` +
          `Content-Type: ${mimeType}\r\n` +
          `Content-Length: ${gzipped.length}\r\n\r\n`;
        socket.write(response);
        socket.write(gzipped);
        socket.end();
      });
    } else {
      const response =
        `HTTP/1.1 200 OK\r\n` +
        `Content-Type: ${mimeType}\r\n` +
        `Content-Length: ${data.length}\r\n\r\n`;
      socket.write(response);
      socket.write(data);
      socket.end();
    }
  });
}