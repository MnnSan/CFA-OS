/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class ChecksumService {
  /**
   * Computes a quick hexadecimal checksum hash from any JSON object.
   */
  public static compute(obj: any): string {
    if (!obj) return '0';
    
    // Sort keys recursively to ensure consistent hashing regardless of key order
    const sortedStr = JSON.stringify(ChecksumService.sortObject(obj));
    
    let hash = 0;
    for (let i = 0; i < sortedStr.length; i++) {
      const char = sortedStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Recursively sorts object keys for consistent string representation.
   */
  private static sortObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(ChecksumService.sortObject);
    }
    const sortedObj: Record<string, any> = {};
    Object.keys(obj).sort().forEach(key => {
      // Exclude volatile property keys to prevent false mismatches
      if (key !== 'checksum' && key !== 'updatedAt' && key !== 'executedAt' && key !== 'lastSync') {
        sortedObj[key] = ChecksumService.sortObject(obj[key]);
      }
    });
    return sortedObj;
  }
}
export const checksumService = ChecksumService;
