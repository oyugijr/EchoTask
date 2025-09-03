import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Mic, MicOff, Loader2, Save, Command } from 'lucide-react-native';
import { useVoiceInput } from '@/hooks/use-voice-input';
import { useVoiceCommands } from '@/hooks/use-voice-commands';
import { AudioNote } from '@/types/note';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onVoiceCommand?: (command: any) => void;
  onAudioNote?: (audioNote: AudioNote) => void;
  showSaveAudio?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ 
  onTranscript, 
  onVoiceCommand, 
  onAudioNote, 
  showSaveAudio = false 
}) => {
  const { voiceState, startRecording, stopRecording, clearTranscript, createAudioNote } = useVoiceInput();
  const { processVoiceCommand, isVoiceCommand } = useVoiceCommands();

  React.useEffect(() => {
    if (voiceState.transcript) {
      // Check if it's a voice command
      if (isVoiceCommand(voiceState.transcript)) {
        const command = processVoiceCommand(voiceState.transcript);
        if (command && onVoiceCommand) {
          onVoiceCommand(command);
        }
      } else {
        onTranscript(voiceState.transcript);
      }
      
      clearTranscript();
    }
  }, [voiceState.transcript, onTranscript, onVoiceCommand, clearTranscript, isVoiceCommand, processVoiceCommand]);

  const handlePress = () => {
    if (voiceState.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSaveAudio = () => {
    const audioNote = createAudioNote();
    if (audioNote && onAudioNote) {
      onAudioNote(audioNote);
      clearTranscript();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.button,
            voiceState.isRecording && styles.recording,
            voiceState.isTranscribing && styles.transcribing,
          ]}
          onPress={handlePress}
          disabled={voiceState.isTranscribing}
        >
          {voiceState.isTranscribing ? (
            <Loader2 size={24} color="#fff" />
          ) : voiceState.isRecording ? (
            <MicOff size={24} color="#fff" />
          ) : (
            <Mic size={24} color="#fff" />
          )}
        </TouchableOpacity>
        
        {showSaveAudio && voiceState.audioUri && (
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSaveAudio}
          >
            <Save size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      
      {voiceState.isRecording && (
        <View style={styles.statusContainer}>
          <Text style={styles.recordingText}>Recording...</Text>
          <Text style={styles.hintText}>Say &quot;create task&quot; or &quot;add note&quot; for voice commands</Text>
        </View>
      )}
      
      {voiceState.isTranscribing && (
        <Text style={styles.transcribingText}>Transcribing...</Text>
      )}
      
      {voiceState.transcript && isVoiceCommand(voiceState.transcript) && (
        <View style={styles.commandDetected}>
          <Command size={16} color="#34C759" />
          <Text style={styles.commandText}>Voice command detected!</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  recording: {
    backgroundColor: '#FF3B30',
  },
  transcribing: {
    backgroundColor: '#FF9500',
  },
  saveButton: {
    backgroundColor: '#34C759',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  recordingText: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '600',
  },
  transcribingText: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600',
    marginTop: 8,
  },
  hintText: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  commandDetected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    gap: 6,
  },
  commandText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
  },
});