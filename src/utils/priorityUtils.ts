import { Priority } from '../types/todo';

/**
 * Priority utility functions for backward compatibility and conversions
 */

// Convert legacy number priority to new Priority type
export const numberToPriority = (priority: number): Priority => {
  switch (priority) {
    case 2:
      return 'high';
    case 1:
      return 'medium';
    case 0:
    default:
      return 'low';
  }
};

// Convert Priority type to legacy number (for database compatibility during migration)
export const priorityToNumber = (priority: Priority): number => {
  switch (priority) {
    case 'high':
      return 2;
    case 'medium':
      return 1;
    case 'low':
    default:
      return 0;
  }
};

// Get priority display text (handles both string and number types)
export const getPriorityText = (priority: Priority): string => {
  // Handle legacy number values
  if (typeof priority === 'number') {
    return getPriorityText(numberToPriority(priority));
  }
  
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

// Get priority CSS class suffix (handles both string and number types)
export const getPriorityClassSuffix = (priority: Priority): string => {
  if (typeof priority === 'number') {
    return priority.toString();
  }
  return priorityToNumber(priority).toString();
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