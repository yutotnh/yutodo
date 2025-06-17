import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ScheduleView } from '../components/ScheduleView';
import { Schedule } from '../types/todo';

// i18nをモック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (key === 'schedule.nextExecution') return 'Next Execution';
      if (key === 'schedule.notScheduled') return 'Not Scheduled';
      if (key === 'schedule.dayOfWeek.0') return 'Sunday';
      if (key === 'schedule.dayOfWeek.1') return 'Monday';
      if (key === 'schedule.dayOfWeek.2') return 'Tuesday';
      if (key === 'schedule.dayOfWeek.3') return 'Wednesday';
      if (key === 'schedule.dayOfWeek.4') return 'Thursday';
      if (key === 'schedule.dayOfWeek.5') return 'Friday';
      if (key === 'schedule.dayOfWeek.6') return 'Saturday';
      if (key === 'schedule.once') return 'Once';
      if (key === 'schedule.daily') return 'Daily';
      if (key === 'schedule.weekly') return 'Weekly';
      if (key === 'schedule.monthly') return 'Monthly';
      if (key === 'priority.high') return 'High';
      if (key === 'priority.medium') return 'Medium';
      if (key === 'schedule.title') return 'Schedules';
      if (key === 'schedule.addNew') return 'Add New Schedule';
      if (key === 'schedule.noSchedules') return 'No schedules found';
      if (key === 'schedule.noSchedulesDesc') return 'Create your first schedule to get started';
      if (key === 'schedule.edit') return 'Edit';
      if (key === 'schedule.delete') return 'Delete';
      return key;
    },
  }),
}));

describe('ScheduleView', () => {
  const mockOnCreateSchedule = vi.fn();
  const mockOnEditSchedule = vi.fn();
  const mockOnDeleteSchedule = vi.fn();
  const mockOnToggleSchedule = vi.fn();

  const defaultProps = {
    schedules: [],
    onCreateSchedule: mockOnCreateSchedule,
    onEditSchedule: mockOnEditSchedule,
    onDeleteSchedule: mockOnDeleteSchedule,
    onToggleSchedule: mockOnToggleSchedule,
  };

  const sampleSchedules: Schedule[] = [
    {
      id: '1',
      title: 'Daily Standup',
      type: 'daily',
      startDate: '2024-01-01',
      priority: 1,
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      time: '09:00',
    },
    {
      id: '2',
      title: 'Weekly Review',
      type: 'weekly',
      startDate: '2024-01-01',
      priority: 2,
      isActive: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      weeklyConfig: {
        daysOfWeek: [1, 3], // Monday, Wednesday
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders schedule view with title', () => {
    render(<ScheduleView {...defaultProps} />);
    expect(screen.getByText('Schedules')).toBeInTheDocument();
  });

  it('renders add new schedule button', () => {
    render(<ScheduleView {...defaultProps} />);
    const addButton = screen.getByText('Add New Schedule');
    expect(addButton).toBeInTheDocument();
  });

  it('calls onCreateSchedule when add button is clicked', () => {
    render(<ScheduleView {...defaultProps} />);
    const addButton = screen.getByText('Add New Schedule');
    fireEvent.click(addButton);
    expect(mockOnCreateSchedule).toHaveBeenCalled();
  });

  it('shows empty state when no schedules', () => {
    render(<ScheduleView {...defaultProps} />);
    expect(screen.getByText('No schedules found')).toBeInTheDocument();
    expect(screen.getByText('Create your first schedule to get started')).toBeInTheDocument();
  });

  it('renders schedule list when schedules exist', () => {
    render(<ScheduleView {...defaultProps} schedules={sampleSchedules} />);
    
    expect(screen.getByText('Daily Standup')).toBeInTheDocument();
    expect(screen.getByText('Weekly Review')).toBeInTheDocument();
  });

  it('shows active/inactive status correctly', () => {
    render(<ScheduleView {...defaultProps} schedules={sampleSchedules} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked(); // Daily Standup is active
    expect(checkboxes[1]).not.toBeChecked(); // Weekly Review is inactive
  });

  it('calls onToggleSchedule when checkbox is clicked', () => {
    render(<ScheduleView {...defaultProps} schedules={sampleSchedules} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    expect(mockOnToggleSchedule).toHaveBeenCalledWith('1');
  });

  it('calls onEditSchedule when edit button is clicked', () => {
    render(<ScheduleView {...defaultProps} schedules={sampleSchedules} />);
    
    const editButtons = screen.getAllByTitle('Edit');
    fireEvent.click(editButtons[0]);
    
    expect(mockOnEditSchedule).toHaveBeenCalledWith(sampleSchedules[0]);
  });

  it('calls onDeleteSchedule when delete button is clicked', () => {
    render(<ScheduleView {...defaultProps} schedules={sampleSchedules} />);
    
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);
    
    expect(mockOnDeleteSchedule).toHaveBeenCalledWith('1');
  });

  it('displays schedule time when available', () => {
    render(<ScheduleView {...defaultProps} schedules={sampleSchedules} />);
    expect(screen.getByText('09:00')).toBeInTheDocument();
  });

  it('displays priority badge for high priority schedules', () => {
    render(<ScheduleView {...defaultProps} schedules={sampleSchedules} />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('shows disabled styling for inactive schedules', () => {
    render(<ScheduleView {...defaultProps} schedules={sampleSchedules} />);
    
    const weeklyReviewItem = screen.getByText('Weekly Review').closest('.schedule-item');
    expect(weeklyReviewItem).toHaveClass('schedule-item--disabled');
  });

  it('formats weekly schedule description correctly', () => {
    render(<ScheduleView {...defaultProps} schedules={sampleSchedules} />);
    expect(screen.getByText('Weekly - Monday, Wednesday')).toBeInTheDocument();
  });
});