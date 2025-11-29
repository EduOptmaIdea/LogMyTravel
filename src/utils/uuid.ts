export function safeRandomUUID(): string {
  // Prefer native randomUUID when available
  // @ts-ignore
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    // @ts-ignore
    return (crypto as any).randomUUID();
  }
  // Fallback: UUID v4 via crypto.getRandomValues
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Set version (4) and variant (RFC 4122)
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return (
      hex.slice(0, 8) + '-' +
      hex.slice(8, 12) + '-' +
      hex.slice(12, 16) + '-' +
      hex.slice(16, 20) + '-' +
      hex.slice(20)
    );
  }
  // Last resort (non-cryptographic)
  const toHex = (n: number) => n.toString(16).padStart(8, '0');
  const now = Date.now();
  const rand = Math.random() * 0xffffffff;
  const base = toHex((now ^ rand) >>> 0) + toHex((now / 2 ^ rand) >>> 0);
  return (
    base.slice(0, 8) + '-' +
    base.slice(8, 12) + '-' +
    '4' + base.slice(13, 16) + '-' +
    '8' + base.slice(17, 20) + '-' +
    base.slice(20).padEnd(12, '0')
  );
}
