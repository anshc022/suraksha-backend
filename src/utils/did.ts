import crypto from 'crypto';

export function generateDID(email: string) {
  return 'did:suraksha:' + crypto.createHash('sha256').update(email + ':' + Date.now()).digest('hex').slice(0,32);
}
