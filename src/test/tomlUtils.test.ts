import { describe, it, expect } from 'vitest';
import { escapeTomlString, formatTomlKeyValue } from '../utils/tomlUtils';

describe('tomlUtils', () => {
  describe('escapeTomlString', () => {
    it('should escape double quotes', () => {
      const input = 'Hello "world"';
      const result = escapeTomlString(input);
      expect(result).toBe('Hello \\"world\\"');
    });

    it('should escape backslashes', () => {
      const input = 'C:\\Users\\test';
      const result = escapeTomlString(input);
      expect(result).toBe('C:\\\\Users\\\\test');
    });

    it('should escape both backslashes and quotes in correct order', () => {
      const input = 'Path: "C:\\Program Files\\"';
      const result = escapeTomlString(input);
      expect(result).toBe('Path: \\"C:\\\\Program Files\\\\\\"');
    });

    it('should handle empty string', () => {
      const input = '';
      const result = escapeTomlString(input);
      expect(result).toBe('');
    });

    it('should handle string without special characters', () => {
      const input = 'Hello world';
      const result = escapeTomlString(input);
      expect(result).toBe('Hello world');
    });

    it('should handle multiple backslashes', () => {
      const input = 'test\\\\path';
      const result = escapeTomlString(input);
      expect(result).toBe('test\\\\\\\\path');
    });

    it('should handle multiple quotes', () => {
      const input = '"test" "value"';
      const result = escapeTomlString(input);
      expect(result).toBe('\\"test\\" \\"value\\"');
    });

    it('should handle mixed special characters', () => {
      const input = 'Say "Hello\\World"';
      const result = escapeTomlString(input);
      expect(result).toBe('Say \\"Hello\\\\World\\"');
    });

    it('should handle unicode characters', () => {
      const input = 'Hello 世界 "test"';
      const result = escapeTomlString(input);
      expect(result).toBe('Hello 世界 \\"test\\"');
    });

    it('should handle newlines and tabs (no escaping needed for TOML strings)', () => {
      const input = 'Line1\nLine2\tTabbed';
      const result = escapeTomlString(input);
      expect(result).toBe('Line1\nLine2\tTabbed');
    });
  });

  describe('formatTomlKeyValue', () => {
    it('should format simple key-value pair', () => {
      const result = formatTomlKeyValue('title', 'Hello World');
      expect(result).toBe('title = "Hello World"\n');
    });

    it('should format key-value with escaped quotes', () => {
      const result = formatTomlKeyValue('description', 'Say "Hello"');
      expect(result).toBe('description = "Say \\"Hello\\""\n');
    });

    it('should format key-value with escaped backslashes', () => {
      const result = formatTomlKeyValue('path', 'C:\\Users\\test');
      expect(result).toBe('path = "C:\\\\Users\\\\test"\n');
    });

    it('should format key-value with mixed special characters', () => {
      const result = formatTomlKeyValue('message', 'Path: "C:\\Program Files\\"');
      expect(result).toBe('message = "Path: \\"C:\\\\Program Files\\\\\\""\n');
    });

    it('should format key-value with empty value', () => {
      const result = formatTomlKeyValue('empty', '');
      expect(result).toBe('empty = ""\n');
    });

    it('should format key-value with unicode characters', () => {
      const result = formatTomlKeyValue('title', 'タイトル "test"');
      expect(result).toBe('title = "タイトル \\"test\\""\n');
    });
  });
});