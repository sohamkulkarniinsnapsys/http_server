export class Request {
  constructor({ method, path, headers, body }) {
    this.method = method;
    this.path = path;
    this.headers = headers;
    this.body = body;
    this.id = crypto.randomUUID();
  }
}
