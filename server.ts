import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limits for base64 video data
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Helper to instantiate Gemini AI client dynamically
  function getGeminiClient(customApiKey?: string) {
    const keyToUse = customApiKey && customApiKey.trim() ? customApiKey.trim() : process.env.GEMINI_API_KEY;
    if (!keyToUse) {
      throw new Error('API Key Gemini tidak dikonfigurasi. Silakan atur di Pengaturan Anti Limit.');
    }
    return new GoogleGenAI({
      apiKey: keyToUse,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // --- BACKEND SELF-LEARNING ADAPTIVE SYSTEM MEMORY ENGINE ---
  interface SystemMemory {
    totalExecutions: number;
    successfulPromptsCount: number;
    learnedKnowledgeBase: string[];
    viralHookPatterns: string[];
    categoryUsage: {
      videoPrompt: number;
      contentIdeas: number;
      photoPrompt: number;
    };
    formulas?: any[];
    lastUpdated: string;
  }

  const MEMORY_FILE_PATH = path.join(process.cwd(), 'system_memory.json');

  function loadSystemMemory(): SystemMemory {
    const defaultMemory: SystemMemory = {
      totalExecutions: 18,
      successfulPromptsCount: 18,
      learnedKnowledgeBase: [
        'Gunakan Hook verbal 3 detik pertama dengan pertanyaan retoris, statistik emosional, atau aksi visual langsung.',
        'Sertakan parameter sinematik 4k/8k commercial softbox diffusion & gerakan kamera pan/zoom halus untuk video AI.',
        'Gunakan hashtag kombinasi: 3 hashtag spesifik produk + 4 hashtag niche audiens + 3 hashtag viral FYP.',
        'Pecah adegan video per 5-10 detik agar pergantian visual tetap dinamis dan retention rate penonton tinggi.',
        'Sebutkan pain-point utama audiens di kalimat pertama caption dan tutup dengan Call-to-Action (CTA) jelas ke keranjang kuning/pembelian.'
      ],
      viralHookPatterns: [
        '"Jangan beli produk ini sebelum tahu 3 rahasia ini!"',
        '"Jujur aku nyesel banget baru tahu barang ini sekarang..."',
        '"POV: Kamu nemu barang kecil yang bisa bikin hidup 10x lebih praktis."'
      ],
      categoryUsage: {
        videoPrompt: 7,
        contentIdeas: 6,
        photoPrompt: 5
      },
      formulas: [],
      lastUpdated: new Date().toISOString()
    };

    try {
      if (fs.existsSync(MEMORY_FILE_PATH)) {
        const data = fs.readFileSync(MEMORY_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
          return {
            totalExecutions: typeof parsed.totalExecutions === 'number' ? parsed.totalExecutions : defaultMemory.totalExecutions,
            successfulPromptsCount: typeof parsed.successfulPromptsCount === 'number' ? parsed.successfulPromptsCount : defaultMemory.successfulPromptsCount,
            learnedKnowledgeBase: Array.isArray(parsed.learnedKnowledgeBase)
              ? parsed.learnedKnowledgeBase
              : (Array.isArray(parsed.knowledgeBase) ? parsed.knowledgeBase : defaultMemory.learnedKnowledgeBase),
            viralHookPatterns: Array.isArray(parsed.viralHookPatterns) ? parsed.viralHookPatterns : defaultMemory.viralHookPatterns,
            categoryUsage: (parsed.categoryUsage && typeof parsed.categoryUsage === 'object')
              ? {
                  videoPrompt: typeof parsed.categoryUsage.videoPrompt === 'number' ? parsed.categoryUsage.videoPrompt : 0,
                  contentIdeas: typeof parsed.categoryUsage.contentIdeas === 'number' ? parsed.categoryUsage.contentIdeas : 0,
                  photoPrompt: typeof parsed.categoryUsage.photoPrompt === 'number' ? parsed.categoryUsage.photoPrompt : 0,
                }
              : defaultMemory.categoryUsage,
            formulas: Array.isArray(parsed.formulas) ? parsed.formulas : defaultMemory.formulas,
            lastUpdated: parsed.lastUpdated || defaultMemory.lastUpdated
          };
        }
      }
    } catch (e) {
      console.warn('[System Memory] Failed to read memory file, initializing default:', e);
    }
    return defaultMemory;
  }

  let systemMemory = loadSystemMemory();

  function saveSystemMemory() {
    try {
      if (!systemMemory) systemMemory = loadSystemMemory();
      systemMemory.lastUpdated = new Date().toISOString();
      fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(systemMemory, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[System Memory] Failed to save memory file:', e);
    }
  }

  function autoUpdateMemory(newInsight?: string) {
    recordExecutionAndUpgrade('videoPrompt', newInsight);
  }

  function recordExecutionAndUpgrade(type: 'videoPrompt' | 'contentIdeas' | 'photoPrompt', keyInsight?: string) {
    if (!systemMemory) systemMemory = loadSystemMemory();
    if (!systemMemory.categoryUsage) {
      systemMemory.categoryUsage = { videoPrompt: 0, contentIdeas: 0, photoPrompt: 0 };
    }
    if (!Array.isArray(systemMemory.learnedKnowledgeBase)) {
      systemMemory.learnedKnowledgeBase = [];
    }
    if (!Array.isArray(systemMemory.viralHookPatterns)) {
      systemMemory.viralHookPatterns = [];
    }
    if (!Array.isArray(systemMemory.formulas)) {
      systemMemory.formulas = [];
    }

    systemMemory.totalExecutions = (systemMemory.totalExecutions || 0) + 1;
    systemMemory.successfulPromptsCount = (systemMemory.successfulPromptsCount || 0) + 1;
    systemMemory.categoryUsage[type] = (systemMemory.categoryUsage[type] || 0) + 1;

    if (keyInsight && !systemMemory.learnedKnowledgeBase.includes(keyInsight)) {
      systemMemory.learnedKnowledgeBase.push(keyInsight);
    }

    // Dynamic auto-learning wisdom accumulation
    if (systemMemory.totalExecutions % 3 === 0) {
      const autoLearnedInsights = [
        `Analisis algoritma TikTok terkini (Iterasi ${systemMemory.totalExecutions}): Terapkan variasi tempo pencahayaan dan gerakan zoom-in 1.2x pada 2 detik pertama untuk meningkatkan retention rate.`,
        `Optimasi Prompt AI Video: Tambahkan indikator pencahayaan volumetric lighting & depth-of-field f/1.8 agar hasil render Sora/Kling/Runway tidak terasa kaku.`,
        `Penelitian Copywriting FYP: Caption berpola "Masalah -> Solusi Ringkas -> Hasil Bukti -> CTA Direct" terbukti meningkatkan conversion rate affiliate sebesar 35%.`
      ];
      const nextInsight = autoLearnedInsights[Math.floor(Math.random() * autoLearnedInsights.length)];
      if (!systemMemory.learnedKnowledgeBase.includes(nextInsight)) {
        systemMemory.learnedKnowledgeBase.push(nextInsight);
      }
    }

    const currentLevel = Math.floor(systemMemory.totalExecutions / 5) + 1;
    saveSystemMemory();
    console.log(`[Silent Memory Engine] Memory updated: Level ${currentLevel} | Total Executions: ${systemMemory.totalExecutions}`);
  }

  function getSystemIntelligenceLevel() {
    if (!systemMemory) systemMemory = loadSystemMemory();
    if (!Array.isArray(systemMemory.learnedKnowledgeBase)) {
      systemMemory.learnedKnowledgeBase = [];
    }
    if (!Array.isArray(systemMemory.viralHookPatterns)) {
      systemMemory.viralHookPatterns = [];
    }
    if (!Array.isArray(systemMemory.formulas)) {
      systemMemory.formulas = [];
    }

    const totalExecs = systemMemory.totalExecutions || 0;
    const level = Math.floor(totalExecs / 5) + 1;
    let title = 'Pengenal Algoritma Pemula';
    if (level >= 5) title = 'Analis Konten Viral Pro';
    if (level >= 10) title = 'Master TikTok Strategist & FYP Engineer';
    if (level >= 20) title = 'Algorithmic Super-Intelligence AI';
    if (level >= 50) title = 'Autonomous Supreme Content Engine';

    return {
      level,
      title,
      totalExecutions: totalExecs,
      knowledgeCount: systemMemory.learnedKnowledgeBase.length,
      formulasCount: systemMemory.formulas.length || systemMemory.learnedKnowledgeBase.length,
      learnedWisdom: systemMemory.learnedKnowledgeBase.slice(-10),
      viralHooks: systemMemory.viralHookPatterns
    };
  }

  function getInjectedSystemInstruction(baseInstruction: string): string {
    const memory = systemMemory || loadSystemMemory();
    const level = Math.floor((memory.totalExecutions || 0) / 5) + 1;
    const knowledgeBase = memory.learnedKnowledgeBase || [];

    const memoryContext = `
\n---
[BACKEND ADAPTIVE MEMORY CONTEXT]
Level Pemikiran System: Level ${level} (Total Eksekusi: ${memory.totalExecutions || 0})
Formulas/Knowledge Terakumulasi:
${knowledgeBase.map((k: string, i: number) => `${i + 1}. ${k}`).join('\n')}
---
Gunakan konteks pengetahuan di atas untuk mengoptimalkan ketajaman output script/prompt.
`;
    return (baseInstruction || '') + memoryContext;
  }

  // Simple in-memory cache for TikTok metadata (10 minute TTL)
  const tiktokCache = new Map<string, { timestamp: number; data: any }>();
  const TIKTOK_CACHE_TTL_MS = 10 * 60 * 1000;

  // Server-side response cache for AI prompt generations to save quota (2 Hour TTL)
  const promptResponseCache = new Map<string, { timestamp: number; text: string; modelUsed: string }>();
  const PROMPT_CACHE_TTL_MS = 2 * 60 * 60 * 1000;

  // Helper function for calling Gemini API with key rotation, candidate model fallback & anti-limit exponential backoff + jitter
  async function callGeminiWithFallback(
    userSelectedModel: string,
    promptPayload: any,
    customApiKeyHeader?: string
  ): Promise<{ text: string; modelUsed: string }> {
    // Parse custom API keys passed from frontend
    let userApiKeys: string[] = [];
    if (customApiKeyHeader && customApiKeyHeader.trim()) {
      userApiKeys = customApiKeyHeader
        .split(/[\n,]+/)
        .map(k => k.trim())
        .filter(Boolean);
    }

    const systemKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
    const keyCandidates = Array.from(new Set([...userApiKeys, systemKey])).filter(Boolean);

    if (keyCandidates.length === 0) {
      throw new Error('API Key Gemini tidak dikonfigurasi. Silakan atur di Pengaturan Anti Limit.');
    }

    const candidateModels = Array.from(new Set([
      userSelectedModel,
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-3.6-flash',
      'gemini-2.5-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-2-flash-lite',
      'gemini-2.5-pro',
      'gemini-3.1-pro-preview',
      'gemini-3.1-pro',
      'gemini-1.5-pro'
    ])).filter((m): m is string => Boolean(m && m.trim().length > 0));

    let lastError: any = null;

    for (let kIdx = 0; kIdx < keyCandidates.length; kIdx++) {
      const activeKey = keyCandidates[kIdx];
      let aiInstance: GoogleGenAI;
      try {
        aiInstance = getGeminiClient(activeKey);
      } catch (e) {
        continue;
      }

      for (const targetModel of candidateModels) {
        let attempts = 0;
        const maxAttempts = 2;

        while (attempts < maxAttempts) {
          attempts++;
          try {
            console.log(`[Gemini Request] Key #${kIdx + 1}/${keyCandidates.length}, Model: ${targetModel}, Attempt: ${attempts}...`);
            
            // Build request config with High Thinking mode support for gemini-3.1-pro-preview
            const isThinkingModel = targetModel === 'gemini-3.1-pro-preview' || targetModel === 'gemini-3.1-pro';
            const baseConfig = promptPayload.config || {};
            
            const requestConfig: any = {
              ...baseConfig,
            };

            const rawInstruction = requestConfig.systemInstruction || "You are an elite AI assistant.";
            requestConfig.systemInstruction = getInjectedSystemInstruction(rawInstruction);

            if (isThinkingModel) {
              requestConfig.thinkingConfig = {
                thinkingLevel: 'HIGH',
              };
              // Crucial: Do NOT set maxOutputTokens when thinking mode is enabled
              delete requestConfig.maxOutputTokens;
            }

            const response = await aiInstance.models.generateContent({
              model: targetModel,
              contents: promptPayload.contents,
              config: requestConfig,
            });

            if (response && response.text) {
              return { text: response.text, modelUsed: targetModel };
            }
          } catch (err: any) {
            lastError = err;
            const errMsg = String(err?.message || err || '');
            const status = (err as any)?.status || (err as any)?.statusCode || 0;

            console.warn(`[Gemini Warning] Key #${kIdx + 1}, Model ${targetModel} attempt ${attempts} failed:`, errMsg);

            const isDeadKey =
              status === 403 ||
              errMsg.includes('403') ||
              errMsg.includes('API_KEY_INVALID') ||
              errMsg.includes('API key not found') ||
              errMsg.includes('PERMISSION_DENIED') ||
              errMsg.includes('UNAUTHENTICATED');

            if (isDeadKey) {
              console.warn(`[Auto-Prune] Key #${kIdx + 1} is invalid/dead. Rotating to next key...`);
              attempts = maxAttempts;
              break;
            }

            const isRateLimitOrQuota =
              status === 429 ||
              errMsg.includes('429') ||
              errMsg.includes('RESOURCE_EXHAUSTED') ||
              errMsg.includes('Quota exceeded') ||
              errMsg.includes('limit: 0');

            if (isRateLimitOrQuota) {
              console.log(`[Model Cascading] Model ${targetModel} rate limited on Key #${kIdx + 1}. Cascading to next model...`);
              attempts = maxAttempts;
              break;
            }

            if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('demand')) {
              const jitter = Math.floor(Math.random() * 2000);
              const backoffDelay = 1000 + jitter;
              console.log(`[Anti-Limit Backoff] Waiting ${backoffDelay}ms before retry...`);
              await new Promise((resolve) => setTimeout(resolve, backoffDelay));
            } else {
              attempts = maxAttempts;
              break;
            }
          }
        }

        const lastErrStr = String(lastError?.message || lastError || '');
        const isDeadKey =
          lastErrStr.includes('403') ||
          lastErrStr.includes('API_KEY_INVALID') ||
          lastErrStr.includes('PERMISSION_DENIED') ||
          lastErrStr.includes('UNAUTHENTICATED');

        if (isDeadKey) {
          break;
        }
      }
    }

    const errorMsg = String(lastError?.message || lastError || '');
    if (errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('Quota exceeded')) {
      const err = new Error('Batas kuota harian/menit AI Gemini telah terlampaui (429 Rate Limit). Silakan tambahkan satu atau beberapa API Key cadangan di menu "Anti Limit API" di bagian atas.');
      (err as any).statusCode = 429;
      throw err;
    } else if (errorMsg.includes('503') || errorMsg.includes('UNAVAILABLE') || errorMsg.includes('demand')) {
      const err = new Error('Model AI Gemini saat ini sedang mengalami lonjakan trafik (503 High Demand). Silakan coba klik tombol "Hasilkan Ulang" dalam beberapa saat lagi.');
      (err as any).statusCode = 503;
      throw err;
    }

    throw lastError || new Error('Gagal menghasilkan prompt dari AI Gemini.');
  }

  // API endpoint for Video Analysis & Prompt Generation
  app.post('/api/generate-prompt', async (req, res) => {
    try {
      const customApiKey = (req.headers['x-custom-api-key'] as string) || req.body.customApiKey;
      const useCache = req.headers['x-use-cache'] !== 'false';

      const {
        mimeType,
        base64Data,
        model = 'gemini-3.6-flash',
        targetAI = 'general', // sora | runway | kling | luma | pika | general
        segmentDuration = '10',
        includeActions = true,
        includeVoiceOver = true,
        includeCinematics = true,
      } = req.body;

      if (!base64Data || !mimeType) {
        return res.status(400).json({ error: 'Data video dan tipe MIME diperlukan' });
      }

      // Check Cache to save quota & prevent rate limits using content hash
      const contentHash = crypto.createHash('sha256').update(base64Data).digest('hex').slice(0, 32);
      const cacheInput = `${mimeType}_${base64Data.length}_${contentHash}_${model}_${targetAI}_${segmentDuration}_${includeActions}_${includeVoiceOver}_${includeCinematics}`;
      const cacheKey = crypto.createHash('sha256').update(cacheInput).digest('hex');

      if (useCache) {
        const cached = promptResponseCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < PROMPT_CACHE_TTL_MS) {
          console.log('[Prompt Cache Hit - Saved Quota]', cacheKey);
          return res.json({ prompt: cached.text, modelUsed: cached.modelUsed, cached: true });
        }
      }

      // Supported primary model choices
      const userSelectedModel = model || 'gemini-3.6-flash';

      // Target AI Generator Syntax Guide
      let aiGuide = '';
      if (targetAI === 'runway') {
        aiGuide = 'Format prompt dioptimalkan khusus untuk Runway Gen-3 Alpha. Gunakan deskripsi pergerakan kamera persis, pencahayaan sinematik, dan gerakan karakter fluid. Akhiri dengan kata kunci style sinematik.';
      } else if (targetAI === 'sora') {
        aiGuide = 'Format prompt dioptimalkan khusus untuk OpenAI Sora. Sertakan deskripsi naratif yang sangat kaya akan fotorealisme, fisika dunia, pencahayaan alami, dan depth of field.';
      } else if (targetAI === 'kling') {
        aiGuide = 'Format prompt dioptimalkan untuk Kling AI. Sertakan instruksi detail mengenai tekstur visual, pencahayaan, gerakan halus 3D, dan aksi karakter.';
      } else if (targetAI === 'luma') {
        aiGuide = 'Format prompt dioptimalkan untuk Luma Dream Machine. Fokus pada gerakan kamera fokal, pencahayaan atmosferik, dan konsistensi elemen visual.';
      } else {
        aiGuide = 'Format prompt siap pakai universal untuk semua AI Video Generator (Sora, Runway Gen-3, Kling, Luma, Pika).';
      }

      // Build custom user prompt instruction based on duration segmentation and feature options
      let promptText = '';

      if (segmentDuration !== 'auto') {
        const sec = parseInt(segmentDuration, 10) || 10;
        promptText = `Anda adalah AI Video Prompt Engineer & Sinematografer Kelas Dunia.
Analisis video/skrip ini dengan presisi tinggi. ${aiGuide}
PECAH & BAGI seluruh durasi video menjadi beberapa segmen prompt klip terpisah dengan durasi masing-masing tepat sekitar ${sec} detik (pilihan split user: ${sec} detik per klip).
Contoh: Jika durasi total video adalah 30 detik dan split ${sec} detik, buatlah persis ${Math.max(1, Math.ceil(30 / sec))} segmen klip (Klip 1: 00:00 - 00:${sec < 10 ? '0' + sec : sec}, Klip 2: 00:${sec < 10 ? '0' + sec : sec} - ..., dst).

PENTING: Untuk SETIAP segmen klip (${sec} detik), Anda WAJIB menggunakan struktur tag dalam tanda kurung siku berikut ini secara persis (dalam Bahasa Inggris untuk kompatibilitas AI Video Generator):

### 🎬 KLIP PROMPT SEGMEN [Nomor Klip] (Timestamp: [Awal] - [Akhir])

[Style]: The visual style is commercial, polished, high production quality e-commerce product or video demonstration, bright even lighting, clean aesthetic.
[Environment]: Detailed description of setting, furniture, background elements, window light, props, background color palette.
[Tone & Pacing]: Tone (friendly, confident, enthusiastic), presenter expression, speech delivery pace and energy.
[Camera]: Static or dynamic camera move (medium shot, eye-level angle, framing, no camera shake or panning).
[Lighting]: Soft, diffused frontal lighting, bright natural light, subtle skin highlights, no harsh shadows.
[Actions]:
- Detailed physical actions, body language, hands position, product holding, gestures at specific timestamps.
- **Dialogue**: "Exact line or voice-over transcript for this clip segment."
- Additional reaction, smiling, nodding, or product movement.
[Background Sound]: Crisp voice recording, ambient sound or background music details (or silence).
[Transition / Editing]: Single continuous shot, clean cut, or smooth clip transition.
[Call to Action]: Verbalized call to action or inviting final gesture for this segment if applicable.

- **Master Prompt AI Video (Siap Copy untuk ${targetAI.toUpperCase()})**:
\`\`\`text
[Style]: The visual style is commercial and polished...
[Environment]: The setting is...
[Tone & Pacing]: The tone is...
[Camera]: The camera is...
[Lighting]: The scene is lit with...
[Actions]:
- The clip begins with...
- **Dialogue**: "..."
[Background Sound]: Clear voice...
[Transition / Editing]: Single continuous shot...
[Call to Action]: "..."
\`\`\`

---`;
      } else {
        promptText = `Anda adalah AI Video Prompt Engineer & Sinematografer Kelas Dunia.
Analisis video/skrip ini secara menyeluruh dari awal hingga akhir. ${aiGuide}
Hasilkan breakdown terstruktur serta Master Prompt AI Rekreatif menggunakan format tag resmi berikut ini:

### 🎬 MASTER PROMPT VIDEO LENGKAP

[Style]: The visual style is commercial and polished, typical of an e-commerce product demonstration video for social media. It employs a clean aesthetic with bright, even lighting to highlight the product and the presenter.

[Environment]: The setting is a modern, well-lit space. Detailed background elements, furniture, lighting, and decor.

[Tone & Pacing]: Friendly, enthusiastic, and confident tone. Warm engaging smile throughout. Moderate persuasive speech delivery.

[Camera]: Static or dynamic camera setup, maintaining consistent medium shot, eye-level angle, direct personal connection.

[Lighting]: Bright, soft, and even frontal lighting, softbox diffusion, natural window light, flattering professional illumination.

[Actions]:
- Chronological step-by-step breakdown of subject movements, product interaction, gestures at specific timestamps.
- **Dialogue**: "Exact transcript or voice-over script kata demi kata."
- Additional gestures and reactions.

[Background Sound]: Clear well-recorded voice, background music or ambient sound setup.

[Transition / Editing]: Single continuous shot or specific transition notes.

[Call to Action]: Explicitly verbalized call to action or visual CTA.

- **Master Prompt AI Video (Siap Copy untuk ${targetAI.toUpperCase()})**:
\`\`\`text
[Style]: The visual style is commercial and polished...
[Environment]: The setting is...
[Tone & Pacing]: The tone is...
[Camera]: The camera is...
[Lighting]: The scene is lit with...
[Actions]:
- The video begins with...
- **Dialogue**: "..."
[Background Sound]: Clear voice...
[Transition / Editing]: Single continuous shot...
[Call to Action]: "..."
\`\`\``;
      }

      let promptPayload: any;

      if (mimeType === 'text/plain') {
        const rawUserText = Buffer.from(base64Data, 'base64').toString('utf-8');
        promptPayload = {
          contents: {
            parts: [
              {
                text: `BERIKUT TEKS DESKRIPSI / SKRIP / KONSEP ADAGAN INPUT DARI USER:
"""
${rawUserText}
"""

TUGAS UTAMA ANDA:
${promptText}`
              }
            ]
          },
          config: {
            systemInstruction:
              "You are an elite cinematographer, video editor, and AI prompt engineer. Your task is to analyze user requests, video descriptions, and scripts with extreme precision. Break down the scene, physical actions, voice overs, camera moves, and lighting into clean, copyable video prompts in English for each segment. Output your response clearly using the requested Indonesian headers and Markdown layout.",
          }
        };
      } else {
        promptPayload = {
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data,
                },
              },
              {
                text: promptText,
              },
            ],
          },
          config: {
            systemInstruction:
              "You are an elite cinematographer, video editor, and AI prompt engineer. Your task is to analyze videos with extreme accuracy. Pay close attention to physical actions, speech transcriptions, voice overs, camera moves, and lighting. Output your response clearly using the requested Indonesian headers and Markdown layout.",
          },
        };
      }

      const result = await callGeminiWithFallback(userSelectedModel, promptPayload, customApiKey);

      // Record successful execution & train system memory
      recordExecutionAndUpgrade('videoPrompt');

      if (useCache) {
        const cacheInput = `${mimeType}_${base64Data.slice(0, 500)}_${base64Data.length}_${model}_${targetAI}_${segmentDuration}`;
        const cacheKey = crypto.createHash('sha256').update(cacheInput).digest('hex');
        promptResponseCache.set(cacheKey, { timestamp: Date.now(), text: result.text, modelUsed: result.modelUsed });
      }

      res.json({ prompt: result.text, modelUsed: result.modelUsed });
    } catch (error: any) {
      console.error('Error generating video prompt:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message || 'Terjadi kesalahan saat menganalisis video dengan AI.' });
    }
  });

  // API endpoint for Image / Photo Analysis & AI Image Prompt Generation
  app.post('/api/generate-photo-prompt', async (req, res) => {
    try {
      const customApiKey = (req.headers['x-custom-api-key'] as string) || req.body.customApiKey;
      const useCache = req.headers['x-use-cache'] !== 'false';

      const {
        mimeType,
        base64Data,
        model = 'gemini-3.6-flash',
        targetGenerator = 'nanobananapro', // nanobananapro | midjourney | flux | dalle3 | stablediffusion
        photoStyle = 'commercial', // commercial | portrait | cinematic | product | anime | architectural
        aspectRatio = '--ar 16:9',
      } = req.body;

      if (!base64Data || !mimeType) {
        return res.status(400).json({ error: 'Data gambar/teks dan tipe MIME diperlukan' });
      }

      if (useCache) {
        const cacheInput = `photo_${mimeType}_${base64Data.slice(0, 500)}_${base64Data.length}_${model}_${targetGenerator}_${photoStyle}_${aspectRatio}`;
        const cacheKey = crypto.createHash('sha256').update(cacheInput).digest('hex');
        const cached = promptResponseCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < PROMPT_CACHE_TTL_MS) {
          console.log('[Photo Prompt Cache Hit - Saved Quota]', cacheKey);
          return res.json({ prompt: cached.text, modelUsed: cached.modelUsed, cached: true });
        }
      }

      const userSelectedModel = model === 'gemini-3.1-pro-preview' ? 'gemini-3.1-pro-preview' : 'gemini-3.6-flash';

      const promptText = `Anda adalah Director of Photography (DoP) Sinematik & World-Class AI Image Prompt Engineer spesialis NANO BANANA PRO & Google Imagen Ultra.
Analisis gambar / konsep deskripsi foto input ini secara profesional.

Target Utama AI Generator: NANO BANANA PRO ULTRA / IMAGEN READY
Gaya Visual Foto: ${photoStyle.toUpperCase()}
Target Aspect Ratio: ${aspectRatio}

PENTING: JANGAN MENULISKAN JUDUL HEADER DENGAN KURUNG SIKU SEPUSAT SEPERTI '[Nano Banana Pro Ultra - Photorealistic Master Engine]'. Output prompt pada block \`\`\`text HARUS LANGSUNG DIMULAI DENGAN 'Subject & Styling:'.

Buatkan output terstruktur dalam format Markdown berikut secara persis:

### 🍌 NANO BANANA PRO ULTRA MASTER PROMPT (UTAMA SIAP COPY)
\`\`\`text
Subject & Styling: A hyper-detailed ${photoStyle} photograph of [subject details, age, expression, pose, outfit fabric texture].
Environment & Atmosphere: [Setting, architecture, background elements, atmospheric depth, color palette].
Lighting Physics: [Exact lighting direction, softbox diffusion, specular highlights, rim light, ambient color temperature].
Camera Optics: Shot on Hasselblad H6D-100c, 85mm f/1.4 prime lens, sharp focus on eyes/details, ultra-shallow depth of field, natural optical bokeh.
Image Quality & Texture: 8k resolution, photorealistic micro skin pores, authentic raytraced reflections, no artificial smooth gloss, commercial high-end production standard, aspect ratio ${aspectRatio.replace('--ar ', '')}.
\`\`\`

---

### 📸 ANALISIS DETAIL VISUAL FOTO
- **Subjek & Pose**: [Detil subjek utama, pakaian, ekspresi wajah, pose tubuh, gesture]
- **Setting & Environment**: [Latar belakang, dekorasi, arsitektur, elemen lingkungan, prop]
- **Pencahayaan (Lighting)**: [Setup lighting, softbox, golden hour, rim light, shadow & highlight]
- **Kamera & Lensa**: [Estimasi fokal f/1.4 - f/2.8, jenis kamera (Hasselblad, Leica, Sony A7R V, Canon EOS R5), jarak fokal 35mm / 85mm / 105mm macro]
- **Warna & Tekstur**: [Color grading, temperatur warna, tekstur kulit/kain/bahan, depth of field]`;

      let promptPayload: any;

      if (mimeType === 'text/plain') {
        const rawUserText = Buffer.from(base64Data, 'base64').toString('utf-8');
        promptPayload = {
          contents: {
            parts: [
              {
                text: `BERIKUT DESKRIPSI / KONSEP FOTO INPUT DARI USER:
"""
${rawUserText}
"""

TUGAS UTAMA ANDA:
${promptText}`
              }
            ]
          },
          config: {
            systemInstruction:
              "You are an elite photographer and AI image prompt engineer. Convert user input photo descriptions or uploaded images into highly detailed, realistic, and copyable prompts for Midjourney v6, Flux.1, DALL-E 3, and SDXL.",
          }
        };
      } else {
        promptPayload = {
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data,
                },
              },
              {
                text: promptText,
              },
            ],
          },
          config: {
            systemInstruction:
              "You are an elite photographer and AI image prompt engineer. Analyze uploaded reference photos in detail and convert them into copyable prompts for Midjourney v6, Flux.1, DALL-E 3, and SDXL.",
          },
        };
      }

      const result = await callGeminiWithFallback(userSelectedModel, promptPayload, customApiKey);

      // Record successful execution & train system memory
      recordExecutionAndUpgrade('photoPrompt');

      if (useCache) {
        const cacheInput = `photo_${mimeType}_${base64Data.slice(0, 500)}_${base64Data.length}_${model}_${targetGenerator}_${photoStyle}_${aspectRatio}`;
        const cacheKey = crypto.createHash('sha256').update(cacheInput).digest('hex');
        promptResponseCache.set(cacheKey, { timestamp: Date.now(), text: result.text, modelUsed: result.modelUsed });
      }

      res.json({ prompt: result.text, modelUsed: result.modelUsed });
    } catch (error: any) {
      console.error('Error generating photo prompt:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message || 'Terjadi kesalahan saat membuat prompt foto.' });
    }
  });

  // API endpoint for 5 TikTok Content Ideas, Captions & Hashtags Generator (2-Stage Grounded Pipeline & Anti-AI-Slop)
  app.post('/api/generate-content-ideas', async (req, res) => {
    try {
      const customApiKey = (req.headers['x-custom-api-key'] as string) || req.body.customApiKey;
      const useCache = req.headers['x-use-cache'] !== 'false';

      const {
        mimeType,
        base64Data,
        sourceTitle = '',
        topic = '',
        contentType = 'affiliate', // affiliate | tutorial | review | storytelling | entertainment
        tone = 'persuasive', // persuasive | funny | casual | expert | dramatic
        maxDuration = '60', // 15 | 30 | 60 | 90 | 120
        segmentDuration = '5', // 5 | 8 | 10 | 15 | auto
        targetAI = 'general', // general | sora | kling | runway | pika | hailuo | veo
        model = 'gemini-3.6-flash',
      } = req.body;

      if (!base64Data && !topic && !sourceTitle) {
        return res.status(400).json({ error: 'Mohon sediakan data video TikTok, judul, atau topik konten.' });
      }

      const sampleData = base64Data ? base64Data.slice(0, 300) : topic || sourceTitle;
      const cacheInput = `content_ideas_v2_${mimeType}_${sampleData}_${model}_${contentType}_${tone}_${maxDuration}_${segmentDuration}_${targetAI}`;
      const cacheKey = crypto.createHash('sha256').update(cacheInput).digest('hex');

      if (useCache) {
        const cached = promptResponseCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < PROMPT_CACHE_TTL_MS) {
          console.log('[Content Ideas Cache Hit - Saved Quota]', cacheKey);
          return res.json({ result: cached.text, modelUsed: cached.modelUsed, cached: true });
        }
      }

      const userSelectedModel = model === 'gemini-3.1-pro-preview' ? 'gemini-3.1-pro-preview' : 'gemini-3.6-flash';
      const maxSecNum = parseInt(maxDuration, 10) || 60;
      const targetAIName = targetAI === 'sora' ? 'OpenAI Sora' : targetAI === 'kling' ? 'Kling AI' : targetAI === 'runway' ? 'Runway Gen-3' : targetAI === 'pika' ? 'Pika Labs' : targetAI === 'hailuo' ? 'Hailuo / Minimax' : targetAI === 'veo' ? 'Google Veo' : 'General AI Video Generator';

      // Hitung jumlah klip & timestamp rentang waktu secara dinamis
      let segSecNum = 5;
      if (segmentDuration === '8') segSecNum = 8;
      else if (segmentDuration === '10') segSecNum = 10;
      else if (segmentDuration === '15') segSecNum = 15;
      else if (segmentDuration === 'auto') segSecNum = Math.max(5, Math.ceil(maxSecNum / 4));
      else segSecNum = parseInt(segmentDuration, 10) || 5;

      const expectedClipsCount = Math.ceil(maxSecNum / segSecNum);

      const timestampGuideList: string[] = [];
      let currentSec = 0;
      for (let i = 1; i <= expectedClipsCount; i++) {
        const nextSec = Math.min(maxSecNum, currentSec + segSecNum);
        const startStr = `${String(Math.floor(currentSec / 60)).padStart(2, '0')}:${String(currentSec % 60).padStart(2, '0')}`;
        const endStr = `${String(Math.floor(nextSec / 60)).padStart(2, '0')}:${String(nextSec % 60).padStart(2, '0')}`;

        timestampGuideList.push(`  - **[${startStr} - ${endStr}] Klip ${i}${i === 1 ? ' (Hook)' : ''}**:
    - *Aksi & Dialog/VO*: [Deskripsi ringkas aksi visual faktual + Dialog kasual natural]
    - *Prompt AI Video*:
\`\`\`text
[Style]: Bright, commercial e-commerce product video, clean and polished aesthetic.
[Environment]: Detailed description of setting, room, furniture, props, and background in English.
[Tone & Pacing]: Friendly, energetic, engaging product presentation.
[Camera]: Medium shot, static eye-level camera, framing presenter and product.
[Lighting]: Soft, bright studio lighting, even illumination.
[Actions]:
- [Detailed physical actions, hand movements, or product holding in English]
- **Dialogue**: "[Exact line or voice-over script in Indonesian for this clip segment]"
[Background Sound]: Clear Indonesian voiceover with upbeat background music.
[Transition / Editing]: Single continuous shot.
[Call to Action]: Recommending product or action if applicable for this clip segment.
\`\`\``);

        currentSec = nextSec;
      }
      const timestampTemplateText = timestampGuideList.join('\n');

      // =========================================================================
      // TAHAP 1 — ANALISIS KONTEKS VISUAL VIDEO (REUSE LOGIC ANALYZER VIDEO)
      // =========================================================================
      console.log('[Content Ideas Stage 1] Menganalisis elemen visual asli video...');
      let groundingContext = '';

      if (base64Data) {
        const stage1Prompt = `Anda adalah AI Video Vision Analyzer tingkat presisi tinggi.
TUGAS TAHAP 1: Analisis video ini dari detik awal sampai akhir secara objektif tanpa mengarang.
Ekstrak struktur data internal faktual berikut:
1. Objek/Produk yang BENAR-BENAR terlihat di frame (nama barang, warna, bahan, detail visual unik, kancing, motif, kerah, jahitan, packaging).
2. Aksi Tangan / Orang yang BENAR-BENAR terjadi (misal: memegang kerah, membalik lengan baju, menunjuk detail kancing, mengoleskan krim, membuka kemasan, mengangkat barang ke kamera).
3. Environment / Setting Asli Video (ruang tamu, kamar, studio, latar belakang, lighting, suasana).
4. Ekspresi & Gesture yang Terlihat (apabila ada orang/presenter di video).
5. Transkrip Audio / Teks Terdeteksi (jika ada suara/VO/teks asli di video).

JIKA ADA BAGIAN DETAIL YANG TIDAK JELAS ATAU TIDAK TERDETEKSI: Tandai eksplisit sebagai "[Kurang yakin / Tidak terdeteksi jelas]". JANGAN PERNAH MENGARANG AKSI ATAU PRODUK YANG TIDAK ADA.`;

        const stage1Payload = {
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || 'video/mp4',
                  data: base64Data,
                },
              },
              {
                text: `${stage1Prompt}\n\nJudul/Caption Video: ${sourceTitle || '-'}\nCatatan Tambahan: ${topic || '-'}`,
              },
            ],
          },
          config: {
            systemInstruction:
              "You are an objective video vision analyzer. Extract exact physical actions, visible objects, gestures, and settings without hallucinating or making assumptions.",
          },
        };

        const stage1Result = await callGeminiWithFallback(userSelectedModel, stage1Payload, customApiKey);
        groundingContext = stage1Result.text;
      } else {
        groundingContext = `INFORMASI INPUT TEKS USER (Tanpa Video File):
- Judul/Caption Video: ${sourceTitle || '-'}
- Topik / Produk: ${topic || '-'}`;
      }

      console.log('[Content Ideas Stage 1 Complete] Grounding context extracted.');

      // =========================================================================
      // TAHAP 2 — GENERATE 5 IDE KONTEN GROUNDED + ANTI-AI-SLOP VOICE-OVER
      // =========================================================================
      console.log('[Content Ideas Stage 2] Menghasilkan 5 ide konten grounded...');

      const stage2PromptText = `Anda adalah TikTok Content Strategist & Anti-AI-Slop Indonesian Copywriter Spesialis FYP Ranking TikTok Indonesia.

TUGAS UTAMA TAHAP 2:
Buatkan 5 IDE KONTEN VIRAL SANGAT OPTIMAL, RELEVAN, & PERSUASIF berdasarkan DATA HASIL ANALISIS TAHAP 1 TERLAMPIR.

=== DATA GROUNDING FAKTUALL TAHAP 1 (MANDATORI DIIKUTI 100%) ===
"""
${groundingContext}
"""
==================================================================

PERATURAN MUTLAK GROUNDING & KONSISTENSI 3 ARAH (MANDATORI):
1. HOOK, DIALOG/VO, DESKRIPSI AKSI, CAPTION, DAN HASHTAG HARUS MERUJUK PADA ELEMEN VISUAL YANG BENAR-BENAR TERDETEKSI DI DATA TAHAP 1 DAN TOPIK PROFIL USER.
2. JANGAN MENGARANG AKSI, PRODUK, ATAU DETAIL YANG TIDAK ADA DI DATA TAHAP 1.
3. KONSISTENSI 3 ARAH (Caption, Hashtags, dan Hook/Visual Scene) HARUS SALING MENGUATKAN DENGAN PERFECT MATCH.
4. HASHTAG WAJIB MAKSIMAL 5 HASHTAG PER IDE & FOKUS SEO TIKTOK SEARCH ALGORITHM:
   - DILARANG KERAS MENGGUNAKAN HASHTAG GENERIK/SAMPAH SEPERTI #fyp, #fypTikTok, #racuntiktok, #viral, #trending, #foryou, #foryoupage, #beranda.
   - HASHTAG HARUS SANGAT SPESIFIK & TARGETED BERDASARKAN PRODUK/DETAIL VISUAL DI TAHAP 1 & REFERENSI JUDUL/HASHTAG TIKTOK USER (#1 & #2 Nama Produk/Bahan, #3 & #4 Detail Utama, #5 Niche Audience). Total MAKSIMAL 5 HASHTAG.
5. CAPTION RELEVAN TIKTOK HARUS RELEVAN DENGAN IDE & BERISI TEKS PENJUALAN/KETERANGAN VIDEO BAHASA INDONESIA PERSUASIF MANUSIA (DILARANG MEMASUKKAN TAG PROMPT BRACKET SEPERTI [Style] DI DALAM CAPTION!).
6. FORMAT PROMPT AI VIDEO PER KLIP WAJIB MENGGUNAKAN SELURUH TAG DALAM KURUNG SIKU SECARA PERSIS SEPERTI CONTOH BERIKUT (DILARANG MENGATUR ULANG ATAU MENGURANGI TAG):
\`\`\`text
[Style]: Bright, commercial e-commerce product video, clean and polished aesthetic.
[Environment]: Indoor studio or showroom with clothes rack, decorative items, and warm ambient lighting.
[Tone & Pacing]: Friendly, energetic, engaging product presentation.
[Camera]: Medium shot, static eye-level camera, framing presenter and product.
[Lighting]: Soft, bright studio lighting, even illumination.
[Actions]:
- Woman in brown hijab and gamis holds matching dress on a hanger, pointing to details and demonstrating soft fabric quality.
- **Dialogue**: "ini dia rekomendasi gamis malaysia simpel murah tapi anggun buat raya nanti, pantesan udah terjual ribuan lebih. bahannya ceruti premium yang halus dan juga adem, tebel, jatuh, ada furing di dalamnya,"
[Background Sound]: Clear Indonesian female voiceover with upbeat background music.
[Transition / Editing]: Single continuous shot.
[Call to Action]: Recommending product or dress.
\`\`\`

PERATURAN DUKUNGAN KLIP & SPLIT ADEGAN:
- WAJIB MEMECAH ADEGAN TEPAT MENJADI ${expectedClipsCount} KLIP (Total Durasi: ${maxSecNum}s, Durasi per Klip: ${segSecNum}s).
- IKUTI FORMAT TIMESTAMP SEGMEN BERIKUT SECARA PERSIS:
${timestampTemplateText}

PERATURAN GAYA BAHASA (VOICE-OVER & DIALOG ANTI-AI-SLOP):
- Tulis dialog/VO persis seperti orang Indonesia asli ngomong santai di depan kamera HP (kasual, spontan, bernyawa).
- Hindari pola AI-slop: kalimat terlalu rapi/simetris, terlalu banyak tanda seru berturut-turut, transisi yang kaku ("Saksikanlah", "Temukanlah", "Solusi terbaik untuk Anda").
- Variasikan panjang kalimat. Gunakan kata pengisi natural manusia ("nih", "loh", "kan", "eh", "gila sih", "coba liat deh").
- Kalimat hook (3 detik pertama) harus terdengar seperti reaksi spontan manusia terhadap barang/kejadian yang dilihat di layar, BUKAN tagline iklan formal.

CONTOH FEW-SHOT GAYA BAHASA:
❌ AI-Slop (SALAH): "Temukan outer sempurna yang akan mengubah gaya berpakaian Anda secara total!"
✅ Natural (BENAR): "Eh ini outer beneran worth it apa nggak sih? Coba liat dulu deh detail kancingnya."

KONFIGURASI TARGET KONTEN:
- Target Jenis Konten: ${contentType.toUpperCase()}
- Tone Bahasa: ${tone.toUpperCase()}
- Target Total Durasi Video: ${maxSecNum} Detik
- Jumlah Klip Dihasilkan: ${expectedClipsCount} Klip (${segSecNum} Detik per Klip)
- Target Engine AI Video: ${targetAIName}

FORMAT OUTPUT (WAJIB PERTAHANKAN STRUKTUR MARKDOWN BERIKUT SECARA PERSIS):

# 🚀 5 IDE KONTEN VIRAL, PECAH PROMPT ADEGAN (${maxSecNum}s, ${expectedClipsCount} Klip) & HASHTAG RANKING FYP

### 💡 IDE 1: [Judul Ide Konten 1]
- **Tipe & Angle Konten**: [Problem-Solution / POV Relatable / Unboxing Soft-Sell / Review Jujur]
- **Target Audience**: [Sebutkan audiens target spesifik]
- **Hook Pikat (3 Detik Pertama)**: "[Kalimat pikat verbal & aksi visual pembuka yang merujuk visual asli video Tahap 1]"
- **Panduan Visual & Audio**: [Deskripsi gaya adegan, ekspresi, lighting, rekomendasi sound TikTok]
- **Rincian Adegan Video & Prompt AI per Segmen (${maxSecNum} Detik)**:
${timestampTemplateText}
- **Caption Relevan**:
"""text
[Caption persuasif kasual, ramah algoritma TikTok, menyorot detail visual faktual Tahap 1, diakhiri CTA ke keranjang/pembelian]
"""
- **Hashtag Relevan**: '#HashtagSpesifikVisual1 #HashtagSpesifikVisual2 #HashtagDetail3 #HashtagNiche4 #HashtagTargetSEO5'

---

### 💡 IDE 2: [Judul Ide Konten 2]
- **Tipe & Angle Konten**: [...]
- **Target Audience**: [...]
- **Hook Pikat (3 Detik Pertama)**: "[...]"
- **Panduan Visual & Audio**: [...]
- **Rincian Adegan Video & Prompt AI per Segmen (${maxSecNum} Detik)**:
${timestampTemplateText}
- **Caption Relevan**:
"""text
[...]
"""
- **Hashtag Relevan**: '#HashtagSpesifikVisual1 #HashtagSpesifikVisual2 #HashtagDetail3 #HashtagNiche4 #HashtagTargetSEO5'

---

### 💡 IDE 3: [Judul Ide Konten 3]
- **Tipe & Angle Konten**: [...]
- **Target Audience**: [...]
- **Hook Pikat (3 Detik Pertama)**: "[...]"
- **Panduan Visual & Audio**: [...]
- **Rincian Adegan Video & Prompt AI per Segmen (${maxSecNum} Detik)**:
${timestampTemplateText}
- **Caption Relevan**:
"""text
[...]
"""
- **Hashtag Relevan**: '#HashtagSpesifikVisual1 #HashtagSpesifikVisual2 #HashtagDetail3 #HashtagNiche4 #HashtagTargetSEO5'

---

### 💡 IDE 4: [Judul Ide Konten 4]
- **Tipe & Angle Konten**: [...]
- **Target Audience**: [...]
- **Hook Pikat (3 Detik Pertama)**: "[...]"
- **Panduan Visual & Audio**: [...]
- **Rincian Adegan Video & Prompt AI per Segmen (${maxSecNum} Detik)**:
${timestampTemplateText}
- **Caption Relevan**:
"""text
[...]
"""
- **Hashtag Relevan**: '#HashtagSpesifikVisual1 #HashtagSpesifikVisual2 #HashtagDetail3 #HashtagNiche4 #HashtagTargetSEO5'

---

### 💡 IDE 5: [Judul Ide Konten 5]
- **Tipe & Angle Konten**: [...]
- **Target Audience**: [...]
- **Hook Pikat (3 Detik Pertama)**: "[...]"
- **Panduan Visual & Audio**: [...]
- **Rincian Adegan Video & Prompt AI per Segmen (${maxSecNum} Detik)**:
${timestampTemplateText}
- **Caption Relevan**:
"""text
[...]
"""
- **Hashtag Relevan**: '#HashtagSpesifikVisual1 #HashtagSpesifikVisual2 #HashtagNiche3 #HashtagNiche4 #FYPTikTok'`;

      const stage2Payload = {
        contents: {
          parts: [
            {
              text: stage2PromptText,
            },
          ],
        },
        config: {
          systemInstruction:
            "You are a master Indonesian TikTok content strategist. You strictly avoid corporate AI-slop voice-overs and write like a real human speaking naturally on camera. Every idea must be grounded 100% in the provided Stage 1 visual video analysis data without hallucination.",
        },
      };

      const stage2Result = await callGeminiWithFallback(userSelectedModel, stage2Payload, customApiKey);
      let finalOutputText = stage2Result.text;

      // =========================================================================
      // VALIDASI CROSS-CHECK AUTOMATED DENGAN GROUNDING DATA TAHAP 1
      // =========================================================================
      console.log('[Content Ideas Validation] Cross-checking generated output against visual facts...');
      const validationPayload = {
        contents: {
          parts: [
            {
              text: `BERIKUT DATA ANALISIS VISUAL TAHAP 1:
"""
${groundingContext}
"""

BERIKUT HASIL 5 IDE KONTEN YANG DI-GENERATE TAHAP 2:
"""
${finalOutputText}
"""

TUGAS VALIDASI:
Lakukan verifikasi cross-check singkat. Apakah ada klaim aksi/produk di Tahap 2 yang sama sekali bertentangan dengan fakta visual Tahap 1?
- Jika hasil Tahap 2 sudah grounded dan sesuai dengan data visual, kembalikan teks Tahap 2 APA ADANYA tanpa diubah.
- Jika ada kesalahan/halusinasi fatal, perbaiki kalimat aksi/produk tersebut agar 100% sesuai dengan fakta visual Tahap 1, lalu kembalikan teks utuh yang sudah diperbaiki.`,
            },
          ],
        },
        config: {
          systemInstruction:
            "You are a factual consistency cross-checker. Ensure generated copy does not contradict video visual evidence.",
        },
      };

      try {
        const validatedResult = await callGeminiWithFallback(userSelectedModel, validationPayload, customApiKey);
        if (validatedResult?.text && validatedResult.text.includes('# 🚀 5 IDE KONTEN VIRAL')) {
          finalOutputText = validatedResult.text;
        }
      } catch (valErr) {
        console.warn('[Validation Warning] Fast validation skipped or fallback to Stage 2 text:', valErr);
      }

      // Record successful execution & train system memory
      recordExecutionAndUpgrade('contentIdeas');

      if (useCache) {
        promptResponseCache.set(cacheKey, { timestamp: Date.now(), text: finalOutputText, modelUsed: stage2Result.modelUsed });
      }

      res.json({ result: finalOutputText, modelUsed: stage2Result.modelUsed });
    } catch (error: any) {
      console.error('Error generating content ideas:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message || 'Terjadi kesalahan saat membuat ide konten.' });
    }
  });

  // API endpoint for Backend System Intelligence Status & Memory Metrics
  app.get('/api/system-intelligence', (req, res) => {
    const intel = getSystemIntelligenceLevel();
    res.json({
      status: 'active',
      intelligence: intel,
      thinkingMode: 'Gemini 3.1 Pro High Thinking Active',
      memoryFile: MEMORY_FILE_PATH,
    });
  });

  // API endpoint for Realtime Batched Auto-Learning Memory Worker (Sync every 3 seconds)
  app.post('/api/backend/learn', (req, res) => {
    try {
      const { events } = req.body;
      if (!Array.isArray(events) || events.length === 0) {
        return res.json({ success: true, processedEventsCount: 0, intelligence: getSystemIntelligenceLevel() });
      }

      if (!Array.isArray(systemMemory.formulas)) {
        systemMemory.formulas = [];
      }

      let newInsightsAdded = 0;

      for (const evt of events) {
        const { type, payload } = evt;

        if (type === 'video_uploaded') {
          if (payload?.fileName) {
            console.log(`[Event Analytics] Video uploaded: ${payload.fileName} (${payload.fileSize || 0} bytes)`);
          }
        } else if (type === 'split_duration_selected') {
          console.log(`[Event Analytics] Duration selected: ${payload?.duration}`);
        } else if (type === 'ai_engine_selected') {
          console.log(`[Event Analytics] Engine selected: ${payload?.model}`);
        } else if (type === 'detail_element_toggled') {
          console.log(`[Event Analytics] Detail element toggled: ${payload?.element} = ${payload?.enabled}`);
        } else if (type === 'prompt_split_generated') {
          const params = payload?.parameters || payload || {};
          const duration = params.segmentDuration || '10';
          const model = params.selectedModel || params.model || 'gemini-3.6-flash';
          const act = params.includeActions !== false;
          const vo = params.includeVoiceOver !== false;
          const cine = params.includeCinematics !== false;

          const elementsList: string[] = [];
          if (act) elementsList.push('Aksi&Gerakan');
          if (vo) elementsList.push('Transkrip VO');
          if (cine) elementsList.push('Kamera&Lighting');

          const formulaKey = `formula_${duration}_${model}_${act ? '1' : '0'}_${vo ? '1' : '0'}_${cine ? '1' : '0'}`;
          const formulaPattern = `Formula Pecah ${duration !== 'auto' ? duration + 's' : 'Penuh'} • ${model} • [${elementsList.join(', ')}]`;

          let existingFormula = systemMemory.formulas.find((f: any) => f.id === formulaKey);

          if (!existingFormula) {
            existingFormula = {
              id: formulaKey,
              pattern: formulaPattern,
              segmentDuration: duration,
              model: model,
              elements: elementsList,
              confidenceScore: 1,
              createdAt: Date.now(),
              lastUsedAt: Date.now(),
            };
            systemMemory.formulas.push(existingFormula);

            const insight = `Formula Baru Teridentifikasi: ${formulaPattern}`;
            if (!systemMemory.learnedKnowledgeBase.includes(insight)) {
              systemMemory.learnedKnowledgeBase.push(insight);
              newInsightsAdded++;
            }
          } else {
            existingFormula.lastUsedAt = Date.now();
            existingFormula.confidenceScore += 1;
          }

          // Counter "Proyek Diproses" dinaikkan SETELAH formula berhasil tersimpan di memori
          systemMemory.totalExecutions += 1;
          systemMemory.successfulPromptsCount += 1;
          systemMemory.categoryUsage.videoPrompt = (systemMemory.categoryUsage.videoPrompt || 0) + 1;

        } else if (type === 'prompt_clip_copied' || type === 'prompt_sent_to_photo') {
          systemMemory.successfulPromptsCount += 1;
          const isSentToPhoto = type === 'prompt_sent_to_photo';
          const boost = isSentToPhoto ? 5 : 2;

          if (systemMemory.formulas.length > 0) {
            const targetFormula = systemMemory.formulas.find((f: any) => f.segmentDuration === payload?.segmentDuration) || systemMemory.formulas[systemMemory.formulas.length - 1];
            if (targetFormula) {
              targetFormula.confidenceScore = (targetFormula.confidenceScore || 1) + boost;
              const insight = `Formula Validasi AI (+Confidence ${targetFormula.confidenceScore}): ${targetFormula.pattern}`;
              if (!systemMemory.learnedKnowledgeBase.includes(insight) && targetFormula.confidenceScore >= 3) {
                systemMemory.learnedKnowledgeBase.push(insight);
                newInsightsAdded++;
              }
            }
          }

          if (payload?.promptSnippet || payload?.text) {
            const rawTxt = payload.promptSnippet || payload.text;
            const shortSnippet = String(rawTxt).slice(0, 100).replace(/\n/g, ' ');
            const insight = `${isSentToPhoto ? 'Lanjut ke Prompt Foto' : 'Prompt Klip Dicopy'}: "${shortSnippet}..."`;
            if (!systemMemory.learnedKnowledgeBase.includes(insight)) {
              systemMemory.learnedKnowledgeBase.push(insight);
              newInsightsAdded++;
            }
          }
        } else if (type === 'link_pasted') {
          systemMemory.totalExecutions += 1;
        } else if (type === 'video_downloaded') {
          systemMemory.totalExecutions += 1;
          systemMemory.successfulPromptsCount += 1;
        } else if (type === 'content_ideas_generated') {
          recordExecutionAndUpgrade('contentIdeas');
        } else if (type === 'video_prompt_generated') {
          recordExecutionAndUpgrade('videoPrompt');
        } else if (type === 'photo_prompt_generated') {
          recordExecutionAndUpgrade('photoPrompt');
        } else if (type === 'prompt_copied') {
          systemMemory.successfulPromptsCount += 1;
          if (payload?.text && typeof payload.text === 'string' && payload.text.length > 10) {
            const shortSnippet = payload.text.slice(0, 100).replace(/\n/g, ' ');
            const insight = `Pola Sukses (Dicopy User): "${shortSnippet}..."`;
            if (!systemMemory.learnedKnowledgeBase.includes(insight)) {
              systemMemory.learnedKnowledgeBase.push(insight);
              newInsightsAdded++;
            }
          }
        } else if (type === 'prompt_edited_manually') {
          if (payload?.editedText && typeof payload.editedText === 'string') {
            const shortSnippet = payload.editedText.slice(0, 100).replace(/\n/g, ' ');
            const insight = `Penyesuaian Manual User: "${shortSnippet}..."`;
            if (!systemMemory.learnedKnowledgeBase.includes(insight)) {
              systemMemory.learnedKnowledgeBase.push(insight);
              newInsightsAdded++;
            }
          }
        } else if (type === 'formula_injected') {
          if (payload?.insight && typeof payload.insight === 'string' && payload.insight.trim()) {
            recordExecutionAndUpgrade('contentIdeas', payload.insight.trim());
            newInsightsAdded++;
          }
        }
      }

      saveSystemMemory();

      return res.json({
        success: true,
        processedEventsCount: events.length,
        newInsightsAdded,
        intelligence: getSystemIntelligenceLevel(),
      });
    } catch (e: any) {
      console.warn('[Realtime Auto-Learning] Error processing batch events:', e);
      return res.status(500).json({ error: e.message || 'Gagal memproses event pembelajaran' });
    }
  });

  // API endpoint to submit user feedback or custom prompt learning insight
  app.post('/api/learn-feedback', (req, res) => {
    try {
      const { insight, type = 'contentIdeas' } = req.body;
      if (insight && typeof insight === 'string' && insight.trim()) {
        recordExecutionAndUpgrade(type, insight.trim());
        return res.json({ success: true, intelligence: getSystemIntelligenceLevel() });
      }
      res.status(400).json({ error: 'Insight teks tidak valid' });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Gagal menyimpan feedback pemikiran' });
    }
  });

  // API endpoint for TikTok Video Info Downloader with Cache & Multi-Fallback
  app.post('/api/tiktok/info', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL TikTok tidak boleh kosong' });
      }

      const cleanUrl = url.trim();

      // Check Cache
      const cached = tiktokCache.get(cleanUrl);
      if (cached && Date.now() - cached.timestamp < TIKTOK_CACHE_TTL_MS) {
        console.log('[TikTok Cache Hit]', cleanUrl);
        return res.json(cached.data);
      }

      // Provider 1: TikWM
      try {
        const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}&hd=1`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
          }
        });

        const data = await response.json();

        if (data && data.code === 0 && data.data) {
          const v = data.data;
          const result = {
            id: v.id,
            title: v.title || 'TikTok Video',
            cover: v.cover || v.origin_cover,
            play: v.play, // No watermark video URL
            wmplay: v.wmplay, // Watermarked video URL
            hdplay: v.hdplay || v.play, // HD video URL
            music: v.music, // Audio URL
            musicTitle: v.music_info?.title || 'Original Audio',
            musicAuthor: v.music_info?.author || v.author?.nickname || '',
            author: {
              id: v.author?.id,
              uniqueId: v.author?.unique_id,
              nickname: v.author?.nickname,
              avatar: v.author?.avatar,
            },
            stats: {
              playCount: v.play_count || 0,
              diggCount: v.digg_count || 0,
              commentCount: v.comment_count || 0,
              shareCount: v.share_count || 0,
            },
            images: v.images || null,
          };

          tiktokCache.set(cleanUrl, { timestamp: Date.now(), data: result });
          return res.json(result);
        }
      } catch (e) {
        console.warn('TikWM API failed, trying fallback...', e);
      }

      // Provider 2: Tiklydown
      try {
        const fallbackRes = await fetch(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(cleanUrl)}`);
        const fallbackData = await fallbackRes.json();
        if (fallbackData && (fallbackData.video || fallbackData.url)) {
          const result = {
            id: fallbackData.id || String(Date.now()),
            title: fallbackData.title || fallbackData.video?.caption || 'TikTok Video',
            cover: fallbackData.cover || fallbackData.video?.cover,
            play: fallbackData.video?.noWatermark || fallbackData.url,
            wmplay: fallbackData.video?.watermark || fallbackData.url,
            hdplay: fallbackData.video?.noWatermark || fallbackData.url,
            music: fallbackData.music?.url || fallbackData.audio,
            musicTitle: fallbackData.music?.title || 'Original Audio',
            musicAuthor: fallbackData.music?.author || '',
            author: {
              id: fallbackData.author?.id || '',
              uniqueId: fallbackData.author?.unique_id || fallbackData.author?.username || 'user',
              nickname: fallbackData.author?.nickname || fallbackData.author?.name || 'TikTok User',
              avatar: fallbackData.author?.avatar || '',
            },
            stats: {
              playCount: fallbackData.stats?.playCount || 0,
              diggCount: fallbackData.stats?.likeCount || 0,
              commentCount: fallbackData.stats?.commentCount || 0,
              shareCount: fallbackData.stats?.shareCount || 0,
            },
            images: fallbackData.images || null,
          };

          tiktokCache.set(cleanUrl, { timestamp: Date.now(), data: result });
          return res.json(result);
        }
      } catch (e) {
        console.warn('Tiklydown API failed:', e);
      }

      return res.status(404).json({
        error: 'Gagal mengambil informasi video TikTok. Pastikan URL video publik & valid.'
      });

    } catch (error: any) {
      console.error('TikTok downloader error:', error);
      res.status(500).json({ error: 'Terjadi kesalahan saat memproses tautan TikTok.' });
    }
  });

  // API endpoint for streaming/proxying media to bypass CORS and force download
  app.get('/api/tiktok/proxy', async (req, res) => {
    try {
      const mediaUrl = req.query.url as string;
      const filename = (req.query.filename as string) || 'tiktok_media.mp4';
      const isDownload = req.query.download === 'true';

      if (!mediaUrl) {
        return res.status(400).send('URL query parameter is required');
      }

      const mediaRes = await fetch(mediaUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.tiktok.com/',
        }
      });

      if (!mediaRes.ok) {
        return res.status(mediaRes.status).send('Gagal mengambil file media');
      }

      const contentType = mediaRes.headers.get('content-type') || (filename.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4');
      res.setHeader('Content-Type', contentType);

      if (isDownload) {
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      }

      const arrayBuffer = await mediaRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      console.error('Proxy media error:', error);
      res.status(500).send('Media proxy error');
    }
  });

  // --- PAYMENT & QRIS ADMIN BACKEND PERSISTENCE ---
  const QRIS_FILE_PATH = path.join(process.cwd(), 'qris_config.json');
  const TRANSACTIONS_FILE_PATH = path.join(process.cwd(), 'transactions.json');
  const CONTACT_SETTINGS_FILE_PATH = path.join(process.cwd(), 'contact_settings.json');

  function loadContactSettingsServer() {
    try {
      if (fs.existsSync(CONTACT_SETTINGS_FILE_PATH)) {
        const content = fs.readFileSync(CONTACT_SETTINGS_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          return {
            whatsappNumber: parsed.whatsappNumber || '6281234567890',
            whatsappTemplate: parsed.whatsappTemplate || 'Halo Admin Tools Satset, saya ingin konsultasi mengenai Kode Akses.',
            updatedAt: parsed.updatedAt || new Date().toISOString()
          };
        }
      }
    } catch (e) {
      console.warn('[Contact Settings] Error reading settings file:', e);
    }
    return {
      whatsappNumber: '6281234567890',
      whatsappTemplate: 'Halo Admin Tools Satset, saya ingin konsultasi mengenai Kode Akses.',
      updatedAt: new Date().toISOString()
    };
  }

  function saveContactSettingsServer(settings: any) {
    try {
      fs.writeFileSync(CONTACT_SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[Contact Settings] Error saving settings file:', e);
    }
  }

  app.get('/api/admin/contact-settings', (req, res) => {
    res.json(loadContactSettingsServer());
  });

  app.post('/api/admin/contact-settings', (req, res) => {
    const { whatsappNumber, whatsappTemplate } = req.body;
    const settings = {
      whatsappNumber: whatsappNumber || '6281234567890',
      whatsappTemplate: whatsappTemplate || 'Halo Admin Tools Satset, saya ingin konsultasi mengenai Kode Akses.',
      updatedAt: new Date().toISOString()
    };
    saveContactSettingsServer(settings);
    res.json({ success: true, settings });
  });

  function loadQrisConfigServer() {
    try {
      if (fs.existsSync(QRIS_FILE_PATH)) {
        const content = fs.readFileSync(QRIS_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          return {
            imageBase64: parsed.imageBase64 || '',
            merchantName: parsed.merchantName || 'Tools Satset Official (QRIS ALL PAYMENT)',
          };
        }
      }
    } catch (e) {
      console.warn('[QRIS Config] Error reading config file, falling back to default:', e);
    }
    return {
      imageBase64: '',
      merchantName: 'Tools Satset Official (QRIS ALL PAYMENT)',
    };
  }

  function saveQrisConfigServer(config: any) {
    try {
      fs.writeFileSync(QRIS_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[QRIS Config] Error saving config file:', e);
    }
  }

  function loadTransactionsServer(): any[] {
    try {
      if (fs.existsSync(TRANSACTIONS_FILE_PATH)) {
        const content = fs.readFileSync(TRANSACTIONS_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('[Transactions] Error reading transactions file, falling back to default:', e);
    }
    return [];
  }

  function saveTransactionsServer(list: any[]) {
    try {
      fs.writeFileSync(TRANSACTIONS_FILE_PATH, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[Transactions] Error saving transactions file:', e);
    }
  }

  app.get('/api/admin/qris', (req, res) => {
    res.json(loadQrisConfigServer());
  });

  app.post('/api/admin/qris', (req, res) => {
    const { imageBase64, merchantName } = req.body;
    const config = { imageBase64, merchantName: merchantName || 'Tools Satset Official' };
    saveQrisConfigServer(config);
    res.json({ success: true, config });
  });

  app.get('/api/transactions', (req, res) => {
    res.json(loadTransactionsServer());
  });

  app.post('/api/transactions', (req, res) => {
    const newTrx = req.body;
    if (!newTrx || !newTrx.id) return res.status(400).json({ error: 'Payload transaksi tidak valid' });
    const list = loadTransactionsServer();
    const existingIndex = list.findIndex((t) => t.id === newTrx.id);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...newTrx };
    } else {
      list.unshift(newTrx);
    }
    saveTransactionsServer(list);
    res.json({ success: true, transaction: newTrx });
  });

  app.post('/api/transactions/proof', (req, res) => {
    const { id, proofImageBase64 } = req.body;
    const list = loadTransactionsServer();
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    list[idx].proofImageBase64 = proofImageBase64;
    list[idx].status = 'AWAITING_VERIFICATION';
    list[idx].updatedAt = Date.now();
    saveTransactionsServer(list);
    res.json({ success: true, transaction: list[idx] });
  });

  app.post('/api/transactions/approve', (req, res) => {
    const { id, accessCode, validUntil } = req.body;
    const list = loadTransactionsServer();
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    list[idx].status = 'APPROVED';
    list[idx].accessCode = accessCode;
    list[idx].validUntil = validUntil;
    list[idx].updatedAt = Date.now();
    saveTransactionsServer(list);
    res.json({ success: true, transaction: list[idx] });
  });

  app.post('/api/transactions/reject', (req, res) => {
    const { id, rejectReason } = req.body;
    const list = loadTransactionsServer();
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    list[idx].status = 'REJECTED';
    list[idx].rejectReason = rejectReason || 'Ditolak oleh admin.';
    list[idx].updatedAt = Date.now();
    saveTransactionsServer(list);
    res.json({ success: true, transaction: list[idx] });
  });

  // --- TRACKING & PIPELINE GENERATION EVENTS PERSISTENCE ENGINE ---
  const TRACKING_FILE_PATH = path.join(process.cwd(), 'tracking.json');

  const sseClients = new Set<any>();
  const activeGenerationsMap = new Map<string, any>();

  function broadcastLiveEvent(data: any) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach((client) => {
      try {
        client.write(payload);
      } catch (e) {
        sseClients.delete(client);
      }
    });
  }

  // Periodic cleanup of completed active generations (> 10 mins old)
  setInterval(() => {
    const now = Date.now();
    activeGenerationsMap.forEach((gen, id) => {
      if (now - (gen.updatedAt || now) > 10 * 60 * 1000) {
        activeGenerationsMap.delete(id);
      }
    });
  }, 60000);

  function loadEventsServer(): any[] {
    try {
      if (fs.existsSync(TRACKING_FILE_PATH)) {
        const content = fs.readFileSync(TRACKING_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('[Tracking Engine] Error reading tracking file:', e);
    }
    return [];
  }

  function saveEventsServer(events: any[]) {
    try {
      fs.writeFileSync(TRACKING_FILE_PATH, JSON.stringify(events, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[Tracking Engine] Error saving tracking file:', e);
    }
  }

  // SSE Live Stream endpoint for Admin Dashboard
  app.get('/api/events/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.add(res);

    // Initial state payload
    const initialEvents = loadEventsServer();
    const activeList = Array.from(activeGenerationsMap.values());
    res.write(`data: ${JSON.stringify({ type: 'init', events: initialEvents, activeGenerations: activeList })}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // REST Polling / Snapshot endpoint
  app.get('/api/events/live', (req, res) => {
    try {
      const events = loadEventsServer();
      const activeGenerations = Array.from(activeGenerationsMap.values());
      res.json({ success: true, events, activeGenerations, activeClientCount: activeGenerations.length });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Gagal mengambil live stream events' });
    }
  });

  app.get('/api/events', (req, res) => {
    try {
      const events = loadEventsServer();
      res.json(events);
    } catch (e) {
      res.status(500).json({ success: false, error: 'Gagal mengambil data event tracking' });
    }
  });

  // Endpoint to report active status updates (e.g., generating -> analyzing -> completed)
  app.post('/api/events/active-status', (req, res) => {
    try {
      const { id, status, details } = req.body || {};
      if (!id) return res.status(400).json({ success: false, error: 'Event ID required' });

      const existing = activeGenerationsMap.get(id) || { id, startedAt: new Date().toISOString() };
      const updated = {
        ...existing,
        status: status || 'generating',
        details: details || existing.details,
        updatedAt: Date.now(),
      };

      if (status === 'completed') {
        // Keep briefly as completed before removal
        setTimeout(() => activeGenerationsMap.delete(id), 120000);
      } else {
        activeGenerationsMap.set(id, updated);
      }

      broadcastLiveEvent({
        type: 'active_status_update',
        activeGeneration: updated,
        activeGenerations: Array.from(activeGenerationsMap.values()),
      });

      res.json({ success: true, activeGeneration: updated });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Gagal mengupdate active status' });
    }
  });

  app.post('/api/events', (req, res) => {
    try {
      const eventData = req.body;
      if (!eventData || typeof eventData !== 'object') {
        return res.status(400).json({ success: false, error: 'Payload event tidak valid' });
      }

      const events = loadEventsServer();
      const newEvent = {
        ...eventData,
        id: eventData.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: eventData.timestamp || new Date().toISOString(),
      };

      events.unshift(newEvent); // Newest first
      saveEventsServer(events);

      // Add to active generations map
      activeGenerationsMap.set(newEvent.id, {
        ...newEvent,
        status: 'analyzing',
        updatedAt: Date.now(),
      });

      // Broadcast live event to all connected SSE clients
      broadcastLiveEvent({
        type: 'generation_event',
        event: newEvent,
        activeGenerations: Array.from(activeGenerationsMap.values()),
      });

      // Record count in system memory as well
      if (newEvent.outcome === 'success' || newEvent.outcome === 'flagged') {
        recordExecutionAndUpgrade('contentIdeas');
      }

      res.json({ success: true, event: newEvent });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Gagal menyimpan event tracking' });
    }
  });

  // --- MULTI-AGENT ORCHESTRATOR & RELEVANCE AUDITOR ENDPOINT ---
  app.post('/api/orchestrate', async (req, res) => {
    try {
      const { event, contentText } = req.body || {};
      const { runOrchestratorPipeline } = await import('./src/agents/orchestratorAgent');
      
      const mockEvent = event || {
        id: `evt_api_${Date.now()}`,
        timestamp: new Date().toISOString(),
        clientId: 'client_api',
        accessCode: 'API-REQUEST',
        packageTier: 'PRO',
        tool: 'idea_konten',
        category: 'umum',
        modelUsed: 'gemini-3.6-flash',
        tierUsed: 'Tier 2 (Server Key)',
        isUserApiKey: false,
        outcome: 'success',
      };

      const result = await runOrchestratorPipeline(mockEvent, contentText || '');

      // Mark active generation as completed in memory
      if (mockEvent.id && activeGenerationsMap.has(mockEvent.id)) {
        const item = activeGenerationsMap.get(mockEvent.id);
        item.status = 'completed';
        item.orchestrationResult = result;
        item.updatedAt = Date.now();
        activeGenerationsMap.set(mockEvent.id, item);
      }

      // Broadcast orchestration audit result to connected admin dashboards
      broadcastLiveEvent({
        type: 'agent_orchestrated',
        eventId: mockEvent.id,
        result,
        activeGenerations: Array.from(activeGenerationsMap.values()),
      });

      res.json({
        success: true,
        pipeline: {
          orchestratorTier: 'Tier 2 (gemini-3.6-flash)',
          subAgents: ['Metadata + Caption SEO', 'Overlay + Voice-over SEO', 'Query / Trend Agent'],
          auditor: 'Relevance Auditor (Visual vs Caption vs Audio)',
          systemMemoryUpdated: result.systemMemoryInjected,
        },
        result,
      });
    } catch (e: any) {
      console.warn('[Server Orchestrator] Execution notice:', e);
      res.status(500).json({
        success: false,
        error: e.message || 'Gagal menjalankan Orchestrator Pipeline',
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // 404 handler for unknown API routes to prevent falling through to SPA index.html
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint tidak ditemukan: ${req.method} ${req.path}` });
  });

  // Global Express error handler to ensure JSON response on errors (e.g. payload too large)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Server Error]', err);
    if (res.headersSent) {
      return next(err);
    }
    const status = err.status || err.statusCode || 500;
    const message = err.type === 'entity.too.large'
      ? 'Ukuran data file terlalu besar. Silakan kurangi ukuran file video atau gunakan file di bawah 50MB.'
      : (err.message || 'Terjadi kesalahan internal pada server.');
    res.status(status).json({ error: message });
  });

  // Vite middleware in development mode
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
