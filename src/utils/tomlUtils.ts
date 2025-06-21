/**
 * Utility functions for TOML string handling and escaping
 */

/**
 * Escapes a string for safe use in TOML format.
 * Properly escapes backslashes and double quotes to prevent injection vulnerabilities.
 * 
 * @param value The string value to escape
 * @returns The escaped string safe for TOML format
 */
export function escapeTomlString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/"/g, '\\"');   // Then escape double quotes
}

/**
 * Formats a key-value pair for TOML output with proper string escaping.
 * 
 * @param key The TOML key name
 * @param value The string value to escape and format
 * @returns Formatted TOML key-value line
 */
export function formatTomlKeyValue(key: string, value: string): string {
  return `${key} = "${escapeTomlString(value)}"\n`;
}