export interface VideoItem {
  id: string;
  learnerName: string;
  topic: string;
  learningStyle: string;
  persona: string;
  personaId?: string;
  duration: number;
  accentType: string;
  script: string;
  generatedPrompt: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'PromptReady' | 'Failed';
  createdAt: string;
  failureReason?: string;
<<<<<<< HEAD
  elevenlabsVideoId?: string;
=======
>>>>>>> 4cdfa9567d4761c73d64dfd837a72c1d016dd8ca
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

export function updateStoredVideo(id: string, updates: Partial<VideoItem>): VideoItem[] {
  const next = getStoredVideos().map((video) => video.id === id ? { ...video, ...updates } : video);

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
