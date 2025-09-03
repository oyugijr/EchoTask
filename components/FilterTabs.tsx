import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { useThemeColors } from '@/hooks/use-theme';

interface FilterTabsProps {
  activeFilter: 'all' | 'notes' | 'tasks';
  onFilterChange: (filter: 'all' | 'notes' | 'tasks') => void;
  notesCount: number;
  tasksCount: number;
}

export const FilterTabs: React.FC<FilterTabsProps> = ({
  activeFilter,
  onFilterChange,
  notesCount,
  tasksCount,
}) => {
  const colors = useThemeColors();
  const tabs = [
    { key: 'all' as const, label: 'All', count: notesCount + tasksCount },
    { key: 'notes' as const, label: 'Notes', count: notesCount },
    { key: 'tasks' as const, label: 'Tasks', count: tasksCount },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab,
            { backgroundColor: colors.surface, borderColor: colors.border },
            activeFilter === tab.key && [
              styles.activeTab, 
              { 
                backgroundColor: colors.primary + '15', // 15% opacity
                borderColor: colors.primary,
              }
            ],
            index > 0 && { marginLeft: 8 },
          ]}
          onPress={() => onFilterChange(tab.key)}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              activeFilter === tab.key && [styles.activeTabText, { color: colors.primary }],
            ]}
          >
            {tab.label} ({tab.count})
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 0,
    shadowColor: 'transparent',
  },
  activeTab: {
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '600',
  },
});