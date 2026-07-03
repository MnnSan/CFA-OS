export class RateLimitTracker {
  private static instance: RateLimitTracker;
  private _isRateLimited = false;
  private _retrySeconds = 0;
  private _retryTotal = 0;
  private listeners: Set<() => void> = new Set();
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {}

  public static getInstance(): RateLimitTracker {
    if (!RateLimitTracker.instance) {
      RateLimitTracker.instance = new RateLimitTracker();
    }
    return RateLimitTracker.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const cb of this.listeners) cb();
  }

  public getState(): { isRateLimited: boolean; retrySeconds: number; retryTotal: number } {
    return {
      isRateLimited: this._isRateLimited,
      retrySeconds: this._retrySeconds,
      retryTotal: this._retryTotal,
    };
  }

  public setRateLimited(seconds: number): void {
    this._isRateLimited = true;
    this._retrySeconds = seconds;
    this._retryTotal = Math.max(this._retryTotal, seconds);
    this.notify();
    this.startCountdown();
  }

  private startCountdown(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      this._retrySeconds--;
      if (this._retrySeconds <= 0) {
        this.clearRateLimit();
      }
      this.notify();
    }, 1000);
  }

  public clearRateLimit(): void {
    this._isRateLimited = false;
    this._retrySeconds = 0;
    this._retryTotal = 0;
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.notify();
  }
}

export const rateLimitTracker = RateLimitTracker.getInstance();
