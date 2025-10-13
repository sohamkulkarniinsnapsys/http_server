import crypto from 'crypto';

const sessions = new Map();
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret';

function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
}

export function createSession(data) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, data);
  const signature = sign(sid);
  return `${sid}.${signature}`;
}

export function getSession(sidSigned) {
  if (!sidSigned) return null;
  const [sid, signature] = sidSigned.split('.');
  if (!sid || !signature) return null;
  // Constant-time compare
  const expected = sign(sid);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  return sessions.get(sid) || null;
}

export function destroySession(sidSigned) {
  const [sid] = sidSigned.split('.');
  sessions.delete(sid);
}