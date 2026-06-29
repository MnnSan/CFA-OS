/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Resource } from '../types';

export class ResourceRepository {
  private resourceById = new Map<string, Resource>();
  private resourcesByLOS = new Map<string, Resource[]>();
  private resourcesByReading = new Map<string, Resource[]>();

  constructor(private resources: Resource[]) {
    resources.forEach(r => {
      this.resourceById.set(r.id, r);

      // Group by LOS
      if (r.linkedLOSId) {
        if (!this.resourcesByLOS.has(r.linkedLOSId)) {
          this.resourcesByLOS.set(r.linkedLOSId, []);
        }
        this.resourcesByLOS.get(r.linkedLOSId)!.push(r);
      }

      // Group by Reading
      if (r.linkedReadingId) {
        if (!this.resourcesByReading.has(r.linkedReadingId)) {
          this.resourcesByReading.set(r.linkedReadingId, []);
        }
        this.resourcesByReading.get(r.linkedReadingId)!.push(r);
      }
    });
  }

  public getById(id: string): Resource | undefined {
    return this.resourceById.get(id);
  }

  public getAll(): Resource[] {
    return this.resources;
  }

  public getByLOSId(losId: string): Resource[] {
    return this.resourcesByLOS.get(losId) || [];
  }

  public getByReadingId(readingId: string): Resource[] {
    return this.resourcesByReading.get(readingId) || [];
  }
}
