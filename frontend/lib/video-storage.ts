export interface VideoItem {
  id: string;
  learnerName: string;
  topic: string;
  learningStyle: string;
  persona: string;
  personaId?: string;
  duration: number;
  accentType: string;
  avatarId?: string;
  generatedPrompt: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  createdAt: string;
  failureReason?: string;
  heygenVideoId?: string;
}

const STORAGE_KEY = 'learn-gen-videos';

export function getStoredVideos(): VideoItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as VideoItem[]) : [];
  } catch {
    return [];
  }
}

export function saveVideo(video: VideoItem): VideoItem[] {
  const existing = getStoredVideos();
  const next = [video, ...existing];

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return next;
}

export function clearStoredVideos() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
