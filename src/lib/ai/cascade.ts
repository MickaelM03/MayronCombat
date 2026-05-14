import { GoogleGenAI, Type } from '@google/genai';

export interface AICascadeConfig {
  geminiKeys: string[];
  // Potential future providers
  openaiKey?: string;
  groqKey?: string;
  deepInfraKey?: string;
  deepseekKey?: string;
  anthropicKey?: string;
}

export interface GenerationResult {
  text: string;
  provider: string;
  model: string;
}

/**
 * Handles AI generation with fallback logic.
 * Tries Gemini keys in order, then falls back to other providers if configured.
 */
export async function generateWithFallback(
  prompt: string,
  config: AICascadeConfig,
  schema?: any,
  mimeType: string = 'application/json'
): Promise<GenerationResult> {
  const { geminiKeys, openaiKey, groqKey, deepInfraKey, deepseekKey } = config;
  const errors: Error[] = [];

  // 1. Try Gemini Keys
  for (let i = 0; i < geminiKeys.length; i++) {
    const key = geminiKeys[i].trim();
    if (!key) continue;

    try {
      console.info(`[ai] Tentative avec Gemini (clé ${i + 1}/${geminiKeys.length})...`);
      const ai = new GoogleGenAI({ apiKey: key });
      
      const generationConfig: any = {
        responseMimeType: mimeType,
      };
      if (schema) {
        generationConfig.responseSchema = schema;
      }

      const result = await ai.models.generateContent({
        model: "gemini-1.5-flash-latest",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: generationConfig,
      });

      const text = result.text;
      if (text) {
        return {
          text,
          provider: `Gemini #${i + 1}`,
          model: 'gemini-1.5-flash-latest'
        };
      }
    } catch (err: any) {
      const msg = String(err?.message || err);
      console.warn(`[ai] Gemini #${i + 1} échoué:`, msg);
      
      // If it's not a quota error, maybe we should stop? 
      // But usually, we want to try the next key anyway.
      errors.push(err);
      
      // If it's a "Safety" error, it won't work with other keys either probably, 
      // but let's keep it simple and try all keys.
    }
  }

  // 2. Try Groq (Great free tier fallback if user has a key)
  if (groqKey) {
    try {
      console.info(`[ai] Tentative avec Groq...`);
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          response_format: mimeType === 'application/json' ? { type: 'json_object' } : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices[0]?.message?.content;
        if (text) {
          return {
            text,
            provider: 'Groq',
            model: 'llama-3.3-70b-versatile'
          };
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        console.warn(`[ai] Groq échoué:`, errData);
      }
    } catch (err) {
      console.warn(`[ai] Erreur Groq:`, err);
    }
  }

  // 3. Try OpenAI (If user has a key)
  if (openaiKey) {
    try {
      console.info(`[ai] Tentative avec OpenAI...`);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: mimeType === 'application/json' ? { type: 'json_object' } : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices[0]?.message?.content;
        if (text) {
          return {
            text,
            provider: 'OpenAI',
            model: 'gpt-4o-mini'
          };
        }
      }
    } catch (err) {
      console.warn(`[ai] Erreur OpenAI:`, err);
    }
  }

  // 4. Try DeepInfra (High performance open-weights)
  if (deepInfraKey) {
    try {
      console.info(`[ai] Tentative avec DeepInfra...`);
      const response = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${deepInfraKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/Llama-3.3-70B-Instruct',
          messages: [{ role: 'user', content: prompt }],
          response_format: mimeType === 'application/json' ? { type: 'json_object' } : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices[0]?.message?.content;
        if (text) {
          return {
            text,
            provider: 'DeepInfra',
            model: 'Llama-3.3-70B-Instruct'
          };
        }
      }
    } catch (err) {
      console.warn(`[ai] Erreur DeepInfra:`, err);
    }
  }

  // 5. Try DeepSeek (High performance / Low cost)
  if (deepseekKey) {
    try {
      console.info(`[ai] Tentative avec DeepSeek...`);
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${deepseekKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          response_format: mimeType === 'application/json' ? { type: 'json_object' } : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices[0]?.message?.content;
        if (text) {
          return {
            text,
            provider: 'DeepSeek',
            model: 'deepseek-chat'
          };
        }
      }
    } catch (err) {
      console.warn(`[ai] Erreur DeepSeek:`, err);
    }
  }

  if (errors.length > 0) {
    throw errors[0];
  }
  throw new Error("Tous les providers AI ont échoué ou aucune clé valide n'est configurée.");
}
