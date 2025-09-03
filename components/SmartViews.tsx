import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions } from 'react-native';
import { Calendar, Clock, AlertTriangle, CheckCircle, Star, Pin, Archive } from 'lucide-react-native';
import { useSmartViews } from '@/hooks/use-smart-views';
import { Note, SmartView } from '@/types/note';
import { useThemeColors } from '@/hooks/use-theme';

const { width: screenWidth } = Dimensions.get('window');

interface SmartViewsProps {
  notes: Note[];
  onSelectView: (viewId: SmartView, notes: Note[]) => void;
}

const iconMap = {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Star,
  Pin,
  Archive,
};

export const SmartViews: React.FC<SmartViewsProps> = ({ notes, onSelectView }) => {
  const { smartViews } = useSmartViews(notes);
  const colors = useThemeColors();

  const getIconColor = (viewId: string) => {
    switch (viewId) {
      case 'today': return '#007AFF';
      case 'upcoming': return '#5856D6';
      case 'overdue': return '#FF3B30';
      case 'completed': return '#34C759';
      case 'high-priority': return '#FF9500';
      case 'starred': return '#FFCC02';
      case 'pinned': return '#007AFF';
      case 'archived': return '#8E8E93';
      default: return colors.primary;
    }
  };

  const getGradientColors = (viewId: string) => {
    switch (viewId) {
      case 'today': return ['#007AFF15', '#007AFF08'];
      case 'upcoming': return ['#5856D615', '#5856D608'];
      case 'overdue': return ['#FF3B3015', '#FF3B3008'];
      case 'completed': return ['#34C75915', '#34C75908'];
      case 'high-priority': return ['#FF950015', '#FF950008'];
      case 'starred': return ['#FFCC0215', '#FFCC0208'];
      case 'pinned': return ['#007AFF15', '#007AFF08'];
      case 'archived': return ['#8E8E9315', '#8E8E9308'];
      default: return [colors.primary + '15', colors.primary + '08'];
    }
  };

  const renderSmartView = ({ item, index }: { item: any; index: number }) => {
    const IconComponent = iconMap[item.icon as keyof typeof iconMap] || Calendar;
    const iconColor = getIconColor(item.id);
    const [gradientStart] = getGradientColors(item.id);
    
    // Calculate card width based on screen size for better mobile experience
    const cardWidth = screenWidth > 400 ? 160 : Math.min(140, (screenWidth - 60) / 2.2);
    
    return (
      <TouchableOpacity
        style={[
          styles.viewCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            width: cardWidth,
          }
        ]}
        onPress={() => onSelectView(item.id, item.notes)}
        activeOpacity={0.75}
      >
        <View style={[
          styles.gradientOverlay,
          { backgroundColor: gradientStart }
        ]} />
        
        <View style={styles.viewHeader}>
          <View style={[
            styles.iconContainer,
            { backgroundColor: iconColor + '25' }
          ]}>
            <IconComponent size={20} color={iconColor} strokeWidth={2.2} />
          </View>
          
          <View style={[
            styles.countBadge,
            {
              backgroundColor: item.count > 0 ? iconColor : colors.textTertiary + '30',
            }
          ]}>
            <Text style={[
              styles.countText,
              { color: item.count > 0 ? '#FFFFFF' : colors.textTertiary }
            ]}>
              {item.count}
            </Text>
          </View>
        </View>
        
        <View style={styles.viewContent}>
          <Text style={[styles.viewName, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          
          {item.count > 0 ? (
            <View style={styles.previewContainer}>
              {item.notes.slice(0, 1).map((note: Note) => (
                <Text key={note.id} style={[styles.previewText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {note.title || 'Untitled'}
                </Text>
              ))}
              {item.count > 1 ? (
                <Text style={[styles.moreText, { color: colors.textTertiary }]}>
                  +{item.count - 1} more
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No items
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (smartViews.length === 0) {
    return null;
  }

  // Show important views even if empty, hide others
  const visibleViews = smartViews.filter(view => 
    view.count > 0 || ['today', 'upcoming', 'starred', 'pinned'].includes(view.id)
  );

  if (visibleViews.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Smart Views
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>
          Quick access to your content
        </Text>
      </View>
      
      <FlatList
        data={visibleViews}
        renderItem={renderSmartView}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        snapToInterval={screenWidth > 400 ? 176 : 156}
        decelerationRate="fast"
        snapToAlignment="start"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  sectionHeader: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
  },
  listContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  viewCard: {
    borderRadius: 16,
    padding: 0,
    height: 120,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.4,
  },
  viewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingBottom: 6,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  viewContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  viewName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 18,
  },
  previewContainer: {
    gap: 2,
  },
  previewText: {
    fontSize: 11,
    lineHeight: 14,
    opacity: 0.8,
  },
  moreText: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.6,
    marginTop: 1,
  },
  emptyText: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.5,
  },
});