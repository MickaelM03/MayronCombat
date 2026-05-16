import { GoogleGenAI, Type } from '@google/genai';

// Sticky failure tracking to avoid retrying broken providers/keys for a while
const deadKeys = new Map<string, number>();
const DEAD_DURATION = 5 * 60 * 1000; // 5 minutes

export interface AICascadeConfig {
  geminiKeys: string[];
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

export async function generateWithFallback(
  prompt: string,
  config: AICascadeConfig,
  schema?: any,
  mimeType: string = 'application/json'
): Promise<GenerationResult> {
  const { geminiKeys, openaiKey, groqKey, deepInfraKey, deepseekKey } = config;
  const errors: Error[] = [];
  const now = Date.now();

  // 1. Try Gemini Keys
  for (let i = 0; i < geminiKeys.length; i++) {
    const key = geminiKeys[i].trim();
    if (!key) continue;

    // Skip if marked as dead
    if (deadKeys.has(key) && now < (deadKeys.get(key) || 0)) {
      console.info(`[ai] Saut de Gemini #${i + 1} (marqué comme défaillant récemment)`);
      continue;
    }

    try {
      console.info(`[ai] Tentative avec Gemini (clé ${i + 1}/${geminiKeys.length})...`);
      const ai = new GoogleGenAI({ apiKey: key });
      
      const generationConfig: any = {
        responseMimeType: mimeType,
        maxOutputTokens: 8192, // max Gemini 2.0 Flash — sinon coupe ~2048 tokens
        temperature: 0.95,
      };
      if (schema) {
        generationConfig.responseSchema = schema;
      }

      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: generationConfig,
      });

      const text = result.text;
      if (text) {
        // Success! Clear dead status if any
        deadKeys.delete(key);
        return {
          text,
          provider: `Gemini #${i + 1}`,
          model: 'gemini-2.0-flash-exp'
        };
      }
    } catch (err: any) {
      const msg = String(err?.message || err);
      console.warn(`[ai] Gemini #${i + 1} échoué:`, msg);
      
      // Mark as dead if it's a quota or config error (404, 429, 403)
      if (/404|429|403|quota|not found|RESOURCE_EXHAUSTED/i.test(msg)) {
        deadKeys.set(key, now + DEAD_DURATION);
      }
      
      errors.push(new Error(`Gemini #${i + 1}: ${msg}`));
    }
  }

  // 2. Try Groq
  if (groqKey) {
    if (!deadKeys.has('groq') || now > (deadKeys.get('groq') || 0)) {
      const groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
      
      for (const model of groqModels) {
        try {
          console.info(`[ai] Tentative avec Groq (${model})...`);
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: prompt }],
              response_format: mimeType === 'application/json' ? { type: 'json_object' } : undefined,
              max_tokens: 8192,
              temperature: 0.95,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const text = data.choices[0]?.message?.content;
            if (text) {
              deadKeys.delete('groq');
              return {
                text,
                provider: 'Groq',
                model
              };
            }
          } else {
            const errData = await response.json().catch(() => ({}));
            const msg = errData.error?.message || response.statusText || 'Erreur inconnue';
            console.warn(`[ai] Groq (${model}) échoué:`, msg);
            
            if (response.status === 429 && model !== groqModels[groqModels.length - 1]) {
              console.info(`[ai] Groq rate limit pour ${model}, essai du modèle suivant...`);
              continue;
            }

            if (response.status === 429 || response.status === 402) {
              deadKeys.set('groq', now + DEAD_DURATION);
            }
            errors.push(new Error(`Groq: ${msg}`));
            break; // Stop trying Groq models if it's not a simple rate limit or if we're out of models
          }
        } catch (err: any) {
          console.warn(`[ai] Erreur Groq (${model}):`, err);
          errors.push(new Error(`Groq (Network): ${err.message}`));
          break;
        }
      }
    } else {
      console.info(`[ai] Saut de Groq (marqué comme défaillant récemment)`);
    }
  }

  // 3. Try OpenAI
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
          max_tokens: 16384,
          temperature: 0.95,
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
      } else {
        const errData = await response.json().catch(() => ({}));
        const msg = errData.error?.message || response.statusText || 'Erreur inconnue';
        console.warn(`[ai] OpenAI échoué:`, msg);
        errors.push(new Error(`OpenAI: ${msg}`));
      }
    } catch (err: any) {
      console.warn(`[ai] Erreur OpenAI:`, err);
      errors.push(new Error(`OpenAI (Network): ${err.message}`));
    }
  }

  // 4. Try DeepInfra
  if (deepInfraKey) {
    if (!deadKeys.has('deepinfra') || now > (deadKeys.get('deepinfra') || 0)) {
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
            max_tokens: 8192,
            temperature: 0.95,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.choices[0]?.message?.content;
          if (text) {
            deadKeys.delete('deepinfra');
            return {
              text,
              provider: 'DeepInfra',
              model: 'Llama-3.3-70B-Instruct'
            };
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          const msg = errData.error?.message || response.statusText || 'Erreur inconnue';
          console.warn(`[ai] DeepInfra échoué:`, msg);
          if (response.status === 402 || response.status === 429) {
            deadKeys.set('deepinfra', now + DEAD_DURATION);
          }
          errors.push(new Error(`DeepInfra: ${msg}`));
        }
      } catch (err: any) {
        console.warn(`[ai] Erreur DeepInfra:`, err);
        errors.push(new Error(`DeepInfra (Network): ${err.message}`));
      }
    }
  }

  // 5. Try DeepSeek
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
          max_tokens: 8192,
          temperature: 0.95,
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
      } else {
        const errData = await response.json().catch(() => ({}));
        const msg = errData.error?.message || response.statusText || 'Erreur inconnue';
        console.warn(`[ai] DeepSeek échoué:`, msg);
        errors.push(new Error(`DeepSeek: ${msg}`));
      }
    } catch (err: any) {
      console.warn(`[ai] Erreur DeepSeek:`, err);
      errors.push(new Error(`DeepSeek (Network): ${err.message}`));
    }
  }

  if (errors.length > 0) {
    const summary = errors.map(e => e.message).join('\n');
    throw new Error(`Échec de la cascade AI :\n${summary}`);
  }
  throw new Error("Aucun provider AI n'est configuré ou opérationnel.");
}
