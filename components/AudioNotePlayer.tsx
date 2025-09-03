import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Play, Pause, Volume2, Trash2 } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { AudioNote } from '@/types/note';

interface AudioNotePlayerProps {
  audioNote: AudioNote;
  onDelete?: () => void;
  compact?: boolean;
}

export const AudioNotePlayer: React.FC<AudioNotePlayerProps> = ({
  audioNote,
  onDelete,
  compact = false,
}) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(audioNote.duration);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadAndPlaySound = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, use HTML5 Audio
        const audio = new window.Audio(audioNote.uri);
        audio.play();
        setIsPlaying(true);
        
        audio.onended = () => {
          setIsPlaying(false);
        };
      } else {
        // For mobile, use expo-av
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioNote.uri },
          { shouldPlay: true }
        );
        
        setSound(newSound);
        setIsPlaying(true);

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis || 0);
            setDuration(status.durationMillis || audioNote.duration);
            
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPosition(0);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const pauseSound = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseSound();
    } else {
      loadAndPlaySound();
    }
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <TouchableOpacity style={styles.compactPlayButton} onPress={handlePlayPause}>
          {isPlaying ? (
            <Pause size={16} color="#007AFF" />
          ) : (
            <Play size={16} color="#007AFF" />
          )}
        </TouchableOpacity>
        <Text style={styles.compactDuration}>{formatTime(duration)}</Text>
        {onDelete && (
          <TouchableOpacity style={styles.compactDeleteButton} onPress={onDelete}>
            <Trash2 size={14} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Volume2 size={20} color="#007AFF" />
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>Audio Note</Text>
          <Text style={styles.timestamp}>
            {new Date(audioNote.createdAt).toLocaleTimeString()}
          </Text>
        </View>
        {onDelete && (
          <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
            <Trash2 size={18} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
          {isPlaying ? (
            <Pause size={24} color="#fff" />
          ) : (
            <Play size={24} color="#fff" />
          )}
        </TouchableOpacity>
        
        <View style={styles.timeInfo}>
          <Text style={styles.timeText}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${duration > 0 ? (position / duration) * 100 : 0}%` }
              ]} 
            />
          </View>
        </View>
      </View>

      {audioNote.transcript && (
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptLabel}>Transcript:</Text>
          <Text style={styles.transcriptText}>{audioNote.transcript}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  timestamp: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeInfo: {
    flex: 1,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  transcriptContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  transcriptLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  transcriptText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  compactPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactDuration: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  compactDeleteButton: {
    padding: 4,
  },
});