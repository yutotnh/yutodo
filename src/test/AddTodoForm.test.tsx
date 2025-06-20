import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AddTodoForm } from '../components/AddTodoForm';

// react-datepickerをモック
vi.mock('react-datepicker', () => ({
  default: ({ className, onChange, value, ...props }: any) => {
    // Filter out DatePicker-specific props that shouldn't be passed to DOM
    const {
      showTimeSelect,
      timeFormat,
      timeIntervals,
      dateFormat,
      placeholderText,
      isClearable,
      shouldCloseOnSelect,
      closeOnScroll,
      preventOpenOnFocus,
      ...domProps
    } = props;
    
    // Acknowledge filtered props to avoid unused variable warnings
    void showTimeSelect;
    void timeFormat;
    void timeIntervals;
    void dateFormat;
    void isClearable;
    void shouldCloseOnSelect;
    void closeOnScroll;
    void preventOpenOnFocus;
    
    return (
      <input 
        data-testid="datepicker" 
        className={className}
        onChange={(e) => onChange && onChange(e.target.value ? new Date(e.target.value) : null)}
        value={value ? value.toISOString().split('T')[0] : ''}
        type="date"
        placeholder={placeholderText}
        {...domProps}
      />
    );
  },
}));

// i18nをモック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('AddTodoForm', () => {
  const mockOnAdd = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders basic form elements', () => {
    render(<AddTodoForm onAdd={mockOnAdd} />);
    
    const titleInput = screen.getByPlaceholderText('Add a new task (supports Markdown)...');
    expect(titleInput).toBeInTheDocument();
    
    const submitButton = screen.getByRole('button');
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toBeDisabled(); // Should be disabled when empty
  });

  it('expands form when title input is focused', () => {
    render(<AddTodoForm onAdd={mockOnAdd} />);
    
    const titleInput = screen.getByPlaceholderText('Add a new task (supports Markdown)...');
    fireEvent.focus(titleInput);
    
    // After focusing, expanded form should be visible
    expect(screen.getByPlaceholderText('Description (supports Markdown)...')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Low Priority')).toBeInTheDocument();
    expect(screen.getByTestId('datepicker')).toBeInTheDocument();
  });

  it('does not expand in slim mode', () => {
    render(<AddTodoForm onAdd={mockOnAdd} slimMode={true} />);
    
    const titleInput = screen.getByPlaceholderText('Add a new task (supports Markdown)...');
    fireEvent.focus(titleInput);
    
    // In slim mode, should not show expanded form
    expect(screen.queryByPlaceholderText('Description (supports Markdown)...')).not.toBeInTheDocument();
  });

  it('enables submit button when title has content', () => {
    render(<AddTodoForm onAdd={mockOnAdd} />);
    
    const titleInput = screen.getByPlaceholderText('Add a new task (supports Markdown)...');
    const submitButton = screen.getByRole('button');
    
    expect(submitButton).toBeDisabled();
    
    fireEvent.change(titleInput, { target: { value: 'New task' } });
    expect(submitButton).not.toBeDisabled();
  });

  it('calls onAdd with correct data when form is submitted', () => {
    render(<AddTodoForm onAdd={mockOnAdd} />);
    
    const titleInput = screen.getByPlaceholderText('Add a new task (supports Markdown)...');
    
    fireEvent.change(titleInput, { target: { value: 'Test Task' } });
    fireEvent.focus(titleInput); // Expand the form
    
    const descriptionInput = screen.getByPlaceholderText('Description (supports Markdown)...');
    const prioritySelect = screen.getByDisplayValue('Low Priority');
    
    fireEvent.change(descriptionInput, { target: { value: 'Test description' } });
    fireEvent.change(prioritySelect, { target: { value: 'medium' } });
    
    const submitButton = screen.getByText('tasks.addTask');
    fireEvent.click(submitButton);
    
    expect(mockOnAdd).toHaveBeenCalledWith({
      title: 'Test Task',
      description: 'Test description',
      completed: false,
      priority: 'medium',
      scheduledFor: undefined
    });
  });

  it('resets form after successful submission', async () => {
    render(<AddTodoForm onAdd={mockOnAdd} />);
    
    const titleInput = screen.getByPlaceholderText('Add a new task (supports Markdown)...');
    
    fireEvent.change(titleInput, { target: { value: 'Test Task' } });
    fireEvent.focus(titleInput);
    
    const descriptionInput = screen.getByPlaceholderText('Description (supports Markdown)...');
    fireEvent.change(descriptionInput, { target: { value: 'Test description' } });
    
    const submitButton = screen.getByText('tasks.addTask');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(titleInput).toHaveValue('');
      // After collapse, the expanded submit button should be gone
    });
  });

  it('collapses form after submission', async () => {
    render(<AddTodoForm onAdd={mockOnAdd} />);
    
    const titleInput = screen.getByPlaceholderText('Add a new task (supports Markdown)...');
    
    fireEvent.change(titleInput, { target: { value: 'Test Task' } });
    fireEvent.focus(titleInput);
    
    // Form should be expanded
    expect(screen.getByPlaceholderText('Description (supports Markdown)...')).toBeInTheDocument();
    
    const submitButton = screen.getByText('tasks.addTask');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Description (supports Markdown)...')).not.toBeInTheDocument();
    });
  });

  it('handles date picker selection', () => {
    render(<AddTodoForm onAdd={mockOnAdd} />);
    
    const titleInput = screen.getByPlaceholderText('Add a new task (supports Markdown)...');
    fireEvent.change(titleInput, { target: { value: 'Test Task' } });
    fireEvent.focus(titleInput);
    
    const datePicker = screen.getByTestId('datepicker');
    fireEvent.change(datePicker, { target: { value: '2024-12-25' } });
    
    const submitButton = screen.getByText('tasks.addTask');
    fireEvent.click(submitButton);
    
    expect(mockOnAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduledFor: expect.any(String)
      })
    );
  });

  it('handles form submission with Enter key', () => {
    render(<AddTodoForm onAdd={mockOnAdd} />);
    
    const titleInput = screen.getByPlaceholderText('Add a new task (supports Markdown)...');
    fireEvent.change(titleInput, { target: { value: 'Test Task' } });
    
    fireEvent.keyDown(titleInput, { key: 'Enter' });
    fireEvent.submit(titleInput.closest('form')!);
    
    expect(mockOnAdd).toHaveBeenCalledWith({
      title: 'Test Task',
      description: undefined,
      completed: false,
      priority: 'low',
      scheduledFor: undefined
    });
  });

  it('trims whitespace from title and description', () => {
    render(<AddTodoForm onAdd={mockOnAdd} />);
    
    const titleInput = screen.getByPlaceholderText('Add a new task (supports Markdown)...');
    fireEvent.change(titleInput, { target: { value: '  Test Task  ' } });
    fireEvent.focus(titleInput);
    
    const descriptionInput = screen.getByPlaceholderText('Description (supports Markdown)...');
    fireEvent.change(descriptionInput, { target: { value: '  Test description  ' } });
    
    const submitButton = screen.getByText('tasks.addTask');
    fireEvent.click(submitButton);
    
    expect(mockOnAdd).toHaveBeenCalledWith({
      title: 'Test Task',
      description: 'Test description',
      completed: false,
      priority: 'low',
      scheduledFor: undefined
    });
  });

  it('handles empty description correctly', () => {
    render(<AddTodoForm onAdd={mockOnAdd} />);
    
    const titleInput = screen.getByPlaceholderText('Add a new task (supports Markdown)...');
    fireEvent.change(titleInput, { target: { value: 'Test Task' } });
    
    const submitButton = screen.getByRole('button');
    fireEvent.click(submitButton);
    
    expect(mockOnAdd).toHaveBeenCalledWith({
      title: 'Test Task',
      description: undefined,
      completed: false,
      priority: 'low',
      scheduledFor: undefined
    });
  });

  it('has collapse button in expanded mode', () => {
    render(<AddTodoForm onAdd={mockOnAdd} />);
    
    const titleInput = screen.getByPlaceholderText('Add a new task (supports Markdown)...');
    fireEvent.focus(titleInput);
    
    const collapseButton = screen.getByText('Collapse');
    expect(collapseButton).toBeInTheDocument();
    
    fireEvent.click(collapseButton);
    
    expect(screen.queryByPlaceholderText('Description (supports Markdown)...')).not.toBeInTheDocument();
  });

  it('prevents submission with empty title', () => {
    render(<AddTodoForm onAdd={mockOnAdd} />);
    
    const submitButton = screen.getByRole('button');
    
    // Try to submit empty form
    fireEvent.click(submitButton);
    
    expect(mockOnAdd).not.toHaveBeenCalled();
    expect(submitButton).toBeDisabled();
  });

  it('maintains focus accessibility', () => {
    render(<AddTodoForm onAdd={mockOnAdd} />);
    
    const titleInput = screen.getByPlaceholderText('Add a new task (supports Markdown)...');
    
    act(() => {
      titleInput.focus();
    });
    expect(titleInput).toHaveFocus();
    
    act(() => {
      fireEvent.focus(titleInput);
    });
    
    // After expansion, focus should still be maintained
    expect(titleInput).toHaveFocus();
  });
});