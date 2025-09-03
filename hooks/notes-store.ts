import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Note, ChecklistItem, SyncStatus, SyncConflict } from '@/types/note';
import databaseService from './database-service';
import firebaseSyncService from './firebase-sync-service';

export const [NotesProvider, useNotes] = createContextHook(() => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'notes' | 'tasks'>('all');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    pendingChanges: 0,
    conflicts: []
  });

  // Initialize database and sync services
  useEffect(() => {
    initializeServices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeServices = async () => {
    try {
      console.log('Initializing services...');
      await databaseService.initialize();
      await firebaseSyncService.initialize();
      await loadNotes();
      
      // Start periodic sync
      startPeriodicSync();
      
      // Start realtime sync
      await firebaseSyncService.startRealtimeSync(() => {
        loadNotes();
      });
      
      console.log('Services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize services:', error);
      setIsLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      const loadedNotes = await databaseService.getAllNotes();
      setNotes(loadedNotes);
      
      // Update sync status
      const isOnline = await databaseService.isOnline();
      const pendingNotes = await databaseService.getNotesForSync();
      
      setSyncStatus(prev => ({
        ...prev,
        isOnline,
        pendingChanges: pendingNotes.length
      }));
      
      // Add demo data if needed (only after first load)
      if (loadedNotes.length === 0) {
        setTimeout(() => {
          addDemoData();
        }, 1000);
      }
      
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startPeriodicSync = () => {
    // Sync every 30 seconds when online
    const syncInterval = setInterval(async () => {
      const isOnline = await databaseService.isOnline();
      if (isOnline && !syncStatus.isSyncing) {
        await performSync();
      }
    }, 30000);

    // Cleanup on unmount
    return () => {
      clearInterval(syncInterval);
      firebaseSyncService.stopRealtimeSync();
    };
  };

  const performSync = async () => {
    setSyncStatus(prev => ({ ...prev, isSyncing: true }));
    
    try {
      const result = await firebaseSyncService.syncNotes();
      
      if (result.success) {
        await loadNotes(); // Reload notes after sync
        
        setSyncStatus(prev => ({
          ...prev,
          lastSyncAt: new Date(),
          conflicts: result.conflicts,
          pendingChanges: 0
        }));
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };

  const addNote = useCallback(async (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'deviceId'>) => {
    try {
      const newNote = await databaseService.saveNote(noteData);
      await loadNotes();
      
      // Trigger sync if online
      const isOnline = await databaseService.isOnline();
      if (isOnline) {
        performSync();
      }
      
      return newNote;
    } catch (error) {
      console.error('Failed to add note:', error);
      throw error;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
    try {
      await databaseService.updateNote(id, updates);
      await loadNotes();
      
      // Trigger sync if online
      const isOnline = await databaseService.isOnline();
      if (isOnline) {
        performSync();
      }
    } catch (error) {
      console.error('Failed to update note:', error);
      throw error;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    try {
      await databaseService.deleteNote(id);
      await loadNotes();
      
      // Trigger sync if online
      const isOnline = await databaseService.isOnline();
      if (isOnline) {
        performSync();
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
      throw error;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTask = useCallback(async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note && note.type === 'task') {
      await updateNote(id, { completed: !note.completed });
    }
  }, [notes, updateNote]);

  const addChecklistItem = useCallback(async (noteId: string, text: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const newItem: ChecklistItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text,
      completed: false,
      createdAt: new Date()
    };

    const updatedChecklist = [...(note.checklist || []), newItem];
    await updateNote(noteId, { checklist: updatedChecklist });
  }, [notes, updateNote]);

  const toggleChecklistItem = useCallback(async (noteId: string, itemId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.checklist) return;

    const updatedChecklist = note.checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    await updateNote(noteId, { checklist: updatedChecklist });
  }, [notes, updateNote]);

  const removeChecklistItem = useCallback(async (noteId: string, itemId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.checklist) return;

    const updatedChecklist = note.checklist.filter(item => item.id !== itemId);
    await updateNote(noteId, { checklist: updatedChecklist });
  }, [notes, updateNote]);

  const resolveConflict = useCallback(async (conflict: SyncConflict, useLocal: boolean) => {
    try {
      await firebaseSyncService.resolveConflictManually(conflict, useLocal);
      
      // Remove conflict from status and reload notes
      setSyncStatus(prev => ({
        ...prev,
        conflicts: prev.conflicts.filter(c => c.noteId !== conflict.noteId)
      }));
      
      await loadNotes();
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manualSync = useCallback(async () => {
    await performSync();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleStar = useCallback(async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      await updateNote(id, { isStarred: !note.isStarred });
    }
  }, [notes, updateNote]);

  const togglePin = useCallback(async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      await updateNote(id, { isPinned: !note.isPinned });
    }
  }, [notes, updateNote]);

  const archiveNote = useCallback(async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      await updateNote(id, { isArchived: !note.isArchived });
    }
  }, [notes, updateNote]);

  const setPriority = useCallback(async (id: string, priority: 'low' | 'medium' | 'high' | undefined) => {
    await updateNote(id, { priority });
  }, [updateNote]);

  // Add demo data for better showcase
  const addDemoData = useCallback(async () => {
    const demoNotes = [
      {
        title: 'Welcome to Notes & Tasks!',
        content: 'This is your first note. You can create notes, tasks, organize them with tags, and much more!',
        type: 'note' as const,
        tags: ['welcome', 'getting-started'],
        isStarred: true,
        isPinned: true,
      },
      {
        title: 'Complete project presentation',
        content: 'Prepare slides for the quarterly review meeting',
        type: 'task' as const,
        tags: ['work', 'presentation'],
        priority: 'high' as const,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      },
      {
        title: 'Grocery Shopping',
        content: '',
        type: 'task' as const,
        tags: ['personal', 'shopping'],
        checklist: [
          { id: '1', text: 'Milk', completed: false, createdAt: new Date() },
          { id: '2', text: 'Bread', completed: true, createdAt: new Date() },
          { id: '3', text: 'Eggs', completed: false, createdAt: new Date() },
          { id: '4', text: 'Apples', completed: false, createdAt: new Date() },
        ],
      },
      {
        title: 'Book Recommendations',
        content: 'Great books to read this year:\n\n• The Psychology of Money\n• Atomic Habits\n• Deep Work\n• The Lean Startup',
        type: 'note' as const,
        tags: ['books', 'reading', 'personal-development'],
        isStarred: true,
      },
      {
        title: 'Call dentist',
        content: 'Schedule annual checkup appointment',
        type: 'task' as const,
        tags: ['health', 'appointments'],
        priority: 'medium' as const,
        completed: true,
      },
    ];

    // Only add demo data if no notes exist
    if (notes.length === 0) {
      for (const noteData of demoNotes) {
        try {
          await addNote(noteData);
        } catch (error) {
          console.error('Failed to add demo note:', error);
        }
      }
    }
  }, [notes.length, addNote]);

  // Filtered notes based on search, tags, and type
  const filteredNotes = useMemo(() => {
    let filtered = notes.filter(note => {
      // Don't show archived notes in main view
      if (note.isArchived) return false;
      
      // Type filter
      if (filterType !== 'all') {
        const expectedType = filterType === 'notes' ? 'note' : 'task';
        if (note.type !== expectedType) {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchInChecklist = note.checklist?.some(item => 
          item.text.toLowerCase().includes(query)
        ) || false;
        
        if (!note.title.toLowerCase().includes(query) && 
            !note.content.toLowerCase().includes(query) &&
            !note.tags.some(tag => tag.toLowerCase().includes(query)) &&
            !searchInChecklist) {
          return false;
        }
      }

      // Tags filter
      if (selectedTags.length > 0) {
        if (!selectedTags.some(tag => note.tags.includes(tag))) {
          return false;
        }
      }

      return true;
    });
    
    // Sort: pinned first, then by updated date
    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes, searchQuery, selectedTags, filterType]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => {
      note.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  return useMemo(() => ({
    notes: filteredNotes,
    allNotes: notes,
    allTags,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedTags,
    setSelectedTags,
    filterType,
    setFilterType,
    syncStatus,
    addNote,
    updateNote,
    deleteNote,
    toggleTask,
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
    resolveConflict,
    manualSync,
    toggleStar,
    togglePin,
    archiveNote,
    setPriority,
    addDemoData,
  }), [
    filteredNotes,
    notes,
    allTags,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedTags,
    setSelectedTags,
    filterType,
    setFilterType,
    syncStatus,
    addNote,
    updateNote,
    deleteNote,
    toggleTask,
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
    resolveConflict,
    manualSync,
    toggleStar,
    togglePin,
    archiveNote,
    setPriority,
    addDemoData,
  ]);
});

export const useNotesStats = () => {
  const { allNotes } = useNotes();
  
  return useMemo(() => {
    const totalNotes = allNotes.filter(n => n.type === 'note').length;
    const totalTasks = allNotes.filter(n => n.type === 'task').length;
    const completedTasks = allNotes.filter(n => n.type === 'task' && n.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    
    return {
      totalNotes,
      totalTasks,
      completedTasks,
      pendingTasks,
    };
  }, [allNotes]);
};