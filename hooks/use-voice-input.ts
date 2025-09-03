import { useState, useRef } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { VoiceRecording, AudioNote } from '@/types/note';

export const useVoiceInput = () => {
  const [voiceState, setVoiceState] = useState<VoiceRecording>({
    isRecording: false,
    isTranscribing: false,
    transcript: '',
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingStartTime = useRef<number>(0);

  const startRecording = async () => {
    try {
      if (Platform.OS === 'web') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        
        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          chunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: 'audio/wav' });
          const duration = Date.now() - recordingStartTime.current;
          await transcribeAudio(audioBlob, duration);
        };
        
        recordingStartTime.current = Date.now();
        mediaRecorder.start();
        setVoiceState(prev => ({ ...prev, isRecording: true }));
      } else {
        // Mobile recording with expo-av
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync({
          android: {
            extension: '.m4a',
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
          },
          ios: {
            extension: '.wav',
            outputFormat: Audio.IOSOutputFormat.LINEARPCM,
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        });

        recordingRef.current = recording;
        recordingStartTime.current = Date.now();
        await recording.startAsync();
        setVoiceState(prev => ({ ...prev, isRecording: true }));
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = async () => {
    if (Platform.OS === 'web') {
      if (mediaRecorderRef.current && voiceState.isRecording) {
        mediaRecorderRef.current.stop();
        setVoiceState(prev => ({ ...prev, isRecording: false, isTranscribing: true }));
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      }
    } else {
      // Mobile recording stop
      if (recordingRef.current && voiceState.isRecording) {
        setVoiceState(prev => ({ ...prev, isRecording: false, isTranscribing: true }));
        
        await recordingRef.current.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        
        const uri = recordingRef.current.getURI();
        const duration = Date.now() - recordingStartTime.current;
        
        if (uri) {
          await transcribeAudioFromUri(uri, duration);
        }
      }
    }
  };

  const transcribeAudio = async (audioBlob: Blob, duration: number) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        
        // Create audio URL for web
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setVoiceState(prev => ({
          ...prev,
          isTranscribing: false,
          transcript: result.text,
          audioUri: audioUrl,
          duration,
        }));
      } else {
        throw new Error('Transcription failed');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setVoiceState(prev => ({
        ...prev,
        isTranscribing: false,
        transcript: 'Failed to transcribe audio',
      }));
    }
  };

  const transcribeAudioFromUri = async (uri: string, duration: number) => {
    try {
      const uriParts = uri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      const audioFile = {
        uri,
        name: "recording." + fileType,
        type: "audio/" + fileType
      };

      const formData = new FormData();
      formData.append('audio', audioFile as any);

      const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setVoiceState(prev => ({
          ...prev,
          isTranscribing: false,
          transcript: result.text,
          audioUri: uri,
          duration,
        }));
      } else {
        throw new Error('Transcription failed');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setVoiceState(prev => ({
        ...prev,
        isTranscribing: false,
        transcript: 'Failed to transcribe audio',
      }));
    }
  };

  const clearTranscript = () => {
    setVoiceState(prev => ({ ...prev, transcript: '', audioUri: undefined, duration: undefined }));
  };

  const createAudioNote = (): AudioNote | null => {
    if (voiceState.audioUri && voiceState.duration) {
      return {
        id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        uri: voiceState.audioUri,
        duration: voiceState.duration,
        transcript: voiceState.transcript,
        createdAt: new Date(),
      };
    }
    return null;
  };

  return {
    voiceState,
    startRecording,
    stopRecording,
    clearTranscript,
    createAudioNote,
  };
};