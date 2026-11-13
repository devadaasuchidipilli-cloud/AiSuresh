import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  ShieldAlert,
  ExternalLink,
  Search,
  AlertTriangle,
  PlusCircle,
} from 'lucide-react';
import { useApp, TaskStepRecord } from '../context/AppContext';
import { evaluateSearchConfidence } from '../utils/agentLogic';

export const AgentWorkspaceView: React.FC = () => {
  const {
    agentTasks,
    taskSteps,
    createAgentTask,
    updateStepState,
    selectedLanguage,
    recordUsage,
    recordAuditLog,
  } = useApp();

  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    agentTasks[0]?.id || ''
  );
  const [newTitle, setNewTitle] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [runningStepId, setRunningStepId] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const activeTask =
    agentTasks.find((t) => t.id === selectedTaskId) || agentTasks[0];
  const activeSteps = taskSteps
    .filter((s) => s.taskId === activeTask?.id)
    .sort((a, b) => a.stepIndex - b.stepIndex);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.trim()) {
      setFormError('Please enter a specific goal for the autonomous agent workflow.');
      return;
    }
    setFormError(null);
    const title = newTitle.trim() || newGoal.trim().slice(0, 65);
    const createdId = await createAgentTask(title, newGoal.trim());
    setSelectedTaskId(createdId);
    setNewTitle('');
    setNewGoal('');
    await recordAuditLog(
      'Created Agent Workflow',
      'AI Agent Workspace',
      'info',
      `Created multi-step workflow "${title}" with sensitive-action approval gate.`
    );
  };

  const handleExecuteStep = async (
    step: TaskStepRecord,
    userConfirmedSensitive: boolean
  ) => {
    if (!activeTask) return;
    if (step.isSensitive && !userConfirmedSensitive) {
      setExecutionError(
        'Sensitive action requires explicit user confirmation before execution.'
      );
      return;
    }

    setExecutionError(null);
    setRunningStepId(step.id);
    await updateStepState(step.id, 'running', 'Executing tool call on server…');

    try {
      const response = await fetch('/api/ai/agent-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: activeTask.goal,
          stepTitle: step.title,
          toolName: step.toolName,
          language: selectedLanguage,
          isSensitive: step.isSensitive,
          userApproved: userConfirmedSensitive,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Agent step failed.');
      }

      await updateStepState(step.id, 'completed', data.output);
      await recordUsage(
        `Agent Step (${step.toolName})`,
        data.model || 'gemini-4-hydrogen',
        data.tokensUsed || 90,
        data.latencyMs || 720
      );

      if (step.isSensitive && userConfirmedSensitive) {
        await recordAuditLog(
          'Approved & Executed Sensitive Action',
          'AI Agent Workspace',
          'high',
          `User confirmed and executed sensitive step "${step.title}" in task "${activeTask.title}".`
        );
      }
    } catch (err: any) {
      const msg =
        err?.message ||
        'Step execution failed. Verify GEMINI_API_KEY in Settings > Secrets.';
      setExecutionError(msg);
      await updateStepState(
        step.id,
        step.isSensitive ? 'awaiting_approval' : 'pending',
        `Execution paused: ${msg}`
      );
    } finally {
      setRunningStepId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            AI Agent Workspace — Multi-Step Task Planner
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Browser-authorized tool workflows with mandatory human confirmation before sensitive actions
          </p>
        </div>
      </div>

      {/* Create New Task Form */}
      <form
        onSubmit={handleCreateTask}
        className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
      >
        <h2 className="text-sm font-bold text-slate-900 dark:text-white font-display">
          Define New Autonomous Agent Task
        </h2>

        {formError && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300"
          >
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4">
            <label
              htmlFor="agent-task-title"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Task Title (Optional)
            </label>
            <input
              id="agent-task-title"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., AP & Telangana Crop Price Analysis"
              className="w-full px-3.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="md:col-span-6">
            <label
              htmlFor="agent-task-goal"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Task Objective &amp; Instructions (Required)
            </label>
            <input
              id="agent-task-goal"
              type="text"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="e.g., Research current turmeric & chili market trends in Guntur and publish Telugu advisory"
              className="w-full px-3.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              type="submit"
              className="w-full py-2 px-3 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Plan Task</span>
            </button>
          </div>
        </div>
      </form>

      {/* Tasks & Steps Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Task Queue */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
            Task Execution Queue ({agentTasks.length})
          </h3>
          <div className="space-y-2.5">
            {agentTasks.map((task) => {
              const selected = activeTask?.id === task.id;
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-colors space-y-2 ${
                    selected
                      ? 'bg-violet-50/70 dark:bg-violet-950/30 border-violet-400 dark:border-violet-700'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {task.title}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-violet-600 dark:text-violet-400 shrink-0">
                      {task.progress}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {task.goal}
                  </p>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-600 transition-transform duration-150 origin-left"
                      style={{ transform: `scaleX(${task.progress / 100})` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Active Task Pipeline */}
        <div className="lg:col-span-8 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
          {activeTask ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400 font-medium">
                    <span>Status: {activeTask.status.toUpperCase()}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Progress: {activeTask.progress}%
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                    {activeTask.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {activeTask.goal}
                  </p>
                </div>
              </div>

              {executionError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300"
                >
                  {executionError}
                </div>
              )}

              <div className="space-y-3">
                {activeSteps.map((step) => {
                  const isRunning = runningStepId === step.id;
                  return (
                    <div
                      key={step.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono tabular-nums">
                              Step 0{step.stepIndex + 1}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">Tool: {step.toolName}</span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                step.status === 'completed'
                                  ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                  : step.status === 'awaiting_approval'
                                  ? 'text-amber-600 dark:text-amber-400 font-medium'
                                  : 'text-blue-600 dark:text-blue-400'
                              }
                            >
                              {step.status.replace('_', ' ')}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                            {step.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {step.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Completed</span>
                            </span>
                          ) : step.isSensitive ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isRunning}
                                onClick={() => handleExecuteStep(step, true)}
                                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>
                                  {isRunning
                                    ? 'Executing…'
                                    : 'Approve & Execute Sensitive Step'}
                                </span>
                              </button>
                              <button
                                type="button"
                                disabled={isRunning}
                                onClick={() =>
                                  updateStepState(
                                    step.id,
                                    'skipped',
                                    'Skipped by user at confirmation gate.'
                                  )
                                }
                                className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded-lg transition-colors whitespace-nowrap"
                              >
                                Skip
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isRunning}
                              onClick={() => handleExecuteStep(step, false)}
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>{isRunning ? 'Running Tool…' : 'Run Step'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {step.output}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Select or create a task to inspect steps.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export const WebResearchView: React.FC = () => {
  const {
    searchHistory,
    addSearchHistoryRecord,
    selectedLanguage,
    recordUsage,
  } = useApp();

  const [queryText, setQueryText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<{
    query: string;
    summary: string;
    sources: { title: string; uri: string }[];
    confidence: string;
    uncertaintyNotice: string;
  } | null>(
    searchHistory[0]
      ? {
          query: searchHistory[0].query,
          summary: searchHistory[0].summary,
          sources: searchHistory[0].sources || [],
          confidence: searchHistory[0].confidence,
          uncertaintyNotice: evaluateSearchConfidence(
            searchHistory[0].sourceCount,
            searchHistory[0].query.length
          ).uncertaintyNotice,
        }
      : null
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = queryText.trim();
    if (!q || isSearching) return;

    setIsSearching(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          language: selectedLanguage,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Research query failed.');
      }

      const conf = evaluateSearchConfidence(data.sourceCount || 0, q.length);
      const nextResult = {
        query: q,
        summary: data.summary,
        sources: data.sources || [],
        confidence: conf.level,
        uncertaintyNotice: conf.uncertaintyNotice,
      };

      setActiveResult(nextResult);
      await addSearchHistoryRecord({
        query: q,
        summary: data.summary,
        sourceCount: data.sourceCount || 0,
        sources: data.sources || [],
        confidence: conf.level,
      });
      await recordUsage(
        'Smart Web Research',
        data.model || 'gemini-4-hydrogen',
        data.tokensUsed || 180,
        data.latencyMs || 950
      );
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'Live web research failed. Please verify your GEMINI_API_KEY in Settings > Secrets.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1 pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
          Smart Web Research — Live Google Search Grounding
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Real-time information retrieval with multi-source citations and explicit uncertainty disclosures
        </p>
      </div>

      {/* Search Form */}
      <form
        onSubmit={handleSearch}
        className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
      >
        <div className="flex flex-col sm:flex-row gap-2.5">
          <label htmlFor="web-research-input" className="sr-only">
            Web Research Query
          </label>
          <input
            id="web-research-input"
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search current events, policy updates, or technical benchmarks in Telugu, Hindi, or English…"
            className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={isSearching || !queryText.trim()}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>{isSearching ? 'Verifying Sources…' : 'Run Grounded Research'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400">Sample Queries:</span>
          {[
            'ISRO Gaganyaan & Bharatiya Antariksh Station latest updates',
            'భారతదేశంలో జాతీయ గ్రీన్ హైడ్రోజన్ మిషన్ పురోగతి',
            'Reserve Bank of India digital rupee & UPI international expansion',
          ].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQueryText(q)}
              className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </form>

      {errorMsg && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300"
        >
          {errorMsg}
        </div>
      )}

      {activeResult && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Research Synthesis */}
          <div className="lg:col-span-8 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="space-y-1 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                <span>Verification Level: {activeResult.confidence}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {activeResult.sources.length} Verified Citations
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                {activeResult.query}
              </h2>
            </div>

            <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {activeResult.summary}
            </div>

            {/* Explicit Uncertainty Communication Banner */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Uncertainty &amp; Source Disclosure: </strong>
                {activeResult.uncertaintyNotice}
              </div>
            </div>
          </div>

          {/* Right Clickable Citations & History */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                Verified Web Citations ({activeResult.sources.length})
              </h3>
              {activeResult.sources.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No external web links returned for this synthesis. Verify claims independently.
                </p>
              ) : (
                <div className="space-y-2">
                  {activeResult.sources.map((src, idx) => (
                    <a
                      key={`${src.uri}-${idx}`}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-start justify-between gap-2 transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          [{idx + 1}] {src.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                          {src.uri}
                        </p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                Recent Research Log
              </h3>
              <div className="space-y-2">
                {searchHistory.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setActiveResult({
                        query: item.query,
                        summary: item.summary,
                        sources: item.sources || [],
                        confidence: item.confidence,
                        uncertaintyNotice: evaluateSearchConfidence(
                          item.sourceCount,
                          item.query.length
                        ).uncertaintyNotice,
                      })
                    }
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                  >
                    <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                      {item.query}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {item.confidence} · {item.sourceCount} sources
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
