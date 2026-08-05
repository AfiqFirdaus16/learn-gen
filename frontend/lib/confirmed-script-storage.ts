export interface ConfirmedScript {
  id: string;
  topic: string;
  content: string;
  personaName: string;
  status: 'Confirmed' | 'Submitted' | 'Failed';
  createdAt: string;
}

const STORAGE_KEY = 'learn-gen-confirmed-scripts';

function getScripts(): ConfirmedScript[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConfirmedScript[]) : [];
  } catch {
    return [];
  }
}

export function saveConfirmedScript(script: ConfirmedScript) {
  const scripts = [script, ...getScripts()];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
}

export function updateConfirmedScriptStatus(id: string, status: ConfirmedScript['status']) {
  const scripts = getScripts().map((script) => script.id === id ? { ...script, status } : script);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
}
