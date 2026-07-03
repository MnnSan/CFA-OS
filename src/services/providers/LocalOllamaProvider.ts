import { AIProvider, AIProviderRegistry } from '../AIProvider';

export class LocalOllamaProvider implements AIProvider {
  public id = 'local-ollama';
  public name = 'Local Ollama';

  public async validateKey(apiKey: string, endpoint?: string): Promise<boolean> {
    const host = endpoint || 'http://localhost:11434';
    try {
      const res = await fetch(`${host}/api/tags`, { method: 'GET' });
      return res.status === 200;
    } catch (e) {
      console.warn('[Ollama] Connection validation failed:', e);
      return false;
    }
  }

  public async generateText(
    prompt: string,
    systemInstruction: string,
    apiKey: string,
    model: string,
    options?: { signal?: AbortSignal; endpoint?: string }
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
    const host = options?.endpoint || 'http://localhost:11434';
    const targetModel = model || 'llama3';

    try {
      const res = await fetch(`${host}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: options?.signal,
        body: JSON.stringify({
          model: targetModel,
          prompt: prompt,
          system: systemInstruction,
          stream: false
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`PROVIDER_ERROR (HTTP ${res.status}): ${errText}`);
      }

      const json = await res.json();
      const text = json.response || '';
      
      // Ollama returns prompt_eval_count (input tokens) and eval_count (output tokens)
      const inputTokens = json.prompt_eval_count || Math.ceil(prompt.length / 4);
      const outputTokens = json.eval_count || Math.ceil(text.length / 4);

      return { text, inputTokens, outputTokens };
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      if (e.message && (e.message.includes('Failed to fetch') || e.message.includes('NetworkError'))) {
        throw new Error(`NETWORK_ERROR: Failed to connect to Ollama at ${host}. Ensure Ollama is running and CORS is enabled (OLLAMA_ORIGINS="*").`);
      }
      throw e;
    }
  }
}

AIProviderRegistry.register(new LocalOllamaProvider());
