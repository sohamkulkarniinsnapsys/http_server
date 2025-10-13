import zlib from 'zlib';

const compressibleTypes = [
  'text/', 'application/json', 'application/javascript', 'application/xml'
];

export function shouldCompress(type) {
  return compressibleTypes.some(t => type.startsWith(t));
}

export function gzipResponse(res, body, contentType) {
  if (!shouldCompress(contentType)) return false;
  zlib.gzip(body, (err, gzipped) => {
    if (err) {
      res.writeHead(500);
      res.end();
      return;
    }
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
    res.end(gzipped);
  });
  return true;
}