/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimelineTemplate, StudyStrategy } from '../../types';

export interface ConflictResolutionResult<T> {
  winner: 'cloud' | 'local' | 'equal';
  data: T;
}

export class ConflictResolver {
  
  /**
   * Resolves template conflicts based on semantic and updatedAt version checks.
   */
  public static resolveTemplate(
    local: TimelineTemplate | undefined,
    cloud: any
  ): ConflictResolutionResult<any> {
    if (!local && !cloud) {
      throw new Error("ConflictResolver: Both local and cloud templates are undefined");
    }
    if (!local) {
      return { winner: 'cloud', data: cloud };
    }
    if (!cloud) {
      return { winner: 'local', data: local };
    }

    const localUpdatedAt = new Date(local.updatedAt).getTime();
    const cloudUpdatedAt = new Date(cloud.updatedAt).getTime();

    // Use semantic versioning
    const localVer = local.semanticVersion?.coachPlanVersion || local.version || 0;
    const cloudVer = cloud.semanticVersion?.coachPlanVersion || cloud.version || 0;

    if (cloudVer > localVer) {
      return { winner: 'cloud', data: cloud };
    } else if (localVer > cloudVer) {
      return { winner: 'local', data: local };
    } else {
      // Tie breaker using timestamp
      if (cloudUpdatedAt > localUpdatedAt) {
        return { winner: 'cloud', data: cloud };
      } else if (localUpdatedAt > cloudUpdatedAt) {
        return { winner: 'local', data: local };
      } else {
        return { winner: 'equal', data: cloud };
      }
    }
  }

  /**
   * Resolves study strategy conflicts using semantic versions.
   */
  public static resolveStrategy(
    local: StudyStrategy | undefined,
    cloud: any
  ): ConflictResolutionResult<any> {
    if (!local && !cloud) {
      throw new Error("ConflictResolver: Both local and cloud strategies are undefined");
    }
    if (!local) {
      return { winner: 'cloud', data: cloud };
    }
    if (!cloud) {
      return { winner: 'local', data: local };
    }

    const localUpdatedAt = new Date(local.updatedAt).getTime();
    const cloudUpdatedAt = new Date(cloud.updatedAt).getTime();

    const localVer = local.semanticVersion?.studyStrategyVersion || local.version || 0;
    const cloudVer = cloud.semanticVersion?.studyStrategyVersion || cloud.version || 0;

    if (cloudVer > localVer) {
      return { winner: 'cloud', data: cloud };
    } else if (localVer > cloudVer) {
      return { winner: 'local', data: local };
    } else {
      // Tie breaker
      if (cloudUpdatedAt > localUpdatedAt) {
        return { winner: 'cloud', data: cloud };
      } else if (localUpdatedAt > cloudUpdatedAt) {
        return { winner: 'local', data: local };
      } else {
        return { winner: 'equal', data: cloud };
      }
    }
  }
}
