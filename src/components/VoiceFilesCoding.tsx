import React, { useState, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Square,
  Upload,
  FileText,
  HelpCircle,
  Code2,
  Play,
  Copy,
  Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUPPORTED_INDIAN_LANGUAGES } from '../utils/agentLogic';

export const VoiceAssistantView: React.FC = () => {
  const { selectedLanguage, setSelectedLanguage, profile, recordUsage } = useApp();

  const [voiceInput, setVoiceInput] = useState(
    'నమస్కారం! ఆంధ్రప్రదేశ్ మరియు తెలంగాణలో డిజిటల్ సేవల గురించి తెలుగులో వివరించండి.'
  );
  const [assistantReply, setAssistantReply] = useState(
    'నమస్కారం! నేను సూపర్ AI వాయిస్ అసిస్టెంట్ను. తెలుగు, హిందీ, తమిళం మరియు ఇంగ్లీష్ భాషలలో మీ ప్రశ్నలకు వెంటనే సమాధానం ఇవ్వగలను.'
  );
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceName, setVoiceName] = useState(profile.voicePersona || 'Kore');
  const [statusMessage, setStatusMessage] = useState('Ready for voice interaction');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const currentLangObj =
    SUPPORTED_INDIAN_LANGUAGES.find((l) => selectedLanguage.includes(l.name)) ||
    SUPPORTED_INDIAN_LANGUAGES[0];

  const handleStartMicrophone = () => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      setStatusMessage(
        'Browser SpeechRecognition unavailable in this frame; type or use preset Telugu/Hindi prompts below.'
      );
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = currentLangObj.bcp47;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage(`Listening in ${currentLangObj.name} (${currentLangObj.bcp47})…`);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setVoiceInput(transcript);
          setStatusMessage(`Captured speech: "${transcript}"`);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setStatusMessage('Microphone capture stopped. You can edit the transcript directly.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setStatusMessage('Unable to start microphone in current environment.');
    }
  };

  const handleStopAll = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsListening(false);
    setIsSpeaking(false);
    setStatusMessage('Voice playback & microphone interrupted.');
  };

  const handleSpeakText = async (textToSpeak: string) => {
    if (!textToSpeak.trim()) return;
    handleStopAll();
    setIsSpeaking(true);
    setStatusMessage(`Synthesizing neural speech (${voiceName})…`);

    try {
      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          voiceName,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.audioBase64) {
        throw new Error(data.error || 'TTS API fallback');
      }

      const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        setStatusMessage('Voice playback completed.');
      };
      await audio.play();
      await recordUsage(
        `Voice TTS (${voiceName})`,
        'gemini-3.8-flash-lite-tts',
        Math.max(25, Math.round(textToSpeak.length / 4)),
        data.latencyMs || 480
      );
    } catch {
      // Fallback to browser Web Speech synthesis if audio autoplay or API key is restricted
      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(textToSpeak);
        utter.lang = currentLangObj.bcp47;
        utter.onend = () => {
          setIsSpeaking(false);
          setStatusMessage('Voice playback finished.');
        };
        window.speechSynthesis.speak(utter);
        setStatusMessage(`Speaking via browser speech engine (${currentLangObj.bcp47}).`);
      } else {
        setIsSpeaking(false);
        setStatusMessage('Audio synthesis finished.');
      }
    }
  };

  const handleVoiceConversationTurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voiceInput.trim() || isProcessing) return;

    setIsProcessing(true);
    setStatusMessage(`Generating ${selectedLanguage} voice response…`);

    try {
      const response = await fetch('/api/ai/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${voiceInput.trim()}\n(Respond concisely in 2-3 spoken sentences in ${selectedLanguage})`,
          language: selectedLanguage,
          domain: 'Voice Conversation',
          history: [],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Voice assistant request failed.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let reply = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value, { stream: true }).split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const payload = JSON.parse(line.slice(6));
                if (payload.text) {
                  reply += payload.text;
                  setAssistantReply(reply);
                }
              } catch {}
            }
          }
        }
      }

      setIsProcessing(false);
      if (reply.trim()) {
        await handleSpeakText(reply);
      }
    } catch (err: any) {
      setIsProcessing(false);
      setStatusMessage(
        err?.message || 'Unable to generate spoken reply. Check API key in Settings > Secrets.'
      );
    }
  };

  const waveformHeights = [28, 52, 74, 40, 88, 64, 95, 50, 78, 42, 84, 60, 36, 70, 54, 30];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            Multilingual Voice Assistant — Speech-to-Text &amp; Neural TTS
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Interactive Telugu, Hindi, Tamil &amp; English voice conversations with live interrupt controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="voice-persona-select" className="text-xs text-slate-500">
            Voice Persona:
          </label>
          <select
            id="voice-persona-select"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
          >
            <option value="Kore">Kore (Balanced Neural)</option>
            <option value="Puck">Puck (Warm Conversational)</option>
            <option value="Charon">Charon (Deep Executive)</option>
            <option value="Zephyr">Zephyr (Bright Clear)</option>
          </select>
        </div>
      </div>

      {/* Waveform Visualizer & Primary Controls */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            {statusMessage} · Locale: {currentLangObj.bcp47}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SUPPORTED_INDIAN_LANGUAGES.slice(0, 5).map((l) => {
              const full = `${l.name} (${l.nativeName})`;
              const active = selectedLanguage.includes(l.name);
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setSelectedLanguage(full)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {l.nativeName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Acoustic Waveform Display */}
        <div
          aria-label="Voice Acoustic Waveform"
          className="h-28 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center gap-2 px-6"
        >
          {waveformHeights.map((h, idx) => {
            const activeAnim = isListening || isSpeaking || isProcessing;
            const scale = activeAnim ? h / 100 : 0.22;
            return (
              <div
                key={idx}
                className="w-2 bg-gradient-to-t from-blue-600 to-violet-400 rounded-full transition-transform duration-150"
                style={{
                  height: '72px',
                  transform: `scaleY(${scale})`,
                }}
              />
            );
          })}
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={isListening ? handleStopAll : handleStartMicrophone}
            className={`px-5 py-2.5 text-xs font-semibold text-white rounded-xl transition-colors flex items-center gap-2 ${
              isListening
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isListening ? 'Stop Microphone' : 'Start Microphone (STT)'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSpeakText(assistantReply)}
            disabled={isSpeaking}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2"
          >
            <Volume2 className="w-4 h-4" />
            <span>Speak Reply (Gemini TTS)</span>
          </button>

          <button
            type="button"
            onClick={handleStopAll}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Interrupt / Stop</span>
          </button>
        </div>

        {/* Spoken Transcript & Response Form */}
        <form onSubmit={handleVoiceConversationTurn} className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <label
              htmlFor="voice-transcript-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Spoken Input / Transcript ({selectedLanguage})
            </label>
            <textarea
              id="voice-transcript-input"
              rows={3}
              value={voiceInput}
              onChange={(e) => setVoiceInput(e.target.value)}
              className="w-full p-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            >
              {isProcessing ? 'Processing Voice Turn…' : 'Send & Speak AI Response'}
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              AI Spoken Response Output
            </p>
            <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 text-sm text-slate-800 dark:text-slate-100 min-h-[84px] leading-relaxed">
              {assistantReply}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export const FileIntelligenceView: React.FC = () => {
  const {
    uploadedFiles,
    addUploadedFileRecord,
    selectedLanguage,
    recordUsage,
  } = useApp();

  const [selectedFileId, setSelectedFileId] = useState<string>(
    uploadedFiles[0]?.id || ''
  );
  const [question, setQuestion] = useState('');
  const [qaResult, setQaResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeFile =
    uploadedFiles.find((f) => f.id === selectedFileId) || uploadedFiles[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const isText =
        file.type.startsWith('text/') ||
        file.name.endsWith('.txt') ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.csv') ||
        file.name.endsWith('.json');

      let base64Data = '';
      let textContent = '';

      if (isText) {
        textContent = await file.text();
      } else {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64Data = btoa(binary);
      }

      const response = await fetch('/api/ai/file-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || 'application/pdf',
          base64Data: base64Data || undefined,
          textContent: textContent || undefined,
          language: selectedLanguage,
        }),
      });

      const data = await response.json();
      const summaryText = response.ok
        ? data.analysis
        : `Uploaded ${file.name} (${Math.round(file.size / 1024)} KB). Ready for inspection.`;

      const saved = await addUploadedFileRecord({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        summary: summaryText,
        extractedText:
          textContent ||
          `Extracted multimodal content from ${file.name} (${file.type || 'document'}).`,
      });

      setSelectedFileId(saved.id);
      if (response.ok) {
        await recordUsage(
          `File Analysis (${file.name})`,
          'gemini-4-hydrogen',
          data.tokensUsed || 210,
          data.latencyMs || 890
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'File upload analysis encountered an error.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAskFileQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFile || !question.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/ai/file-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: activeFile.fileName,
          mimeType: activeFile.mimeType,
          textContent: `${activeFile.summary}\n\n${activeFile.extractedText}`,
          question: question.trim(),
          language: selectedLanguage,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Document Q&A failed.');
      }

      setQaResult(data.analysis);
      await recordUsage(
        'File Intelligence Q&A',
        'gemini-4-hydrogen',
        data.tokensUsed || 140,
        data.latencyMs || 620
      );
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Unable to answer document question. Verify API key configuration.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            File Intelligence — PDF, Document &amp; Image Understanding
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Upload PDFs, images, or text reports for automated summarization, text extraction, and Q&amp;A
          </p>
        </div>

        <label className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-2 whitespace-nowrap shrink-0">
          <Upload className="w-4 h-4" />
          <span>{isAnalyzing ? 'Analyzing File…' : 'Upload PDF / Image / Text'}</span>
          <input
            type="file"
            accept=".pdf,.txt,.md,.csv,.json,image/*"
            onChange={handleFileUpload}
            className="sr-only"
          />
        </label>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300"
        >
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left File Repository */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white font-display">
            Indexed Documents ({uploadedFiles.length})
          </h2>
          <div className="space-y-2">
            {uploadedFiles.map((file) => {
              const selected = activeFile?.id === file.id;
              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => {
                    setSelectedFileId(file.id);
                    setQaResult(null);
                  }}
                  className={`w-full p-3 rounded-xl border text-left transition-colors space-y-1 ${
                    selected
                      ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {file.fileName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {file.mimeType} · {Math.max(1, Math.round(file.sizeBytes / 1024))} KB
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right File Summary, Extracted Text & Q&A */}
        <div className="lg:col-span-8 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
          {activeFile && (
            <>
              <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-4">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Executive Document Summary · {activeFile.fileName}
                </p>
                <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {activeFile.summary}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Extracted Text Preview
                </p>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-mono leading-relaxed max-h-40 overflow-y-auto">
                  {activeFile.extractedText}
                </div>
              </div>

              <form onSubmit={handleAskFileQuestion} className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label
                  htmlFor="file-qa-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Ask a Question About This Document (in {selectedLanguage})
                </label>
                <div className="flex gap-2">
                  <input
                    id="file-qa-input"
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g., What is the average net income increase per acre reported in this document?"
                    className="flex-1 px-3.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={isAnalyzing || !question.trim()}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{isAnalyzing ? 'Analyzing…' : 'Ask File'}</span>
                  </button>
                </div>
              </form>

              {qaResult && (
                <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-1">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    Document Answer
                  </p>
                  <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {qaResult}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const CodingAssistantView: React.FC = () => {
  const { selectedLanguage, recordUsage } = useApp();

  const [mode, setMode] = useState<'generate' | 'explain' | 'debug'>('generate');
  const [programmingLanguage, setProgrammingLanguage] = useState('HTML/CSS/JS');
  const [prompt, setPrompt] = useState(
    'Build a responsive solar subsidy calculator widget with kW slider and instant rupee savings breakdown'
  );
  const [codeOutput, setCodeOutput] = useState(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; max-width: 460px; }
    .metric { font-size: 24px; font-weight: 700; color: #38bdf8; margin-top: 8px; }
    input[type="range"] { width: 100%; margin: 12px 0; }
  </style>
</head>
<body>
  <div class="card">
    <h3>PM Surya Ghar Solar Subsidy Calculator</h3>
    <label>System Capacity: <strong id="kwLabel">3 kW</strong></label>
    <input id="kwRange" type="range" min="1" max="10" value="3" oninput="updateCalc(this.value)" />
    <div>Estimated Central Subsidy:</div>
    <div class="metric" id="subsidyVal">₹78,000</div>
  </div>
  <script>
    function updateCalc(kw) {
      document.getElementById('kwLabel').textContent = kw + ' kW';
      const k = Number(kw);
      const subsidy = k === 1 ? 30000 : k === 2 ? 60000 : 78000;
      document.getElementById('subsidyVal').textContent = '₹' + subsidy.toLocaleString('en-IN');
    }
  </script>
</body>
</html>`);
  const [explanation, setExplanation] = useState(
    'This self-contained HTML/JS component calculates rooftop solar subsidies dynamically from 1 kW to 10 kW using the official slab caps (₹30,000 for 1 kW, ₹60,000 for 2 kW, and ₹78,000 for 3 kW+).'
  );
  const [issuesFixed, setIssuesFixed] = useState<string[]>([
    'Added responsive range input handler with Indian Rupee locale formatting',
    'Zero external runtime dependencies required',
  ]);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunCodeAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/ai/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          code: mode !== 'generate' ? codeOutput : '',
          mode,
          programmingLanguage,
          explanationLanguage: selectedLanguage,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Coding assistant failed.');
      }

      if (data.code) setCodeOutput(data.code);
      if (data.explanation) setExplanation(data.explanation);
      if (Array.isArray(data.issuesFixed)) setIssuesFixed(data.issuesFixed);
      await recordUsage(
        `Coding Assistant (${mode})`,
        'gemini-4-hydrogen',
        data.tokensUsed || 220,
        data.latencyMs || 840
      );
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Coding Assistant request failed. Check API key in Settings > Secrets.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(codeOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            Coding Assistant — Generate, Explain &amp; Debug
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Write production-ready HTML/CSS/JS, Python, TypeScript, and SQL with explanations in {selectedLanguage}
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg">
          {(['generate', 'explain', 'debug'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
                mode === m
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {m} Code
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Form */}
      <form
        onSubmit={handleRunCodeAssistant}
        className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-3">
            <label
              htmlFor="code-lang-select"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Target Language
            </label>
            <select
              id="code-lang-select"
              value={programmingLanguage}
              onChange={(e) => setProgrammingLanguage(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="HTML/CSS/JS">HTML / CSS / JavaScript</option>
              <option value="Python">Python 3</option>
              <option value="TypeScript / React">TypeScript / React</option>
              <option value="PostgreSQL / SQL">PostgreSQL / SQL</option>
            </select>
          </div>

          <div className="md:col-span-7">
            <label
              htmlFor="code-prompt-input"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Coding Task or Bug Description
            </label>
            <input
              id="code-prompt-input"
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the function, component, or bug you want solved…"
              className="w-full px-3.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="w-full py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Running…' : `Run ${mode}`}</span>
            </button>
          </div>
        </div>
      </form>

      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300"
        >
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Code Editor & Live HTML Preview */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'code'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Source Code ({programmingLanguage})
              </button>
              {programmingLanguage === 'HTML/CSS/JS' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
                    activeTab === 'preview'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Play className="w-3 h-3" />
                  <span>Live Sandbox Preview</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          {activeTab === 'code' ? (
            <textarea
              aria-label="Generated Source Code"
              rows={14}
              value={codeOutput}
              onChange={(e) => setCodeOutput(e.target.value)}
              className="w-full p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed border border-slate-800 focus:outline-none"
            />
          ) : (
            <iframe
              title="HTML Sandbox Preview"
              srcDoc={codeOutput}
              sandbox="allow-scripts"
              className="w-full h-80 rounded-xl border border-slate-800 bg-slate-950"
            />
          )}
        </div>

        {/* Explanation & Diagnostics */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white font-display">
              Code Walkthrough &amp; Explanation ({selectedLanguage})
            </h2>
            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {explanation}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              Diagnostics &amp; Architectural Notes
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              {issuesFixed.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-mono text-blue-600 dark:text-blue-400">0{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
