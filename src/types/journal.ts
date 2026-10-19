export interface JournalImage {
  id: string;
  dataUrl: string;
  caption?: string;
  createdAt: string;
  width?: number;
  height?: number;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title?: string;
  content: string;
  images: JournalImage[];
  tags: string[];
  mood?: string;
  date: string; // Format: YYYY-MM-DD
  pinned?: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export type SyncStatus = 'synced' | 'saving' | 'offline' | 'local' | 'error';

export type JournalViewMode = 'editorial' | 'focus' | 'timeline' | 'gallery';
