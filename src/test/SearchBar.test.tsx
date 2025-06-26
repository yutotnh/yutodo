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
  const mockOnSearchSettingsChange = vi.fn();
  const defaultSearchSettings = {
    caseSensitive: false,
    useRegex: false,
    wholeWord: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithDarkMode = (component: React.ReactElement, isDark = false) => {
    return render(
      <div className={isDark ? 'app app--dark' : 'app'}>
        {component}
      </div>
    );
  };

  it('renders search input with placeholder', () => {
    render(<SearchBar searchQuery="" onSearchChange={mockOnSearchChange} searchSettings={defaultSearchSettings} onSearchSettingsChange={mockOnSearchSettingsChange} />);
    
    const input = screen.getByPlaceholderText('tasks.search');
    expect(input).toBeInTheDocument();
  });

  it('displays the current search value', () => {
    render(<SearchBar searchQuery="test search" onSearchChange={mockOnSearchChange} searchSettings={defaultSearchSettings} onSearchSettingsChange={mockOnSearchSettingsChange} />);
    
    const input = screen.getByDisplayValue('test search');
    expect(input).toBeInTheDocument();
  });

  it('calls onSearchChange when input value changes', () => {
    render(<SearchBar searchQuery="" onSearchChange={mockOnSearchChange} searchSettings={defaultSearchSettings} onSearchSettingsChange={mockOnSearchSettingsChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new search' } });
    
    expect(mockOnSearchChange).toHaveBeenCalledWith('new search');
  });

  it('shows clear button when there is a search value', () => {
    render(<SearchBar searchQuery="test" onSearchChange={mockOnSearchChange} searchSettings={defaultSearchSettings} onSearchSettingsChange={mockOnSearchSettingsChange} />);
    
    const clearButton = screen.getByLabelText('tasks.clearSearch');
    expect(clearButton).toBeInTheDocument();
  });

  it('hides clear button when search value is empty', () => {
    render(<SearchBar searchQuery="" onSearchChange={mockOnSearchChange} searchSettings={defaultSearchSettings} onSearchSettingsChange={mockOnSearchSettingsChange} />);
    
    const clearButton = screen.queryByLabelText('tasks.clearSearch');
    expect(clearButton).not.toBeInTheDocument();
  });

  it('calls onSearchChange with empty string when clear button is clicked', () => {
    render(<SearchBar searchQuery="test" onSearchChange={mockOnSearchChange} searchSettings={defaultSearchSettings} onSearchSettingsChange={mockOnSearchSettingsChange} />);
    
    const clearButton = screen.getByLabelText('tasks.clearSearch');
    fireEvent.click(clearButton);
    
    expect(mockOnSearchChange).toHaveBeenCalledWith('');
  });

  it('applies correct CSS classes', () => {
    const { container } = render(<SearchBar searchQuery="test" onSearchChange={mockOnSearchChange} searchSettings={defaultSearchSettings} onSearchSettingsChange={mockOnSearchSettingsChange} />);
    
    const searchContainer = container.querySelector('.search-bar');
    expect(searchContainer).toBeInTheDocument();
    
    const input = container.querySelector('.search-input');
    expect(input).toBeInTheDocument();
  });

  it('handles rapid input changes', () => {
    render(<SearchBar searchQuery="" onSearchChange={mockOnSearchChange} searchSettings={defaultSearchSettings} onSearchSettingsChange={mockOnSearchSettingsChange} />);
    
    const input = screen.getByRole('textbox');
    
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.change(input, { target: { value: 'abc' } });
    
    expect(mockOnSearchChange).toHaveBeenCalledTimes(3);
    expect(mockOnSearchChange).toHaveBeenLastCalledWith('abc');
  });

  it('handles empty string input', () => {
    render(<SearchBar searchQuery="test" onSearchChange={mockOnSearchChange} searchSettings={defaultSearchSettings} onSearchSettingsChange={mockOnSearchSettingsChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    
    expect(mockOnSearchChange).toHaveBeenCalledWith('');
  });

  it('uses custom placeholder when provided', () => {
    render(<SearchBar searchQuery="" onSearchChange={mockOnSearchChange} searchSettings={defaultSearchSettings} onSearchSettingsChange={mockOnSearchSettingsChange} placeholder="Custom placeholder" />);
    
    const input = screen.getByPlaceholderText('Custom placeholder');
    expect(input).toBeInTheDocument();
  });

  it('forwards ref to input element', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<SearchBar ref={ref} searchQuery="" onSearchChange={mockOnSearchChange} searchSettings={defaultSearchSettings} onSearchSettingsChange={mockOnSearchSettingsChange} />);
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.className).toBe('search-input');
  });

  it('calls onClose when Escape key is pressed in search input', () => {
    const mockOnClose = vi.fn();
    render(
      <SearchBar 
        searchQuery="test" 
        onSearchChange={mockOnSearchChange} 
        searchSettings={defaultSearchSettings} 
        onSearchSettingsChange={mockOnSearchSettingsChange}
        onClose={mockOnClose}
      />
    );
    
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Escape' });
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not throw error when Escape is pressed without onClose prop', () => {
    render(
      <SearchBar 
        searchQuery="test" 
        onSearchChange={mockOnSearchChange} 
        searchSettings={defaultSearchSettings} 
        onSearchSettingsChange={mockOnSearchSettingsChange}
      />
    );
    
    const input = screen.getByRole('textbox');
    
    // Should not throw error
    expect(() => {
      fireEvent.keyDown(input, { key: 'Escape' });
    }).not.toThrow();
  });

  describe('Dark Mode Support', () => {
    it('applies dark mode styles to search bar', () => {
      renderWithDarkMode(
        <SearchBar searchQuery="" onSearchChange={mockOnSearchChange} searchSettings={defaultSearchSettings} onSearchSettingsChange={mockOnSearchSettingsChange} />,
        true
      );

      const searchBar = document.querySelector('.search-bar');
      const input = document.querySelector('.search-input');
      const icon = document.querySelector('.search-icon');

      expect(searchBar).toBeInTheDocument();
      expect(input).toBeInTheDocument();
      expect(icon).toBeInTheDocument();

      // Dark mode classes should be applied through CSS
      const appElement = document.querySelector('.app--dark');
      expect(appElement).toBeInTheDocument();
    });

    it('applies dark mode styles to clear button when visible', () => {
      renderWithDarkMode(
        <SearchBar searchQuery="test" onSearchChange={mockOnSearchChange} searchSettings={defaultSearchSettings} onSearchSettingsChange={mockOnSearchSettingsChange} />,
        true
      );

      const clearButton = document.querySelector('.search-clear');
      expect(clearButton).toBeInTheDocument();

      // Verify dark mode app class is present
      const appElement = document.querySelector('.app--dark');
      expect(appElement).toBeInTheDocument();
    });
  });
});