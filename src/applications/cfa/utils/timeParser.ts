/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Parses and normalizes time values from Excel sheets into accurate minutes.
 * Handles Excel Day Fractions, Date objects, colons, decimal formats, and raw strings.
 */
export function parseExcelTimeToMinutes(timeInput: any): number {
  if (timeInput === null || timeInput === undefined || String(timeInput).trim() === '') {
    return 90; // Healthy 1.5-hour baseline fallback for live/empty rows (e.g., CME)
  }

  // Handle native numbers
  if (typeof timeInput === 'number') {
    if (timeInput <= 0) return 90;
    // If it's a day fraction (less than 1.0)
    if (timeInput < 1.0) {
      return timeInput * 24 * 60;
    }
    return timeInput;
  }

  // Handle Date objects or object timing structures
  if (timeInput instanceof Date || (typeof timeInput === 'object' && ('hours' in timeInput || 'hours' in (timeInput as any) || typeof (timeInput as any).getHours === 'function'))) {
    const hours = (timeInput as any).hours ?? (typeof (timeInput as any).getHours === 'function' ? (timeInput as any).getHours() : 0);
    const minutes = (timeInput as any).minutes ?? (typeof (timeInput as any).getMinutes === 'function' ? (timeInput as any).getMinutes() : 0);
    const seconds = (timeInput as any).seconds ?? (typeof (timeInput as any).getSeconds === 'function' ? (timeInput as any).getSeconds() : 0);
    const val = hours * 60 + minutes + (seconds / 60);
    return val > 0 ? val : 90;
  }

  const s = String(timeInput).trim();
  if (!s || s.toLowerCase() === 'nan' || s.toLowerCase() === 'null') {
    return 90;
  }

  // Handle plain numbers formatted as strings
  const rawNum = Number(s);
  if (!isNaN(rawNum)) {
    if (rawNum <= 0) return 90;
    if (rawNum < 1.0) {
      return rawNum * 24 * 60;
    }
    return rawNum;
  }

  const sLower = s.toLowerCase();

  // Handle hours suffixes (e.g. "1.5 hr" or "1.5 hours")
  if (sLower.includes('hr') || sLower.includes('hour')) {
    const val = parseFloat(sLower.replace(/[a-z]/g, '').trim());
    return isNaN(val) ? 90 : val * 60;
  }

  // Handle minutes suffixes (e.g. "90 min" or "90 minutes")
  if (sLower.includes('min')) {
    const val = parseFloat(sLower.replace(/[a-z]/g, '').trim());
    return isNaN(val) ? 90 : val;
  }

  // Handle combined "1h 30m" format
  if (sLower.includes('h') && sLower.includes('m')) {
    const hMatch = sLower.match(/(\d+(?:\.\d+)?)\s*h/);
    const mMatch = sLower.match(/(\d+(?:\.\d+)?)\s*m/);
    const h = hMatch ? parseFloat(hMatch[1]) : 0;
    const m = mMatch ? parseFloat(mMatch[1]) : 0;
    const val = h * 60 + m;
    return val > 0 ? val : 90;
  }

  // Handle split colon format (e.g., 01:26:17, 1:24, 00:52, etc.)
  const parts = s.split(':').map(Number);
  if (parts.every(p => !isNaN(p)) && parts.length > 0) {
    if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 60 + parts[1] + parts[2] / 60;
    } else if (parts.length === 2) {
      // Treat as HH:MM since lectures are longer classes
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      return parts[0];
    }
  }

  return 90; // Default safety fallback
}
