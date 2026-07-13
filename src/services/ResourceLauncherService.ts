import { LearningResource } from '../resources/types';
import { eventBus } from './EventBus';

export interface LaunchResult {
  success: boolean;
  openedUrl: string;
  provider: string;
  resourceId: string;
  error?: string;
  telemetry: {
    launchedAt: string;
    action: 'launch' | 'resume';
  };
}

export interface ResourceLauncher {
  canLaunch(resource: LearningResource): boolean;
  launch(resource: LearningResource): LaunchResult;
  resume(resource: LearningResource): LaunchResult;
}

export class SSCILauncher implements ResourceLauncher {
  canLaunch(resource: LearningResource): boolean {
    return resource.provider === 'SSCI';
  }
  launch(resource: LearningResource): LaunchResult {
    const url = resource.launchUrl || 'https://www.schweser.com/';
    try {
      window.open(url, '_blank');
      return {
        success: true,
        openedUrl: url,
        provider: 'SSCI',
        resourceId: resource.id,
        telemetry: { launchedAt: new Date().toISOString(), action: 'launch' }
      };
    } catch (err: any) {
      return {
        success: false,
        openedUrl: url,
        provider: 'SSCI',
        resourceId: resource.id,
        error: err.message,
        telemetry: { launchedAt: new Date().toISOString(), action: 'launch' }
      };
    }
  }
  resume(resource: LearningResource): LaunchResult {
    const result = this.launch(resource);
    result.telemetry.action = 'resume';
    return result;
  }
}

export class NotebookLauncher implements ResourceLauncher {
  canLaunch(resource: LearningResource): boolean {
    return resource.provider === 'NotebookLM';
  }
  launch(resource: LearningResource): LaunchResult {
    const url = resource.launchUrl || 'https://notebooklm.google.com/';
    try {
      window.open(url, '_blank');
      return {
        success: true,
        openedUrl: url,
        provider: 'NotebookLM',
        resourceId: resource.id,
        telemetry: { launchedAt: new Date().toISOString(), action: 'launch' }
      };
    } catch (err: any) {
      return {
        success: false,
        openedUrl: url,
        provider: 'NotebookLM',
        resourceId: resource.id,
        error: err.message,
        telemetry: { launchedAt: new Date().toISOString(), action: 'launch' }
      };
    }
  }
  resume(resource: LearningResource): LaunchResult {
    const result = this.launch(resource);
    result.telemetry.action = 'resume';
    return result;
  }
}

export class PDFLauncher implements ResourceLauncher {
  canLaunch(resource: LearningResource): boolean {
    return resource.resourceType === 'PDF';
  }
  launch(resource: LearningResource): LaunchResult {
    const url = resource.launchUrl || '/data/curriculum/placeholder.pdf';
    try {
      window.open(url, '_blank');
      return {
        success: true,
        openedUrl: url,
        provider: 'CFA Institute',
        resourceId: resource.id,
        telemetry: { launchedAt: new Date().toISOString(), action: 'launch' }
      };
    } catch (err: any) {
      return {
        success: false,
        openedUrl: url,
        provider: 'CFA Institute',
        resourceId: resource.id,
        error: err.message,
        telemetry: { launchedAt: new Date().toISOString(), action: 'launch' }
      };
    }
  }
  resume(resource: LearningResource): LaunchResult {
    const result = this.launch(resource);
    result.telemetry.action = 'resume';
    return result;
  }
}

export class YoutubeLauncher implements ResourceLauncher {
  canLaunch(resource: LearningResource): boolean {
    return (resource.provider === 'CFA Institute' || resource.provider === 'SSCI') && 
           resource.launchUrl && 
           (resource.launchUrl.includes('youtube.com') || resource.launchUrl.includes('youtu.be'));
  }
  launch(resource: LearningResource): LaunchResult {
    const url = resource.launchUrl;
    try {
      window.open(url, '_blank');
      return {
        success: true,
        openedUrl: url,
        provider: 'YouTube',
        resourceId: resource.id,
        telemetry: { launchedAt: new Date().toISOString(), action: 'launch' }
      };
    } catch (err: any) {
      return {
        success: false,
        openedUrl: url,
        provider: 'YouTube',
        resourceId: resource.id,
        error: err.message,
        telemetry: { launchedAt: new Date().toISOString(), action: 'launch' }
      };
    }
  }
  resume(resource: LearningResource): LaunchResult {
    const result = this.launch(resource);
    result.telemetry.action = 'resume';
    return result;
  }
}

export class DriveLauncher implements ResourceLauncher {
  canLaunch(resource: LearningResource): boolean {
    return resource.launchUrl && resource.launchUrl.includes('drive.google.com');
  }
  launch(resource: LearningResource): LaunchResult {
    const url = resource.launchUrl;
    try {
      window.open(url, '_blank');
      return {
        success: true,
        openedUrl: url,
        provider: 'Google Drive',
        resourceId: resource.id,
        telemetry: { launchedAt: new Date().toISOString(), action: 'launch' }
      };
    } catch (err: any) {
      return {
        success: false,
        openedUrl: url,
        provider: 'Google Drive',
        resourceId: resource.id,
        error: err.message,
        telemetry: { launchedAt: new Date().toISOString(), action: 'launch' }
      };
    }
  }
  resume(resource: LearningResource): LaunchResult {
    const result = this.launch(resource);
    result.telemetry.action = 'resume';
    return result;
  }
}

export class WebsiteLauncher implements ResourceLauncher {
  canLaunch(resource: LearningResource): boolean {
    return true; // Fallback
  }
  launch(resource: LearningResource): LaunchResult {
    const url = resource.launchUrl || 'https://www.cfainstitute.org/';
    try {
      window.open(url, '_blank');
      return {
        success: true,
        openedUrl: url,
        provider: resource.provider || 'Website',
        resourceId: resource.id,
        telemetry: { launchedAt: new Date().toISOString(), action: 'launch' }
      };
    } catch (err: any) {
      return {
        success: false,
        openedUrl: url,
        provider: resource.provider || 'Website',
        resourceId: resource.id,
        error: err.message,
        telemetry: { launchedAt: new Date().toISOString(), action: 'launch' }
      };
    }
  }
  resume(resource: LearningResource): LaunchResult {
    const result = this.launch(resource);
    result.telemetry.action = 'resume';
    return result;
  }
}

export class ResourceLauncherService {
  private static instance: ResourceLauncherService;
  private launchers: ResourceLauncher[] = [];

  private constructor() {
    this.launchers.push(new DriveLauncher());
    this.launchers.push(new YoutubeLauncher());
    this.launchers.push(new SSCILauncher());
    this.launchers.push(new NotebookLauncher());
    this.launchers.push(new PDFLauncher());
    this.launchers.push(new WebsiteLauncher()); // Fallback
  }

  public static getInstance(): ResourceLauncherService {
    if (!ResourceLauncherService.instance) {
      ResourceLauncherService.instance = new ResourceLauncherService();
    }
    return ResourceLauncherService.instance;
  }

  public launch(resource: LearningResource): LaunchResult {
    const launcher = this.launchers.find(l => l.canLaunch(resource)) || this.launchers[this.launchers.length - 1];
    console.log(`[ResourceLauncherService] Routing launch for "${resource.title}" via ${launcher.constructor.name}`);
    const result = launcher.launch(resource);
    
    eventBus.publish({
      type: 'ResourceLaunched',
      timestamp: new Date().toISOString(),
      source: 'ResourceLauncherService',
      entityId: resource.id,
      payload: { ...result }
    });

    return result;
  }

  public resume(resource: LearningResource): LaunchResult {
    const launcher = this.launchers.find(l => l.canLaunch(resource)) || this.launchers[this.launchers.length - 1];
    console.log(`[ResourceLauncherService] Routing resume for "${resource.title}" via ${launcher.constructor.name}`);
    const result = launcher.resume(resource);

    eventBus.publish({
      type: 'ResourceResumed',
      timestamp: new Date().toISOString(),
      source: 'ResourceLauncherService',
      entityId: resource.id,
      payload: { ...result }
    });

    return result;
  }
}

export const resourceLauncherService = ResourceLauncherService.getInstance();
