import { useMemo } from 'react';
import { Note, SmartView, SmartViewConfig } from '@/types/note';

export const useSmartViews = (notes: Note[]) => {
  const smartViews: SmartViewConfig[] = useMemo(() => [
    {
      id: 'today',
      name: "Today's Tasks",
      icon: 'Calendar',
      filter: (notes: Note[]) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return notes.filter(note => {
          if (note.type !== 'task' || note.completed || note.isArchived) return false;
          
          // Tasks due today
          if (note.dueDate) {
            const dueDate = new Date(note.dueDate);
            return dueDate >= today && dueDate < tomorrow;
          }
          
          // Tasks with reminders today
          if (note.reminderDate) {
            const reminderDate = new Date(note.reminderDate);
            return reminderDate >= today && reminderDate < tomorrow;
          }
          
          // Tasks created today
          const createdDate = new Date(note.createdAt);
          return createdDate >= today && createdDate < tomorrow;
        });
      }
    },
    {
      id: 'upcoming',
      name: 'Upcoming',
      icon: 'Clock',
      filter: (notes: Note[]) => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        return notes.filter(note => {
          if (note.type !== 'task' || note.completed || note.isArchived) return false;
          
          if (note.dueDate) {
            const dueDate = new Date(note.dueDate);
            return dueDate > today && dueDate <= nextWeek;
          }
          
          if (note.reminderDate) {
            const reminderDate = new Date(note.reminderDate);
            return reminderDate > today && reminderDate <= nextWeek;
          }
          
          return false;
        });
      }
    },
    {
      id: 'overdue',
      name: 'Overdue',
      icon: 'AlertTriangle',
      filter: (notes: Note[]) => {
        const now = new Date();
        
        return notes.filter(note => {
          if (note.type !== 'task' || note.completed || note.isArchived) return false;
          
          if (note.dueDate) {
            const dueDate = new Date(note.dueDate);
            return dueDate < now;
          }
          
          return false;
        });
      }
    },
    {
      id: 'completed',
      name: 'Completed',
      icon: 'CheckCircle',
      filter: (notes: Note[]) => {
        return notes.filter(note => note.type === 'task' && note.completed && !note.isArchived);
      }
    },
    {
      id: 'high-priority',
      name: 'High Priority',
      icon: 'Star',
      filter: (notes: Note[]) => {
        return notes.filter(note => note.priority === 'high' && !note.completed && !note.isArchived);
      }
    },
    {
      id: 'starred',
      name: 'Starred',
      icon: 'Star',
      filter: (notes: Note[]) => {
        return notes.filter(note => note.isStarred && !note.isArchived);
      }
    },
    {
      id: 'pinned',
      name: 'Pinned',
      icon: 'Pin',
      filter: (notes: Note[]) => {
        return notes.filter(note => note.isPinned && !note.isArchived);
      }
    },
    {
      id: 'archived',
      name: 'Archived',
      icon: 'Archive',
      filter: (notes: Note[]) => {
        return notes.filter(note => note.isArchived);
      }
    }
  ], []);

  const getSmartViewData = useMemo(() => {
    return smartViews.map(view => ({
      ...view,
      notes: view.filter(notes),
      count: view.filter(notes).length
    }));
  }, [notes, smartViews]);

  const getSmartViewById = (id: SmartView) => {
    return getSmartViewData.find(view => view.id === id);
  };

  return {
    smartViews: getSmartViewData,
    getSmartViewById,
  };
};