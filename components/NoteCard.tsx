import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle2, Circle, FileText, ListTodo, Trash2, CheckSquare, Star, Pin, Archive, AlertTriangle } from 'lucide-react-native';
import { Note } from '@/types/note';
import { useThemeColors } from '@/hooks/use-theme';

interface NoteCardProps {
  note: Note;
  onPress: () => void;
  onToggleTask: () => void;
  onDelete: () => void;
  onToggleStar?: () => void;
  onTogglePin?: () => void;
  onArchive?: () => void;
  onSetPriority?: (priority: 'low' | 'medium' | 'high' | undefined) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onPress,
  onToggleTask,
  onDelete,
  onToggleStar,
  onTogglePin,
  onArchive,
  onSetPriority,
}) => {
  const colors = useThemeColors();
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const isOverdue = note.dueDate && new Date(note.dueDate) < new Date() && !note.completed;

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { backgroundColor: colors.card, borderColor: colors.border },
        note.isPinned && { borderLeftWidth: 4, borderLeftColor: colors.primary },
        isOverdue && { borderLeftWidth: 4, borderLeftColor: colors.error }
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <View style={styles.typeIcon}>
            {note.type === 'task' ? (
              <ListTodo size={16} color={colors.primary} />
            ) : (
              <FileText size={16} color={colors.success} />
            )}
          </View>
          
          <View style={styles.headerContent}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {note.title || 'Untitled'}
              </Text>
              <View style={styles.badges}>
                {note.isPinned && <Pin size={14} color={colors.primary} />}
                {note.isStarred && <Star size={14} color={colors.warning} fill={colors.warning} />}
                {note.priority === 'high' && <AlertTriangle size={14} color={colors.error} />}
              </View>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.date, { color: colors.textTertiary }]}>
                {formatDate(note.updatedAt)}
              </Text>
              {note.dueDate && (
                <Text style={[styles.dueDate, { color: isOverdue ? colors.error : colors.textTertiary }]}>
                  Due: {new Date(note.dueDate).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          {onToggleStar && (
            <TouchableOpacity onPress={onToggleStar} style={styles.actionButton}>
              <Star 
                size={18} 
                color={note.isStarred ? colors.warning : colors.textTertiary}
                fill={note.isStarred ? colors.warning : 'transparent'}
              />
            </TouchableOpacity>
          )}
          
          {note.type === 'task' && (
            <TouchableOpacity onPress={onToggleTask} style={styles.actionButton}>
              {note.completed ? (
                <CheckCircle2 size={20} color={colors.success} />
              ) : (
                <Circle size={20} color={colors.textTertiary} />
              )}
            </TouchableOpacity>
          )}

          {onArchive && (
            <TouchableOpacity onPress={onArchive} style={styles.actionButton}>
              <Archive size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
            <Trash2 size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {note.content && (
        <Text style={[styles.content, { color: colors.textSecondary }]} numberOfLines={2}>
          {note.content}
        </Text>
      )}

      {note.checklist && note.checklist.length > 0 && (
        <View style={[styles.checklistPreview, { backgroundColor: colors.background }]}>
          <Text style={[styles.checklistTitle, { color: colors.textTertiary }]}>
            Checklist ({note.checklist.filter(item => item.completed).length}/{note.checklist.length})
          </Text>
          {note.checklist.slice(0, 2).map((item) => (
            <View key={item.id} style={styles.checklistItem}>
              <CheckSquare
                size={14}
                color={item.completed ? colors.success : colors.textTertiary}
                fill={item.completed ? colors.success : 'transparent'}
              />
              <Text
                style={[
                  styles.checklistItemText,
                  { color: colors.textSecondary },
                  item.completed && { color: colors.textTertiary, textDecorationLine: 'line-through' },
                ]}
                numberOfLines={1}
              >
                {item.text}
              </Text>
            </View>
          ))}
          {note.checklist.length > 2 && (
            <Text style={[styles.moreItems, { color: colors.textTertiary }]}>
              +{note.checklist.length - 2} more items
            </Text>
          )}
        </View>
      )}

      {note.tags.length > 0 && (
        <View style={styles.tags}>
          {note.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={[styles.tag, { backgroundColor: colors.background }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>
                #{tag}
              </Text>
            </View>
          ))}
          {note.tags.length > 3 && (
            <Text style={[styles.moreTags, { color: colors.textTertiary }]}>
              +{note.tags.length - 3}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leftSection: {
    flexDirection: 'row',
    flex: 1,
  },
  typeIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  date: {
    fontSize: 11,
    opacity: 0.8,
  },
  dueDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButton: {
    padding: 4,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
    opacity: 0.85,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  moreTags: {
    fontSize: 11,
    alignSelf: 'center',
    opacity: 0.7,
  },
  checklistPreview: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
  },
  checklistTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 6,
  },
  checklistItemText: {
    fontSize: 11,
    flex: 1,
  },
  moreItems: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
    opacity: 0.6,
  },
});