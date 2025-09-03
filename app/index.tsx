import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Plus, Settings } from 'lucide-react-native';
import { useNotes, useNotesStats } from '@/hooks/notes-store';
import { NoteCard } from '@/components/NoteCard';
import { SearchBar } from '@/components/SearchBar';
import { FilterTabs } from '@/components/FilterTabs';
import { CreateNoteModal } from '@/components/CreateNoteModal';
import { SyncStatusBar } from '@/components/SyncStatusBar';
import { SmartViews } from '@/components/SmartViews';
import { ThemeSelector } from '@/components/ThemeSelector';
import { Note, SmartView } from '@/types/note';
import { useThemeColors } from '@/hooks/use-theme';

export default function NotesScreen() {
  const {
    notes,
    allNotes,
    isLoading,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    syncStatus,
    addNote,
    updateNote,
    deleteNote,
    toggleTask,
    resolveConflict,
    manualSync,
    toggleStar,
    togglePin,
    archiveNote,
    setPriority,
  } = useNotes();

  const { totalNotes, totalTasks } = useNotesStats();
  const colors = useThemeColors();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedSmartView, setSelectedSmartView] = useState<{ id: SmartView; notes: Note[] } | null>(null);

  const handleCreateNote = () => {
    setEditingNote(null);
    setModalVisible(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setModalVisible(true);
  };

  const handleSaveNote = async (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'deviceId'>) => {
    try {
      if (editingNote) {
        await updateNote(editingNote.id, noteData);
      } else {
        await addNote(noteData);
      }
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  const handleSmartViewSelect = (viewId: SmartView, viewNotes: Note[]) => {
    setSelectedSmartView({ id: viewId, notes: viewNotes });
  };

  const handleBackToMain = () => {
    setSelectedSmartView(null);
  };

  const renderNote = ({ item }: { item: Note }) => (
    <NoteCard
      note={item}
      onPress={() => handleEditNote(item)}
      onToggleTask={() => toggleTask(item.id)}
      onDelete={() => deleteNote(item.id)}
      onToggleStar={() => toggleStar(item.id)}
      onTogglePin={() => togglePin(item.id)}
      onArchive={() => archiveNote(item.id)}
      onSetPriority={(priority) => setPriority(item.id, priority)}
    />
  );

  const renderEmptyState = () => {
    const title = selectedSmartView 
      ? `No items in ${selectedSmartView.id}` 
      : `No ${filterType === 'all' ? 'items' : filterType} yet`;
    const subtitle = selectedSmartView
      ? 'Items will appear here when they match this view'
      : `Tap the + button to create your first ${filterType === 'tasks' ? 'task' : 'note'}`;
      
    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyTitle, { color: colors.textTertiary }]}>{title}</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textTertiary }]}>Loading your notes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayNotes = selectedSmartView ? selectedSmartView.notes : notes;
  const displayTitle = selectedSmartView ? selectedSmartView.id.charAt(0).toUpperCase() + selectedSmartView.id.slice(1) : 'Notes & Tasks';

  if (showSettings) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowSettings(false)}>
            <Text style={[styles.backButton, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          <View style={{ width: 60 }} />
        </View>
        
        <ScrollView style={styles.settingsContent}>
          <ThemeSelector />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <SyncStatusBar
        syncStatus={syncStatus}
        onManualSync={manualSync}
        onResolveConflict={resolveConflict}
      />
      
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {selectedSmartView ? (
          <TouchableOpacity onPress={handleBackToMain} style={styles.backButtonContainer}>
            <Text style={[styles.backButton, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
        
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.text }]}>{displayTitle}</Text>
          {!selectedSmartView && (
            <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
              {totalNotes} notes • {totalTasks} tasks
            </Text>
          )}
        </View>
        
        <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.settingsButton}>
          <Settings size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {!selectedSmartView && (
        <View style={styles.filtersContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <FilterTabs
            activeFilter={filterType}
            onFilterChange={setFilterType}
            notesCount={totalNotes}
            tasksCount={totalTasks}
          />

          <SmartViews
            notes={allNotes}
            onSelectView={handleSmartViewSelect}
          />
        </View>
      )}

      <FlatList
        data={displayNotes}
        renderItem={renderNote}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        style={styles.notesList}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleCreateNote}
      >
        <Plus size={28} color="#fff" />
      </TouchableOpacity>

      <CreateNoteModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveNote}
        editingNote={editingNote}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  backButtonContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    padding: 8,
    borderRadius: 8,
  },
  settingsContent: {
    flex: 1,
  },
  filtersContainer: {
    paddingBottom: 8,
  },
  notesList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 120,
    paddingTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 34,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
});