'use strict';

const http = require('node:http');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 30000;

/**
 * Send a request to the Ollama API.
 *
 * @param {string} prompt - The prompt to send.
 * @param {object} [options] - Additional options.
 * @param {boolean} [options.json=false] - Whether to request JSON output.
 * @returns {Promise<string>} The generated text.
 */
function ollamaGenerate(prompt, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/generate', OLLAMA_URL);

    const body = JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      format: options.json ? 'json' : undefined,
      options: {
        temperature: 0.3,
        num_predict: 1024,
      },
    });

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 11434,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: OLLAMA_TIMEOUT_MS,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.response || '');
            } catch (_err) {
              resolve(data.trim());
            }
          } else {
            reject(new Error(`Ollama responded with status ${res.statusCode}: ${data}`));
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Ollama request timed out.'));
    });

    req.write(body);
    req.end();
  });
}

/**
 * Check if Ollama is available and the model is loaded.
 *
 * @returns {Promise<{available: boolean, model: string|null}>}
 */
function isOllamaAvailable() {
  return new Promise((resolve) => {
    const url = new URL('/api/tags', OLLAMA_URL);

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 11434,
        path: url.pathname,
        method: 'GET',
        timeout: 3000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const models = (parsed.models || []).map((m) => m.name || m.model);
            const hasModel = models.some((name) =>
              name.startsWith(OLLAMA_MODEL) || name.includes(OLLAMA_MODEL)
            );
            resolve({ available: true, model: hasModel ? OLLAMA_MODEL : null, models });
          } catch (_err) {
            resolve({ available: true, model: null, models: [] });
          }
        });
      }
    );

    req.on('error', () => resolve({ available: false, model: null }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ available: false, model: null });
    });

    req.end();
  });
}

/**
 * Generate a SOAP note from a clinical transcript using Llama 3.2.
 *
 * @param {string} transcript - The clinical transcript text.
 * @returns {Promise<{S: string, O: string, A: string, P: string, flags: string[]}|null>}
 *   Returns null if Ollama is unavailable (caller should use rule-based fallback).
 */
async function generateSoapNote(transcript) {
  const status = await isOllamaAvailable();
  if (!status.available || !status.model) {
    return null;
  }

  const prompt = `You are a clinical documentation assistant for Community Health Workers in low-resource settings.

Given the following patient encounter transcript, generate a structured SOAP note.

TRANSCRIPT:
"""
${transcript}
"""

Return a JSON object with exactly these keys:
- "S" (Subjective): What the patient or caregiver reported — symptoms, complaints, history.
- "O" (Objective): What was observed or measured — vitals, exam findings, test results.
- "A" (Assessment): Clinical impression — likely diagnosis or condition.
- "P" (Plan): What to do next — treatment, referral, follow-up instructions.
- "flags" (array of strings): Any danger signs or red flags that need urgent attention.

Be concise and use plain medical language appropriate for community health workers.
Respond with ONLY the JSON object, no additional text.`;

  try {
    const response = await ollamaGenerate(prompt, { json: true });
    const parsed = JSON.parse(response);

    return {
      S: String(parsed.S || parsed.subjective || ''),
      O: String(parsed.O || parsed.objective || ''),
      A: String(parsed.A || parsed.assessment || ''),
      P: String(parsed.P || parsed.plan || ''),
      flags: Array.isArray(parsed.flags) ? parsed.flags.map(String) : [],
    };
  } catch (error) {
    console.error('Llama SOAP generation failed, using rule-based fallback:', error.message);
    return null;
  }
}

/**
 * Disambiguate triage classification for cases where rule-based matching
 * is uncertain or results in GREEN but symptoms may warrant further review.
 *
 * @param {object} params
 * @param {string[]} params.symptoms - Array of reported symptoms.
 * @param {number} params.age_months - Patient age in months.
 * @param {object} [params.vitals] - Vital signs if available.
 * @param {string} params.rule_result - Current rule-based classification.
 * @returns {Promise<{classification: string, confidence: number, reasoning: string}|null>}
 *   Returns null if Ollama is unavailable.
 */
async function disambiguateTriage({ symptoms, age_months, vitals, rule_result }) {
  const status = await isOllamaAvailable();
  if (!status.available || !status.model) {
    return null;
  }

  const vitalsText = vitals
    ? `Vitals: temperature=${vitals.temperature || 'N/A'}°C, respiratory_rate=${vitals.respiratory_rate || 'N/A'}/min, MUAC=${vitals.muac || 'N/A'}mm`
    : 'No vitals available.';

  const prompt = `You are a clinical triage assistant following WHO IMCI/IMAI guidelines.

A Community Health Worker is assessing a patient with the following details:
- Age: ${age_months} months
- Symptoms: ${symptoms.join(', ')}
- ${vitalsText}
- Current rule-based classification: ${rule_result}

Based on WHO IMCI guidelines, evaluate whether the current classification is appropriate.

Return a JSON object with:
- "classification": "RED", "YELLOW", or "GREEN"
- "confidence": a number between 0.0 and 1.0 indicating your confidence
- "reasoning": a brief explanation of your assessment (1-2 sentences)
- "danger_signs": array of any identified danger signs

Be conservative — when in doubt, escalate to a higher urgency level.
Respond with ONLY the JSON object.`;

  try {
    const response = await ollamaGenerate(prompt, { json: true });
    const parsed = JSON.parse(response);

    const classification = String(parsed.classification || rule_result).toUpperCase();
    if (!['RED', 'YELLOW', 'GREEN'].includes(classification)) {
      return null;
    }

    return {
      classification,
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
      reasoning: String(parsed.reasoning || ''),
      danger_signs: Array.isArray(parsed.danger_signs) ? parsed.danger_signs.map(String) : [],
    };
  } catch (error) {
    console.error('Llama triage disambiguation failed:', error.message);
    return null;
  }
}

/**
 * Extract clinical entities from a transcript string.
 *
 * @param {string} transcript - The text to analyze.
 * @returns {Promise<{symptoms: string[], vitals: object, medications: string[], flags: string[]}|null>}
 */
async function extractClinicalEntities(transcript) {
  const status = await isOllamaAvailable();
  if (!status.available || !status.model) {
    return null;
  }

  const prompt = `You are a clinical NLP assistant. Extract structured medical entities from this transcript.

TRANSCRIPT:
"""
${transcript}
"""

Return a JSON object with:
- "symptoms": array of symptom strings mentioned
- "vitals": object with any vital signs mentioned (temperature, respiratory_rate, heart_rate, spo2, blood_pressure, muac, weight)
- "medications": array of any medications mentioned
- "flags": array of any danger signs or red flags

Respond with ONLY the JSON object.`;

  try {
    const response = await ollamaGenerate(prompt, { json: true });
    const parsed = JSON.parse(response);

    return {
      symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms.map(String) : [],
      vitals: parsed.vitals && typeof parsed.vitals === 'object' ? parsed.vitals : {},
      medications: Array.isArray(parsed.medications) ? parsed.medications.map(String) : [],
      flags: Array.isArray(parsed.flags) ? parsed.flags.map(String) : [],
    };
  } catch (error) {
    console.error('Llama clinical entity extraction failed:', error.message);
    return null;
  }
}

module.exports = {
  disambiguateTriage,
  extractClinicalEntities,
  generateSoapNote,
  isOllamaAvailable,
};
