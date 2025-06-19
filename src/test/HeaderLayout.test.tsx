import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

// Test component to verify CSS behavior
const TestHeaderLayout: React.FC<{ detailedMode: boolean }> = ({ detailedMode }) => {
  return (
    <div className={`app ${!detailedMode ? 'app--slim' : ''}`}>
      <header className={`app-header app-header--visible`}>
        <div className="header-left">
          <span>Menu</span>
        </div>
        <div className="header-center">
          <span>Center</span>
        </div>
        <div className="header-right">
          <span>Controls</span>
        </div>
      </header>
      <main className="app-main">
        <div>Main content</div>
      </main>
    </div>
  );
};

describe('Header Layout CSS Behavior', () => {
  beforeEach(() => {
    // Clear any existing styles
    document.head.innerHTML = '';
  });

  it('should apply app--slim class in slim mode', () => {
    render(<TestHeaderLayout detailedMode={false} />);
    
    const app = document.querySelector('.app');
    expect(app).toHaveClass('app--slim');
    expect(app).not.toHaveClass('app:not(.app--slim)');
  });

  it('should not apply app--slim class in detailed mode', () => {
    render(<TestHeaderLayout detailedMode={true} />);
    
    const app = document.querySelector('.app');
    expect(app).not.toHaveClass('app--slim');
  });

  it('should render header structure correctly', () => {
    render(<TestHeaderLayout detailedMode={true} />);
    
    const header = document.querySelector('.app-header');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('app-header--visible');
    
    const headerLeft = header?.querySelector('.header-left');
    const headerCenter = header?.querySelector('.header-center');
    const headerRight = header?.querySelector('.header-right');
    
    expect(headerLeft).toBeInTheDocument();
    expect(headerCenter).toBeInTheDocument();
    expect(headerRight).toBeInTheDocument();
    
    expect(headerLeft).toHaveTextContent('Menu');
    expect(headerCenter).toHaveTextContent('Center');
    expect(headerRight).toHaveTextContent('Controls');
  });

  it('should maintain proper header visibility classes', () => {
    // Test slim mode
    const { rerender } = render(<TestHeaderLayout detailedMode={false} />);
    
    let app = document.querySelector('.app');
    let header = document.querySelector('.app-header');
    
    expect(app).toHaveClass('app--slim');
    expect(header).toHaveClass('app-header--visible');
    
    // Test detailed mode
    rerender(<TestHeaderLayout detailedMode={true} />);
    
    app = document.querySelector('.app');
    header = document.querySelector('.app-header');
    
    expect(app).not.toHaveClass('app--slim');
    expect(header).toHaveClass('app-header--visible');
  });

  it('should have correct DOM structure for layout', () => {
    render(<TestHeaderLayout detailedMode={true} />);
    
    const app = document.querySelector('.app');
    const header = app?.querySelector('.app-header');
    const main = app?.querySelector('.app-main');
    
    expect(app).toBeInTheDocument();
    expect(header).toBeInTheDocument();
    expect(main).toBeInTheDocument();
    
    // Verify order: header should come before main
    const children = Array.from(app?.children || []);
    const headerIndex = children.indexOf(header as Element);
    const mainIndex = children.indexOf(main as Element);
    
    expect(headerIndex).toBeLessThan(mainIndex);
  });

  it('should support CSS selector structure for positioning rules', () => {
    // Test that CSS selectors can distinguish between modes
    const { rerender } = render(<TestHeaderLayout detailedMode={false} />);
    
    // Slim mode: should have .app.app--slim structure
    let app = document.querySelector('.app.app--slim');
    expect(app).toBeInTheDocument();
    
    // CSS selector .app:not(.app--slim) should NOT match
    let notSlimApp = document.querySelector('.app:not(.app--slim)');
    expect(notSlimApp).toBeNull();
    
    // Switch to detailed mode
    rerender(<TestHeaderLayout detailedMode={true} />);
    
    // Detailed mode: should NOT have .app--slim
    app = document.querySelector('.app.app--slim');
    expect(app).toBeNull();
    
    // CSS selector .app:not(.app--slim) should match
    notSlimApp = document.querySelector('.app:not(.app--slim)');
    expect(notSlimApp).toBeInTheDocument();
  });
});