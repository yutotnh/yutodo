import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SearchBar } from '../components/SearchBar';

// i18nをモック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('SearchBar', () => {
  const mockOnSearchChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input with placeholder', () => {
    render(<SearchBar searchQuery="" onSearchChange={mockOnSearchChange} />);
    
    const input = screen.getByPlaceholderText('tasks.search');
    expect(input).toBeInTheDocument();
  });

  it('displays the current search value', () => {
    render(<SearchBar searchQuery="test search" onSearchChange={mockOnSearchChange} />);
    
    const input = screen.getByDisplayValue('test search');
    expect(input).toBeInTheDocument();
  });

  it('calls onSearchChange when input value changes', () => {
    render(<SearchBar searchQuery="" onSearchChange={mockOnSearchChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new search' } });
    
    expect(mockOnSearchChange).toHaveBeenCalledWith('new search');
  });

  it('shows clear button when there is a search value', () => {
    render(<SearchBar searchQuery="test" onSearchChange={mockOnSearchChange} />);
    
    const clearButton = screen.getByLabelText('tasks.clearSearch');
    expect(clearButton).toBeInTheDocument();
  });

  it('hides clear button when search value is empty', () => {
    render(<SearchBar searchQuery="" onSearchChange={mockOnSearchChange} />);
    
    const clearButton = screen.queryByLabelText('tasks.clearSearch');
    expect(clearButton).not.toBeInTheDocument();
  });

  it('calls onSearchChange with empty string when clear button is clicked', () => {
    render(<SearchBar searchQuery="test" onSearchChange={mockOnSearchChange} />);
    
    const clearButton = screen.getByLabelText('tasks.clearSearch');
    fireEvent.click(clearButton);
    
    expect(mockOnSearchChange).toHaveBeenCalledWith('');
  });

  it('applies correct CSS classes', () => {
    const { container } = render(<SearchBar searchQuery="test" onSearchChange={mockOnSearchChange} />);
    
    const searchContainer = container.querySelector('.search-bar');
    expect(searchContainer).toBeInTheDocument();
    
    const input = container.querySelector('.search-input');
    expect(input).toBeInTheDocument();
  });

  it('handles rapid input changes', () => {
    render(<SearchBar searchQuery="" onSearchChange={mockOnSearchChange} />);
    
    const input = screen.getByRole('textbox');
    
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.change(input, { target: { value: 'abc' } });
    
    expect(mockOnSearchChange).toHaveBeenCalledTimes(3);
    expect(mockOnSearchChange).toHaveBeenLastCalledWith('abc');
  });

  it('handles empty string input', () => {
    render(<SearchBar searchQuery="test" onSearchChange={mockOnSearchChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    
    expect(mockOnSearchChange).toHaveBeenCalledWith('');
  });

  it('uses custom placeholder when provided', () => {
    render(<SearchBar searchQuery="" onSearchChange={mockOnSearchChange} placeholder="Custom placeholder" />);
    
    const input = screen.getByPlaceholderText('Custom placeholder');
    expect(input).toBeInTheDocument();
  });

  it('forwards ref to input element', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<SearchBar ref={ref} searchQuery="" onSearchChange={mockOnSearchChange} />);
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.className).toBe('search-input');
  });
});