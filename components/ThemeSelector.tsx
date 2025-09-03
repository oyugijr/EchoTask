import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sun, Moon, Smartphone } from 'lucide-react-native';
import { useTheme, Theme } from '@/hooks/use-theme';

export const ThemeSelector: React.FC = () => {
  const { theme, colors, setTheme } = useTheme();

  const themeOptions: { value: Theme; label: string; icon: React.ComponentType<any> }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Smartphone },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Appearance
        </Text>
        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
          Choose your preferred theme
        </Text>
      </View>
      
      <View style={styles.optionsContainer}>
        {themeOptions.map((option) => {
          const IconComponent = option.icon;
          const isSelected = theme === option.value;
          
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                { 
                  backgroundColor: isSelected ? colors.primary + '15' : colors.card,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                }
              ]}
              onPress={() => setTheme(option.value)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer,
                { backgroundColor: isSelected ? colors.primary + '20' : colors.background }
              ]}>
                <IconComponent 
                  size={22} 
                  color={isSelected ? colors.primary : colors.textSecondary} 
                  strokeWidth={2}
                />
              </View>
              <Text 
                style={[
                  styles.optionText,
                  { color: isSelected ? colors.primary : colors.textSecondary },
                  isSelected && styles.selectedText
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedText: {
    fontWeight: '600',
  },
});