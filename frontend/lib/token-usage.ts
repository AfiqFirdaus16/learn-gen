export const MONTHLY_TOKEN_LIMIT = 10_000;

interface TokenUsageRecord {
  month: string;
  used: number;
}

const STORAGE_KEY = 'learn-gen-token-usage';

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

export function getTokenUsage(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const record = raw ? (JSON.parse(raw) as TokenUsageRecord) : null;
    return record?.month === currentMonth() ? record.used : 0;
  } catch {
    return 0;
  }
}

export function recordTokenUsage(tokens: number): number {
  const used = getTokenUsage() + Math.max(0, Math.round(tokens));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ month: currentMonth(), used }));
  return used;
}

export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.trim().length / 4));
}
