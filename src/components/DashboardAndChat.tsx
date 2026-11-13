import React, { useState } from 'react';
import {
  Send,
  Plus,
  Trash2,
  ArrowUpRight,
  Cpu,
  Search,
  Mic,
  FileText,
  Code2,
  MessageSquare,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUPPORTED_INDIAN_LANGUAGES, detectIndianLanguage } from '../utils/agentLogic';

export const DashboardView: React.FC = () => {
  const {
    setActivePage,
    conversations,
    agentTasks,
    uploadedFiles,
    searchHistory,
    usageRecords,
    selectedLanguage,
    setSelectedLanguage,
    aiStatus,
  } = useApp();

  const totalTokens = usageRecords.reduce((acc, r) => acc + r.tokensUsed, 0);
  const avgLatency =
    usageRecords.length > 0
      ? Math.round(
          usageRecords.reduce((acc, r) => acc + r.latencyMs, 0) / usageRecords.length
        )
      : 0;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
            <span>Super AI Agent Workspace</span>
            <span aria-hidden="true">·</span>
            <span>Active Language: {selectedLanguage}</span>
            <span aria-hidden="true">·</span>
            <span>{aiStatus.configured ? 'LLM API Connected' : 'Setup Required'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display">
            AI Command Center &amp; Multilingual Hub
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="dashboard-lang-select" className="sr-only">
            Workspace Language
          </label>
          <select
            id="dashboard-lang-select"
            aria-label="Workspace Language"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
          >
            {SUPPORTED_INDIAN_LANGUAGES.map((l) => {
              const val = `${l.name} (${l.nativeName})`;
              return (
                <option key={l.code} value={val}>
                  {val}
                </option>
              );
            })}
          </select>

          <button
            type="button"
            onClick={() => setActivePage('chat')}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            New Multilingual Chat
          </button>
          <button
            type="button"
            onClick={() => setActivePage('agent')}
            className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Launch Agent Task
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">Active Conversations</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {conversations.length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Telugu, Hindi &amp; English threads
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">Autonomous Agent Tasks</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {agentTasks.length}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {agentTasks.filter((t) => t.status === 'awaiting_approval').length} awaiting user approval
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">Verified Web Searches</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {searchHistory.length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {uploadedFiles.length} analyzed files indexed
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">Tokens Processed</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {totalTokens.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Avg latency: {avgLatency} ms
          </p>
        </div>
      </div>

      {/* Quick Launch Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            page: 'chat' as const,
            title: 'Universal AI Chat',
            subtitle: 'Telugu, Hindi, Tamil & English streaming assistant',
            icon: MessageSquare,
          },
          {
            page: 'research' as const,
            title: 'Smart Web Research',
            subtitle: 'Live Google Search grounding with clickable citations',
            icon: Search,
          },
          {
            page: 'agent' as const,
            title: 'AI Agent Workspace',
            subtitle: 'Multi-step task planner with human confirmation gates',
            icon: Cpu,
          },
          {
            page: 'voice' as const,
            title: 'Voice Assistant',
            subtitle: 'Telugu & multilingual Speech-to-Text + Neural TTS',
            icon: Mic,
          },
          {
            page: 'files' as const,
            title: 'File Intelligence',
            subtitle: 'PDF, image & document summarization + Q&A',
            icon: FileText,
          },
          {
            page: 'coding' as const,
            title: 'Coding Assistant',
            subtitle: 'Generate, explain & debug code with live preview',
            icon: Code2,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.page}
              type="button"
              onClick={() => setActivePage(item.page)}
              className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 text-left transition-colors flex items-start justify-between gap-4 group"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-display">
                    {item.title}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {item.subtitle}
                </p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Recent Conversations & Active Agent Tasks Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
              Recent Multilingual Conversations
            </h2>
            <button
              type="button"
              onClick={() => setActivePage('history')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              View All History →
            </button>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {conversations.slice(0, 4).map((conv) => (
              <div
                key={conv.id}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {conv.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {conv.language} · {conv.domain} · {conv.messageCount} messages
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePage('chat')}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Open Chat
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
              Active Agent Workflows
            </h2>
            <button
              type="button"
              onClick={() => setActivePage('agent')}
              className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
            >
              Manage Tasks →
            </button>
          </div>

          <div className="space-y-3">
            {agentTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {task.title}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-blue-600 dark:text-blue-400 shrink-0">
                    {task.progress}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Status: {task.status.replace('_', ' ')} ·{' '}
                  {task.requiresApproval ? 'Approval Gate Active' : 'Standard'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChatView: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    createNewConversation,
    appendChatMessage,
    deleteConversation,
    selectedLanguage,
    setSelectedLanguage,
    recordUsage,
  } = useApp();

  const [input, setInput] = useState('');
  const [domain, setDomain] = useState('General Knowledge');
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const activeMessages = messages.filter(
    (m) => m.conversationId === activeConversationId
  );
  const liveDetected = detectIndianLanguage(input);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || isStreaming) return;

    setErrorBanner(null);
    setInput('');
    const detectedLabel = `${liveDetected.name} (${liveDetected.nativeName})`;

    await appendChatMessage(activeConversationId, 'user', prompt, detectedLabel);
    setIsStreaming(true);
    setStreamingText('');

    try {
      const response = await fetch('/api/ai/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          language: selectedLanguage,
          domain,
          history: activeMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error || `Chat request failed with status ${response.status}`
        );
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let finalTokens = 60;
      let finalLatency = 450;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const payload = JSON.parse(line.slice(6));
                if (payload.error) {
                  throw new Error(payload.error);
                }
                if (payload.text) {
                  accumulated += payload.text;
                  setStreamingText(accumulated);
                }
                if (payload.done) {
                  finalTokens = payload.tokensUsed || finalTokens;
                  finalLatency = payload.latencyMs || finalLatency;
                }
              } catch (parseErr: any) {
                if (parseErr?.message && !parseErr.message.includes('JSON')) {
                  throw parseErr;
                }
              }
            }
          }
        }
      }

      if (accumulated.trim()) {
        await appendChatMessage(
          activeConversationId,
          'assistant',
          accumulated,
          selectedLanguage
        );
        await recordUsage(
          `Universal Chat (${selectedLanguage})`,
          'gemini-4-hydrogen',
          finalTokens,
          finalLatency
        );
      }
    } catch (err: any) {
      setErrorBanner(
        err?.message || 'Unable to reach AI streaming endpoint. Check API configuration.'
      );
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  const handleQuickPrompt = (samplePrompt: string, langLabel: string) => {
    setSelectedLanguage(langLabel);
    setInput(samplePrompt);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-10rem)]">
      {/* Left Conversation List */}
      <div className="lg:col-span-4 xl:col-span-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          <button
            type="button"
            onClick={() =>
              createNewConversation(
                `Chat · ${selectedLanguage.split(' ')[0]}`,
                selectedLanguage,
                domain
              )
            }
            className="w-full py-2.5 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation</span>
          </button>

          <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
            {conversations.map((conv) => {
              const isSelected = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  className={`p-2.5 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                      : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveConversationId(conv.id)}
                    className="text-left min-w-0 flex-1"
                  >
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {conv.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {conv.language} · {conv.messageCount} msgs
                    </p>
                  </button>
                  {conversations.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Delete conversation ${conv.title}`}
                      onClick={() => deleteConversation(conv.id)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          <label
            htmlFor="chat-domain-select"
            className="block font-medium text-slate-600 dark:text-slate-400"
          >
            Knowledge Domain
          </label>
          <select
            id="chat-domain-select"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
          >
            <option value="General Knowledge">General Knowledge</option>
            <option value="Agriculture & Rural Advisory">Agriculture &amp; Rural Advisory</option>
            <option value="Technology & Software">Technology &amp; Software</option>
            <option value="Healthcare & Science">Healthcare &amp; Science</option>
            <option value="Finance, Banking & DPI">Finance, Banking &amp; DPI</option>
            <option value="Education & Competitive Exams">Education &amp; Exams</option>
          </select>
        </div>
      </div>

      {/* Right Chat Stream & Composer */}
      <div className="lg:col-span-8 xl:col-span-9 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
        {/* Top Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
              Universal Multilingual AI Chat
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Domain: {domain} · Auto script detection active
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="chat-lang-select" className="text-xs text-slate-500 dark:text-slate-400">
              Response Language:
            </label>
            <select
              id="chat-lang-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              {SUPPORTED_INDIAN_LANGUAGES.map((l) => {
                const label = `${l.name} (${l.nativeName})`;
                return (
                  <option key={l.code} value={label}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Multilingual Starter Prompts */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              handleQuickPrompt(
                'తెలుగులో కృత్రిమ మేధస్సు (AI) విద్యార్థులకు ఎలా ఉపయోగపడుతుందో వివరించండి.',
                'Telugu (తెలుగు)'
              )
            }
            className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            తెలుగు: AI విద్యా ప్రయోజనాలు
          </button>
          <button
            type="button"
            onClick={() =>
              handleQuickPrompt(
                'भारत में डिजिटल पब्लिक इंफ्रास्ट्रक्चर (UPI और ONDC) के प्रमुख लाभ क्या हैं?',
                'Hindi (हिन्दी)'
              )
            }
            className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            हिन्दी: UPI और ONDC लाभ
          </button>
          <button
            type="button"
            onClick={() =>
              handleQuickPrompt(
                'Explain how zero-trust security architecture protects cloud web applications.',
                'English (English (India))'
              )
            }
            className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            English: Zero-Trust Architecture
          </button>
        </div>

        {errorBanner && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300"
          >
            {errorBanner}
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 space-y-4 overflow-y-auto max-h-[440px] pr-1">
          {activeMessages.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No messages in this conversation yet.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Type a question in Telugu (తెలుగు), Hindi (हिन्दी), Tamil (தமிழ்), or English below.
              </p>
            </div>
          ) : (
            activeMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-4 rounded-xl space-y-1.5 ${
                  msg.role === 'user'
                    ? 'bg-slate-100 dark:bg-slate-800/80 ml-4 sm:ml-12'
                    : 'bg-blue-50/60 dark:bg-blue-950/25 border border-blue-200/60 dark:border-blue-900/40 mr-4 sm:mr-12'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {msg.role === 'user' ? 'You' : 'Super AI Agent'}
                  </span>
                  <span>
                    {msg.detectedLanguage} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                  {msg.content.split(/(\*\*.*?\*\*)/g).map((part, idx) =>
                    part.startsWith('**') && part.endsWith('**') ? (
                      <strong key={idx} className="font-semibold text-slate-900 dark:text-white">
                        {part.slice(2, -2)}
                      </strong>
                    ) : (
                      <React.Fragment key={idx}>{part}</React.Fragment>
                    )
                  )}
                </div>
              </div>
            ))
          )}

          {isStreaming && (
            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/25 border border-blue-200/60 dark:border-blue-900/40 mr-4 sm:mr-12 space-y-1.5">
              <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                Super AI Agent · Streaming in {selectedLanguage}…
              </div>
              <div className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                {streamingText || 'Thinking and generating response…'}
              </div>
            </div>
          )}
        </div>

        {/* Composer Form */}
        <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Detected Input Script: <strong className="text-slate-700 dark:text-slate-200">{liveDetected.name} ({liveDetected.nativeName})</strong>
            </span>
            <span>Model: gemini-4-hydrogen</span>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="chat-message-input" className="sr-only">
              Ask anything in Telugu, Hindi, English, or any Indian language
            </label>
            <input
              id="chat-message-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ప్రశ్నను అడగండి / अपना प्रश्न पूछें / Ask any question across all domains…"
              className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isStreaming ? 'Streaming…' : 'Send'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
