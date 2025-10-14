import net from 'net';
import { handleRoute } from './router.js';
import express from 'express';

function parseHttpRequest(raw) {
  const request = raw.toString();
  const [headerPart, bodyPart = ''] = request.split('\r\n\r\n');
  const headerLines = headerPart.split('\r\n');
  const [method, path, version] = headerLines[0].split(' ');

  const headers = {};
  for (let i = 1; i < headerLines.length; i++) {
    const [key, value] = headerLines[i].split(':');
    if (key && value) headers[key.trim().toLowerCase()] = value.trim();
  }

  return { method, path, version, headers, body: bodyPart };
}

const server = net.createServer((socket) => {
  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  while (true) {
    const reqText = buffer.toString();
    const headerEnd = reqText.indexOf('\r\n\r\n');
    if (headerEnd === -1) break; // wait for more data

    const headerPart = reqText.slice(0, headerEnd);
    const headerLines = headerPart.split('\r\n');
    const firstLine = headerLines[0];
    const [method, path] = firstLine.split(' ');
    const headers = {};
    for (let i = 1; i < headerLines.length; i++) {
      const [k, v] = headerLines[i].split(':');
      if (k && v) headers[k.trim().toLowerCase()] = v.trim();
    }

    const contentLength = parseInt(headers['content-length'] || '0', 10);
    const totalExpected = headerEnd + 4 + contentLength;
    if (buffer.length < totalExpected) break; // wait for full body

    const body = buffer.slice(headerEnd + 4, totalExpected).toString();
    const reqUrl = new URL(path, 'http://placeholder');

    handleRoute(method, reqUrl, socket, headers, body);

    // Remove processed request from buffer
    buffer = buffer.slice(totalExpected);

    if (buffer.length === 0) break;
  }
});
socket.on('error', (err) => {
  //console.log('Socket error:', err);
});
});



const app = express();

// Health check endpoint (GET only)
app.get('/health', (req, res) => {
  res.sendStatus(200);
});

// 405 handler for /health (for all other methods)
app.all('/health', (req, res, next) => {
  if (req.method !== 'GET') {
    res.set('Allow', 'GET');
    return res.sendStatus(405);
  }
  next();
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`HTTP-over-TCP server running on http://127.0.0.1:${PORT}`);
});