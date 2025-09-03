import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Tag, FileText, ListTodo } from 'lucide-react-native';
import { VoiceInput } from './VoiceInput';
import { RichTextEditor } from './RichTextEditor';
import { Note, ChecklistItem, RichTextSegment } from '@/types/note';

interface CreateNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'deviceId'>) => void;
  editingNote?: Note | null;
}

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  visible,
  onClose,
  onSave,
  editingNote,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [richContent, setRichContent] = useState<RichTextSegment[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [type, setType] = useState<'note' | 'task'>('note');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title);
      setContent(editingNote.content);
      setRichContent(editingNote.richContent || []);
      setChecklist(editingNote.checklist || []);
      setType(editingNote.type);
      setTags(editingNote.tags);
    } else {
      setTitle('');
      setContent('');
      setRichContent([]);
      setChecklist([]);
      setType('note');
      setTags([]);
    }
    setTagInput('');
  }, [editingNote, visible]);

  const handleSave = () => {
    if (!title.trim() && !content.trim() && checklist.length === 0) return;

    onSave({
      title: title.trim() || 'Untitled',
      content: content.trim(),
      richContent: richContent.length > 0 ? richContent : undefined,
      checklist: checklist.length > 0 ? checklist : undefined,
      type,
      tags,
      completed: editingNote?.completed || false,
    });

    onClose();
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleVoiceTranscript = (transcript: string) => {
    if (!title.trim()) {
      setTitle(transcript);
    } else {
      setContent(prev => prev ? `${prev}\n\n${transcript}` : transcript);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {editingNote ? 'Edit' : 'Create'} {type === 'note' ? 'Note' : 'Task'}
          </Text>
          
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeButton, type === 'note' && styles.activeTypeButton]}
            onPress={() => setType('note')}
          >
            <FileText size={20} color={type === 'note' ? '#fff' : '#007AFF'} />
            <Text style={[styles.typeButtonText, type === 'note' && styles.activeTypeButtonText]}>
              Note
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.typeButton, type === 'task' && styles.activeTypeButton]}
            onPress={() => setType('task')}
          >
            <ListTodo size={20} color={type === 'task' ? '#fff' : '#007AFF'} />
            <Text style={[styles.typeButtonText, type === 'task' && styles.activeTypeButtonText]}>
              Task
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <TextInput
            style={styles.titleInput}
            placeholder={`${type === 'note' ? 'Note' : 'Task'} title...`}
            value={title}
            onChangeText={setTitle}
            multiline
          />

          <RichTextEditor
            content={content}
            richContent={richContent}
            checklist={checklist}
            onContentChange={(newContent, newRichContent) => {
              setContent(newContent);
              if (newRichContent) {
                setRichContent(newRichContent);
              }
            }}
            onChecklistChange={setChecklist}
            placeholder={`Write your ${type === 'note' ? 'note' : 'task description'} here...`}
            showFormatting={true}
          />

          <View style={styles.tagsSection}>
            <View style={styles.tagInputContainer}>
              <Tag size={20} color="#8E8E93" />
              <TextInput
                style={styles.tagInput}
                placeholder="Add tags..."
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={addTag}
                returnKeyType="done"
              />
              {tagInput.trim() && (
                <TouchableOpacity onPress={addTag} style={styles.addTagButton}>
                  <Text style={styles.addTagButtonText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            {tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tags.map((tag, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.tag}
                    onPress={() => removeTag(tag)}
                  >
                    <Text style={styles.tagText}>#{tag}</Text>
                    <X size={14} color="#007AFF" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.voiceSection}>
          <VoiceInput onTranscript={handleVoiceTranscript} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  typeSelector: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTypeButton: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  activeTypeButtonText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    minHeight: 50,
  },
  contentInput: {
    fontSize: 16,
    color: '#000',
    minHeight: 200,
    marginBottom: 24,
  },
  tagsSection: {
    marginBottom: 24,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  tagInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#000',
  },
  addTagButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  addTagButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  voiceSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    alignItems: 'center',
  },
});