import React from 'react';
import {
  ArrowRight,
  Globe,
  ShieldCheck,
  Mic,
  Search,
  Cpu,
  FileText,
  Code2,
  LogIn,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUPPORTED_INDIAN_LANGUAGES } from '../utils/agentLogic';

export const LandingPage: React.FC = () => {
  const { setActivePage, setSelectedLanguage, selectedLanguage } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 lg:px-12 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#0B1120]/90 backdrop-blur-md sticky top-0 z-30">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActivePage('landing');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 font-display"
        >
          Super AI Agent
        </a>

        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          <a
            href="#capabilities"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0"
          >
            Capabilities
          </a>
          <a
            href="#languages"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0"
          >
            Indian Languages
          </a>
          <a
            href="#architecture"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0"
          >
            Security
          </a>
          <button
            type="button"
            onClick={() => setActivePage('auth')}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0"
          >
            Sign In
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm"
          >
            <span>Open Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-12 py-12 lg:py-20 space-y-20">
        {/* Hero Split */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                <span>Multilingual AI Platform</span>
                <span aria-hidden="true">·</span>
                <span>Telugu, Hindi, Tamil &amp; 9+ Indian Languages</span>
                <span aria-hidden="true">·</span>
                <span>Browser-Native Workspace</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12] font-display">
                Universal Intelligence, Grounded Research, and Autonomous Workflows in Your Language.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Super AI Agent unifies streaming multilingual conversation, live web research with verified source citations, Telugu &amp; Indian voice conversations, PDF/image intelligence, coding assistance, and human-approved autonomous tasks in one secure web platform.
              </p>
            </div>

            {/* Interactive Language Quick-Switch */}
            <div id="languages" className="space-y-3 pt-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Select default workspace language before launching:
              </p>
              <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-200/70 dark:bg-slate-900/90 border border-slate-300/80 dark:border-slate-800 rounded-xl">
                {SUPPORTED_INDIAN_LANGUAGES.slice(0, 6).map((lang) => {
                  const fullLabel = `${lang.name} (${lang.nativeName})`;
                  const active = selectedLanguage.includes(lang.name);
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setSelectedLanguage(fullLabel)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800'
                      }`}
                    >
                      {lang.nativeName} · {lang.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => setActivePage('dashboard')}
                className="px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
              >
                <span>Launch AI Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActivePage('chat')}
                className="px-5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Try Telugu &amp; Multilingual Chat
              </button>
            </div>
          </div>

          {/* Right Interactive Preview Console */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  Live Multilingual Orchestration Preview
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  gemini-4-hydrogen
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    User Prompt · తెలుగు (Telugu)
                  </p>
                  <p className="font-medium">
                    &ldquo;భారతదేశంలో సౌర విద్యుత్ సబ్సిడీ వివరాలు మరియు దరఖాస్తు విధానం చెప్పండి.&rdquo;
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50 text-slate-800 dark:text-slate-200 space-y-2">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    Super AI Agent · Grounded Response + Voice Ready
                  </p>
                  <p className="text-xs leading-relaxed">
                    PM Surya Ghar పథకం కింద 3 kW వరకు రూఫ్టాప్ సోలార్ ప్లాంట్లకు ₹78,000 వరకు కేంద్ర సబ్సిడీ లభిస్తుంది. ఆన్లైన్ పోర్టల్ ద్వారా నేరుగా దరఖాస్తు చేసుకోవచ్చు.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActivePage('voice')}
                className="px-3 py-2 text-xs font-medium text-left rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
              >
                Voice Assistant (తెలుగు / हिन्दी) →
              </button>
              <button
                type="button"
                onClick={() => setActivePage('agent')}
                className="px-3 py-2 text-xs font-medium text-left rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
              >
                Autonomous Agent Tasks →
              </button>
            </div>
          </div>
        </section>

        {/* Full-Width 4-Column Metric Strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-y border-slate-200 dark:border-slate-800 py-8">
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              9+ Scripts
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali, Marathi, Gujarati &amp; English
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              6 Core Modules
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chat, Web Research, Agent Workflows, Voice, File Intelligence &amp; Coding
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              9 Collections
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Zero-Trust security rules with user UID isolation &amp; audit logging
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              100% Web-Native
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Responsive mobile &amp; desktop browser execution without companion installs
            </p>
          </div>
        </section>

        {/* 6 Core Capabilities Grid */}
        <section id="capabilities" className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-display">
              01. Complete AI Platform Capabilities
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Every module connects directly to the server-side Gemini orchestration layer without exposing API credentials to the browser.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                id: 'chat' as const,
                icon: Globe,
                title: 'Universal AI Chat',
                meta: 'Streaming · Auto Language Detection · Context Memory',
                desc: 'Converse across science, agriculture, business, and public policy in Telugu, Hindi, English, and major Indian languages.',
              },
              {
                id: 'research' as const,
                icon: Search,
                title: 'Smart Web Research',
                meta: 'Google Search Grounding · Verified Citations · Uncertainty Notes',
                desc: 'Retrieve real-time facts with clickable source citations and explicit confidence indicators.',
              },
              {
                id: 'agent' as const,
                icon: Cpu,
                title: 'AI Agent Workspace',
                meta: 'Multi-Step Planning · Tool Calling · Approval Gates',
                desc: 'Decompose complex objectives into automated steps with mandatory human confirmation before sensitive actions.',
              },
              {
                id: 'voice' as const,
                icon: Mic,
                title: 'Multilingual Voice Assistant',
                meta: 'Speech-to-Text · Gemini 3.8 TTS · Live Waveform',
                desc: 'Speak naturally in Telugu, Hindi, or English with real-time audio transcription, neural voice playback, and interrupt controls.',
              },
              {
                id: 'files' as const,
                icon: FileText,
                title: 'File Intelligence',
                meta: 'PDF & Image Understanding · Text Extraction · Document Q&A',
                desc: 'Upload PDFs, images, or text reports to generate executive summaries and ask targeted follow-up questions.',
              },
              {
                id: 'coding' as const,
                icon: Code2,
                title: 'Coding Assistant',
                meta: 'Generate · Explain · Debug · Live HTML Preview',
                desc: 'Write, debug, and explain Python, TypeScript, SQL, and interactive HTML/CSS/JS with native-language explanations.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="p-6 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-5 hover:border-blue-500/60 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {item.meta}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActivePage(item.id)}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline text-left flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <span>Open {item.title}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Security & Architecture Section */}
        <section
          id="architecture"
          className="p-8 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
        >
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero-Trust Server Orchestration &amp; Row-Level Document Isolation</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
              02. Production Security &amp; Explicit Human Approval Gates
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Secret API keys remain strictly on the Express server proxy (`/api/ai/*`). User records across all 9 collections (`profiles`, `conversations`, `messages`, `agent_tasks`, `task_steps`, `uploaded_files`, `search_history`, `usage_records`, `audit_logs`) enforce strict owner UID validation and sensitive-action confirmation.
            </p>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end gap-3">
            <button
              type="button"
              onClick={() => setActivePage('auth')}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Authenticate Account
            </button>
            <button
              type="button"
              onClick={() => setActivePage('admin')}
              className="px-5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Inspect Audit Logs
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 px-6 lg:px-12 py-6 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span>Super AI Agent — Website-Only Multilingual AI Platform</span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            className="hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Dashboard
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setActivePage('usage')}
            className="hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Usage Metrics
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setActivePage('settings')}
            className="hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Settings
          </button>
        </div>
      </footer>
    </div>
  );
};

export const AuthPage: React.FC = () => {
  const { user, signInWithGoogle, signOutUser, authError, setActivePage, profile } = useApp();

  return (
    <div className="max-w-xl mx-auto py-12 px-4 space-y-6">
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
        <div className="space-y-2">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            Identity &amp; Session Management
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            Sign in to Super AI Agent
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Authenticate with Google to sync your conversations, autonomous tasks, uploaded file summaries, and usage records with cloud database security rules.
          </p>
        </div>

        {authError && (
          <div
            role="alert"
            className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300"
          >
            {authError}
          </div>
        )}

        {user ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {user.displayName || profile.displayName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {user.email} · UID: {user.uid.slice(0, 12)}…
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActivePage('dashboard')}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Continue to AI Dashboard
              </button>
              <button
                type="button"
                onClick={signOutUser}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign in with Google Account</span>
            </button>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Testing in preview or sandbox?</span>
              <button
                type="button"
                onClick={() => setActivePage('dashboard')}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Continue in Interactive Workspace →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
