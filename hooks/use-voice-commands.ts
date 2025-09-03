import { useCallback } from 'react';
import { Note } from '@/types/note';

interface VoiceCommand {
  pattern: RegExp;
  action: (matches: RegExpMatchArray, transcript: string) => Partial<Note> | null;
}

export const useVoiceCommands = () => {
  const commands: VoiceCommand[] = [
    {
      pattern: /^(create|add|new)\s+(task|todo)\s+(.+)/i,
      action: (matches) => ({
        type: 'task' as const,
        title: matches[3].trim(),
        content: '',
        tags: [],
      })
    },
    {
      pattern: /^(create|add|new)\s+(note)\s+(.+)/i,
      action: (matches) => ({
        type: 'note' as const,
        title: matches[3].trim(),
        content: '',
        tags: [],
      })
    },
    {
      pattern: /^(high|medium|low)\s+priority\s+(.+)/i,
      action: (matches) => ({
        type: 'task' as const,
        title: matches[2].trim(),
        priority: matches[1].toLowerCase() as 'high' | 'medium' | 'low',
        content: '',
        tags: [],
      })
    },
    {
      pattern: /^remind\s+me\s+(.+)\s+(today|tomorrow|in\s+\d+\s+(hours?|days?))/i,
      action: (matches) => {
        const title = matches[1].trim();
        const timePhrase = matches[2].toLowerCase();
        
        let reminderDate = new Date();
        if (timePhrase === 'tomorrow') {
          reminderDate.setDate(reminderDate.getDate() + 1);
        } else if (timePhrase.includes('hours')) {
          const hours = parseInt(timePhrase.match(/\d+/)?.[0] || '1');
          reminderDate.setHours(reminderDate.getHours() + hours);
        } else if (timePhrase.includes('days')) {
          const days = parseInt(timePhrase.match(/\d+/)?.[0] || '1');
          reminderDate.setDate(reminderDate.getDate() + days);
        }
        
        return {
          type: 'task' as const,
          title,
          reminderDate,
          content: '',
          tags: [],
        };
      }
    },
    {
      pattern: /^tag\s+(.+)\s+with\s+(.+)/i,
      action: (matches) => {
        const title = matches[1].trim();
        const tagsString = matches[2].trim();
        const tags = tagsString.split(/[,\s]+/).filter(tag => tag.length > 0);
        
        return {
          type: 'note' as const,
          title,
          tags,
          content: '',
        };
      }
    },
  ];

  const processVoiceCommand = useCallback((transcript: string): Partial<Note> | null => {
    const cleanTranscript = transcript.trim();
    
    for (const command of commands) {
      const matches = cleanTranscript.match(command.pattern);
      if (matches) {
        console.log('Voice command detected:', matches[0]);
        return command.action(matches, cleanTranscript);
      }
    }
    
    return null;
  }, []);

  const isVoiceCommand = useCallback((transcript: string): boolean => {
    const cleanTranscript = transcript.trim().toLowerCase();
    return commands.some(command => command.pattern.test(cleanTranscript));
  }, []);

  return {
    processVoiceCommand,
    isVoiceCommand,
  };
};