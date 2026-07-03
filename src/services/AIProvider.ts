export interface AIProvider {
  id: string;
  name: string;
  validateKey(apiKey: string, endpoint?: string): Promise<boolean>;
  generateText(
    prompt: string,
    systemInstruction: string,
    apiKey: string,
    model: string,
    options?: { signal?: AbortSignal; endpoint?: string }
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }>;
}

export class AIProviderRegistry {
  private static providers: Map<string, AIProvider> = new Map();

  public static register(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  public static getProvider(id: string): AIProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      // Dynamic import triggers registration if not registered
      throw new Error(`AI Provider ${id} is not registered.`);
    }
    return provider;
  }

  public static listProviders(): { id: string; name: string }[] {
    return Array.from(this.providers.values()).map(p => ({ id: p.id, name: p.name }));
  }
}

