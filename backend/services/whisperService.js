'use strict';

const { execSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');

const WHISPER_HTTP_URL = process.env.WHISPER_URL || 'http://localhost:9000/asr';
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'base';
const TEMP_DIR = path.resolve(__dirname, '..', '.tmp');
const DEFAULT_LANGUAGE = 'en';
const HTTP_TIMEOUT_MS = 60000;

// Supported audio formats
const AUDIO_FORMATS = new Set(['wav', 'mp3', 'flac', 'ogg', 'webm', 'm4a']);

/**
 * Ensure the temporary directory exists.
 */
function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

/**
 * Write base64 audio data to a temporary file.
 *
 * @param {string} audioBase64 - Base64-encoded audio data.
 * @param {string} [format='wav'] - Audio file extension.
 * @returns {string} Path to the temporary audio file.
 */
function writeAudioToTemp(audioBase64, format = 'wav') {
  ensureTempDir();

  const safeFormat = AUDIO_FORMATS.has(format) ? format : 'wav';
  const filename = `whisper_${crypto.randomUUID()}.${safeFormat}`;
  const filepath = path.join(TEMP_DIR, filename);

  const buffer = Buffer.from(audioBase64, 'base64');
  if (buffer.length === 0) {
    throw new Error('Audio data is empty after base64 decoding.');
  }

  fs.writeFileSync(filepath, buffer);
  return filepath;
}

/**
 * Clean up a temporary audio file.
 */
function cleanupTempFile(filepath) {
  try {
    if (filepath && fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (_error) {
    // Ignore cleanup errors
  }
}

/**
 * Transcribe audio via Whisper HTTP server (e.g., running via whisper-asr-webservice).
 *
 * @param {string} filepath - Path to the audio file.
 * @param {string} language - Language code (e.g., 'en', 'sw', 'hi').
 * @returns {Promise<string>} Transcribed text.
 */
function transcribeViaHttp(filepath, language) {
  return new Promise((resolve, reject) => {
    const fileData = fs.readFileSync(filepath);
    const boundary = `----FormBoundary${crypto.randomUUID().replace(/-/g, '')}`;
    const filename = path.basename(filepath);

    const bodyParts = [
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="audio_file"; filename="${filename}"\r\n`,
      `Content-Type: application/octet-stream\r\n\r\n`,
    ];

    const bodyEnd = `\r\n--${boundary}--\r\n`;

    const bodyStart = Buffer.from(bodyParts.join(''));
    const bodyEndBuf = Buffer.from(bodyEnd);
    const body = Buffer.concat([bodyStart, fileData, bodyEndBuf]);

    const url = new URL(`${WHISPER_HTTP_URL}?language=${language}&output=json`);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
      timeout: HTTP_TIMEOUT_MS,
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.text || parsed.transcript || data);
          } catch (_err) {
            resolve(data.trim());
          }
        } else {
          reject(new Error(`Whisper HTTP responded with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Whisper HTTP request timed out.'));
    });

    req.write(body);
    req.end();
  });
}

/**
 * Transcribe audio via local Whisper CLI.
 *
 * @param {string} filepath - Path to the audio file.
 * @param {string} language - Language code.
 * @returns {string} Transcribed text.
 */
function transcribeViaCli(filepath, language) {
  const command = `whisper "${filepath}" --model ${WHISPER_MODEL} --language ${language} --output_format txt --output_dir "${TEMP_DIR}"`;

  execSync(command, {
    timeout: 120000,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const baseName = path.basename(filepath, path.extname(filepath));
  const outputPath = path.join(TEMP_DIR, `${baseName}.txt`);

  if (!fs.existsSync(outputPath)) {
    throw new Error('Whisper CLI did not produce output file.');
  }

  const transcript = fs.readFileSync(outputPath, 'utf8').trim();
  cleanupTempFile(outputPath);

  return transcript;
}

/**
 * Check if the Whisper HTTP server is available.
 *
 * @returns {Promise<boolean>}
 */
function isWhisperHttpAvailable() {
  return new Promise((resolve) => {
    const url = new URL(WHISPER_HTTP_URL);
    const client = url.protocol === 'https:' ? https : http;

    const req = client.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: '/',
        method: 'GET',
        timeout: 3000,
      },
      (res) => {
        res.resume();
        resolve(true);
      }
    );

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Check if the Whisper CLI is available.
 *
 * @returns {boolean}
 */
function isWhisperCliAvailable() {
  try {
    execSync('which whisper', { stdio: ['pipe', 'pipe', 'pipe'], timeout: 5000 });
    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * Main transcription function.
 * Attempts HTTP first, then CLI, then returns a helpful error.
 *
 * @param {object} params
 * @param {string} params.audio_base64 - Base64-encoded audio.
 * @param {string} [params.language='en'] - Language code (ISO 639-1).
 * @param {string} [params.format='wav'] - Audio format.
 * @returns {Promise<{transcript: string, method: string, language: string}>}
 */
async function transcribe({ audio_base64, language = DEFAULT_LANGUAGE, format = 'wav' }) {
  if (!audio_base64) {
    throw new Error('audio_base64 is required for transcription.');
  }

  const filepath = writeAudioToTemp(audio_base64, format);

  try {
    // Try HTTP server first
    const httpAvailable = await isWhisperHttpAvailable();
    if (httpAvailable) {
      const transcript = await transcribeViaHttp(filepath, language);
      return { transcript, method: 'http', language };
    }

    // Try CLI fallback
    if (isWhisperCliAvailable()) {
      const transcript = transcribeViaCli(filepath, language);
      return { transcript, method: 'cli', language };
    }

    // No Whisper available — return informative error
    throw new Error(
      'Whisper is not available. Please start the Whisper HTTP server ' +
      '(whisper-asr-webservice on port 9000) or install the whisper CLI. ' +
      'You can also submit a text transcript directly to /api/notes/generate.'
    );
  } finally {
    cleanupTempFile(filepath);
  }
}

/**
 * Get the current availability status of Whisper.
 *
 * @returns {Promise<{available: boolean, method: string|null}>}
 */
async function getWhisperStatus() {
  const httpAvailable = await isWhisperHttpAvailable();
  if (httpAvailable) {
    return { available: true, method: 'http' };
  }

  if (isWhisperCliAvailable()) {
    return { available: true, method: 'cli' };
  }

  return { available: false, method: null };
}

module.exports = {
  getWhisperStatus,
  transcribe,
};
