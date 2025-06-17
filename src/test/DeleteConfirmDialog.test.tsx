import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';

// i18nをモック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (key === 'tasks.tasksWillBeDeleted' && options?.count) {
        return `${options.count} tasks will be deleted.`;
      }
      return key;
    },
  }),
}));

describe('DeleteConfirmDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog with title and message', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        title="Delete Task"
        message="Are you sure you want to delete this task?"
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Delete Task')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this task?')).toBeInTheDocument();
    expect(screen.getByText('tasks.actionCannotBeUndone')).toBeInTheDocument();
    expect(screen.getByText('buttons.delete')).toBeInTheDocument();
    expect(screen.getByText('buttons.cancel')).toBeInTheDocument();
  });

  it('renders multiple tasks deletion dialog with count', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        title="Delete Selected Tasks"
        message="Are you sure you want to delete the selected tasks?"
        itemCount={5}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Delete Selected Tasks')).toBeInTheDocument();
    expect(screen.getByText('5 tasks will be deleted.')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <DeleteConfirmDialog
        isOpen={false}
        title="Delete Task"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Delete Task')).not.toBeInTheDocument();
  });

  it('calls onConfirm when delete button is clicked', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        title="Delete Task"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
      />
    );

    const deleteButton = screen.getByText('buttons.delete');
    fireEvent.click(deleteButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        title="Delete Task"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
      />
    );

    const cancelButton = screen.getByText('buttons.cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when escape key is pressed', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        title="Delete Task"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
      />
    );

    // Simulate escape key on the overlay div
    const overlay = document.querySelector('.delete-confirm-overlay');
    if (overlay) {
      fireEvent.keyDown(overlay, { key: 'Escape' });
    }

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('focuses on delete button by default', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        title="Delete Task"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
      />
    );

    const deleteButton = screen.getByText('buttons.delete');
    expect(deleteButton).toHaveFocus();
  });

  it('handles Enter key to confirm', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        title="Delete Task"
        message="Are you sure?"
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
      />
    );

    const overlay = document.querySelector('.delete-confirm-overlay');
    if (overlay) {
      fireEvent.keyDown(overlay, { key: 'Enter' });
    }

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not show count message for single item', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        title="Delete Task"
        message="Are you sure?"
        itemCount={1}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('1 tasks will be deleted.')).not.toBeInTheDocument();
  });
});