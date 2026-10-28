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
    message: 'Firestore activo.',
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
