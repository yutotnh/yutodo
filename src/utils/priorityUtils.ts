import { Priority } from '../types/todo';

/**
 * Priority utility functions
 */

// Get priority display text
export const getPriorityText = (priority: Priority): string => {
  switch (priority) {
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
    default:
      return 'Low';
  }
};

// Get priority CSS class suffix
export const getPriorityClassSuffix = (priority: Priority): string => {
  switch (priority) {
    case 'high':
      return '2';
    case 'medium':
      return '1';
    case 'low':
    default:
      return '0';
  }
};

// Validate priority value
export const isValidPriority = (value: any): value is Priority => {
  return ['low', 'medium', 'high'].includes(value);
};

// Priority options for UI dropdowns
export const PRIORITY_OPTIONS: Array<{ value: Priority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];