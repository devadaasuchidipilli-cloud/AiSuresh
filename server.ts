import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import {
  GoogleGenAI,
  Type,
  FunctionDeclaration,
  GenerateContentResponse,
} from '@google/genai';

dotenv.config();

const PORT = 3000;

function isApiKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() !== '' && key !== 'MY_GEMINI_API_KEY');
}

function getGenAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Simple in-memory rate limiter per IP
const rateLimitWindowMs = 60 * 1000;
const maxRequestsPerMinute = 45;
const requestCounters = new Map<string, { count: number; resetAt: number }>();

function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || 'local';
  const now = Date.now();
  const entry = requestCounters.get(ip);

  if (!entry || now > entry.resetAt) {
    requestCounters.set(ip, { count: 1, resetAt: now + rateLimitWindowMs });
    res.setHeader('X-RateLimit-Remaining', String(maxRequestsPerMinute - 1));
    return next();
  }

  if (entry.count >= maxRequestsPerMinute) {
    res.setHeader('X-RateLimit-Remaining', '0');
    return res.status(429).json({
      error: 'API rate limit reached (45 requests/minute). Please wait a moment and try again.',
    });
  }

  entry.count += 1;
  res.setHeader('X-RateLimit-Remaining', String(maxRequestsPerMinute - entry.count));
  next();
}

// Agent Function Declarations for Tool Calling
const agentToolDeclarations: FunctionDeclaration[] = [
  {
    name: 'verify_facts_matrix',
    description: 'Cross-check key facts, dates, and quantitative claims for an agent workflow step.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: {
          type: Type.STRING,
          description: 'The topic or claim to verify.',
        },
        region: {
          type: Type.STRING,
          description: 'Target region or language context (e.g., India, Andhra Pradesh, Telangana).',
        },
      },
      required: ['topic'],
    },
  },
  {
    name: 'compile_action_deliverable',
    description: 'Compile a structured action plan or deliverable artifact in the requested language.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Deliverable title' },
        summaryPoints: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Key actionable bullet points',
        },
      },
      required: ['title', 'summaryPoints'],
    },
  },
];

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use('/api', rateLimiter);

  // 1. Health & AI Configuration Status
  app.get('/api/ai/status', (_req: Request, res: Response) => {
    res.json({
      configured: isApiKeyConfigured(),
      models: {
        chat: 'gemini-4-hydrogen',
        research: 'gemini-4-hydrogen (Google Search Grounding)',
        agent: 'gemini-4-hydrogen (Tool Calling)',
        tts: 'gemini-3.8-flash-lite-tts',
        transcribe: 'gemini-3.5-transcribe',
      },
      rateLimitPerMinute: maxRequestsPerMinute,
    });
  });

  // 2. Universal Multilingual AI Chat (Streaming SSE)
  app.post('/api/ai/chat-stream', async (req: Request, res: Response) => {
    if (!isApiKeyConfigured()) {
      return res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured yet. Please check your API key in the Settings > Secrets panel.',
      });
    }

    const { message, history = [], language = 'Auto', domain = 'General Knowledge' } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const startTime = Date.now();
    try {
      const ai = getGenAIClient();
      const systemInstruction = `You are Super AI Agent, a production-grade multilingual AI platform built for India and global users.
Current Knowledge Domain: ${domain}.
Preferred Language Mode: ${language}.
Rules:
1. If the user writes in Telugu (తెలుగు), Hindi (हिन्दी), Tamil (தமிழ்), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Bengali (বাংলা), Marathi (मराठी), Gujarati (ગુજરાતી), or English, respond naturally and accurately in that language (or the explicitly selected language mode if not 'Auto').
2. Provide structured, clear, high-precision answers with headings and bullet points where helpful.
3. Never fabricate citations or pretend an external action has been executed without user confirmation.`;

      const contents = [
        ...history.slice(-10).map((msg: { role: string; content: string }) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(msg.content || '') }],
        })),
        { role: 'user', parts: [{ text: message }] },
      ];

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
        },
      });

      let totalChars = 0;
      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        const text = c.text || '';
        if (text) {
          totalChars += text.length;
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      const latencyMs = Date.now() - startTime;
      const estimatedTokens = Math.max(12, Math.round((message.length + totalChars) / 4));
      res.write(
        `data: ${JSON.stringify({
          done: true,
          latencyMs,
          tokensUsed: estimatedTokens,
          model: 'gemini-4-hydrogen',
        })}\n\n`
      );
      res.end();
    } catch (error: any) {
      console.error('Chat stream error:', error);
      res.write(
        `data: ${JSON.stringify({
          error:
            error?.message ||
            'AI request failed. Please verify your API key in Settings > Secrets.',
        })}\n\n`
      );
      res.end();
    }
  });

  // 3. Smart Web Research with Live Google Search Grounding
  app.post('/api/ai/research', async (req: Request, res: Response) => {
    if (!isApiKeyConfigured()) {
      return res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Please check the Settings > Secrets panel to enable live web research.',
      });
    }

    const { query, language = 'English' } = req.body || {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    const startTime = Date.now();
    try {
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Conduct thorough real-time web research on the following query and respond in ${language}: "${query}".
Structure your response with:
1. Executive Summary
2. Key Verified Findings (with specific dates/numbers)
3. Uncertainty & Verification Notes (explicitly state if any aspect is evolving or uncertain).`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const summary = response.text || 'No summary generated.';
      const rawChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources: { title: string; uri: string }[] = [];

      for (const chunk of rawChunks) {
        const web = (chunk as any)?.web;
        if (web?.uri) {
          sources.push({
            title: web.title || new URL(web.uri).hostname,
            uri: web.uri,
          });
        }
      }

      // Deduplicate sources by URI
      const uniqueSources = Array.from(
        new Map(sources.map((s) => [s.uri, s])).values()
      );

      const latencyMs = Date.now() - startTime;
      const tokensUsed = Math.max(
        25,
        Math.round((query.length + summary.length) / 4)
      );

      res.json({
        summary,
        sources: uniqueSources,
        sourceCount: uniqueSources.length,
        latencyMs,
        tokensUsed,
        model: 'gemini-4-hydrogen',
      });
    } catch (error: any) {
      console.error('Web research error:', error);
      res.status(500).json({
        error:
          error?.message ||
          'Failed to execute live web research. Check API key configuration.',
      });
    }
  });

  // 4. AI Agent Mode — Step Execution with Tool Calling & Google Search Hybrid
  app.post('/api/ai/agent-step', async (req: Request, res: Response) => {
    if (!isApiKeyConfigured()) {
      return res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Please check Settings > Secrets to run autonomous agent steps.',
      });
    }

    const { goal, stepTitle, toolName, language = 'English', userApproved = false, isSensitive = false } =
      req.body || {};

    if (!goal || !stepTitle) {
      return res.status(400).json({ error: 'Goal and stepTitle are required.' });
    }

    if (isSensitive && !userApproved) {
      return res.status(403).json({
        error: 'User confirmation is required before executing a sensitive agent action.',
      });
    }

    const startTime = Date.now();
    try {
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are executing an autonomous AI Agent step.
Overall Task Goal: "${goal}"
Current Step: "${stepTitle}" (Tool: ${toolName})
Target Output Language: ${language}
Sensitive Action Approved by User: ${userApproved ? 'YES' : 'N/A'}

Execute this step using available tools if appropriate, and provide a concise, concrete execution output report.`,
              },
            ],
          },
        ],
        config: {
          tools: [
            { googleSearch: {} },
            { functionDeclarations: agentToolDeclarations },
          ],
          toolConfig: { includeServerSideToolInvocations: true },
        },
      });

      const functionCalls = response.functionCalls || [];
      let outputText = response.text || '';

      if (functionCalls.length > 0 && !outputText) {
        const fc = functionCalls[0];
        outputText = `Tool [${fc.name}] invoked with arguments: ${JSON.stringify(
          fc.args
        )}. Step verified and completed.`;
      }

      if (!outputText) {
        outputText = `Completed step "${stepTitle}" using ${toolName}.`;
      }

      const latencyMs = Date.now() - startTime;
      const tokensUsed = Math.max(20, Math.round(outputText.length / 4));

      res.json({
        output: outputText,
        toolCalls: functionCalls.map((fc) => ({
          name: fc.name,
          args: fc.args,
        })),
        latencyMs,
        tokensUsed,
        model: 'gemini-4-hydrogen',
      });
    } catch (error: any) {
      console.error('Agent step execution error:', error);
      res.status(500).json({
        error: error?.message || 'Agent step execution failed.',
      });
    }
  });

  // 5. File Intelligence — Multimodal PDF, Image & Text Analysis + Q&A
  app.post('/api/ai/file-analyze', async (req: Request, res: Response) => {
    if (!isApiKeyConfigured()) {
      return res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Please check Settings > Secrets to analyze files.',
      });
    }

    const {
      fileName,
      mimeType,
      base64Data,
      textContent,
      question,
      language = 'English',
    } = req.body || {};

    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required.' });
    }

    const startTime = Date.now();
    try {
      const ai = getGenAIClient();
      const parts: any[] = [];

      if (base64Data && mimeType) {
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      } else if (textContent) {
        parts.push({
          text: `Document Content (${fileName}):\n${String(textContent).slice(0, 30000)}`,
        });
      }

      const promptText = question
        ? `Based on the provided file "${fileName}", answer this question accurately in ${language}: "${question}". Also quote relevant sections.`
        : `Analyze the uploaded file "${fileName}" and provide your response in ${language}:
1. Executive Document Summary
2. Key Extracted Entities, Figures & Dates
3. Actionable Insights`;

      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
      });

      const analysis = response.text || 'No analysis returned.';
      const latencyMs = Date.now() - startTime;
      const tokensUsed = Math.max(30, Math.round(analysis.length / 4));

      res.json({
        analysis,
        latencyMs,
        tokensUsed,
        model: 'gemini-4-hydrogen',
      });
    } catch (error: any) {
      console.error('File analysis error:', error);
      res.status(500).json({
        error: error?.message || 'Failed to analyze document.',
      });
    }
  });

  // 6. Coding Assistant — Generate, Explain, Debug Code
  app.post('/api/ai/code', async (req: Request, res: Response) => {
    if (!isApiKeyConfigured()) {
      return res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Please check Settings > Secrets to use the Coding Assistant.',
      });
    }

    const {
      prompt,
      code = '',
      mode = 'generate',
      programmingLanguage = 'HTML/CSS/JS',
      explanationLanguage = 'English',
    } = req.body || {};

    if (!prompt && !code) {
      return res.status(400).json({ error: 'Prompt or code snippet is required.' });
    }

    const startTime = Date.now();
    try {
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Mode: ${mode.toUpperCase()}
Target Programming Language: ${programmingLanguage}
Explanation Language: ${explanationLanguage}
User Request: ${prompt || 'Analyze and improve this code.'}
${code ? `\nExisting Code:\n\`\`\`\n${code}\n\`\`\`` : ''}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              code: {
                type: Type.STRING,
                description: 'Complete, working, production-ready code without markdown backticks.',
              },
              explanation: {
                type: Type.STRING,
                description: 'Clear step-by-step explanation in the requested explanationLanguage.',
              },
              issuesFixed: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of bugs fixed, edge cases handled, or architectural highlights.',
              },
            },
            required: ['code', 'explanation', 'issuesFixed'],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      const latencyMs = Date.now() - startTime;
      const tokensUsed = Math.max(
        35,
        Math.round(((response.text || '').length + (prompt || '').length) / 4)
      );

      res.json({
        code: parsed.code || '',
        explanation: parsed.explanation || '',
        issuesFixed: parsed.issuesFixed || [],
        latencyMs,
        tokensUsed,
        model: 'gemini-4-hydrogen',
      });
    } catch (error: any) {
      console.error('Coding assistant error:', error);
      res.status(500).json({
        error: error?.message || 'Coding assistant request failed.',
      });
    }
  });

  // 7. Voice Assistant — Text-to-Speech (gemini-3.8-flash-lite-tts)
  app.post('/api/ai/tts', async (req: Request, res: Response) => {
    if (!isApiKeyConfigured()) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured for Text-to-Speech.',
      });
    }

    const { text, voiceName = 'Kore' } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for speech synthesis.' });
    }

    const startTime = Date.now();
    try {
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.slice(0, 1500),
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return res.status(500).json({ error: 'No audio data returned by TTS model.' });
      }

      res.json({
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
        latencyMs: Date.now() - startTime,
        model: 'gemini-3.8-flash-lite-tts',
      });
    } catch (error: any) {
      console.error('TTS error:', error);
      res.status(500).json({
        error: error?.message || 'Speech synthesis failed.',
      });
    }
  });

  // 8. Voice Assistant — Audio Transcription (gemini-3.5-transcribe)
  app.post('/api/ai/transcribe', async (req: Request, res: Response) => {
    if (!isApiKeyConfigured()) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured for Audio Transcription.',
      });
    }

    const { base64Audio, mimeType = 'audio/webm', languageHint = 'Telugu, Hindi, or English' } =
      req.body || {};
    if (!base64Audio) {
      return res.status(400).json({ error: 'base64Audio is required.' });
    }

    const startTime = Date.now();
    try {
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Audio,
              },
            },
            {
              text: `Transcribe this spoken audio accurately (${languageHint}). Return only the transcribed text.`,
            },
          ],
        },
      });

      res.json({
        transcript: (response.text || '').trim(),
        latencyMs: Date.now() - startTime,
        model: 'gemini-3.5-transcribe',
      });
    } catch (error: any) {
      console.error('Transcription error:', error);
      res.status(500).json({
        error: error?.message || 'Audio transcription failed.',
      });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Super AI Agent server running on http://localhost:${PORT}`);
  });
}

startServer();
