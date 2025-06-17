import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TodoFilter } from '../components/TodoFilter';
import { FilterType } from '../types/todo';

// i18nをモック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: { [key: string]: string } = {
        'filters.title': 'Filters',
        'filters.all': 'All',
        'filters.pending': 'Pending',
        'filters.completed': 'Completed', 
        'filters.overdue': 'Overdue',
        'filters.highPriority': 'High Priority',
        'filters.mediumPriority': 'Medium Priority',
        'filters.lowPriority': 'Low Priority'
      };
      return translations[key] || key;
    },
  }),
}));

describe('TodoFilter', () => {
  const mockOnFilterChange = vi.fn();
  
  const defaultCounts = {
    all: 10,
    pending: 5,
    completed: 3,
    overdue: 2,
    high: 1,
    medium: 2,
    low: 2
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all filter options', () => {
    render(<TodoFilter currentFilter="all" onFilterChange={mockOnFilterChange} counts={defaultCounts} />);
    
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    expect(screen.getByText('Medium Priority')).toBeInTheDocument();
    expect(screen.getByText('Low Priority')).toBeInTheDocument();
  });

  it('highlights the current filter', () => {
    render(<TodoFilter currentFilter="pending" onFilterChange={mockOnFilterChange} counts={defaultCounts} />);
    
    const pendingButton = screen.getByText('Pending');
    expect(pendingButton.closest('button')).toHaveClass('filter-btn--active');
  });

  it('calls onFilterChange when a filter is clicked', () => {
    render(<TodoFilter currentFilter="all" onFilterChange={mockOnFilterChange} counts={defaultCounts} />);
    
    const completedButton = screen.getByText('Completed');
    fireEvent.click(completedButton);
    
    expect(mockOnFilterChange).toHaveBeenCalledWith('completed');
  });

  it('changes active filter when different option is selected', () => {
    const { rerender } = render(<TodoFilter currentFilter="all" onFilterChange={mockOnFilterChange} counts={defaultCounts} />);
    
    let allButton = screen.getByText('All');
    expect(allButton.closest('button')).toHaveClass('filter-btn--active');

    rerender(<TodoFilter currentFilter="overdue" onFilterChange={mockOnFilterChange} counts={defaultCounts} />);
    
    const overdueButton = screen.getByText('Overdue');
    expect(overdueButton.closest('button')).toHaveClass('filter-btn--active');
    
    allButton = screen.getByText('All');
    expect(allButton.closest('button')).not.toHaveClass('filter-btn--active');
  });

  it('handles all filter types correctly', () => {
    const filterTypes: FilterType[] = [
      'all',
      'pending', 
      'completed',
      'overdue',
      'high',
      'medium',
      'low'
    ];
    
    const filterLabels = {
      'all': 'All',
      'pending': 'Pending',
      'completed': 'Completed',
      'overdue': 'Overdue',
      'high': 'High Priority',
      'medium': 'Medium Priority',
      'low': 'Low Priority'
    };

    filterTypes.forEach(filter => {
      const { unmount } = render(<TodoFilter currentFilter={filter} onFilterChange={mockOnFilterChange} counts={defaultCounts} />);
      
      const filterButton = screen.getByText(filterLabels[filter]);
      expect(filterButton.closest('button')).toHaveClass('filter-btn--active');
      
      unmount();
    });
  });

  it('applies correct CSS classes', () => {
    const { container } = render(<TodoFilter currentFilter="all" onFilterChange={mockOnFilterChange} counts={defaultCounts} />);
    
    const filterContainer = container.querySelector('.todo-filter');
    expect(filterContainer).toBeInTheDocument();
    
    const filterButtons = container.querySelectorAll('.filter-btn');
    expect(filterButtons).toHaveLength(7); // All filter options
  });

  it('maintains button accessibility', () => {
    render(<TodoFilter currentFilter="all" onFilterChange={mockOnFilterChange} counts={defaultCounts} />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(7);
    
    buttons.forEach(button => {
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });
  });

  it('handles rapid filter changes', () => {
    render(<TodoFilter currentFilter="all" onFilterChange={mockOnFilterChange} counts={defaultCounts} />);
    
    const pendingButton = screen.getByText('Pending');
    const completedButton = screen.getByText('Completed');
    const overdueButton = screen.getByText('Overdue');
    
    fireEvent.click(pendingButton);
    fireEvent.click(completedButton);
    fireEvent.click(overdueButton);
    
    expect(mockOnFilterChange).toHaveBeenCalledTimes(3);
    expect(mockOnFilterChange).toHaveBeenNthCalledWith(1, 'pending');
    expect(mockOnFilterChange).toHaveBeenNthCalledWith(2, 'completed');
    expect(mockOnFilterChange).toHaveBeenNthCalledWith(3, 'overdue');
  });

  it('does not call onFilterChange when clicking the already active filter', () => {
    render(<TodoFilter currentFilter="pending" onFilterChange={mockOnFilterChange} counts={defaultCounts} />);
    
    const pendingButton = screen.getByText('Pending');
    fireEvent.click(pendingButton);
    
    // Should still be called even if clicking the same filter
    expect(mockOnFilterChange).toHaveBeenCalledWith('pending');
  });

  it('displays filter counts correctly', () => {
    const { container } = render(<TodoFilter currentFilter="all" onFilterChange={mockOnFilterChange} counts={defaultCounts} />);
    
    const filterCounts = container.querySelectorAll('.filter-count');
    expect(filterCounts).toHaveLength(7);
    
    // Check specific filter counts in order
    expect(filterCounts[0]).toHaveTextContent('10'); // all
    expect(filterCounts[1]).toHaveTextContent('5');  // pending
    expect(filterCounts[2]).toHaveTextContent('3');  // completed
    expect(filterCounts[3]).toHaveTextContent('2');  // overdue
    expect(filterCounts[4]).toHaveTextContent('1');  // high
    expect(filterCounts[5]).toHaveTextContent('2');  // medium
    expect(filterCounts[6]).toHaveTextContent('2');  // low
  });
});