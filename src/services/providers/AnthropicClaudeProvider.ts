import { AIProvider, AIProviderRegistry } from '../AIProvider';

export class AnthropicClaudeProvider implements AIProvider {
  public id = 'anthropic-claude';
  public name = 'Anthropic Claude';

  public async validateKey(apiKey: string): Promise<boolean> {
    if (!apiKey) return false;
    return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
  }

  public async generateText(
    prompt: string,
    systemInstruction: string,
    apiKey: string,
    model: string,
    options?: { signal?: AbortSignal }
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
    if (!apiKey) {
      throw new Error('Anthropic Claude API Key is missing.');
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        signal: options?.signal,
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens: 2048,
          system: systemInstruction,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 401) throw new Error('INVALID_API_KEY: Invalid API Key');
        if (res.status === 429) throw new Error('RATE_LIMIT_EXCEEDED: Rate limit exceeded');
        throw new Error(`PROVIDER_ERROR (HTTP ${res.status}): ${errText}`);
      }

      const json = await res.json();
      const text = json.content?.[0]?.text || '';
      const inputTokens = json.usage?.input_tokens || Math.ceil(prompt.length / 4);
      const outputTokens = json.usage?.output_tokens || Math.ceil(text.length / 4);

      return { text, inputTokens, outputTokens };
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      if (e.message && (e.message.includes('Failed to fetch') || e.message.includes('CORS') || e.message.includes('NetworkError'))) {
        throw new Error('NETWORK_ERROR: Anthropic API requests blocked by browser CORS policy. Please use Google Gemini or Local Ollama.');
      }
      throw e;
    }
  }
}

AIProviderRegistry.register(new AnthropicClaudeProvider());
