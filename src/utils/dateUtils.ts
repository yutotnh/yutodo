// Date utility functions for todo scheduling and urgency detection

export type UrgencyLevel = 'none' | 'approaching' | 'due-today' | 'overdue-light' | 'overdue-moderate' | 'overdue-severe';

/**
 * Calculate the urgency level of a todo item based on its scheduled date
 * @param scheduledFor - The scheduled date string (ISO format)
 * @param completed - Whether the todo is completed
 * @returns UrgencyLevel indicating the urgency state
 */
export function calculateUrgencyLevel(scheduledFor: string | undefined, completed: boolean): UrgencyLevel {
  // No urgency if no schedule or task is completed
  if (!scheduledFor || completed) {
    return 'none';
  }

  const now = new Date();
  const scheduledDate = new Date(scheduledFor);
  
  // Invalid date handling
  if (isNaN(scheduledDate.getTime())) {
    return 'none';
  }

  // Calculate time difference in milliseconds
  const timeDiff = scheduledDate.getTime() - now.getTime();
  
  // Convert to days (negative for overdue)
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

  // Urgency level determination
  if (daysDiff > 1) {
    // More than 1 day in the future
    return 'none';
  } else if (daysDiff > 0 && daysDiff <= 1) {
    // Within 24 hours but not overdue (approaching deadline)
    return 'approaching';
  } else if (daysDiff <= 0 && daysDiff > -1) {
    // Due now or overdue by less than 1 day
    return 'due-today';
  } else if (daysDiff <= -1 && daysDiff > -3) {
    // 1-3 days overdue
    return 'overdue-light';
  } else if (daysDiff <= -3 && daysDiff > -7) {
    // 3-7 days overdue
    return 'overdue-moderate';
  } else {
    // More than 7 days overdue
    return 'overdue-severe';
  }
}

/**
 * Check if a todo item is overdue (any level of overdue)
 * @param scheduledFor - The scheduled date string (ISO format)
 * @param completed - Whether the todo is completed
 * @returns boolean indicating if the todo is overdue
 */
export function isOverdue(scheduledFor: string | undefined, completed: boolean): boolean {
  const urgencyLevel = calculateUrgencyLevel(scheduledFor, completed);
  return urgencyLevel.startsWith('overdue-') || urgencyLevel === 'due-today';
}

/**
 * Get CSS class suffix for urgency level
 * @param urgencyLevel - The urgency level
 * @returns CSS class suffix string
 */
export function getUrgencyClassSuffix(urgencyLevel: UrgencyLevel): string {
  switch (urgencyLevel) {
    case 'approaching':
      return '--approaching';
    case 'due-today':
      return '--due-today';
    case 'overdue-light':
      return '--overdue-light';
    case 'overdue-moderate':
      return '--overdue-moderate';
    case 'overdue-severe':
      return '--overdue-severe';
    default:
      return '';
  }
}

/**
 * Get human-readable description of urgency level
 * @param urgencyLevel - The urgency level
 * @returns Descriptive string for the urgency level
 */
export function getUrgencyDescription(urgencyLevel: UrgencyLevel): string {
  switch (urgencyLevel) {
    case 'approaching':
      return 'Due within 24 hours';
    case 'due-today':
      return 'Due today or just overdue';
    case 'overdue-light':
      return '1-3 days overdue';
    case 'overdue-moderate':
      return '3-7 days overdue';
    case 'overdue-severe':
      return 'More than 7 days overdue';
    default:
      return 'No urgency';
  }
}