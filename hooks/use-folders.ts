import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Folder } from '@/types/note';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FOLDERS_STORAGE_KEY = 'notes_folders';

export const [FoldersProvider, useFolders] = createContextHook(() => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load folders from storage
  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      const stored = await AsyncStorage.getItem(FOLDERS_STORAGE_KEY);
      if (stored) {
        const parsedFolders = JSON.parse(stored).map((folder: any) => ({
          ...folder,
          createdAt: new Date(folder.createdAt),
          updatedAt: new Date(folder.updatedAt),
        }));
        setFolders(parsedFolders);
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFolders = async (foldersToSave: Folder[]) => {
    try {
      await AsyncStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(foldersToSave));
    } catch (error) {
      console.error('Failed to save folders:', error);
    }
  };

  const createFolder = useCallback(async (name: string, parentId?: string, color?: string) => {
    const newFolder: Folder = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      parentId,
      color,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    await saveFolders(updatedFolders);
    
    return newFolder;
  }, [folders]);

  const updateFolder = useCallback(async (id: string, updates: Partial<Omit<Folder, 'id' | 'createdAt'>>) => {
    const updatedFolders = folders.map(folder =>
      folder.id === id
        ? { ...folder, ...updates, updatedAt: new Date() }
        : folder
    );
    
    setFolders(updatedFolders);
    await saveFolders(updatedFolders);
  }, [folders]);

  const deleteFolder = useCallback(async (id: string) => {
    // Remove folder and all its subfolders
    const getFolderAndSubfolders = (folderId: string): string[] => {
      const subfolders = folders.filter(f => f.parentId === folderId);
      return [folderId, ...subfolders.flatMap(f => getFolderAndSubfolders(f.id))];
    };

    const foldersToDelete = getFolderAndSubfolders(id);
    const updatedFolders = folders.filter(folder => !foldersToDelete.includes(folder.id));
    
    setFolders(updatedFolders);
    await saveFolders(updatedFolders);
    
    // Clear selection if deleted folder was selected
    if (selectedFolderId && foldersToDelete.includes(selectedFolderId)) {
      setSelectedFolderId(null);
    }
  }, [folders, selectedFolderId]);

  // Get folder hierarchy
  const folderHierarchy = useMemo(() => {
    const buildHierarchy = (parentId?: string): (Folder & { children: any[] })[] => {
      return folders
        .filter(folder => folder.parentId === parentId)
        .map(folder => ({
          ...folder,
          children: buildHierarchy(folder.id)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    };

    return buildHierarchy();
  }, [folders]);

  // Get folder path (breadcrumb)
  const getFolderPath = useCallback((folderId: string): Folder[] => {
    const path: Folder[] = [];
    let currentFolder = folders.find(f => f.id === folderId);
    
    while (currentFolder) {
      path.unshift(currentFolder);
      currentFolder = currentFolder.parentId 
        ? folders.find(f => f.id === currentFolder!.parentId)
        : undefined;
    }
    
    return path;
  }, [folders]);

  // Get all subfolders of a folder
  const getSubfolders = useCallback((folderId: string): Folder[] => {
    const getSubfoldersRecursive = (parentId: string): Folder[] => {
      const directChildren = folders.filter(f => f.parentId === parentId);
      return [
        ...directChildren,
        ...directChildren.flatMap(child => getSubfoldersRecursive(child.id))
      ];
    };

    return getSubfoldersRecursive(folderId);
  }, [folders]);

  return {
    folders,
    folderHierarchy,
    selectedFolderId,
    setSelectedFolderId,
    isLoading,
    createFolder,
    updateFolder,
    deleteFolder,
    getFolderPath,
    getSubfolders,
  };
});