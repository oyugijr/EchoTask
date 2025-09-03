import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { Note, SyncConflict } from '@/types/note';
import databaseService from './database-service';

// Firebase configuration - replace with your actual config
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "notes-app-demo.firebaseapp.com",
  projectId: "notes-app-demo",
  storageBucket: "notes-app-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

class FirebaseSyncService {
  private app: any = null;
  private db: any = null;
  private isInitialized = false;
  private syncInProgress = false;
  private listeners: (() => void)[] = [];

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('Initializing Firebase...');
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app);
      this.isInitialized = true;
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      // Continue without Firebase - app should work offline
    }
  }

  async syncNotes(): Promise<{ success: boolean; conflicts: SyncConflict[] }> {
    if (!this.isInitialized || this.syncInProgress) {
      return { success: false, conflicts: [] };
    }

    const isOnline = await databaseService.isOnline();
    if (!isOnline) {
      console.log('Device is offline, skipping sync');
      return { success: false, conflicts: [] };
    }

    this.syncInProgress = true;
    const conflicts: SyncConflict[] = [];

    try {
      console.log('Starting sync...');
      
      // Get local notes that need syncing
      const localNotes = await databaseService.getNotesForSync();
      console.log(`Found ${localNotes.length} local notes to sync`);

      // Upload local changes to Firebase
      for (const note of localNotes) {
        try {
          await this.uploadNote(note);
          await databaseService.markAsSynced(note.id, note.syncId || note.id);
        } catch (error) {
          console.error(`Failed to upload note ${note.id}:`, error);
        }
      }

      // Download remote changes
      const remoteConflicts = await this.downloadRemoteChanges();
      conflicts.push(...remoteConflicts);

      console.log(`Sync completed with ${conflicts.length} conflicts`);
      return { success: true, conflicts };

    } catch (error) {
      console.error('Sync failed:', error);
      return { success: false, conflicts };
    } finally {
      this.syncInProgress = false;
    }
  }

  private async uploadNote(note: Note): Promise<void> {
    if (!this.db) throw new Error('Firebase not initialized');

    const noteRef = doc(this.db, 'notes', note.syncId || note.id);
    
    const firebaseNote = {
      id: note.id,
      title: note.title,
      content: note.content,
      richContent: note.richContent || [],
      type: note.type,
      completed: note.completed || false,
      checklist: note.checklist || [],
      tags: note.tags,
      createdAt: Timestamp.fromDate(note.createdAt),
      updatedAt: Timestamp.fromDate(note.updatedAt),
      isDeleted: note.isDeleted || false,
      deviceId: note.deviceId,
      conflictVersion: note.conflictVersion || 0,
      lastModified: serverTimestamp()
    };

    await setDoc(noteRef, firebaseNote, { merge: true });
  }

  private async downloadRemoteChanges(): Promise<SyncConflict[]> {
    if (!this.db) return [];

    const conflicts: SyncConflict[] = [];
    const lastSyncTime = await databaseService.getSyncMetadata('last_sync_time');
    
    let q = query(
      collection(this.db, 'notes'),
      orderBy('lastModified', 'desc'),
      limit(100)
    );

    if (lastSyncTime) {
      const lastSync = new Date(parseInt(lastSyncTime));
      q = query(
        collection(this.db, 'notes'),
        where('lastModified', '>', Timestamp.fromDate(lastSync)),
        orderBy('lastModified', 'desc'),
        limit(100)
      );
    }

    const snapshot = await getDocs(q);
    
    for (const docSnapshot of snapshot.docs) {
      const remoteNote = this.mapFirebaseToNote(docSnapshot.data());
      const localNote = await databaseService.getNoteById(remoteNote.id);

      if (!localNote) {
        // New remote note - add locally
        await this.saveRemoteNote(remoteNote);
      } else if (localNote.updatedAt.getTime() !== remoteNote.updatedAt.getTime()) {
        // Conflict detected
        const conflict = await this.resolveConflict(localNote, remoteNote);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    // Update last sync time
    await databaseService.setSyncMetadata('last_sync_time', Date.now().toString());
    
    return conflicts;
  }

  private async resolveConflict(localNote: Note, remoteNote: Note): Promise<SyncConflict | null> {
    // Simple conflict resolution: most recent wins
    if (remoteNote.updatedAt.getTime() > localNote.updatedAt.getTime()) {
      // Remote is newer - update local
      await this.saveRemoteNote(remoteNote);
      return null;
    } else if (localNote.updatedAt.getTime() > remoteNote.updatedAt.getTime()) {
      // Local is newer - upload to remote
      await this.uploadNote(localNote);
      return null;
    } else {
      // Same timestamp but different content - create conflict
      const conflictFields = this.getConflictFields(localNote, remoteNote);
      if (conflictFields.length > 0) {
        return {
          noteId: localNote.id,
          localVersion: localNote,
          remoteVersion: remoteNote,
          conflictFields
        };
      }
    }
    
    return null;
  }

  private getConflictFields(local: Note, remote: Note): string[] {
    const conflicts: string[] = [];
    
    if (local.title !== remote.title) conflicts.push('title');
    if (local.content !== remote.content) conflicts.push('content');
    if (local.completed !== remote.completed) conflicts.push('completed');
    if (JSON.stringify(local.tags) !== JSON.stringify(remote.tags)) conflicts.push('tags');
    if (JSON.stringify(local.checklist) !== JSON.stringify(remote.checklist)) conflicts.push('checklist');
    
    return conflicts;
  }

  private async saveRemoteNote(note: Note): Promise<void> {
    // Check if note exists locally
    const existingNote = await databaseService.getNoteById(note.id);
    
    if (existingNote) {
      // Update existing note
      await databaseService.updateNote(note.id, {
        title: note.title,
        content: note.content,
        richContent: note.richContent,
        type: note.type,
        completed: note.completed,
        checklist: note.checklist,
        tags: note.tags,
        syncId: note.syncId,
        lastSyncAt: new Date(),
        isDeleted: note.isDeleted
      });
    } else {
      // Create new note
      await databaseService.saveNote({
        title: note.title,
        content: note.content,
        richContent: note.richContent,
        type: note.type,
        completed: note.completed,
        checklist: note.checklist,
        tags: note.tags,
        syncId: note.syncId,
        lastSyncAt: new Date(),
        isDeleted: note.isDeleted
      });
    }
  }

  private mapFirebaseToNote(data: any): Note {
    return {
      id: data.id,
      title: data.title,
      content: data.content,
      richContent: data.richContent,
      type: data.type,
      completed: data.completed,
      checklist: data.checklist?.map((item: any) => ({
        ...item,
        createdAt: item.createdAt?.toDate() || new Date()
      })),
      tags: data.tags || [],
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      syncId: data.id,
      lastSyncAt: new Date(),
      conflictVersion: data.conflictVersion || 0,
      isDeleted: data.isDeleted || false,
      deviceId: data.deviceId
    };
  }

  async startRealtimeSync(onUpdate: () => void): Promise<void> {
    if (!this.isInitialized || !this.db) return;

    const isOnline = await databaseService.isOnline();
    if (!isOnline) return;

    try {
      const q = query(
        collection(this.db, 'notes'),
        orderBy('lastModified', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        console.log('Received realtime update');
        
        for (const change of snapshot.docChanges()) {
          if (change.type === 'added' || change.type === 'modified') {
            const remoteNote = this.mapFirebaseToNote(change.doc.data());
            const localNote = await databaseService.getNoteById(remoteNote.id);
            
            if (!localNote || localNote.updatedAt.getTime() < remoteNote.updatedAt.getTime()) {
              await this.saveRemoteNote(remoteNote);
              onUpdate();
            }
          }
        }
      });

      this.listeners.push(unsubscribe);
    } catch (error) {
      console.error('Failed to start realtime sync:', error);
    }
  }

  stopRealtimeSync(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];
  }

  async resolveConflictManually(conflict: SyncConflict, useLocal: boolean): Promise<void> {
    const noteToKeep = useLocal ? conflict.localVersion : conflict.remoteVersion;
    
    // Update local database
    await databaseService.updateNote(conflict.noteId, {
      title: noteToKeep.title,
      content: noteToKeep.content,
      richContent: noteToKeep.richContent,
      completed: noteToKeep.completed,
      checklist: noteToKeep.checklist,
      tags: noteToKeep.tags,
      conflictVersion: (noteToKeep.conflictVersion || 0) + 1
    });

    // Upload resolution to Firebase
    if (this.isInitialized) {
      await this.uploadNote(noteToKeep);
    }
  }
}

export const firebaseSyncService = new FirebaseSyncService();
export default firebaseSyncService;