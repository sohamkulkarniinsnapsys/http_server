export class Response {
  constructor(socket) {
    this.socket = socket;
    this.statusCode = 200;
    this.headers = { 'Connection': 'keep-alive' };
    this.body = '';
  }

  setHeader(name, value) {
    this.headers[name.toLowerCase()] = value;
  }

  json(obj) {
    const str = JSON.stringify(obj);
    this.setHeader('Content-Type', 'application/json; charset=utf-8');
    this.setHeader('Content-Length', Buffer.byteLength(str));
    this.end(str);
  }

  end(body = '') {
    this.body = body;
    let headers = `HTTP/1.1 ${this.statusCode} OK\r\n`;
    for (const [k, v] of Object.entries(this.headers)) {
      headers += `${k}: ${v}\r\n`;
    }
    this.socket.write(headers + '\r\n' + body);
  }
}
