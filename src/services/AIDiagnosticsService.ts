const DIAGNOSTICS_KEY = 'cfa_ai_diagnostics';
const MAX_RECORDS = 200;

export interface AIDiagnosticRecord {
  id: string;
  taskId: string;
  taskLabel: string;
  resourceKey: string;
  queuedAt: string;
  contextCompletedAt: string | null;
  providerCalledAt: string | null;
  completedAt: string | null;
  provider: string | null;
  model: string | null;
  apiKeyStored: boolean;
  apiKeyExecution: boolean;
  providerResolved: boolean;
  taskFound: boolean;
  promptKey: string | null;
  promptFound: boolean;
  contextBuilt: boolean;
  requestSent: boolean;
  responseReceived: boolean;
  httpStatus: number | null;
  errorMessage: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number | null;
  cacheHit: boolean;
  fallbackActivated: boolean;
  fallbackReason: string | null;
  promptVersion: string | null;
  contextVersion: string | null;
  cacheKey: string | null;
  jobId: string | null;
  contextSize: number | null;
  responseSource: 'AI' | 'Cache' | 'Offline' | null;
}

const TASK_LABELS: Record<string, string> = {
  'task-plan-explain': 'Coach Insight',
  'task-coach-recommendation': 'Coach Recommendation',
  'task-mission-explain': 'Mission Explanation',
  'task-prepare-brief': 'Prepare Me',
  'task-metric-explain': 'KPI Explanation',
  'task-learning-pattern': 'Learning Pattern',
  'task-los-summary': 'LOS Summary',
  'task-mission-status': 'Mission Status',
  'task-weekly-review': 'Weekly Review',
  'task-analytics-explain': 'Analytics',
  'task-mission-brief': 'Mission Brief',
};

export class AIDiagnosticsService {
  private static instance: AIDiagnosticsService;
  private records: AIDiagnosticRecord[] = [];
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.load();
  }

  public static getInstance(): AIDiagnosticsService {
    if (!AIDiagnosticsService.instance) {
      AIDiagnosticsService.instance = new AIDiagnosticsService();
    }
    return AIDiagnosticsService.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const cb of this.listeners) cb();
  }

  public getRecords(): AIDiagnosticRecord[] {
    return [...this.records];
  }

  public getLatest(): AIDiagnosticRecord | null {
    return this.records.length > 0 ? this.records[this.records.length - 1] : null;
  }

  public beginRecord(taskId: string, resourceKey: string): string {
    const id = `diag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const record: AIDiagnosticRecord = {
      id,
      taskId,
      taskLabel: TASK_LABELS[taskId] || taskId,
      resourceKey,
      queuedAt: new Date().toISOString(),
      contextCompletedAt: null,
      providerCalledAt: null,
      completedAt: null,
      provider: null,
      model: null,
      apiKeyStored: false,
      apiKeyExecution: false,
      providerResolved: false,
      taskFound: false,
      promptKey: null,
      promptFound: false,
      contextBuilt: false,
      requestSent: false,
      responseReceived: false,
      httpStatus: null,
      errorMessage: null,
      inputTokens: null,
      outputTokens: null,
      latencyMs: null,
      cacheHit: false,
      fallbackActivated: false,
      fallbackReason: null,
      promptVersion: null,
      contextVersion: null,
      cacheKey: null,
      jobId: null,
      contextSize: null,
      responseSource: null,
    };
    this.records.push(record);
    if (this.records.length > MAX_RECORDS) {
      this.records = this.records.slice(-MAX_RECORDS);
    }
    this.persist();
    this.notify();
    return id;
  }

  public recordContextCompleted(diagId: string): void {
    const record = this.records.find(r => r.id === diagId);
    if (record) {
      record.contextCompletedAt = new Date().toISOString();
      this.persist();
      this.notify();
    }
  }

  public recordTaskResolution(diagId: string, taskFound: boolean, promptKey: string | null, promptFound: boolean): void {
    const record = this.records.find(r => r.id === diagId);
    if (record) {
      record.taskFound = taskFound;
      record.promptKey = promptKey;
      record.promptFound = promptFound;
      this.persist();
      this.notify();
    }
  }

  public recordContextBuilt(diagId: string): void {
    const record = this.records.find(r => r.id === diagId);
    if (record) {
      record.contextBuilt = true;
      this.persist();
      this.notify();
    }
  }

  public recordVersionInfo(diagId: string, promptVersion: string, contextVersion: string): void {
    const record = this.records.find(r => r.id === diagId);
    if (record) {
      record.promptVersion = promptVersion;
      record.contextVersion = contextVersion;
      this.persist();
      this.notify();
    }
  }

  public recordContextSize(diagId: string, contextSize: number): void {
    const record = this.records.find(r => r.id === diagId);
    if (record) {
      record.contextSize = contextSize;
      this.persist();
      this.notify();
    }
  }

  public recordJobId(diagId: string, jobId: string): void {
    const record = this.records.find(r => r.id === diagId);
    if (record) {
      record.jobId = jobId;
      this.persist();
      this.notify();
    }
  }

  public recordCacheKey(diagId: string, cacheKey: string): void {
    const record = this.records.find(r => r.id === diagId);
    if (record) {
      record.cacheKey = cacheKey;
      this.persist();
      this.notify();
    }
  }

  public recordResponseSource(diagId: string, source: 'AI' | 'Cache' | 'Offline'): void {
    const record = this.records.find(r => r.id === diagId);
    if (record) {
      record.responseSource = source;
      this.persist();
      this.notify();
    }
  }

  public recordProviderCalled(diagId: string, provider: string, model: string, apiKeyStored: boolean = false, apiKeyExecution: boolean = false): void {
    const record = this.records.find(r => r.id === diagId);
    if (record) {
      record.providerCalledAt = new Date().toISOString();
      record.provider = provider;
      record.model = model;
      record.apiKeyStored = apiKeyStored;
      record.apiKeyExecution = apiKeyExecution;
      record.providerResolved = true;
      record.requestSent = true;
      this.persist();
      this.notify();
    }
  }

  public recordCacheHit(diagId: string, cacheKey?: string): void {
    const record = this.records.find(r => r.id === diagId);
    if (record) {
      record.cacheHit = true;
      record.cacheKey = cacheKey || null;
      record.responseReceived = true;
      record.responseSource = 'Cache';
      record.completedAt = new Date().toISOString();
      record.latencyMs = new Date(record.completedAt).getTime() - new Date(record.queuedAt).getTime();
      this.persist();
      this.notify();
    }
  }

  public recordSuccess(
    diagId: string,
    inputTokens: number,
    outputTokens: number,
    httpStatus: number,
    latencyMs: number
  ): void {
    const record = this.records.find(r => r.id === diagId);
    if (record) {
      record.inputTokens = inputTokens;
      record.outputTokens = outputTokens;
      record.httpStatus = httpStatus;
      record.responseReceived = true;
      record.responseSource = 'AI';
      record.completedAt = new Date().toISOString();
      record.latencyMs = latencyMs;
      this.persist();
      this.notify();
    }
  }

  public recordFallback(diagId: string, reason: string, errorMessage?: string): void {
    const record = this.records.find(r => r.id === diagId);
    if (record) {
      record.fallbackActivated = true;
      record.fallbackReason = reason;
      record.errorMessage = errorMessage || null;
      record.responseSource = 'Offline';
      record.completedAt = new Date().toISOString();
      record.latencyMs = new Date(record.completedAt).getTime() - new Date(record.queuedAt).getTime();
      this.persist();
      this.notify();
    }
  }

  public recordError(diagId: string, errorMessage: string, httpStatus?: number): void {
    const record = this.records.find(r => r.id === diagId);
    if (record) {
      record.errorMessage = errorMessage;
      if (httpStatus !== undefined) record.httpStatus = httpStatus;
      record.completedAt = new Date().toISOString();
      record.latencyMs = new Date(record.completedAt).getTime() - new Date(record.queuedAt).getTime();
      this.persist();
      this.notify();
    }
  }

  public clear(): void {
    this.records = [];
    localStorage.removeItem(DIAGNOSTICS_KEY);
    this.notify();
  }

  private load(): void {
    try {
      const saved = localStorage.getItem(DIAGNOSTICS_KEY);
      if (saved) {
        this.records = JSON.parse(saved);
      }
    } catch {
      this.records = [];
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(DIAGNOSTICS_KEY, JSON.stringify(this.records));
    } catch {
      // Storage full — trim
      this.records = this.records.slice(-50);
      try {
        localStorage.setItem(DIAGNOSTICS_KEY, JSON.stringify(this.records));
      } catch {}
    }
  }
}

export const aiDiagnostics = AIDiagnosticsService.getInstance();
