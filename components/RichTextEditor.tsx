import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Bold,
  Italic,
  Highlighter,
  List,
  CheckSquare,
  Plus,
  X,
} from 'lucide-react-native';
import { RichTextSegment, ChecklistItem } from '@/types/note';

interface RichTextEditorProps {
  content: string;
  richContent?: RichTextSegment[];
  checklist?: ChecklistItem[];
  onContentChange: (content: string, richContent?: RichTextSegment[]) => void;
  onChecklistChange?: (checklist: ChecklistItem[]) => void;
  placeholder?: string;
  showFormatting?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  richContent = [],
  checklist = [],
  onContentChange,
  onChecklistChange,
  placeholder = 'Start typing...',
  showFormatting = true,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<{
    bold: boolean;
    italic: boolean;
    highlight: boolean;
    bulletPoint: boolean;
  }>({
    bold: false,
    italic: false,
    highlight: false,
    bulletPoint: false,
  });
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const toggleFormat = useCallback((format: keyof typeof selectedFormat) => {
    setSelectedFormat(prev => ({
      ...prev,
      [format]: !prev[format],
    }));
  }, []);

  const handleTextChange = useCallback((text: string) => {
    onContentChange(text, richContent);
  }, [onContentChange, richContent]);

  const addChecklistItem = useCallback(() => {
    if (!newChecklistItem.trim() || !onChecklistChange) return;

    const newItem: ChecklistItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: newChecklistItem.trim(),
      completed: false,
      createdAt: new Date(),
    };

    onChecklistChange([...checklist, newItem]);
    setNewChecklistItem('');
  }, [newChecklistItem, checklist, onChecklistChange]);

  const toggleChecklistItem = useCallback((itemId: string) => {
    if (!onChecklistChange) return;

    const updatedChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    onChecklistChange(updatedChecklist);
  }, [checklist, onChecklistChange]);

  const removeChecklistItem = useCallback((itemId: string) => {
    if (!onChecklistChange) return;

    const updatedChecklist = checklist.filter(item => item.id !== itemId);
    onChecklistChange(updatedChecklist);
  }, [checklist, onChecklistChange]);

  const renderFormattingToolbar = () => {
    if (!showFormatting) return null;

    return (
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolbarButton, selectedFormat.bold && styles.activeToolbarButton]}
          onPress={() => toggleFormat('bold')}
        >
          <Bold size={18} color={selectedFormat.bold ? '#fff' : '#007AFF'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolbarButton, selectedFormat.italic && styles.activeToolbarButton]}
          onPress={() => toggleFormat('italic')}
        >
          <Italic size={18} color={selectedFormat.italic ? '#fff' : '#007AFF'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolbarButton, selectedFormat.highlight && styles.activeToolbarButton]}
          onPress={() => toggleFormat('highlight')}
        >
          <Highlighter size={18} color={selectedFormat.highlight ? '#fff' : '#007AFF'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolbarButton, selectedFormat.bulletPoint && styles.activeToolbarButton]}
          onPress={() => toggleFormat('bulletPoint')}
        >
          <List size={18} color={selectedFormat.bulletPoint ? '#fff' : '#007AFF'} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderChecklist = () => {
    if (!onChecklistChange) return null;

    return (
      <View style={styles.checklistContainer}>
        <Text style={styles.checklistTitle}>Checklist</Text>
        
        {checklist.map((item) => (
          <View key={item.id} style={styles.checklistItem}>
            <TouchableOpacity
              style={styles.checklistToggle}
              onPress={() => toggleChecklistItem(item.id)}
            >
              <CheckSquare
                size={20}
                color={item.completed ? '#34C759' : '#8E8E93'}
                fill={item.completed ? '#34C759' : 'transparent'}
              />
            </TouchableOpacity>
            
            <Text
              style={[
                styles.checklistText,
                item.completed && styles.checklistTextCompleted,
              ]}
            >
              {item.text}
            </Text>
            
            <TouchableOpacity
              style={styles.removeChecklistItem}
              onPress={() => removeChecklistItem(item.id)}
            >
              <X size={16} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.addChecklistItem}>
          <TextInput
            style={styles.checklistInput}
            placeholder="Add checklist item..."
            value={newChecklistItem}
            onChangeText={setNewChecklistItem}
            onSubmitEditing={addChecklistItem}
            returnKeyType="done"
          />
          {newChecklistItem.trim() && (
            <TouchableOpacity
              style={styles.addChecklistButton}
              onPress={addChecklistItem}
            >
              <Plus size={16} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {renderFormattingToolbar()}
      
      <TextInput
        style={styles.textInput}
        placeholder={placeholder}
        value={content}
        onChangeText={handleTextChange}
        multiline
        textAlignVertical="top"
        placeholderTextColor="#8E8E93"
      />

      {renderChecklist()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    gap: 12,
  },
  toolbarButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  activeToolbarButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  textInput: {
    fontSize: 16,
    color: '#000',
    padding: 16,
    minHeight: 200,
    textAlignVertical: 'top',
  },
  checklistContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  checklistTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  checklistToggle: {
    padding: 4,
  },
  checklistText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  checklistTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
  },
  removeChecklistItem: {
    padding: 4,
  },
  addChecklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  checklistInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  addChecklistButton: {
    padding: 4,
  },
});