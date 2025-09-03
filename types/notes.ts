export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

export interface RichTextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  highlight?: boolean;
  bulletPoint?: boolean;
}

export interface AudioNote {
  id: string;
  uri: string;
  duration: number;
  transcript?: string;
  createdAt: Date;
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  richContent?: RichTextSegment[];
  type: 'note' | 'task';
  completed?: boolean;
  checklist?: ChecklistItem[];
  tags: string[];
  folderId?: string;
  audioNotes?: AudioNote[];
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
  reminderDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  // New features
  isStarred?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  // Sync metadata
  syncId?: string;
  lastSyncAt?: Date;
  conflictVersion?: number;
  isDeleted?: boolean;
  deviceId: string;
}

export interface VoiceRecording {
  isRecording: boolean;
  isTranscribing: boolean;
  transcript: string;
  audioUri?: string;
  duration?: number;
}

export type SmartView = 'today' | 'upcoming' | 'overdue' | 'completed' | 'high-priority' | 'starred' | 'pinned' | 'archived';

export interface SmartViewConfig {
  id: SmartView;
  name: string;
  icon: string;
  filter: (notes: Note[]) => Note[];
}

export interface SyncConflict {
  noteId: string;
  localVersion: Note;
  remoteVersion: Note;
  conflictFields: string[];
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt?: Date;
  pendingChanges: number;
  conflicts: SyncConflict[];
}