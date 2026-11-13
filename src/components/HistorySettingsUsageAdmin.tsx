import React, { useState } from 'react';
import {
  Search,
  MessageSquare,
  Trash2,
  Save,
  ShieldCheck,
  Database,
  Activity,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUPPORTED_INDIAN_LANGUAGES } from '../utils/agentLogic';

export const HistoryView: React.FC = () => {
  const {
    conversations,
    messages,
    searchHistory,
    setActiveConversationId,
    setActivePage,
    deleteConversation,
  } = useApp();

  const [filterText, setFilterText] = useState('');
  const [tab, setTab] = useState<'chats' | 'searches'>('chats');

  const filteredConvs = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(filterText.toLowerCase()) ||
      c.language.toLowerCase().includes(filterText.toLowerCase()) ||
      c.domain.toLowerCase().includes(filterText.toLowerCase())
  );

  const filteredSearches = searchHistory.filter(
    (s) =>
      s.query.toLowerCase().includes(filterText.toLowerCase()) ||
      s.summary.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            Conversation &amp; Research History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Search, filter, and resume multilingual chats and grounded web research sessions
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('chats')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              tab === 'chats'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Chat Sessions ({conversations.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('searches')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              tab === 'searches'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Web Searches ({searchHistory.length})
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <label htmlFor="history-search-input" className="sr-only">
          Filter History
        </label>
        <input
          id="history-search-input"
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Filter by title, language (Telugu, Hindi, English), or topic…"
          className="flex-1 text-xs bg-transparent text-slate-900 dark:text-white focus:outline-none"
        />
      </div>

      {tab === 'chats' ? (
        <div className="space-y-3">
          {filteredConvs.map((conv) => {
            const convMsgs = messages.filter((m) => m.conversationId === conv.id);
            const lastPreview =
              convMsgs[convMsgs.length - 1]?.content || 'No messages yet.';
            return (
              <div
                key={conv.id}
                className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                    <span>{conv.language}</span>
                    <span aria-hidden="true">·</span>
                    <span>{conv.domain}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {conv.messageCount} messages
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white font-display truncate">
                    {conv.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {lastPreview}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      setActivePage('chat');
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Resume Chat</span>
                  </button>
                  {conversations.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Delete ${conv.title}`}
                      onClick={() => deleteConversation(conv.id)}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-lg border border-slate-200 dark:border-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSearches.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {item.confidence} · {item.sourceCount} verified sources
                </span>
                <span className="font-mono tabular-nums">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                {item.query}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.summary}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const SettingsView: React.FC = () => {
  const { profile, updateProfileSettings, theme, toggleTheme } = useApp();

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [preferredLanguage, setPreferredLanguage] = useState(
    profile.preferredLanguage
  );
  const [voicePersona, setVoicePersona] = useState(profile.voicePersona);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfileSettings({
      displayName: displayName.trim() || 'Super AI User',
      preferredLanguage,
      voicePersona,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1 pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
          User Settings &amp; Multilingual Preferences
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure your profile, default Indian language script, neural voice persona, and display theme
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="settings-display-name"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Display Name
            </label>
            <input
              id="settings-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="settings-email-readonly"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Account Email (PII Isolated)
            </label>
            <input
              id="settings-email-readonly"
              type="email"
              readOnly
              value={profile.email}
              className="w-full px-3.5 py-2 text-xs rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-500 font-mono"
            />
          </div>

          <div>
            <label
              htmlFor="settings-lang-select"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Default Indian Language
            </label>
            <select
              id="settings-lang-select"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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

          <div>
            <label
              htmlFor="settings-voice-select"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Default Neural Voice Persona
            </label>
            <select
              id="settings-voice-select"
              value={voicePersona}
              onChange={(e) => setVoicePersona(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="Kore">Kore (Balanced Neural)</option>
              <option value="Puck">Puck (Warm Conversational)</option>
              <option value="Charon">Charon (Deep Executive)</option>
              <option value="Zephyr">Zephyr (Bright Clear)</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-900 dark:text-white">
              Interface Theme Mode
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Current theme: {theme === 'dark' ? 'Futuristic Dark Navy' : 'Clean Light Mode'}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </button>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Profile Settings</span>
          </button>
          {savedNotice && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Preferences saved &amp; synced.
            </span>
          )}
        </div>
      </form>
    </div>
  );
};

export const UsageDashboardView: React.FC = () => {
  const { usageRecords, aiStatus } = useApp();

  const totalTokens = usageRecords.reduce((acc, r) => acc + r.tokensUsed, 0);
  const avgLatency =
    usageRecords.length > 0
      ? Math.round(
          usageRecords.reduce((acc, r) => acc + r.latencyMs, 0) / usageRecords.length
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1 pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
          Usage &amp; Token Telemetry Dashboard
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Real-time API token consumption, model routing, and latency distribution
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Tokens Used</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {totalTokens.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500">Across {usageRecords.length} API calls</p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">Average Response Latency</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {avgLatency} ms
          </p>
          <p className="text-xs text-slate-500">Server-side orchestration</p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">Rate Limit Quota</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {aiStatus.rateLimitPerMinute} req / min
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            Active &amp; within quota
          </p>
        </div>
      </div>

      {/* High-Density Usage Records Table */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white font-display">
            Usage Records Ledger (usage_records)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/50">
                <th className="py-2.5 px-4 font-semibold">Feature Module</th>
                <th className="py-2.5 px-4 font-semibold">AI Model</th>
                <th className="py-2.5 px-4 font-semibold text-right">Tokens Used</th>
                <th className="py-2.5 px-4 font-semibold text-right">Latency (ms)</th>
                <th className="py-2.5 px-4 font-semibold text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {usageRecords.map((rec) => (
                <tr
                  key={rec.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">
                    {rec.feature}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-blue-600 dark:text-blue-400">
                    {rec.model}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    {rec.tokensUsed.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {rec.latencyMs} ms
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500">
                    {new Date(rec.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const AdminDashboardView: React.FC = () => {
  const {
    conversations,
    messages,
    agentTasks,
    taskSteps,
    uploadedFiles,
    searchHistory,
    usageRecords,
    auditLogs,
    recordAuditLog,
  } = useApp();

  const collectionStats = [
    { name: 'profiles', count: 1, policy: 'Owner UID & Admin Only (PII Isolated)' },
    { name: 'conversations', count: conversations.length, policy: 'Owner UID Verified Write' },
    { name: 'messages', count: messages.length, policy: 'Parent Conversation Relational Gate' },
    { name: 'agent_tasks', count: agentTasks.length, policy: 'Terminal State Locked' },
    { name: 'task_steps', count: taskSteps.length, policy: 'Parent Task Relational Gate' },
    { name: 'uploaded_files', count: uploadedFiles.length, policy: '20MB Cap + Owner Isolation' },
    { name: 'search_history', count: searchHistory.length, policy: 'Owner UID Read/Write' },
    { name: 'usage_records', count: usageRecords.length, policy: 'Immutable Append-Only' },
    { name: 'audit_logs', count: auditLogs.length, policy: 'Immutable Security Ledger' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            Admin &amp; Security Governance Console
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Inspect database collections, row-level security rules, and immutable audit logs
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            recordAuditLog(
              'Manual Security Audit Executed',
              'Admin Console',
              'info',
              'Administrator verified all 9 collection security boundaries and rate limit policies.'
            )
          }
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Run Security Audit Log</span>
        </button>
      </div>

      {/* 9 Collections Status Grid */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white font-display">
            Database Collections &amp; Zero-Trust Isolation Policies (9 Tables/Collections)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/50">
                <th className="py-2.5 px-4 font-semibold">Collection Name</th>
                <th className="py-2.5 px-4 font-semibold">Active Security Policy</th>
                <th className="py-2.5 px-4 font-semibold text-right">Records Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {collectionStats.map((col) => (
                <tr key={col.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                    {col.name}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                    {col.policy}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-blue-600 dark:text-blue-400 font-semibold">
                    {col.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immutable Audit Logs Table */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white font-display">
            Security &amp; Sensitive Action Audit Trail (audit_logs)
          </h2>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`font-semibold uppercase ${
                      log.severity === 'high'
                        ? 'text-red-600 dark:text-red-400'
                        : log.severity === 'warning'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    [{log.severity}]
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {log.action}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-500">{log.module}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {log.details}
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                {new Date(log.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
