import { AIProvider, AIProviderRegistry } from '../AIProvider';

export class GoogleGeminiProvider implements AIProvider {
  public id = 'google-gemini';
  public name = 'Google Gemini';

  public async validateKey(apiKey: string): Promise<boolean> {
    if (!apiKey) return false;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        { method: 'GET' }
      );
      return res.status === 200;
    } catch (e) {
      console.warn('[Gemini] Key validation failed:', e);
      return false;
    }
  }

  public async generateText(
    prompt: string,
    systemInstruction: string,
    apiKey: string,
    model: string,
    options?: { signal?: AbortSignal }
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
    if (!apiKey) {
      throw new Error('Google Gemini API Key is missing.');
    }
    const modelName = model || 'gemini-3.5-flash';
    // Ensure format is models/gemini-xx
    const cleanModelName = modelName.startsWith('models/') ? modelName : `models/${modelName}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/${cleanModelName}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: options?.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: systemInstruction
          ? { parts: [{ text: systemInstruction }] }
          : undefined,
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.2
        }
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      let parsedError;
      try {
        parsedError = JSON.parse(errorText);
      } catch {
        parsedError = { error: { message: errorText } };
      }
      const message = parsedError?.error?.message || errorText;
      const status = res.status;
      
      // Map to rich errors
      if (status === 429) {
        throw new Error(`RATE_LIMIT_EXCEEDED: ${message}`);
      } else if (status === 400 && message.toLowerCase().includes('key')) {
        throw new Error(`INVALID_API_KEY: ${message}`);
      } else if (status === 403) {
        throw new Error(`QUOTA_EXCEEDED: ${message}`);
      }
      throw new Error(`PROVIDER_ERROR (HTTP ${status}): ${message}`);
    }

    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const inputTokens = json.usageMetadata?.promptTokenCount || Math.ceil(prompt.length / 4);
    const outputTokens = json.usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);

    return { text, inputTokens, outputTokens };
  }
}

// Register
AIProviderRegistry.register(new GoogleGeminiProvider());
