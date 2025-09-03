import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, TextInput } from 'react-native';
import { Folder, FolderPlus, ChevronRight, X, Plus } from 'lucide-react-native';
import { useFolders } from '@/hooks/use-folders';
import { Folder as FolderType } from '@/types/note';

interface FolderSelectorProps {
  selectedFolderId?: string;
  onSelectFolder: (folderId: string | null) => void;
  showCreateButton?: boolean;
}

const FOLDER_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF3B30', 
  '#AF52DE', '#FF2D92', '#5AC8FA', '#FFCC00'
];

export const FolderSelector: React.FC<FolderSelectorProps> = ({
  selectedFolderId,
  onSelectFolder,
  showCreateButton = true,
}) => {
  const { folderHierarchy, createFolder, getFolderPath } = useFolders();
  const [modalVisible, setModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);
  const [parentFolderId, setParentFolderId] = useState<string | undefined>();

  const selectedFolder = selectedFolderId 
    ? folderHierarchy.find(f => f.id === selectedFolderId) || 
      folderHierarchy.flatMap(f => getAllSubfolders(f)).find(f => f.id === selectedFolderId)
    : null;

  const getAllSubfolders = (folder: FolderType & { children: any[] }): (FolderType & { children: any[] })[] => {
    return [folder, ...folder.children.flatMap(child => getAllSubfolders(child))];
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createFolder(newFolderName.trim(), parentFolderId, selectedColor);
      setNewFolderName('');
      setCreateModalVisible(false);
      setParentFolderId(undefined);
    }
  };

  const renderFolderItem = ({ item, level = 0 }: { item: FolderType & { children: any[] }, level?: number }) => (
    <View>
      <TouchableOpacity
        style={[styles.folderItem, { paddingLeft: 16 + level * 20 }]}
        onPress={() => {
          onSelectFolder(item.id);
          setModalVisible(false);
        }}
      >
        <View style={styles.folderContent}>
          <View style={[styles.folderIcon, { backgroundColor: item.color || '#007AFF' }]}>
            <Folder size={16} color="#fff" />
          </View>
          <Text style={styles.folderName}>{item.name}</Text>
        </View>
        {item.children.length > 0 && (
          <ChevronRight size={16} color="#8E8E93" />
        )}
      </TouchableOpacity>
      {item.children.map((child: FolderType & { children: any[] }) => (
        <View key={child.id}>
          {renderFolderItem({ item: child, level: level + 1 })}
        </View>
      ))}
    </View>
  );

  const renderColorOption = (color: string) => (
    <TouchableOpacity
      key={color}
      style={[
        styles.colorOption,
        { backgroundColor: color },
        selectedColor === color && styles.selectedColor
      ]}
      onPress={() => setSelectedColor(color)}
    />
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.selectorContent}>
          {selectedFolder ? (
            <>
              <View style={[styles.folderIcon, { backgroundColor: selectedFolder.color || '#007AFF' }]}>
                <Folder size={16} color="#fff" />
              </View>
              <Text style={styles.selectedFolderText}>{selectedFolder.name}</Text>
            </>
          ) : (
            <>
              <FolderPlus size={20} color="#8E8E93" />
              <Text style={styles.placeholderText}>Select folder</Text>
            </>
          )}
        </View>
        <ChevronRight size={16} color="#8E8E93" />
      </TouchableOpacity>

      {/* Folder Selection Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Folder</Text>
            {showCreateButton && (
              <TouchableOpacity onPress={() => setCreateModalVisible(true)}>
                <Plus size={24} color="#007AFF" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.folderItem}
            onPress={() => {
              onSelectFolder(null);
              setModalVisible(false);
            }}
          >
            <View style={styles.folderContent}>
              <View style={[styles.folderIcon, { backgroundColor: '#8E8E93' }]}>
                <FolderPlus size={16} color="#fff" />
              </View>
              <Text style={styles.folderName}>No Folder</Text>
            </View>
          </TouchableOpacity>

          <FlatList
            data={folderHierarchy}
            renderItem={({ item }) => renderFolderItem({ item })}
            keyExtractor={(item) => item.id}
          />
        </View>
      </Modal>

      {/* Create Folder Modal */}
      <Modal visible={createModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
              <X size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Folder</Text>
            <TouchableOpacity onPress={handleCreateFolder}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.createForm}>
            <TextInput
              style={styles.nameInput}
              placeholder="Folder name"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />

            <Text style={styles.colorLabel}>Color</Text>
            <View style={styles.colorGrid}>
              {FOLDER_COLORS.map(renderColorOption)}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  folderIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedFolderText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  placeholderText: {
    fontSize: 16,
    color: '#8E8E93',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  folderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    color: '#000',
  },
  createForm: {
    padding: 16,
  },
  nameInput: {
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingVertical: 12,
    marginBottom: 24,
  },
  colorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#000',
  },
});