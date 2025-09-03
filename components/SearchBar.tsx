import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, Modal, FlatList } from 'react-native';
import { Search, X, Filter, Tag, Star } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/use-theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  availableTags?: string[];
  onTagFilter?: (tags: string[]) => void;
  onDateFilter?: (dateRange: { start?: Date; end?: Date }) => void;
  onPriorityFilter?: (priority: 'high' | 'medium' | 'low' | null) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search notes and tasks...',
  availableTags = [],
  onTagFilter,
  onDateFilter,
  onPriorityFilter,
}) => {
  const colors = useThemeColors();
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<'high' | 'medium' | 'low' | null>(null);

  const hasActiveFilters = selectedTags.length > 0 || selectedPriority !== null;

  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    setSelectedTags(newTags);
    onTagFilter?.(newTags);
  };

  const handlePrioritySelect = (priority: 'high' | 'medium' | 'low' | null) => {
    setSelectedPriority(priority);
    onPriorityFilter?.(priority);
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedPriority(null);
    onTagFilter?.([]);
    onPriorityFilter?.(null);
  };

  const renderTagItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.tagItem,
        { backgroundColor: colors.surface },
        selectedTags.includes(item) && [styles.selectedTagItem, { backgroundColor: colors.primary }]
      ]}
      onPress={() => handleTagToggle(item)}
    >
      <Tag size={16} color={selectedTags.includes(item) ? '#fff' : colors.primary} />
      <Text style={[
        styles.tagText,
        { color: colors.primary },
        selectedTags.includes(item) && styles.selectedTagText
      ]}>
        #{item}
      </Text>
    </TouchableOpacity>
  );

  const priorityOptions = [
    { value: null, label: 'All Priorities', color: colors.textTertiary },
    { value: 'high' as const, label: 'High Priority', color: colors.error },
    { value: 'medium' as const, label: 'Medium Priority', color: colors.warning },
    { value: 'low' as const, label: 'Low Priority', color: colors.success },
  ];

  return (
    <View>
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
        />
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            hasActiveFilters && [styles.activeFilterButton, { backgroundColor: colors.primary }]
          ]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Filter size={20} color={hasActiveFilters ? '#fff' : colors.textTertiary} />
        </TouchableOpacity>
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')} style={styles.searchClearButton}>
            <X size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {hasActiveFilters && (
        <View style={styles.activeFilters}>
          {selectedTags.map(tag => (
            <View key={tag} style={[styles.activeFilterChip, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[styles.activeFilterText, { color: colors.primary }]}>#{tag}</Text>
              <TouchableOpacity onPress={() => handleTagToggle(tag)}>
                <X size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
          {selectedPriority && (
            <View style={[styles.activeFilterChip, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[styles.activeFilterText, { color: colors.primary }]}>{selectedPriority} priority</Text>
              <TouchableOpacity onPress={() => handlePrioritySelect(null)}>
                <X size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
            <Text style={[styles.clearFiltersText, { color: colors.textTertiary }]}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <X size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={[styles.modalClearButton, { color: colors.primary }]}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.filterSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Priority</Text>
            {priorityOptions.map(option => (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.priorityOption,
                  { backgroundColor: colors.surface },
                  selectedPriority === option.value && [styles.selectedPriorityOption, { backgroundColor: `${colors.primary}20` }]
                ]}
                onPress={() => handlePrioritySelect(option.value)}
              >
                <Star size={16} color={option.color} />
                <Text style={[
                  styles.priorityText,
                  { color: colors.text },
                  selectedPriority === option.value && [styles.selectedPriorityText, { color: colors.primary }]
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {availableTags.length > 0 && (
            <View style={[styles.filterSection, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Tags</Text>
              <FlatList
                data={availableTags}
                renderItem={renderTagItem}
                keyExtractor={(item) => item}
                numColumns={2}
                columnWrapperStyle={styles.tagRow}
              />
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  filterButton: {
    padding: 8,
    marginRight: 4,
    borderRadius: 8,
  },
  activeFilterButton: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  searchClearButton: {
    padding: 4,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  activeFilterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearFiltersText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  modalContainer: {
    flex: 1,
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
  },
  modalClearButton: {
    fontSize: 16,
  },
  filterSection: {
    padding: 16,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  selectedPriorityOption: {
    // backgroundColor set dynamically
  },
  priorityText: {
    fontSize: 16,
  },
  selectedPriorityText: {
    fontWeight: '600',
  },
  tagRow: {
    justifyContent: 'space-between',
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 8,
    gap: 6,
    flex: 0.48,
  },
  selectedTagItem: {
    // backgroundColor set dynamically
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedTagText: {
    color: '#fff',
  },
});