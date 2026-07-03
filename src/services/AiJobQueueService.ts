import { AIProviderRegistry } from './AIProvider';
import { AI_TASK_REGISTRY, AiTaskConfiguration } from './AiTaskRegistry';
import { PROMPT_REGISTRY } from './PromptRegistry';
import { StudySettings, AiAvailabilityLevel } from '../types';
import { aiDiagnostics } from './AIDiagnosticsService';
import { rateLimitTracker } from './RateLimitTracker';

export interface AiJob {
  id: string;
  taskId: string;
  resourceKey: string; // e.g. reading-15 or global-planner
  status: 'QUEUED' | 'ASSEMBLING' | 'SYNTHESIZING' | 'READY' | 'FAILED';
  progressLabel: string;
  error?: string;
  result?: {
    text: string;
    versionMetadata: {
      provider: string;
      model: string;
      promptVersion: string;
      contextVersion: string;
      generatedAt: string;
    };
  };
  timestamp: string;
}

export interface ProviderPricing {
  inputCostPerMillion: number;
  outputCostPerMillion: number;
}

export interface TelemetryData {
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
}

// Configurable pricing table (decoupled from logic)
export const PRICING_CONFIG: Record<string, ProviderPricing> = {
  'google-gemini': { inputCostPerMillion: 0.075, outputCostPerMillion: 0.30 },
  'anthropic-claude': { inputCostPerMillion: 3.00, outputCostPerMillion: 15.00 },
  'local-ollama': { inputCostPerMillion: 0, outputCostPerMillion: 0 }
};

// Fast hash function for caching
function computeHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

export class AiJobQueueService {
  private static instance: AiJobQueueService;
  
  private queue: AiJob[] = [];
  private activeControllers: Map<string, AbortController> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Set<(jobs: AiJob[]) => void> = new Set();
  private pendingJobSettings: Map<string, StudySettings> = new Map();
  private pendingContextBuilders: Map<string, () => any> = new Map();
  private pendingDiagIds: Map<string, string> = new Map();
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private rateLimitedKeys: Set<string> = new Set();
  
  private static GLOBAL_REQUEST_LOCK = false;
  private static MINIMUM_REQUEST_INTERVAL_MS = 4500;

  private runningCount = 0;
  private lastRequestTime = 0;

  private constructor() {}

  private async acquireRequestSlot(): Promise<void> {
    while (AiJobQueueService.GLOBAL_REQUEST_LOCK) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    const gap = AiJobQueueService.MINIMUM_REQUEST_INTERVAL_MS - (Date.now() - this.lastRequestTime);
    if (gap > 0) {
      await new Promise(resolve => setTimeout(resolve, gap));
    }
    AiJobQueueService.GLOBAL_REQUEST_LOCK = true;
  }

  private releaseRequestSlot(): void {
    AiJobQueueService.GLOBAL_REQUEST_LOCK = false;
    this.lastRequestTime = Date.now();
  }

  public static getInstance(): AiJobQueueService {
    if (!AiJobQueueService.instance) {
      AiJobQueueService.instance = new AiJobQueueService();
    }
    return AiJobQueueService.instance;
  }

  public subscribe(listener: (jobs: AiJob[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.queue]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const copy = [...this.queue];
    this.listeners.forEach(cb => cb(copy));
  }

  public getJobs(): AiJob[] {
    return [...this.queue];
  }

  // --- Caching Engine ---
  public getCacheKey(
    taskId: string,
    contextPayload: any,
    promptVersion: string,
    contextVersion: string,
    provider: string,
    model: string
  ): string {
    const serializedContext = JSON.stringify(contextPayload);
    const content = `${taskId}_${serializedContext}_${promptVersion}_${contextVersion}_${provider}_${model}`;
    return computeHash(content);
  }

  public getCachedResult(
    taskId: string,
    contextPayload: any,
    provider: string,
    model: string
  ): any | null {
    const taskConfig = AI_TASK_REGISTRY[taskId];
    if (!taskConfig) return null;

    const promptTemplate = PROMPT_REGISTRY[taskConfig.promptTemplateKey];
    if (!promptTemplate) return null;

    const cacheKey = this.getCacheKey(
      taskId,
      contextPayload,
      promptTemplate.version,
      '1.0.0', // Context Builder Version default
      provider,
      model
    );

    try {
      const cacheRaw = localStorage.getItem('cfa_ai_cache');
      if (!cacheRaw) return null;

      const cache = JSON.parse(cacheRaw);
      const entry = cache[cacheKey];
      if (!entry) return null;

      // Check TTL validation
      const now = Date.now();
      const generatedTime = new Date(entry.versionMetadata.generatedAt).getTime();
      
      if (taskConfig.cacheTtlRule === '24h') {
        if (now - generatedTime > 24 * 60 * 60 * 1000) {
          this.removeCacheEntry(cacheKey);
          return null;
        }
      }
      return entry;
    } catch (e) {
      console.error('[Cache] Read error:', e);
      return null;
    }
  }

  public setCacheResult(
    taskId: string,
    contextPayload: any,
    provider: string,
    model: string,
    text: string
  ): void {
    const taskConfig = AI_TASK_REGISTRY[taskId];
    if (!taskConfig) return;

    const promptTemplate = PROMPT_REGISTRY[taskConfig.promptTemplateKey];
    if (!promptTemplate) return;

    const promptVersion = promptTemplate.version;
    const contextVersion = '1.0.0';

    const cacheKey = this.getCacheKey(
      taskId,
      contextPayload,
      promptVersion,
      contextVersion,
      provider,
      model
    );

    const entry = {
      text,
      versionMetadata: {
        provider,
        model,
        promptVersion,
        contextVersion,
        generatedAt: new Date().toISOString()
      }
    };

    try {
      const cacheRaw = localStorage.getItem('cfa_ai_cache') || '{}';
      const cache = JSON.parse(cacheRaw);
      cache[cacheKey] = entry;
      localStorage.setItem('cfa_ai_cache', JSON.stringify(cache));
    } catch (e) {
      console.error('[Cache] Save error:', e);
    }
  }

  private removeCacheEntry(key: string): void {
    try {
      const cacheRaw = localStorage.getItem('cfa_ai_cache');
      if (!cacheRaw) return;
      const cache = JSON.parse(cacheRaw);
      delete cache[key];
      localStorage.setItem('cfa_ai_cache', JSON.stringify(cache));
    } catch (e) {
      console.error('[Cache] Delete error:', e);
    }
  }

  public invalidateCacheByRule(rule: AiTaskConfiguration['cacheTtlRule']): void {
    try {
      const cacheRaw = localStorage.getItem('cfa_ai_cache');
      if (!cacheRaw) return;
      const cache = JSON.parse(cacheRaw);
      let updated = false;

      for (const [key, entry] of Object.entries(cache) as [string, any][]) {
        // Map entry back to task configs to check rule
        const matchedTask = Object.values(AI_TASK_REGISTRY).find(t => {
          const promptTemplate = PROMPT_REGISTRY[t.promptTemplateKey];
          return promptTemplate && promptTemplate.version === entry.versionMetadata.promptVersion;
        });

        if (matchedTask && matchedTask.cacheTtlRule === rule) {
          delete cache[key];
          updated = true;
        }
      }
      if (updated) {
        localStorage.setItem('cfa_ai_cache', JSON.stringify(cache));
      }
    } catch (e) {
      console.error('[Cache] Invalidation error:', e);
    }
  }

  // --- Telemetry Token tracking ---
  public recordTelemetry(providerId: string, inputTokens: number, outputTokens: number): void {
    try {
      const storedRaw = localStorage.getItem('cfa_ai_telemetry');
      let telemetry: TelemetryData = { inputTokens: 0, outputTokens: 0, costUSD: 0 };
      if (storedRaw) {
        telemetry = JSON.parse(storedRaw);
      }

      const pricing = PRICING_CONFIG[providerId] || { inputCostPerMillion: 0, outputCostPerMillion: 0 };
      const calculatedCost =
        (inputTokens * pricing.inputCostPerMillion) / 1000000 +
        (outputTokens * pricing.outputCostPerMillion) / 1000000;

      telemetry.inputTokens += inputTokens;
      telemetry.outputTokens += outputTokens;
      telemetry.costUSD += calculatedCost;

      localStorage.setItem('cfa_ai_telemetry', JSON.stringify(telemetry));
      
      const settingsRaw = localStorage.getItem('cfa_settings');
      if (settingsRaw) {
        const settings = JSON.parse(settingsRaw);
        settings.telemetryTokens = {
          inputTokens: telemetry.inputTokens,
          outputTokens: telemetry.outputTokens,
          costUSD: telemetry.costUSD
        };
        localStorage.setItem('cfa_settings', JSON.stringify(settings));
      }
    } catch (e) {
      console.error('[Telemetry] Error recording:', e);
    }
  }

  public getTelemetry(): TelemetryData {
    try {
      const storedRaw = localStorage.getItem('cfa_ai_telemetry');
      if (storedRaw) return JSON.parse(storedRaw);
    } catch {}
    return { inputTokens: 0, outputTokens: 0, costUSD: 0 };
  }

  public clearTelemetry(): void {
    localStorage.removeItem('cfa_ai_telemetry');
    const settingsRaw = localStorage.getItem('cfa_settings');
    if (settingsRaw) {
      try {
        const settings = JSON.parse(settingsRaw);
        if (settings.telemetryTokens) {
          delete settings.telemetryTokens;
          localStorage.setItem('cfa_settings', JSON.stringify(settings));
        }
      } catch {}
    }
  }

  // --- Queue Job Processing ---
  public queueJob(
    taskId: string,
    resourceKey: string,
    contextBuilder: () => any,
    settings: StudySettings,
    onStatusUpdate?: (status: AiJob['status'], result?: any, error?: string) => void
  ): string {
    const jobKey = `${taskId}_${resourceKey}`;

    // Debounce/Coalescing Logic: Clear previous timer if exists
    if (this.debounceTimers.has(jobKey)) {
      clearTimeout(this.debounceTimers.get(jobKey)!);
    }

    // Set a debounce of 350ms to group multiple UI calls
    const timer = setTimeout(() => {
      this.debounceTimers.delete(jobKey);
      this.executeQueuedJob(taskId, resourceKey, contextBuilder, settings, onStatusUpdate);
    }, 350);

    this.debounceTimers.set(jobKey, timer);
    return jobKey;
  }

  private executeQueuedJob(
    taskId: string,
    resourceKey: string,
    contextBuilder: () => any,
    settings: StudySettings,
    onStatusUpdate?: (status: AiJob['status'], result?: any, error?: string) => void
  ): void {
    const jobKey = `${taskId}_${resourceKey}`;

    // AbortController Management: Cancel any existing/active requests for this resource
    if (this.activeControllers.has(jobKey)) {
      console.log(`[Queue] Cancelling previous job request for ${jobKey}`);
      this.activeControllers.get(jobKey)!.abort();
      this.activeControllers.delete(jobKey);
    }

    // Remove any previously queued or active job of same type from queue
    this.queue = this.queue.filter(j => !(j.taskId === taskId && j.resourceKey === resourceKey));

    const controller = new AbortController();
    this.activeControllers.set(jobKey, controller);

    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newJob: AiJob = {
      id: jobId,
      taskId,
      resourceKey,
      status: 'QUEUED',
      progressLabel: 'Queued Task',
      timestamp: new Date().toISOString()
    };

    const diagId = aiDiagnostics.beginRecord(taskId, resourceKey);
    aiDiagnostics.recordJobId(diagId, jobId);
    this.pendingDiagIds.set(jobKey, diagId);
    this.pendingJobSettings.set(jobKey, settings);
    this.pendingContextBuilders.set(jobKey, contextBuilder);
    this.queue.push(newJob);
    this.notify();

    onStatusUpdate?.('QUEUED');

    // Run tick to process queue
    this.processNext();
  }

  /**
   * Gracefully resolves a job as a deterministic offline fallback when the
   * AI provider or task registry is unavailable. Sets the job to FAILED with
   * a PROV_* token so consuming UI components (e.g. MissionBriefDrawer) can
   * detect the state and render their built-in local fallback content.
   * Does NOT clean up tracking maps — the caller's `finally` block handles that.
   */
  private triggerLocalOfflineFallback(job: AiJob): void {
    job.status = 'FAILED';
    job.progressLabel = 'Offline Fallback';
  }

  private async processNext(): Promise<void> {
    if (AiJobQueueService.GLOBAL_REQUEST_LOCK) return;
    if (this.runningCount >= 1) return;

    const nextJob = this.queue.find(j => j.status === 'QUEUED');
    if (!nextJob) return;

    nextJob.status = 'ASSEMBLING';
    nextJob.progressLabel = 'Assembling Context';
    this.runningCount++;
    this.notify();

    this.executeJob(nextJob);
  }

  private async executeJob(job: AiJob): Promise<void> {
    const jobKey = `${job.taskId}_${job.resourceKey}`;
    const controller = this.activeControllers.get(jobKey);
    const diagId = this.pendingDiagIds.get(jobKey) || aiDiagnostics.beginRecord(job.taskId, job.resourceKey);
    const requestStartTime = Date.now();
    
    // Retrieve settings: use passed context settings as primary, fall back to localStorage
    const contextSettings = this.pendingJobSettings.get(jobKey) ?? null;
    const storedSettingsRaw = localStorage.getItem('cfa_settings');
    let storedSettings: StudySettings | null = null;
    try {
      if (storedSettingsRaw) storedSettings = JSON.parse(storedSettingsRaw);
    } catch {}

    const activeSettings = contextSettings ?? storedSettings;
    const providerId = activeSettings?.aiProvider || 'google-gemini';
    // Split stored vs execution API key detection for diagnostics
    const executionApiKey =
      providerId === 'google-gemini'
        ? contextSettings?.geminiApiKey
        : providerId === 'anthropic-claude'
          ? contextSettings?.claudeApiKey
          : '';
    const storedApiKey =
      providerId === 'google-gemini'
        ? storedSettings?.geminiApiKey
        : providerId === 'anthropic-claude'
          ? storedSettings?.claudeApiKey
          : '';
    const providerKey = executionApiKey || storedApiKey || '';
    const endpoint = activeSettings?.ollamaEndpoint || 'http://localhost:11434';
    const model = activeSettings?.aiModel || (providerId === 'google-gemini' ? 'gemini-3.5-flash' : providerId === 'anthropic-claude' ? 'claude-3-5-sonnet-20241022' : 'llama3');

    try {
      // 1. Build context — use caller's contextBuilder closure when available
      const callerContextBuilder = this.pendingContextBuilders.get(jobKey);
      let contextPackage: any = null;

      if (typeof callerContextBuilder === 'function') {
        contextPackage = callerContextBuilder();
      } else {
        // Fallback: re-derive context via method name lookup
        const contextMethodName = AI_TASK_REGISTRY[job.taskId]?.contextBuilderMethod;
        const { ContextBuilderService } = await import('./ContextBuilderService');
        const builderFunc = (ContextBuilderService as any)[contextMethodName];

        if (typeof builderFunc === 'function') {
          if (job.taskId === 'task-plan-explain') {
            const readingsRaw = localStorage.getItem('cfa_readings') || '[]';
            const readings = JSON.parse(readingsRaw);
            const totalHours = readings.reduce((sum: number, r: any) => sum + (r.estimatedHours || 0), 0);
            const examDate = activeSettings?.examDate || '2027-02-21';
            const startDate = activeSettings?.targetStartDate || '2026-06-28';
            const daysRemaining = Math.max(0, Math.ceil((new Date(examDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
            
            contextPackage = builderFunc(activeSettings || {}, {
              totalSubjects: 10,
              totalHoursEstimate: totalHours,
              daysRemaining: daysRemaining
            });
          } else {
            contextPackage = builderFunc();
          }
        }
      }

      aiDiagnostics.recordContextCompleted(diagId);
      aiDiagnostics.recordContextBuilt(diagId);
      if (contextPackage) {
        const raw = JSON.stringify(contextPackage);
        aiDiagnostics.recordContextSize(diagId, raw.length);
      }

      if (controller?.signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      // Task & prompt resolution — hoisted before cache check for version availability
      const taskConfig = AI_TASK_REGISTRY[job.taskId];
      const taskFound = !!taskConfig;
      const promptKey = taskConfig ? taskConfig.promptTemplateKey : null;
      const promptTemplate = promptKey ? PROMPT_REGISTRY[promptKey] : null;
      const promptFound = !!promptTemplate;
      const promptVersion = promptTemplate?.version || 'unknown';
      const contextVersion = '1.0.0';

      // DEFENSIVE GUARD: Task registry mismatch — resolve as offline fallback immediately
      if (!taskConfig) {
        console.warn(`[AiJobQueueService] Registry mismatch: Task ID "${job.taskId}" not found in AI_TASK_REGISTRY.`);
        job.error = "PROV_REGISTRY_MISMATCH: Target task configuration missing.";
        aiDiagnostics.recordFallback(diagId, 'registry_mismatch', job.error);
        this.triggerLocalOfflineFallback(job);
        return;
      }

      // Check Cache first
      const cacheKey = this.getCacheKey(
        job.taskId,
        contextPackage?.payload || {},
        promptVersion,
        contextVersion,
        providerId,
        model
      );
      aiDiagnostics.recordCacheKey(diagId, cacheKey);
      const cached = this.getCachedResult(job.taskId, contextPackage?.payload || {}, providerId, model);
      if (cached) {
        console.log(`[Queue] Cache hit for task ${job.taskId}`);
        aiDiagnostics.recordCacheHit(diagId, cacheKey);
        job.status = 'READY';
        job.progressLabel = 'Ready';
        job.result = {
          text: cached.text,
          versionMetadata: cached.versionMetadata
        };
        this.runningCount--;
        this.activeControllers.delete(jobKey);
        this.pendingDiagIds.delete(jobKey);
        this.notify();
        this.processNext();
        return;
      }

      // 2. Synthesize prompt
      job.status = 'SYNTHESIZING';
      job.progressLabel = 'Synthesizing';
      this.notify();

      // Task & prompt resolution diagnostics
      aiDiagnostics.recordTaskResolution(diagId, taskFound, promptKey, promptFound);
      if (taskFound && promptTemplate) {
        aiDiagnostics.recordVersionInfo(diagId, promptVersion, contextVersion);
      }

      if (!taskFound || !promptTemplate) {
        const missing = !taskFound ? `Task "${job.taskId}" not found in AI_TASK_REGISTRY` : `Prompt "${promptKey}" not found in PROMPT_REGISTRY`;
        throw new Error(`TASK_RESOLUTION_FAILED: ${missing}`);
      }

      const promptText = promptTemplate.userPromptTemplate(contextPackage);

      // 3. Resolve provider instance — record diagnostics BEFORE getProvider
      aiDiagnostics.recordProviderCalled(diagId, providerId, model, !!storedApiKey, !!executionApiKey);

      // Handle OFFLINE check BEFORE provider resolution
      if (providerId !== 'local-ollama' && !providerKey) {
        const errMsg = 'INVALID_API_KEY: Provider credentials are empty. Please check your system configs.';
        aiDiagnostics.recordFallback(diagId, 'missing_api_key', errMsg);
        const fallbackErr = new Error(errMsg);
        (fallbackErr as any).diagnosticsFallbackReason = 'missing_api_key';
        throw fallbackErr;
      }

      let provider: import('./AIProvider').AIProvider;
      try {
        provider = AIProviderRegistry.getProvider(providerId);
      } catch {
        // Lazy-load: provider might not be registered yet in edge cases
        try {
          const mod = await import(`./providers/${providerId === 'google-gemini' ? 'GoogleGeminiProvider' : providerId === 'anthropic-claude' ? 'AnthropicClaudeProvider' : 'LocalOllamaProvider'}`);
          // Registration side-effect runs on import
          provider = AIProviderRegistry.getProvider(providerId);
        } catch {
          const errMsg = `PROVIDER_NOT_REGISTERED: AI Provider "${providerId}" could not be resolved. Ensure it is registered in AIProviderRegistry.`;
          aiDiagnostics.recordFallback(diagId, 'provider_not_registered', errMsg);
          throw new Error(errMsg);
        }
      }

      await this.acquireRequestSlot();

      const result = await provider.generateText(
        promptText,
        promptTemplate.systemInstruction,
        providerKey || '',
        model,
        { signal: controller?.signal, endpoint }
      );

      const latencyMs = Date.now() - requestStartTime;

      // Save Cache
      this.setCacheResult(job.taskId, contextPackage?.payload || {}, providerId, model, result.text);

      // Record Telemetry
      this.recordTelemetry(providerId, result.inputTokens, result.outputTokens);

      // Record success diagnostics
      aiDiagnostics.recordSuccess(diagId, result.inputTokens, result.outputTokens, 200, latencyMs);

      job.status = 'READY';
      job.progressLabel = 'Ready';
      job.result = {
        text: result.text,
        versionMetadata: {
          provider: providerId,
          model: model,
          promptVersion: promptTemplate.version,
          contextVersion: '1.0.0',
          generatedAt: new Date().toISOString()
        }
      };

    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log(`[Queue] Job ${job.id} aborted.`);
        aiDiagnostics.recordFallback(diagId, 'aborted', 'Request was cancelled by user or superseded');
        job.status = 'FAILED';
        job.error = 'ABORTED';
        job.progressLabel = 'Cancelled';
      } else if (e.message && e.message.startsWith('RATE_LIMIT_EXCEEDED')) {
        aiDiagnostics.recordError(diagId, e.message, 429);

        // Parse retry seconds from error message: "Please retry in X seconds" or default 30
        const retryMatch = e.message.match(/(\d+)\s*seconds/i);
        const baseDelay = retryMatch ? parseInt(retryMatch[1], 10) : 30;
        const attempts = this.retryAttempts.get(jobKey) || 0;
        const backoffDelay = Math.min(baseDelay * Math.pow(2, attempts), 120);
        this.retryAttempts.set(jobKey, attempts + 1);

        console.error(`[Queue] Rate limited for ${job.id}, retrying in ${backoffDelay}s (attempt ${attempts + 1})`);

        rateLimitTracker.setRateLimited(backoffDelay);
        this.rateLimitedKeys.add(jobKey);

        job.progressLabel = `Rate Limited - Retrying in ${backoffDelay}s`;
        job.error = e.message;

        const retryTimer = setTimeout(() => {
          this.retryTimers.delete(jobKey);
          this.rateLimitedKeys.delete(jobKey);
          if (this.retryAttempts.get(jobKey) && this.retryAttempts.get(jobKey)! >= 3) {
            // Max retries exceeded — reject with PROV_RATE_LIMIT_EXHAUSTED token
            const exhaustedMsg = `PROV_RATE_LIMIT_EXHAUSTED: Rate limit retries exhausted after ${this.retryAttempts.get(jobKey)} attempts`;
            aiDiagnostics.recordFallback(diagId, 'rate_limit_retries_exhausted', exhaustedMsg);
            job.status = 'FAILED';
            job.error = exhaustedMsg;
            job.progressLabel = 'Rate Limited';
            this.retryAttempts.delete(jobKey);
            this.notify();
            return;
          }
          job.status = 'QUEUED';
          job.progressLabel = 'Retrying...';
          this.notify();
          this.processNext();
        }, backoffDelay * 1000);
        this.retryTimers.set(jobKey, retryTimer);
      } else if (e.message && e.message.startsWith('QUOTA_EXCEEDED')) {
        aiDiagnostics.recordError(diagId, e.message, 403);
        aiDiagnostics.recordFallback(diagId, 'quota_exceeded', e.message);
        console.error(`[Queue] Quota exceeded for ${job.id}:`, e);
        job.status = 'FAILED';
        job.error = e.message;
        job.progressLabel = 'Quota Exceeded';
      } else if (e.message && e.message.startsWith('INVALID_API_KEY')) {
        aiDiagnostics.recordError(diagId, e.message, 400);
        aiDiagnostics.recordFallback(diagId, 'invalid_api_key', e.message);
        console.error(`[Queue] Invalid API key for ${job.id}:`, e);
        job.status = 'FAILED';
        job.error = e.message;
        job.progressLabel = 'Auth Failed';
      } else if (e.message && e.message.startsWith('PROVIDER_ERROR')) {
        const statusMatch = e.message.match(/HTTP (\d+)/);
        const httpStatus = statusMatch ? parseInt(statusMatch[1], 10) : undefined;
        aiDiagnostics.recordError(diagId, e.message, httpStatus);
        aiDiagnostics.recordFallback(diagId, 'provider_error', e.message);
        console.error(`[Queue] Provider error for ${job.id}:`, e);
        job.status = 'FAILED';
        job.error = e.message;
        job.progressLabel = 'Provider Error';
      } else {
        console.error(`[Queue] Job execution error for ${job.id}:`, e);
        aiDiagnostics.recordError(diagId, e.message || 'Unknown provider error');
        aiDiagnostics.recordFallback(diagId, 'unknown_error', e.message || 'Unknown provider error');
        job.status = 'FAILED';
        job.error = e.message || 'Unknown provider error';
        job.progressLabel = 'Execution Failed';
      }
    } finally {
      this.runningCount--;
      this.releaseRequestSlot();
      if (this.rateLimitedKeys.has(jobKey)) {
        // Keep retry context intact; timer will re-queue
        this.activeControllers.delete(jobKey);
      } else {
        this.activeControllers.delete(jobKey);
        this.pendingJobSettings.delete(jobKey);
        this.pendingContextBuilders.delete(jobKey);
        this.pendingDiagIds.delete(jobKey);
        this.retryAttempts.delete(jobKey);
      }
      this.notify();
      if (!this.rateLimitedKeys.has(jobKey)) {
        this.processNext();
      }
    }
  }

  public cancelJob(taskId: string, resourceKey: string): void {
    const jobKey = `${taskId}_${resourceKey}`;
    if (this.activeControllers.has(jobKey)) {
      this.activeControllers.get(jobKey)!.abort();
      this.activeControllers.delete(jobKey);
    }
    if (this.retryTimers.has(jobKey)) {
      clearTimeout(this.retryTimers.get(jobKey)!);
      this.retryTimers.delete(jobKey);
    }
    this.pendingJobSettings.delete(jobKey);
    this.pendingContextBuilders.delete(jobKey);
    this.pendingDiagIds.delete(jobKey);
    this.retryAttempts.delete(jobKey);
    this.rateLimitedKeys.delete(jobKey);
    this.queue = this.queue.filter(j => !(j.taskId === taskId && j.resourceKey === resourceKey));
    this.notify();
  }

  public cancelAll(): void {
    this.activeControllers.forEach(controller => controller.abort());
    this.activeControllers.clear();
    this.retryTimers.forEach(t => clearTimeout(t));
    this.retryTimers.clear();
    this.pendingJobSettings.clear();
    this.pendingContextBuilders.clear();
    this.pendingDiagIds.clear();
    this.retryAttempts.clear();
    this.rateLimitedKeys.clear();
    this.queue = [];
    this.notify();
  }
}

export const aiJobQueue = AiJobQueueService.getInstance();
