import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateUrgencyLevel, isOverdue, getUrgencyClassSuffix, getUrgencyDescription } from '../utils/dateUtils';
import type { UrgencyLevel } from '../utils/dateUtils';

describe('dateUtils', () => {
  let mockDate: Date;

  beforeEach(() => {
    // Mock current date to 2024-01-15 12:00:00
    mockDate = new Date('2024-01-15T12:00:00Z');
    vi.setSystemTime(mockDate);
  });

  describe('calculateUrgencyLevel', () => {
    it('should return "none" when no scheduled date', () => {
      expect(calculateUrgencyLevel(undefined, false)).toBe('none');
      expect(calculateUrgencyLevel('', false)).toBe('none');
    });

    it('should return "none" when task is completed', () => {
      const pastDate = '2024-01-10T12:00:00Z'; // 5 days ago
      expect(calculateUrgencyLevel(pastDate, true)).toBe('none');
    });

    it('should return "none" when invalid date', () => {
      expect(calculateUrgencyLevel('invalid-date', false)).toBe('none');
    });

    it('should return "none" when more than 1 day in future', () => {
      const futureDate = '2024-01-17T12:00:00Z'; // 2 days in future
      expect(calculateUrgencyLevel(futureDate, false)).toBe('none');
    });

    it('should return "approaching" when within 24 hours but not overdue', () => {
      const approachingDate = '2024-01-16T06:00:00Z'; // 18 hours in future
      expect(calculateUrgencyLevel(approachingDate, false)).toBe('approaching');
      
      // Edge case: exactly 1 day in future
      const exactlyOneDayFuture = '2024-01-16T12:00:00Z';
      expect(calculateUrgencyLevel(exactlyOneDayFuture, false)).toBe('approaching');
    });

    it('should return "due-today" when due today or overdue by less than 1 day', () => {
      // Due today (same time)
      const dueTodayDate = '2024-01-15T12:00:00Z';
      expect(calculateUrgencyLevel(dueTodayDate, false)).toBe('due-today');
      
      // Overdue by a few hours
      const overdueHoursDate = '2024-01-15T06:00:00Z'; // 6 hours ago
      expect(calculateUrgencyLevel(overdueHoursDate, false)).toBe('due-today');
      
      // Almost 1 day overdue (but still within due-today range)
      const almostOneDayOverdue = '2024-01-14T18:00:00Z'; // 18 hours ago
      expect(calculateUrgencyLevel(almostOneDayOverdue, false)).toBe('due-today');
    });

    it('should return "overdue-light" when 1-3 days overdue', () => {
      // Exactly 1 day overdue
      const oneDayOverdue = '2024-01-14T12:00:00Z';
      expect(calculateUrgencyLevel(oneDayOverdue, false)).toBe('overdue-light');
      
      // 2 days overdue
      const twoDaysOverdue = '2024-01-13T12:00:00Z';
      expect(calculateUrgencyLevel(twoDaysOverdue, false)).toBe('overdue-light');
    });

    it('should return "overdue-moderate" when 3-7 days overdue', () => {
      // Exactly 3 days overdue
      const threeDaysOverdue = '2024-01-12T12:00:00Z';
      expect(calculateUrgencyLevel(threeDaysOverdue, false)).toBe('overdue-moderate');
      
      // 4 days overdue
      const fourDaysOverdue = '2024-01-11T12:00:00Z';
      expect(calculateUrgencyLevel(fourDaysOverdue, false)).toBe('overdue-moderate');
      
      // 6 days overdue (still moderate)
      const sixDaysOverdue = '2024-01-09T12:00:00Z';
      expect(calculateUrgencyLevel(sixDaysOverdue, false)).toBe('overdue-moderate');
    });

    it('should return "overdue-severe" when more than 7 days overdue', () => {
      // Exactly 7 days overdue
      const sevenDaysOverdue = '2024-01-08T12:00:00Z';
      expect(calculateUrgencyLevel(sevenDaysOverdue, false)).toBe('overdue-severe');
      
      // 8 days overdue
      const eightDaysOverdue = '2024-01-07T12:00:00Z';
      expect(calculateUrgencyLevel(eightDaysOverdue, false)).toBe('overdue-severe');
      
      // 30 days overdue
      const thirtyDaysOverdue = '2023-12-16T12:00:00Z';
      expect(calculateUrgencyLevel(thirtyDaysOverdue, false)).toBe('overdue-severe');
    });
  });

  describe('isOverdue', () => {
    it('should return false when no urgency', () => {
      expect(isOverdue(undefined, false)).toBe(false);
      expect(isOverdue('2024-01-17T12:00:00Z', false)).toBe(false); // Future
    });

    it('should return false when task is completed', () => {
      const pastDate = '2024-01-10T12:00:00Z';
      expect(isOverdue(pastDate, true)).toBe(false);
    });

    it('should return false when approaching but not overdue', () => {
      const approachingDate = '2024-01-16T06:00:00Z';
      expect(isOverdue(approachingDate, false)).toBe(false);
    });

    it('should return true when due today', () => {
      const dueTodayDate = '2024-01-15T12:00:00Z';
      expect(isOverdue(dueTodayDate, false)).toBe(true);
    });

    it('should return true when overdue at any level', () => {
      // Light overdue
      const lightOverdue = '2024-01-13T12:00:00Z';
      expect(isOverdue(lightOverdue, false)).toBe(true);
      
      // Moderate overdue
      const moderateOverdue = '2024-01-11T12:00:00Z';
      expect(isOverdue(moderateOverdue, false)).toBe(true);
      
      // Severe overdue
      const severeOverdue = '2024-01-07T12:00:00Z';
      expect(isOverdue(severeOverdue, false)).toBe(true);
    });
  });

  describe('getUrgencyClassSuffix', () => {
    it('should return correct CSS class suffixes', () => {
      expect(getUrgencyClassSuffix('none')).toBe('');
      expect(getUrgencyClassSuffix('approaching')).toBe('--approaching');
      expect(getUrgencyClassSuffix('due-today')).toBe('--due-today');
      expect(getUrgencyClassSuffix('overdue-light')).toBe('--overdue-light');
      expect(getUrgencyClassSuffix('overdue-moderate')).toBe('--overdue-moderate');
      expect(getUrgencyClassSuffix('overdue-severe')).toBe('--overdue-severe');
    });
  });

  describe('getUrgencyDescription', () => {
    it('should return correct descriptions', () => {
      expect(getUrgencyDescription('none')).toBe('No urgency');
      expect(getUrgencyDescription('approaching')).toBe('Due within 24 hours');
      expect(getUrgencyDescription('due-today')).toBe('Due today or just overdue');
      expect(getUrgencyDescription('overdue-light')).toBe('1-3 days overdue');
      expect(getUrgencyDescription('overdue-moderate')).toBe('3-7 days overdue');
      expect(getUrgencyDescription('overdue-severe')).toBe('More than 7 days overdue');
    });
  });

  describe('edge cases and real-world scenarios', () => {
    it('should handle timezone differences correctly', () => {
      // Different timezone but same urgency level
      const utcDate = '2024-01-13T12:00:00Z';
      const localDate = '2024-01-13T21:00:00+09:00'; // Same time in JST
      
      expect(calculateUrgencyLevel(utcDate, false)).toBe('overdue-light');
      expect(calculateUrgencyLevel(localDate, false)).toBe('overdue-light');
    });

    it('should handle different time formats', () => {
      // ISO format without Z
      const isoDate = '2024-01-13T12:00:00';
      expect(calculateUrgencyLevel(isoDate, false)).toBe('overdue-light');
      
      // Date only (should be parsed correctly)
      const dateOnly = '2024-01-13';
      const result = calculateUrgencyLevel(dateOnly, false);
      expect(['due-today', 'overdue-light']).toContain(result); // Could be either depending on time parsing
    });

    it('should handle leap year dates', () => {
      // Set mock date to Feb 29 on leap year
      vi.setSystemTime(new Date('2024-02-29T12:00:00Z'));
      
      const yesterdayLeap = '2024-02-28T12:00:00Z'; // 1 day ago
      expect(calculateUrgencyLevel(yesterdayLeap, false)).toBe('overdue-light');
    });

    it('should be consistent across multiple calls', () => {
      const testDate = '2024-01-13T12:00:00Z';
      const result1 = calculateUrgencyLevel(testDate, false);
      const result2 = calculateUrgencyLevel(testDate, false);
      const result3 = calculateUrgencyLevel(testDate, false);
      
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe('overdue-light');
    });
  });
});