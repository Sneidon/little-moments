import * as functions from 'firebase-functions';

export function json(res: functions.Response, status: number, body: unknown): void {
  res.status(status);
  res.set('Content-Type', 'application/json; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.send(JSON.stringify(body));
}

export function setCors(req: functions.Request, res: functions.Response): boolean {
  const origin = req.headers.origin || '*';
  res.set('Access-Control-Allow-Origin', origin);
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  return false;
}

export async function readJsonBody(req: functions.Request): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(String(c))));
    req.on('end', () => resolve());
    req.on('error', (e) => reject(e));
  });
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}
