import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { Platform } from 'react-native';
import { Note, ChecklistItem, SyncConflict } from '@/types/note';

const DB_NAME = 'notes_app.db';
const DEVICE_ID_KEY = 'device_id';
const NOTES_STORAGE_KEY = 'notes_storage';
const SYNC_METADATA_KEY = 'sync_metadata';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private deviceId: string | null = null;
  private isWeb: boolean = Platform.OS === 'web';

  async initialize() {
    console.log('Initializing database...');
    
    // Get or create device ID
    this.deviceId = await this.getOrCreateDeviceId();
    
    if (this.isWeb) {
      // Use AsyncStorage for web
      console.log('Using AsyncStorage for web platform');
      await this.initializeWebStorage();
    } else {
      // Use SQLite for native platforms
      this.db = await SQLite.openDatabaseAsync(DB_NAME);
      await this.createTables();
    }
    
    console.log('Database initialized successfully');
  }

  private async getOrCreateDeviceId(): Promise<string> {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  private async initializeWebStorage() {
    // Initialize storage structure for web
    const existingNotes = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    if (!existingNotes) {
      await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify([]));
    }
    
    const existingMetadata = await AsyncStorage.getItem(SYNC_METADATA_KEY);
    if (!existingMetadata) {
      await AsyncStorage.setItem(SYNC_METADATA_KEY, JSON.stringify({}));
    }
  }

  private async createTables() {
    if (!this.db) throw new Error('Database not initialized');

    // Notes table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        rich_content TEXT,
        type TEXT NOT NULL CHECK (type IN ('note', 'task')),
        completed INTEGER DEFAULT 0,
        tags TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        sync_id TEXT,
        last_sync_at INTEGER,
        conflict_version INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        device_id TEXT NOT NULL
      );
    `);

    // Checklist items table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS checklist_items (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL,
        text TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE
      );
    `);

    // Sync metadata table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create indexes for better performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
      CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
      CREATE INDEX IF NOT EXISTS idx_notes_sync_id ON notes(sync_id);
      CREATE INDEX IF NOT EXISTS idx_checklist_note_id ON checklist_items(note_id);
    `);
  }

  async getAllNotes(): Promise<Note[]> {
    if (this.isWeb) {
      return this.getAllNotesWeb();
    }
    
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(`
      SELECT * FROM notes 
      WHERE is_deleted = 0 
      ORDER BY updated_at DESC
    `);

    const notes: Note[] = [];
    for (const row of result) {
      const note = await this.mapRowToNote(row as any);
      notes.push(note);
    }

    return notes;
  }

  private async getAllNotesWeb(): Promise<Note[]> {
    const notesJson = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    if (!notesJson) return [];
    
    const notes: Note[] = JSON.parse(notesJson);
    return notes
      .filter(note => !note.isDeleted)
      .map(note => ({
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
        lastSyncAt: note.lastSyncAt ? new Date(note.lastSyncAt) : undefined,
        checklist: note.checklist?.map(item => ({
          ...item,
          createdAt: new Date(item.createdAt)
        }))
      }))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getNoteById(id: string): Promise<Note | null> {
    if (this.isWeb) {
      return this.getNoteByIdWeb(id);
    }
    
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(
      'SELECT * FROM notes WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (!result) return null;
    return this.mapRowToNote(result as any);
  }

  private async getNoteByIdWeb(id: string): Promise<Note | null> {
    const notes = await this.getAllNotesWeb();
    return notes.find(note => note.id === id) || null;
  }

  async saveNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'deviceId'>): Promise<Note> {
    if (!this.deviceId) throw new Error('Database not initialized');

    const now = new Date();
    const id = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newNote: Note = {
      ...note,
      id,
      createdAt: now,
      updatedAt: now,
      deviceId: this.deviceId,
    };

    if (this.isWeb) {
      return this.saveNoteWeb(newNote);
    }

    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(`
      INSERT INTO notes (
        id, title, content, rich_content, type, completed, tags,
        created_at, updated_at, sync_id, last_sync_at, conflict_version,
        is_deleted, device_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newNote.id,
      newNote.title,
      newNote.content,
      JSON.stringify(newNote.richContent || []),
      newNote.type,
      newNote.completed ? 1 : 0,
      JSON.stringify(newNote.tags),
      newNote.createdAt.getTime(),
      newNote.updatedAt.getTime(),
      newNote.syncId || null,
      newNote.lastSyncAt?.getTime() || null,
      newNote.conflictVersion || 0,
      newNote.isDeleted ? 1 : 0,
      newNote.deviceId
    ]);

    // Save checklist items if any
    if (newNote.checklist && newNote.checklist.length > 0) {
      await this.saveChecklistItems(newNote.id, newNote.checklist);
    }

    return newNote;
  }

  private async saveNoteWeb(note: Note): Promise<Note> {
    const notesJson = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    const notes: Note[] = notesJson ? JSON.parse(notesJson) : [];
    
    notes.push(note);
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    
    return note;
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<void> {
    if (this.isWeb) {
      return this.updateNoteWeb(id, updates);
    }
    
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date();
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.content !== undefined) {
      updateFields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.richContent !== undefined) {
      updateFields.push('rich_content = ?');
      values.push(JSON.stringify(updates.richContent));
    }
    if (updates.type !== undefined) {
      updateFields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.completed !== undefined) {
      updateFields.push('completed = ?');
      values.push(updates.completed ? 1 : 0);
    }
    if (updates.tags !== undefined) {
      updateFields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }

    updateFields.push('updated_at = ?');
    values.push(now.getTime());
    values.push(id);

    await this.db.runAsync(`
      UPDATE notes 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, values);

    // Update checklist items if provided
    if (updates.checklist !== undefined) {
      await this.deleteChecklistItems(id);
      if (updates.checklist.length > 0) {
        await this.saveChecklistItems(id, updates.checklist);
      }
    }
  }

  private async updateNoteWeb(id: string, updates: Partial<Note>): Promise<void> {
    const notesJson = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    const notes: Note[] = notesJson ? JSON.parse(notesJson) : [];
    
    const noteIndex = notes.findIndex(note => note.id === id);
    if (noteIndex === -1) return;
    
    const now = new Date();
    notes[noteIndex] = {
      ...notes[noteIndex],
      ...updates,
      updatedAt: now
    };
    
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  }

  async deleteNote(id: string): Promise<void> {
    if (this.isWeb) {
      return this.deleteNoteWeb(id);
    }
    
    if (!this.db) throw new Error('Database not initialized');

    // Soft delete - mark as deleted for sync purposes
    await this.db.runAsync(
      'UPDATE notes SET is_deleted = 1, updated_at = ? WHERE id = ?',
      [Date.now(), id]
    );
  }

  private async deleteNoteWeb(id: string): Promise<void> {
    const notesJson = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    const notes: Note[] = notesJson ? JSON.parse(notesJson) : [];
    
    const noteIndex = notes.findIndex(note => note.id === id);
    if (noteIndex === -1) return;
    
    notes[noteIndex] = {
      ...notes[noteIndex],
      isDeleted: true,
      updatedAt: new Date()
    };
    
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  }

  async hardDeleteNote(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
    await this.deleteChecklistItems(id);
  }

  private async saveChecklistItems(noteId: string, items: ChecklistItem[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    for (const item of items) {
      await this.db.runAsync(`
        INSERT INTO checklist_items (id, note_id, text, completed, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [
        item.id,
        noteId,
        item.text,
        item.completed ? 1 : 0,
        item.createdAt.getTime()
      ]);
    }
  }

  private async deleteChecklistItems(noteId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM checklist_items WHERE note_id = ?', [noteId]);
  }

  private async getChecklistItems(noteId: string): Promise<ChecklistItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM checklist_items WHERE note_id = ? ORDER BY created_at ASC',
      [noteId]
    );

    return result.map((row: any) => ({
      id: row.id,
      text: row.text,
      completed: row.completed === 1,
      createdAt: new Date(row.created_at)
    }));
  }

  private async mapRowToNote(row: any): Promise<Note> {
    const checklist = await this.getChecklistItems(row.id);
    
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      richContent: row.rich_content ? JSON.parse(row.rich_content) : undefined,
      type: row.type,
      completed: row.completed === 1,
      checklist: checklist.length > 0 ? checklist : undefined,
      tags: JSON.parse(row.tags),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      syncId: row.sync_id,
      lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at) : undefined,
      conflictVersion: row.conflict_version,
      isDeleted: row.is_deleted === 1,
      deviceId: row.device_id
    };
  }

  async getNotesForSync(): Promise<Note[]> {
    if (this.isWeb) {
      return this.getNotesForSyncWeb();
    }
    
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(`
      SELECT * FROM notes 
      WHERE last_sync_at IS NULL OR updated_at > last_sync_at
      ORDER BY updated_at ASC
    `);

    const notes: Note[] = [];
    for (const row of result) {
      const note = await this.mapRowToNote(row as any);
      notes.push(note);
    }

    return notes;
  }

  private async getNotesForSyncWeb(): Promise<Note[]> {
    const notes = await this.getAllNotesWeb();
    return notes.filter(note => 
      !note.lastSyncAt || note.updatedAt.getTime() > note.lastSyncAt.getTime()
    ).sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
  }

  async markAsSynced(noteId: string, syncId: string): Promise<void> {
    if (this.isWeb) {
      return this.markAsSyncedWeb(noteId, syncId);
    }
    
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'UPDATE notes SET sync_id = ?, last_sync_at = ? WHERE id = ?',
      [syncId, Date.now(), noteId]
    );
  }

  private async markAsSyncedWeb(noteId: string, syncId: string): Promise<void> {
    const notesJson = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    const notes: Note[] = notesJson ? JSON.parse(notesJson) : [];
    
    const noteIndex = notes.findIndex(note => note.id === noteId);
    if (noteIndex === -1) return;
    
    notes[noteIndex] = {
      ...notes[noteIndex],
      syncId,
      lastSyncAt: new Date()
    };
    
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  }

  async isOnline(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return navigator.onLine;
    }
    
    try {
      const networkState = await Network.getNetworkStateAsync();
      return networkState.isConnected === true;
    } catch {
      return false;
    }
  }

  async getSyncMetadata(key: string): Promise<string | null> {
    if (this.isWeb) {
      return this.getSyncMetadataWeb(key);
    }
    
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(
      'SELECT value FROM sync_metadata WHERE key = ?',
      [key]
    );

    return result ? (result as any).value : null;
  }

  private async getSyncMetadataWeb(key: string): Promise<string | null> {
    const metadataJson = await AsyncStorage.getItem(SYNC_METADATA_KEY);
    const metadata = metadataJson ? JSON.parse(metadataJson) : {};
    return metadata[key] || null;
  }

  async setSyncMetadata(key: string, value: string): Promise<void> {
    if (this.isWeb) {
      return this.setSyncMetadataWeb(key, value);
    }
    
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(`
      INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
      VALUES (?, ?, ?)
    `, [key, value, Date.now()]);
  }

  private async setSyncMetadataWeb(key: string, value: string): Promise<void> {
    const metadataJson = await AsyncStorage.getItem(SYNC_METADATA_KEY);
    const metadata = metadataJson ? JSON.parse(metadataJson) : {};
    
    metadata[key] = value;
    await AsyncStorage.setItem(SYNC_METADATA_KEY, JSON.stringify(metadata));
  }
}

export const databaseService = new DatabaseService();
export default databaseService;