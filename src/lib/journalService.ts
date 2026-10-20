import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { JournalEntry } from '../types/journal';

const LOCAL_STORAGE_KEY = 'tinta_journal_entries_v1';
const GUEST_USER_ID = 'guest_user';

export const INITIAL_SAMPLE_ENTRY: JournalEntry = {
  id: 'intro_bienvenida',
  userId: GUEST_USER_ID,
  title: 'El placer de la hoja en blanco',
  content: `Hoy decidí comenzar este diario. Hay algo profundamente sereno en el blanco y negro; elimina todo el ruido innecesario y te obliga a estar presente únicamente con tus palabras.

Aquí puedes volcar cualquier pensamiento: reflexiones del día, citas memorables, planes o pequeñas observaciones cotidianas. 

Puedes arrastrar fotografías, pegarlas directamente con Ctrl+V (o Cmd+V) desde tu portapapeles, organizarlas con etiquetas y activar el modo concentración para escribir sin interrupciones. Todo se sincroniza automáticamente en la nube.`,
  images: [
    {
      id: 'img_intro_1',
      dataUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
      caption: 'Un cuaderno abierto, luz de mañana y una taza de café.',
      createdAt: new Date().toISOString(),
      width: 1200,
      height: 800,
    },
  ],
  tags: ['reflexión', 'comienzo', 'escritura'],
  mood: 'Calmo',
  date: new Date().toISOString().split('T')[0],
  pinned: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Loads entries cached in local storage.
 */
export function getLocalEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return [INITIAL_SAMPLE_ENTRY];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [INITIAL_SAMPLE_ENTRY];
  } catch (e) {
    console.error('Error reading local storage journal entries:', e);
    return [INITIAL_SAMPLE_ENTRY];
  }
}

/**
 * Persists entries in local storage.
 */
export function saveLocalEntries(entries: JournalEntry[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Error saving local storage journal entries:', e);
  }
}

/**
 * Subscribes to real-time updates for a user's journal entries from Firestore.
 */
export function subscribeToEntries(
  userId: string,
  onEntriesReceived: (entries: JournalEntry[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const collectionPath = `users/${userId}/entries`;
  const entriesQuery = query(
    collection(db, collectionPath),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    entriesQuery,
    (snapshot) => {
      const items: JournalEntry[] = [];
      snapshot.forEach((docSnapshot) => {
        items.push(docSnapshot.data() as JournalEntry);
      });
      // Sort pinned entries to top, then by date/updatedAt
      items.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      onEntriesReceived(items);
      saveLocalEntries(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, collectionPath);
    }
  );
}

/**
 * Saves or updates a journal entry in Firestore.
 */
export async function saveEntryToFirestore(
  userId: string,
  entry: JournalEntry
): Promise<void> {
  const docPath = `users/${userId}/entries/${entry.id}`;
  const now = new Date().toISOString();
  const entryToSave: JournalEntry = {
    ...entry,
    userId,
    updatedAt: now,
    createdAt: entry.createdAt || now,
    date: entry.date || now.split('T')[0],
    images: entry.images || [],
    tags: entry.tags || [],
  };

  try {
    await setDoc(doc(db, 'users', userId, 'entries', entry.id), entryToSave);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

/**
 * Deletes a journal entry from Firestore.
 */
export async function deleteEntryFromFirestore(
  userId: string,
  entryId: string
): Promise<void> {
  const docPath = `users/${userId}/entries/${entryId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'entries', entryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Migrates existing local entries into Firestore when a guest signs in.
 */
export async function syncLocalEntriesToCloud(
  userId: string,
  localEntries: JournalEntry[]
): Promise<void> {
  for (const entry of localEntries) {
    // Only upload if entry is guest created or matches this user
    if (entry.userId === GUEST_USER_ID || entry.userId === userId) {
      const updated = {
        ...entry,
        userId,
      };
      await saveEntryToFirestore(userId, updated);
    }
  }
}

export interface DbStatusInfo {
  provider: 'mongodb' | 'firestore';
  mongodbConfigured: boolean;
  connected: boolean;
  message: string;
}

const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function fetchDbStatus(): Promise<DbStatusInfo> {
  try {
    const res = await fetch(`${BASE_URL}/api/db/status`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Error checking db status:', e);
  }
  return {
    provider: 'firestore',
    mongodbConfigured: false,
    connected: false,
    message: 'Almacenamiento local y Firestore activos.',
  };
}

export async function saveEntryToMongo(entry: JournalEntry): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (res.ok) {
      const data = await res.json();
      return !!data.saved;
    }
  } catch (err) {
    console.warn('MongoDB API write notice:', err);
  }
  return false;
}

export async function deleteEntryFromMongo(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/entries/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const data = await res.json();
      return !!data.deleted;
    }
  } catch (err) {
    console.warn('MongoDB API delete notice:', err);
  }
  return false;
}

export async function fetchMongoEntries(): Promise<JournalEntry[] | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/entries`);
    if (res.ok) {
      const data = await res.json();
      if (data.usingMongo && Array.isArray(data.entries) && data.entries.length > 0) {
        return data.entries;
      }
    }
  } catch (err) {
    console.warn('MongoDB API read notice:', err);
  }
  return null;
}
