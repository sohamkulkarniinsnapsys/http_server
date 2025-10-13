import { serveStatic } from './static.js';
import { createSession } from './utils/sessions.js';

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, decodeURIComponent(v.join('='))];
    }).filter(([k]) => k)
  );
}

const sessions = new Map();

export function handleRoute(method, url, socket, headers = {}, body = '') {
  const path = url.pathname;

  if (method === 'OPTIONS') {
  const origin = headers['origin'] || '*';
  const reqMethod = headers['access-control-request-method'] || '';
  const reqHeaders = headers['access-control-request-headers'] || '';

  const response =
    `HTTP/1.1 204 No Content\r\n` +
    `Access-Control-Allow-Origin: ${origin}\r\n` +
    `Access-Control-Allow-Methods: ${reqMethod}\r\n` +
    `Access-Control-Allow-Headers: ${reqHeaders}\r\n` +
    `Access-Control-Max-Age: 600\r\n` +
    `Vary: Origin\r\n` +
    `Content-Length: 0\r\n` +
    `Connection: close\r\n\r\n`;
  socket.write(response);
  socket.end();
  return;
}

  if (method === 'POST' && path === '/login') {
  let user;
  try {
    user = JSON.parse(body).user;
  } catch {
    const response =
      `HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`;
    socket.write(response);
    socket.end();
    return;
  }
  if (!user) {
    const response =
      `HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`;
    socket.write(response);
    socket.end();
    return;
  }

  const sidSigned = createSession({ user });
  const cookie = `sid=${sidSigned}; HttpOnly; Path=/; SameSite=Lax`;
  const responseBody = JSON.stringify({ user });
  const response =
    `HTTP/1.1 200 OK\r\n` +
    `Set-Cookie: ${cookie}\r\n` +
    `Content-Type: application/json; charset=utf-8\r\n` +
    `Content-Length: ${Buffer.byteLength(responseBody)}\r\n` +
    `Connection: close\r\n\r\n` +
    responseBody;
  socket.write(response);
  socket.end();
  return;
}

  if (method === 'GET' && path === '/set-cookie') {
    const cookie = 'session=abc123; Path=/; HttpOnly; SameSite=Lax';
    const response =
      `HTTP/1.1 200 OK\r\n` +
      `Set-Cookie: ${cookie}\r\n` +
      `Content-Length: 2\r\n` +
      `Connection: close\r\n\r\n` +
      `ok`;
    socket.write(response);
    socket.end();
    return;
  }

  if (method === 'GET' && path === '/me') {
    const cookies = parseCookies(headers['cookie'] || '');
    const sid = cookies.session;
    if (!sid) {
      const response =
        `HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`;
      socket.write(response);
      socket.end();
      return;
    }
    // Session logic
    let session = sessions.get(sid);
    if (!session) {
      session = { id: sid, visits: 1 };
    } else {
      session.visits += 1;
    }
    sessions.set(sid, session);

    const body = JSON.stringify({ session });
    const response =
      `HTTP/1.1 200 OK\r\n` +
      `Content-Type: application/json; charset=utf-8\r\n` +
      `Content-Length: ${Buffer.byteLength(body)}\r\n` +
      `Connection: close\r\n\r\n` +
      body;
    socket.write(response);
    socket.end();
    return;
  }

  // ---- Health check ----
  if (path === '/health') {
    if (method === 'GET') {
      const body = 'ok';
      const response =
        `HTTP/1.1 200 OK\r\n` +
        `Content-Type: text/plain; charset=utf-8\r\n` +
        `Content-Length: ${Buffer.byteLength(body)}\r\n` +
        `Connection: close\r\n\r\n` +
        body;
      socket.write(response);
    } else {
      const response =
        `HTTP/1.1 405 Method Not Allowed\r\n` +
        `Allow: GET\r\n` +
        `Content-Length: 0\r\n` +
        `Connection: close\r\n\r\n`;
      socket.write(response);
    }
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
  // console.log(`path: ${path}`);
  // console.log(`method: ${method}`);
  // ---- Root or static ----
  if (method === 'GET' && path === '/index.html') {
    serveStatic('/index.html', socket, headers);
    return;
  }
  if (method === 'GET' && path === '/image.png') {
  serveStatic('/image.png', socket, headers);
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