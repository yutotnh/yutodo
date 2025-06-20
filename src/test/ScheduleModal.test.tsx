import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ScheduleModal } from '../components/ScheduleModal';
import { Schedule } from '../types/todo';

// i18nをモック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('ScheduleModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(<ScheduleModal {...defaultProps} />);
    expect(screen.getByText('schedule.createSchedule')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ScheduleModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('schedule.createSchedule')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<ScheduleModal {...defaultProps} />);
    const closeButton = document.querySelector('.modal-close');
    fireEvent.click(closeButton!);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    render(<ScheduleModal {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay is clicked (excluding header area)', () => {
    render(<ScheduleModal {...defaultProps} />);
    const overlay = screen.getByTestId('modal-overlay');
    // ヘッダー領域外（Y座標30px以上）でクリック
    fireEvent.click(overlay, { clientY: 100 });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not close when modal content is clicked', () => {
    render(<ScheduleModal {...defaultProps} />);
    const modalContent = screen.getByTestId('modal-content');
    fireEvent.click(modalContent);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('does not close when clicking in header area', () => {
    render(<ScheduleModal {...defaultProps} />);
    const overlay = screen.getByTestId('modal-overlay');
    // ヘッダー領域内（Y座標30px以下）でクリック
    fireEvent.click(overlay, { clientY: 20 });
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('renders title input', () => {
    render(<ScheduleModal {...defaultProps} />);
    const titleInput = screen.getByLabelText('schedule.title');
    expect(titleInput).toBeInTheDocument();
  });

  it('renders schedule type selector', () => {
    render(<ScheduleModal {...defaultProps} />);
    const typeSelect = screen.getByLabelText('schedule.type');
    expect(typeSelect).toBeInTheDocument();
  });

  it('renders priority selector', () => {
    render(<ScheduleModal {...defaultProps} />);
    const prioritySelect = screen.getByLabelText('schedule.priority');
    expect(prioritySelect).toBeInTheDocument();
  });

  it('submits form with correct data', async () => {
    render(<ScheduleModal {...defaultProps} />);
    
    const titleInput = screen.getByLabelText('schedule.title');
    const typeSelect = screen.getByLabelText('schedule.type');
    const submitButton = screen.getByRole('button', { name: 'common.create' });

    fireEvent.change(titleInput, { target: { value: 'Test Schedule' } });
    fireEvent.change(typeSelect, { target: { value: 'daily' } });
    
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Schedule',
          type: 'daily',
          isActive: true,
          priority: 'low',
          time: '09:00',
          excludeWeekends: false,
        })
      );
    });
  });

  it('populates form when editing existing schedule', () => {
    const existingSchedule: Schedule = {
      id: '1',
      title: 'Existing Schedule',
      type: 'weekly',
      startDate: '2024-01-01',
      priority: 'medium',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    render(<ScheduleModal {...defaultProps} schedule={existingSchedule} />);
    
    const titleInput = screen.getByLabelText('schedule.title');
    const typeSelect = screen.getByLabelText('schedule.type');
    
    expect(titleInput).toHaveValue('Existing Schedule');
    expect(typeSelect).toHaveValue('weekly');
  });

  it('shows weekly configuration when weekly type is selected', () => {
    render(<ScheduleModal {...defaultProps} />);
    
    const typeSelect = screen.getByLabelText('schedule.type');
    fireEvent.change(typeSelect, { target: { value: 'weekly' } });
    
    expect(screen.getByText('schedule.daysOfWeek')).toBeInTheDocument();
  });

  it('shows monthly configuration when monthly type is selected', () => {
    render(<ScheduleModal {...defaultProps} />);
    
    const typeSelect = screen.getByLabelText('schedule.type');
    fireEvent.change(typeSelect, { target: { value: 'monthly' } });
    
    expect(screen.getByText('schedule.monthlyPattern')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<ScheduleModal {...defaultProps} />);
    
    const submitButton = screen.getByRole('button', { name: 'common.create' });
    fireEvent.click(submitButton);

    // Title is required
    const titleInput = screen.getByLabelText('schedule.title');
    expect(titleInput).toBeRequired();
  });
});