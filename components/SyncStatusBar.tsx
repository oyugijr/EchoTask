import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle,
} from 'lucide-react-native';
import { SyncStatus, SyncConflict } from '@/types/note';
import { useThemeColors } from '@/hooks/use-theme';

interface SyncStatusBarProps {
  syncStatus: SyncStatus;
  onManualSync: () => void;
  onResolveConflict: (conflict: SyncConflict, useLocal: boolean) => void;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
  syncStatus,
  onManualSync,
  onResolveConflict,
}) => {
  const colors = useThemeColors();
  const [showConflicts, setShowConflicts] = React.useState(false);

  const formatLastSync = (date?: Date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleConflictResolution = (conflict: SyncConflict, useLocal: boolean) => {
    Alert.alert(
      'Resolve Conflict',
      `Are you sure you want to use the ${useLocal ? 'local' : 'remote'} version?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => onResolveConflict(conflict, useLocal),
        },
      ]
    );
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statusInfo}>
          <View style={styles.connectionStatus}>
            {syncStatus.isOnline ? (
              <Wifi size={16} color={colors.success} />
            ) : (
              <WifiOff size={16} color={colors.error} />
            )}
            <Text style={[styles.connectionText, { color: colors.textSecondary }]}>
              {syncStatus.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>

          {syncStatus.isSyncing && (
            <View style={styles.syncingIndicator}>
              <RefreshCw size={14} color={colors.primary} />
              <Text style={[styles.syncingText, { color: colors.primary }]}>Syncing...</Text>
            </View>
          )}

          {syncStatus.pendingChanges > 0 && (
            <View style={styles.pendingChanges}>
              <Clock size={14} color={colors.warning} />
              <Text style={[styles.pendingText, { color: colors.warning }]}>
                {syncStatus.pendingChanges} pending
              </Text>
            </View>
          )}

          {syncStatus.conflicts.length > 0 && (
            <TouchableOpacity
              style={styles.conflictsIndicator}
              onPress={() => setShowConflicts(true)}
            >
              <AlertTriangle size={14} color={colors.error} />
              <Text style={[styles.conflictsText, { color: colors.error }]}>
                {syncStatus.conflicts.length} conflicts
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.syncActions}>
          <Text style={[styles.lastSyncText, { color: colors.textTertiary }]}>
            Last sync: {formatLastSync(syncStatus.lastSyncAt)}
          </Text>
          
          <TouchableOpacity
            style={[styles.syncButton, { backgroundColor: colors.background }]}
            onPress={onManualSync}
            disabled={syncStatus.isSyncing || !syncStatus.isOnline}
          >
            {syncStatus.isSyncing ? (
              <RefreshCw size={16} color={colors.textTertiary} />
            ) : (
              <CheckCircle size={16} color={syncStatus.isOnline ? colors.primary : colors.textTertiary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showConflicts}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Sync Conflicts</Text>
            <TouchableOpacity
              onPress={() => setShowConflicts(false)}
              style={styles.closeButton}
            >
              <Text style={[styles.closeButtonText, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.conflictsList}>
            {syncStatus.conflicts.map((conflict, index) => (
              <View key={conflict.noteId} style={[styles.conflictItem, { backgroundColor: colors.card }]}>
                <Text style={[styles.conflictTitle, { color: colors.text }]}>
                  Conflict #{index + 1}: {conflict.localVersion.title}
                </Text>
                
                <Text style={[styles.conflictDescription, { color: colors.textTertiary }]}>
                  Conflicting fields: {conflict.conflictFields.join(', ')}
                </Text>

                <View style={styles.conflictVersions}>
                  <View style={[styles.versionContainer, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.versionTitle, { color: colors.text }]}>Local Version</Text>
                    <Text style={[styles.versionDate, { color: colors.textTertiary }]}>
                      Modified: {conflict.localVersion.updatedAt.toLocaleString()}
                    </Text>
                    <Text style={[styles.versionContent, { color: colors.textSecondary }]} numberOfLines={3}>
                      {conflict.localVersion.content}
                    </Text>
                    <TouchableOpacity
                      style={[styles.resolveButton, { backgroundColor: colors.success }]}
                      onPress={() => handleConflictResolution(conflict, true)}
                    >
                      <Text style={styles.resolveButtonText}>Use Local</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.versionContainer, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.versionTitle, { color: colors.text }]}>Remote Version</Text>
                    <Text style={[styles.versionDate, { color: colors.textTertiary }]}>
                      Modified: {conflict.remoteVersion.updatedAt.toLocaleString()}
                    </Text>
                    <Text style={[styles.versionContent, { color: colors.textSecondary }]} numberOfLines={3}>
                      {conflict.remoteVersion.content}
                    </Text>
                    <TouchableOpacity
                      style={[styles.resolveButton, { backgroundColor: colors.primary }]}
                      onPress={() => handleConflictResolution(conflict, false)}
                    >
                      <Text style={styles.resolveButtonText}>Use Remote</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  syncingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  pendingChanges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  conflictsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  conflictsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  syncActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lastSyncText: {
    fontSize: 11,
    fontWeight: '500',
  },
  syncButton: {
    padding: 6,
    borderRadius: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    fontWeight: '700',
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  conflictsList: {
    flex: 1,
    padding: 16,
  },
  conflictItem: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  conflictTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  conflictDescription: {
    fontSize: 14,
    marginBottom: 16,
    fontWeight: '500',
  },
  conflictVersions: {
    flexDirection: 'row',
    gap: 12,
  },
  versionContainer: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  versionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  versionDate: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  versionContent: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  resolveButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  resolveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});