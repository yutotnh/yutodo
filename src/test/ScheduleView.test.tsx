import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ScheduleView } from '../components/ScheduleView';
import { Schedule } from '../types/todo';

// i18nをモック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
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
      if (key === 'schedule.startDate') return 'Start Date';
      if (key === 'schedule.endDate') return 'End Date';
      if (key === 'schedule.nextDay') return 'Tomorrow';
      if (key === 'schedule.nextWeek') return 'Next week';
      if (key === 'schedule.nextMonth') return 'Next month';
      if (key === 'schedule.asScheduled') return 'As scheduled';
      if (key === 'schedule.pending') return 'Pending';
      if (key === 'schedule.inactive') return 'Inactive';
      if (key === 'schedule.completed') return 'Completed';
      if (key === 'schedule.activeSchedules') return 'Active Schedules';
      if (key === 'schedule.inactiveSchedules') return 'Inactive Schedules';
      if (key === 'schedule.deleteInactiveSchedules') return 'Delete Inactive Schedules';
      if (key === 'schedule.deleteInactiveSchedulesConfirm') return 'Delete all inactive schedules?';
      if (key === 'schedule.deleteInactiveSchedulesDesc') return 'This will permanently delete all inactive and completed schedules. This action cannot be undone.';
      if (key === 'buttons.cancel') return 'Cancel';
      if (key === 'buttons.delete') return 'Delete';
      return key;
    },
  }),
}));

describe('ScheduleView', () => {
  const mockOnCreateSchedule = vi.fn();
  const mockOnEditSchedule = vi.fn();
  const mockOnDeleteSchedule = vi.fn();
  const mockOnToggleSchedule = vi.fn();

  const mockOnDeleteInactiveSchedules = vi.fn();

  const defaultProps = {
    schedules: [],
    onCreateSchedule: mockOnCreateSchedule,
    onEditSchedule: mockOnEditSchedule,
    onDeleteSchedule: mockOnDeleteSchedule,
    onToggleSchedule: mockOnToggleSchedule,
    onDeleteInactiveSchedules: mockOnDeleteInactiveSchedules,
  };

  const sampleSchedules: Schedule[] = [
    {
      id: '1',
      title: 'Daily Standup',
      type: 'daily',
      startDate: '2024-01-01',
      priority: 'medium',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      time: '09:00',
      nextExecution: '2024-01-15T09:00:00.000Z', // Active schedule with next execution
    },
    {
      id: '2',
      title: 'Weekly Review',
      type: 'weekly',
      startDate: '2024-01-01',
      priority: 'high',
      isActive: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      weeklyConfig: {
        daysOfWeek: [1, 3], // Monday, Wednesday
      },
    },
    {
      id: '3',
      title: 'Completed Task',
      type: 'once',
      startDate: '2024-01-01',
      priority: 'low',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      time: '10:00',
      lastExecuted: '2024-01-01T10:00:00.000Z', // Completed schedule
      nextExecution: undefined,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnDeleteInactiveSchedules.mockClear();
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
    
    // Active schedule should be visible
    expect(screen.getByText('Daily Standup')).toBeInTheDocument();
    
    // Inactive schedule should be in the inactive section
    // First, expand the inactive section
    const inactiveSectionHeader = screen.getByText(/Inactive Schedules/);
    fireEvent.click(inactiveSectionHeader);
    
    // Now the inactive schedule should be visible
    expect(screen.getByText('Weekly Review')).toBeInTheDocument();
  });

  it('shows active/inactive status correctly', () => {
    render(<ScheduleView {...defaultProps} schedules={sampleSchedules} />);
    
    // Get the checkbox for the active schedule (Daily Standup)
    const activeCheckbox = screen.getAllByRole('checkbox')[0];
    expect(activeCheckbox).toBeChecked(); // Daily Standup is active
    
    // Expand inactive section to access inactive schedule checkbox
    const inactiveSectionHeader = screen.getByText(/Inactive Schedules/);
    fireEvent.click(inactiveSectionHeader);
    
    // Now get the checkbox for inactive schedule (Weekly Review)
    const allCheckboxes = screen.getAllByRole('checkbox');
    const inactiveCheckbox = allCheckboxes[1];
    expect(inactiveCheckbox).not.toBeChecked(); // Weekly Review is inactive
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
    
    // Expand inactive section to see the high priority schedule (Weekly Review)
    const inactiveSectionHeader = screen.getByText(/Inactive Schedules/);
    fireEvent.click(inactiveSectionHeader);
    
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('shows disabled styling for inactive schedules', () => {
    render(<ScheduleView {...defaultProps} schedules={sampleSchedules} />);
    
    // Expand inactive section to access the Weekly Review schedule
    const inactiveSectionHeader = screen.getByText(/Inactive Schedules/);
    fireEvent.click(inactiveSectionHeader);
    
    const weeklyReviewItem = screen.getByText('Weekly Review').closest('.schedule-item');
    expect(weeklyReviewItem).toHaveClass('schedule-item--disabled');
  });

  it('formats weekly schedule description correctly', () => {
    render(<ScheduleView {...defaultProps} schedules={sampleSchedules} />);
    
    // Expand inactive section to see the weekly schedule description
    const inactiveSectionHeader = screen.getByText(/Inactive Schedules/);
    fireEvent.click(inactiveSectionHeader);
    
    expect(screen.getByText('Weekly - Monday, Wednesday')).toBeInTheDocument();
  });

  describe('Start and End Date Display', () => {
    it('displays start date when start date is today or future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // Tomorrow
      const futureSchedule: Schedule = {
        id: '3',
        title: 'Future Schedule',
        type: 'once',
        startDate: futureDate.toISOString().split('T')[0],
        priority: 'low',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      render(<ScheduleView {...defaultProps} schedules={[futureSchedule]} />);
      expect(screen.getByText(/Start Date:/)).toBeInTheDocument();
    });

    it('does not display start date when start date is in the past', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday
      const pastSchedule: Schedule = {
        id: '4',
        title: 'Past Schedule',
        type: 'once',
        startDate: pastDate.toISOString().split('T')[0],
        priority: 'low',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      render(<ScheduleView {...defaultProps} schedules={[pastSchedule]} />);
      expect(screen.queryByText(/Start Date:/)).not.toBeInTheDocument();
    });

    it('displays start date when start date is today', () => {
      const today = new Date().toISOString().split('T')[0];
      const todaySchedule: Schedule = {
        id: '5',
        title: 'Today Schedule',
        type: 'once',
        startDate: today,
        priority: 'low',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      render(<ScheduleView {...defaultProps} schedules={[todaySchedule]} />);
      expect(screen.getByText(/Start Date:/)).toBeInTheDocument();
    });

    it('displays end date when end date is provided', () => {
      const futureStartDate = new Date();
      futureStartDate.setDate(futureStartDate.getDate() + 1); // Tomorrow
      const futureEndDate = new Date();
      futureEndDate.setDate(futureEndDate.getDate() + 30); // 30 days from now
      
      const scheduleWithEndDate: Schedule = {
        id: '6',
        title: 'Schedule with End Date',
        type: 'daily',
        startDate: futureStartDate.toISOString().split('T')[0],
        endDate: futureEndDate.toISOString().split('T')[0],
        priority: 'low',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        nextExecution: '2024-01-16T09:00:00.000Z', // Active schedule needs next execution
      };

      render(<ScheduleView {...defaultProps} schedules={[scheduleWithEndDate]} />);
      expect(screen.getByText(/End Date:/)).toBeInTheDocument();
    });

    it('does not display end date when end date is not provided', () => {
      const scheduleWithoutEndDate: Schedule = {
        id: '7',
        title: 'Schedule without End Date',
        type: 'daily',
        startDate: '2024-12-01',
        priority: 'low',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        nextExecution: '2024-01-17T09:00:00.000Z', // Active schedule needs next execution
      };

      render(<ScheduleView {...defaultProps} schedules={[scheduleWithoutEndDate]} />);
      expect(screen.queryByText(/End Date:/)).not.toBeInTheDocument();
    });

    it('displays both start and end dates when both are provided and start date is future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      
      const scheduleWithBothDates: Schedule = {
        id: '8',
        title: 'Schedule with Both Dates',
        type: 'daily',
        startDate: futureDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        priority: 'low',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        nextExecution: '2024-01-18T09:00:00.000Z', // Active schedule needs next execution
      };

      render(<ScheduleView {...defaultProps} schedules={[scheduleWithBothDates]} />);
      expect(screen.getByText(/Start Date:/)).toBeInTheDocument();
      expect(screen.getByText(/End Date:/)).toBeInTheDocument();
    });

    it('shows only end date when start date is past but end date exists', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const futureEndDate = new Date();
      futureEndDate.setDate(futureEndDate.getDate() + 30);
      
      const scheduleWithPastStartFutureEnd: Schedule = {
        id: '9',
        title: 'Past Start Future End',
        type: 'daily',
        startDate: pastDate.toISOString().split('T')[0],
        endDate: futureEndDate.toISOString().split('T')[0],
        priority: 'low',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        nextExecution: '2024-01-19T09:00:00.000Z', // Active schedule needs next execution
      };

      render(<ScheduleView {...defaultProps} schedules={[scheduleWithPastStartFutureEnd]} />);
      expect(screen.queryByText(/Start Date:/)).not.toBeInTheDocument();
      expect(screen.getByText(/End Date:/)).toBeInTheDocument();
    });
  });

  describe('Completed Schedule Handling', () => {
    it('shows completed schedule in inactive section with "Completed" status', () => {
      render(<ScheduleView {...defaultProps} schedules={sampleSchedules} />);
      
      // Expand inactive section to see completed schedule
      const inactiveSectionHeader = screen.getByText(/Inactive Schedules/);
      fireEvent.click(inactiveSectionHeader);
      
      // Completed Task should be in inactive section
      expect(screen.getByText('Completed Task')).toBeInTheDocument();
      
      // Should show "Completed" status in next execution field
      expect(screen.getByText(/Next Execution: Completed/)).toBeInTheDocument();
    });

    it('correctly categorizes active, inactive, and completed schedules', () => {
      render(<ScheduleView {...defaultProps} schedules={sampleSchedules} />);
      
      // Active schedule should be visible immediately
      expect(screen.getByText('Daily Standup')).toBeInTheDocument();
      
      // Should show only Active section by default
      expect(screen.getByText(/Active Schedules/)).toBeInTheDocument();
      
      // Inactive section should show count including completed schedule
      expect(screen.getByText(/Inactive Schedules \(2\)/)).toBeInTheDocument();
      
      // Expand inactive section
      const inactiveSectionHeader = screen.getByText(/Inactive Schedules/);
      fireEvent.click(inactiveSectionHeader);
      
      // Both inactive schedules should be visible
      expect(screen.getByText('Weekly Review')).toBeInTheDocument();
      expect(screen.getByText('Completed Task')).toBeInTheDocument();
    });

    it.skip('displays next execution correctly for different schedule states', () => {
      render(<ScheduleView {...defaultProps} schedules={sampleSchedules} />);
      
      // Active schedule should show the specific next execution date and time
      expect(screen.getByText((content, element) => {
        return element?.textContent?.includes('2024/1/15') && element?.textContent?.includes('18:00') || false;
      })).toBeInTheDocument();
      
      // Expand inactive section
      const inactiveSectionHeader = screen.getByText(/Inactive Schedules/);
      fireEvent.click(inactiveSectionHeader);
      
      // Completed schedule should show "Completed"
      expect(screen.getByText(/Next Execution: Completed/)).toBeInTheDocument();
      
      // Inactive schedule should show "Inactive"
      expect(screen.getByText(/Next Execution: Inactive/)).toBeInTheDocument();
    });
  });

  describe('Delete Inactive Schedules', () => {
    it('shows delete button for inactive schedules when handler is provided', () => {
      render(<ScheduleView {...defaultProps} schedules={sampleSchedules} />);
      
      // Expand inactive section
      const inactiveSectionHeader = screen.getByText(/Inactive Schedules/);
      fireEvent.click(inactiveSectionHeader);
      
      // Delete button should be visible
      const deleteButton = screen.getByTitle('Delete Inactive Schedules');
      expect(deleteButton).toBeInTheDocument();
    });

    it('does not show delete button when handler is not provided', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { onDeleteInactiveSchedules, ...propsWithoutDelete } = defaultProps;
      
      render(<ScheduleView {...propsWithoutDelete} schedules={sampleSchedules} />);
      
      // Delete button should not be visible
      const deleteButton = screen.queryByTitle('Delete Inactive Schedules');
      expect(deleteButton).not.toBeInTheDocument();
    });

    it('shows confirmation dialog when delete button is clicked', () => {
      render(<ScheduleView {...defaultProps} schedules={sampleSchedules} />);
      
      // Expand inactive section
      const inactiveSectionHeader = screen.getByText(/Inactive Schedules/);
      fireEvent.click(inactiveSectionHeader);
      
      // Click delete button
      const deleteButton = screen.getByTitle('Delete Inactive Schedules');
      fireEvent.click(deleteButton);
      
      // Confirmation dialog should appear
      expect(screen.getByText('Delete all inactive schedules?')).toBeInTheDocument();
      expect(screen.getByText(/This will permanently delete all inactive and completed schedules/)).toBeInTheDocument();
    });

    it('calls delete handler when confirmed', () => {
      render(<ScheduleView {...defaultProps} schedules={sampleSchedules} />);
      
      // Expand inactive section
      const inactiveSectionHeader = screen.getByText(/Inactive Schedules/);
      fireEvent.click(inactiveSectionHeader);
      
      // Click delete button
      const deleteButton = screen.getByTitle('Delete Inactive Schedules');
      fireEvent.click(deleteButton);
      
      // Click confirm button
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
      
      // Handler should be called
      expect(mockOnDeleteInactiveSchedules).toHaveBeenCalled();
    });

    it('closes dialog when cancelled', () => {
      render(<ScheduleView {...defaultProps} schedules={sampleSchedules} />);
      
      // Expand inactive section
      const inactiveSectionHeader = screen.getByText(/Inactive Schedules/);
      fireEvent.click(inactiveSectionHeader);
      
      // Click delete button
      const deleteButton = screen.getByTitle('Delete Inactive Schedules');
      fireEvent.click(deleteButton);
      
      // Click cancel button
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      // Dialog should be closed
      expect(screen.queryByText('Delete all inactive schedules?')).not.toBeInTheDocument();
    });
  });
});