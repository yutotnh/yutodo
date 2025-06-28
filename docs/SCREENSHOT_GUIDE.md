# Screenshot Guide for YuToDo

This guide explains how to capture screenshots for the README documentation.

## Required Screenshots

### 1. Main Interface - Light Mode (`main-interface-light.png`)
- Start the app: `npm run tauri dev`
- Ensure light theme is active (Settings > Theme > Light)
- Show the main task list with a few sample tasks
- Include both pending and completed tasks
- Size: Recommended 1200x800px

### 2. Main Interface - Dark Mode (`main-interface-dark.png`)
- Switch to dark theme (Settings > Theme > Dark)
- Same content as light mode for comparison
- Show the dark theme styling
- Size: Recommended 1200x800px

### 3. Schedule Management (`schedule-view.png`)
- Navigate to Schedule view (Ctrl+3 or View menu)
- Show both active and inactive schedules
- Include different schedule types (daily, weekly, etc.)
- Size: Recommended 1200x800px

### 4. Command Palette (`command-palette.png`)
- Open command palette with Ctrl+Shift+P
- Show the command list with search functionality
- Include various command categories
- Size: Recommended 800x600px

### 5. Settings Panel (`settings-panel.png`)
- Open settings with Ctrl+, or gear icon
- Show the comprehensive settings options
- Include theme, language, and other configuration options
- Size: Recommended 1000x700px

### 6. TOML Error Handling (`error-handling.png`)
- Edit settings.toml to introduce a syntax error (e.g., missing quote)
- Show the error banner at the top of the app
- Include the "Open File" functionality
- Size: Recommended 1200x600px

## Screenshot Instructions

1. **Using Built-in Screenshot Tools:**
   - Windows: Windows Key + Shift + S
   - macOS: Cmd + Shift + 4
   - Linux: Use system screenshot tool or `import` command

2. **Naming Convention:**
   - Use exact filenames as listed above
   - Save as PNG format for best quality
   - Place in `docs/screenshots/` directory

3. **Quality Guidelines:**
   - High resolution (at least 1200px wide for main screenshots)
   - Clear, readable text
   - Show realistic usage scenarios
   - Consistent window sizing across screenshots

4. **Content Guidelines:**
   - Include sample tasks that demonstrate features
   - Show realistic dates and priorities
   - Use English language for consistency
   - Avoid personal or sensitive information

## Sample Content for Screenshots

### Sample Tasks:
- "Complete project documentation" (High priority, due tomorrow)
- "Review pull requests" (Medium priority, completed)
- "Prepare presentation slides" (Low priority, pending)
- "Update dependencies" (Medium priority, overdue)

### Sample Schedules:
- "Daily standup meeting" (Daily, 9:00 AM)
- "Weekly team review" (Weekly, Fridays)
- "Monthly report submission" (Monthly, last day)

## Updating Screenshots

When the UI changes significantly:
1. Update the relevant screenshots
2. Maintain consistency in content and sizing
3. Update this guide if new screenshot types are needed
4. Commit both images and any guide updates