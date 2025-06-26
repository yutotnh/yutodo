import { describe, it, expect } from 'vitest';
import { 
  getPriorityText, 
  getPriorityClassSuffix,
  isValidPriority,
  PRIORITY_OPTIONS
} from '../utils/priorityUtils';

// Test utility functions that might be used in the application
describe('Utility Functions', () => {
  describe('Date formatting', () => {
    it('should format ISO date strings correctly', () => {
      const isoDate = '2025-06-15T10:30:00.000Z';
      const date = new Date(isoDate);
      
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(5); // June is month 5 (0-indexed)
      expect(date.getDate()).toBe(15);
    });
    
    it('should handle invalid date strings gracefully', () => {
      const invalidDate = new Date('invalid-date');
      expect(isNaN(invalidDate.getTime())).toBe(true);
    });
  });
  
  describe('UUID validation', () => {
    it('should validate UUID format', () => {
      const validUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      expect(uuidRegex.test(validUuid)).toBe(true);
    });
    
    it('should reject invalid UUID format', () => {
      const invalidUuids = [
        'not-a-uuid',
        '12345',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890-extra',
        ''
      ];
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      invalidUuids.forEach(invalidUuid => {
        expect(uuidRegex.test(invalidUuid)).toBe(false);
      });
    });
  });
  
  describe('Priority validation', () => {
    it('should validate priority values', () => {
      const validPriorities = ['low', 'medium', 'high'];
      const invalidPriorities = [0, 1, 2, 'invalid', null, undefined];
      
      validPriorities.forEach(priority => {
        expect(['low', 'medium', 'high'].includes(priority)).toBe(true);
      });
      
      invalidPriorities.forEach(priority => {
        expect(['low', 'medium', 'high'].includes(priority as string)).toBe(false);
      });
    });
  });
  
  describe('Text validation', () => {
    it('should validate todo title requirements', () => {
      const validTitles = [
        'Valid todo title',
        'Short',
        'A'.repeat(100), // Long but reasonable title
        'Title with 🚀 emoji',
        'タイトル', // Japanese
        'Título', // Spanish with accent
      ];
      
      const invalidTitles = [
        '', // Empty
        '   ', // Only whitespace
        null,
        undefined
      ];
      
      validTitles.forEach(title => {
        expect(typeof title === 'string' && title.trim().length > 0).toBe(true);
      });
      
      invalidTitles.forEach(title => {
        expect(typeof title === 'string' && title.trim().length > 0).toBe(false);
      });
    });
    
    it('should handle markdown content', () => {
      const markdownContent = '**Bold** and *italic* text with [link](https://example.com)';
      
      // Basic markdown detection
      expect(markdownContent.includes('**')).toBe(true);
      expect(markdownContent.includes('*')).toBe(true);
      expect(markdownContent.includes('[link]')).toBe(true);
    });
  });
  
  describe('Theme validation', () => {
    it('should validate theme values', () => {
      const validThemes = ['auto', 'light', 'dark'];
      const invalidThemes = ['blue', 'custom', '', null, undefined, 123];
      
      validThemes.forEach(theme => {
        expect(validThemes.includes(theme)).toBe(true);
      });
      
      invalidThemes.forEach(theme => {
        expect(validThemes.includes(theme as any)).toBe(false);
      });
    });
  });
  
  describe('Language validation', () => {
    it('should validate language codes', () => {
      const validLanguages = ['auto', 'en', 'ja'];
      const invalidLanguages = ['spanish', 'chinese', '', null, undefined];
      
      validLanguages.forEach(lang => {
        expect(validLanguages.includes(lang)).toBe(true);
      });
      
      invalidLanguages.forEach(lang => {
        expect(validLanguages.includes(lang as any)).toBe(false);
      });
    });
  });
  
  describe('URL validation', () => {
    it('should validate server URLs', () => {
      const validUrls = [
        'http://localhost:3001',
        'https://example.com',
        'http://192.168.1.100:3000',
        'https://subdomain.example.com:8080'
      ];
      
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'localhost:3001', // Missing protocol
        '',
        null,
        undefined
      ];
      
      validUrls.forEach(url => {
        expect(url.startsWith('http://') || url.startsWith('https://')).toBe(true);
      });
      
      invalidUrls.forEach(url => {
        if (typeof url === 'string') {
          expect(url.startsWith('http://') || url.startsWith('https://')).toBe(false);
        } else {
          expect(url).toBeFalsy();
        }
      });
    });
  });
  
  describe('CSS validation', () => {
    it('should handle custom CSS content', () => {
      const validCss = [
        '',
        '.app { color: red; }',
        'body { background: #f0f0f0; font-family: Arial; }',
        '/* Comment */ .class { property: value; }'
      ];
      
      validCss.forEach(css => {
        expect(typeof css === 'string').toBe(true);
        // Basic CSS syntax check (contains braces or is empty)
        if (css.trim().length > 0) {
          expect(css.includes('{') && css.includes('}')).toBe(true);
        }
      });
    });
    
    it('should detect potentially malicious CSS', () => {
      const suspiciousCss = [
        'javascript:alert("xss")',
        '@import url("malicious.css")',
        'expression(alert("xss"))'
      ];
      
      suspiciousCss.forEach(css => {
        const lowerCss = css.toLowerCase();
        const hasSuspiciousContent = 
          lowerCss.includes('javascript:') ||
          lowerCss.includes('@import') ||
          lowerCss.includes('expression(');
        
        expect(hasSuspiciousContent).toBe(true);
      });
    });
  });
  
  describe('Error handling', () => {
    it('should handle network errors gracefully', () => {
      const networkErrors = [
        new Error('Network error'),
        new Error('ECONNREFUSED'),
        new Error('Timeout'),
        new Error('CORS error')
      ];
      
      networkErrors.forEach(error => {
        expect(error instanceof Error).toBe(true);
        expect(typeof error.message === 'string').toBe(true);
        expect(error.message.length > 0).toBe(true);
      });
    });
    
    it('should validate error response format', () => {
      const errorResponse = {
        error: true,
        message: 'Something went wrong',
        code: 500
      };
      
      expect(errorResponse.error).toBe(true);
      expect(typeof errorResponse.message === 'string').toBe(true);
      expect(typeof errorResponse.code === 'number').toBe(true);
    });
  });
  
  describe('Data serialization', () => {
    it('should serialize todo data correctly', () => {
      const todo = {
        id: 'test-id',
        title: 'Test Todo',
        description: 'Test Description',
        completed: false,
        priority: 'medium',
        scheduledFor: '2025-06-15T10:00:00.000Z',
        createdAt: '2025-06-14T10:00:00.000Z',
        updatedAt: '2025-06-14T10:00:00.000Z',
        order: 0
      };
      
      const serialized = JSON.stringify(todo);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized).toEqual(todo);
      expect(typeof deserialized.completed === 'boolean').toBe(true);
      expect(typeof deserialized.priority === 'string').toBe(true);
    });
    
    it('should handle special characters in serialization', () => {
      const todoWithSpecialChars = {
        id: 'test-id',
        title: 'Special: "quotes" & <tags> and 中文',
        description: 'Line 1\nLine 2\tTabbed',
        completed: false,
        priority: 'low'
      };
      
      const serialized = JSON.stringify(todoWithSpecialChars);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized.title).toBe(todoWithSpecialChars.title);
      expect(deserialized.description).toBe(todoWithSpecialChars.description);
    });
  });

  describe('Priority Utilities', () => {

    describe('getPriorityText', () => {
      it('should return display text for string priorities', () => {
        expect(getPriorityText('low')).toBe('Low');
        expect(getPriorityText('medium')).toBe('Medium');
        expect(getPriorityText('high')).toBe('High');
      });

      it('should handle invalid priorities', () => {
        expect(getPriorityText('invalid' as any)).toBe('Low');
      });
    });

    describe('getPriorityClassSuffix', () => {
      it('should return number strings for string priorities', () => {
        expect(getPriorityClassSuffix('low')).toBe('0');
        expect(getPriorityClassSuffix('medium')).toBe('1');
        expect(getPriorityClassSuffix('high')).toBe('2');
      });

    });

    describe('isValidPriority', () => {
      it('should validate priority strings correctly', () => {
        expect(isValidPriority('low')).toBe(true);
        expect(isValidPriority('medium')).toBe(true);
        expect(isValidPriority('high')).toBe(true);
      });

      it('should reject invalid values', () => {
        expect(isValidPriority('invalid')).toBe(false);
        expect(isValidPriority(0)).toBe(false);
        expect(isValidPriority(1)).toBe(false);
        expect(isValidPriority(2)).toBe(false);
        expect(isValidPriority(null)).toBe(false);
        expect(isValidPriority(undefined)).toBe(false);
        expect(isValidPriority('')).toBe(false);
      });
    });

    describe('PRIORITY_OPTIONS', () => {
      it('should provide correct options for UI dropdowns', () => {
        expect(PRIORITY_OPTIONS).toHaveLength(3);
        expect(PRIORITY_OPTIONS[0]).toEqual({ value: 'low', label: 'Low' });
        expect(PRIORITY_OPTIONS[1]).toEqual({ value: 'medium', label: 'Medium' });
        expect(PRIORITY_OPTIONS[2]).toEqual({ value: 'high', label: 'High' });
      });
    });

  });
});