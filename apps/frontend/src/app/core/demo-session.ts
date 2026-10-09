/** Pack / unpack of a shareable demo session (seed + knobs + rules). */

export interface DemoSessionPayload {
  v: 1;
  seed: number;
  sugar: number;
  bitter: number;
  looming: number;
  hunger: number;
  durationMs: number;
  shuffle: boolean;
  silence: string;
  policies?: Record<string, unknown>;
  parameters?: Record<string, number>;
  adaptersVersion?: string;
  label?: string;
}

export function encodeDemoSession(payload: DemoSessionPayload): string {
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeDemoSession(token: string): DemoSessionPayload | null {
  try {
    let b64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = decodeURIComponent(escape(atob(b64)));
    const data = JSON.parse(json) as DemoSessionPayload;
    if (data?.v !== 1 || typeof data.seed !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function buildDemoUrl(payload: DemoSessionPayload): string {
  const token = encodeDemoSession(payload);
  const url = new URL(window.location.href);
  url.pathname = '/lab';
  url.search = '';
  url.hash = `demo=${token}`;
  return url.toString();
}
