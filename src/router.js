import { serveStatic } from './static.js';

export function handleRoute(method, url, socket, headers = {}, body = '') {
  const path = url.pathname;

  // ---- Health check ----
  if (method === 'GET' && path === '/health') {
    const body = 'ok';
    const response =
      `HTTP/1.1 200 OK\r\n` +
      `Content-Type: text/plain; charset=utf-8\r\n` +
      `Content-Length: ${Buffer.byteLength(body)}\r\n` +
      `Connection: close\r\n\r\n` +
      body;
    socket.write(response);
    socket.end();
    return;
  }

  // ---- Echo GET (query) ----
  if (method === 'GET' && path === '/echo') {
    const msg = url.searchParams.get('msg') || '';
    const body = msg + '\n';
    const response =
      `HTTP/1.1 200 OK\r\n` +
      `Content-Type: text/plain; charset=utf-8\r\n` +
      `Content-Length: ${Buffer.byteLength(body)}\r\n` +
      `Connection: close\r\n\r\n` +
      body;
    socket.write(response);
    socket.end();
    return;
  }

  // ---- Echo POST (JSON) ----
  if (method === 'POST' && path === '/api/echo') {
    const contentType = headers['content-type'] || '';
    if (!contentType.startsWith('application/json')) {
      const error = {
        error: 'Unsupported Media Type: application/json required',
      };
      const body = JSON.stringify(error);
      const response =
        `HTTP/1.1 415 Unsupported Media Type\r\n` +
        `Content-Type: application/json; charset=utf-8\r\n` +
        `Content-Length: ${Buffer.byteLength(body)}\r\n` +
        `Connection: close\r\n\r\n` +
        body;
      socket.write(response);
      socket.end();
      return;
    }

    try {
      const json = JSON.parse(body);
      const responseBody = JSON.stringify(json);
      const response =
        `HTTP/1.1 200 OK\r\n` +
        `Content-Type: application/json; charset=utf-8\r\n` +
        `Content-Length: ${Buffer.byteLength(responseBody)}\r\n` +
        `Connection: close\r\n\r\n` +
        responseBody;
      socket.write(response);
      socket.end();
    } catch {
      const error = { error: 'Invalid JSON' };
      const body = JSON.stringify(error);
      const response =
        `HTTP/1.1 400 Bad Request\r\n` +
        `Content-Type: application/json; charset=utf-8\r\n` +
        `Content-Length: ${Buffer.byteLength(body)}\r\n` +
        `Connection: close\r\n\r\n` +
        body;
      socket.write(response);
      socket.end();
    }
    return;
  }

  // ---- Root or static ----
  // ---- Root or static ----
if (method === 'GET' && path === '/') {
  serveStatic('/index.html', socket);
  return;
}

// ---- Default: 404 ----
const response =
  `HTTP/1.1 404 Not Found\r\n` +
  `Content-Length: 0\r\n` +
  `Connection: close\r\n\r\n`;
socket.write(response);
socket.end();
}