export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  bcp47: string;
}

export const SUPPORTED_INDIAN_LANGUAGES: LanguageInfo[] = [
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', bcp47: 'te-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', bcp47: 'hi-IN' },
  { code: 'en', name: 'English', nativeName: 'IN', bcp47: 'en-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', bcp47: 'ta-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', bcp47: 'kn-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', bcp47: 'ml-IN' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', bcp47: 'bn-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', bcp47: 'mr-IN' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', bcp47: 'gu-IN' },
];

export function detectIndianLanguage(input: string): LanguageInfo {
  const text = (input || '').trim();
  if (!text) return SUPPORTED_INDIAN_LANGUAGES[2]; // English default

  // Unicode range checks for Indian scripts
  if (/[\u0C00-\u0C7F]/.test(text)) {
    return SUPPORTED_INDIAN_LANGUAGES[0]; // Telugu
  }
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return SUPPORTED_INDIAN_LANGUAGES[3]; // Tamil
  }
  if (/[\u0C80-\u0CFF]/.test(text)) {
    return SUPPORTED_INDIAN_LANGUAGES[4]; // Kannada
  }
  if (/[\u0D00-\u0D7F]/.test(text)) {
    return SUPPORTED_INDIAN_LANGUAGES[5]; // Malayalam
  }
  if (/[\u0980-\u09FF]/.test(text)) {
    return SUPPORTED_INDIAN_LANGUAGES[6]; // Bengali
  }
  if (/[\u0A80-\u0AFF]/.test(text)) {
    return SUPPORTED_INDIAN_LANGUAGES[8]; // Gujarati
  }
  if (/[\u0900-\u097F]/.test(text)) {
    // Distinguish Marathi common tokens vs Hindi
    if (/(आहे|नाही|माझा|तुम्ही|मराठी)/.test(text)) {
      return SUPPORTED_INDIAN_LANGUAGES[7]; // Marathi
    }
    return SUPPORTED_INDIAN_LANGUAGES[1]; // Hindi
  }

  // Romanized Telugu/Hindi heuristics
  const lower = text.toLowerCase();
  if (/\b(namaskaram|ela unnaru|telugu|cheppandi|emiti|bagunnara|sahayam)\b/.test(lower)) {
    return SUPPORTED_INDIAN_LANGUAGES[0];
  }
  if (/\b(namaste|kaise ho|kya hai|batao|bahut|dhanyavad)\b/.test(lower)) {
    return SUPPORTED_INDIAN_LANGUAGES[1];
  }

  return SUPPORTED_INDIAN_LANGUAGES[2];
}

export interface PlannedStep {
  id: string;
  stepIndex: number;
  title: string;
  toolName: string;
  status: 'pending' | 'awaiting_approval' | 'running' | 'completed' | 'skipped';
  isSensitive: boolean;
  output: string;
}

export function buildAgentWorkflowSteps(goal: string, taskId: string = 'task-1'): PlannedStep[] {
  const cleanGoal = (goal || '').trim();
  if (!cleanGoal) {
    throw new Error('Agent task goal cannot be empty.');
  }

  const lower = cleanGoal.toLowerCase();
  const hasSensitiveIntent =
    /(send|email|publish|delete|payment|transfer|export|update account|deploy|dispatch|submit|share|ఇమెయిల్|పంపండి|డిలీట్|పబ్లిష్)/.test(
      lower
    );

  const steps: PlannedStep[] = [
    {
      id: `${taskId}-step-1`,
      stepIndex: 0,
      title: `Analyze objective & parse multilingual context: "${cleanGoal.slice(0, 60)}"`,
      toolName: 'context_planner',
      status: 'completed',
      isSensitive: false,
      output: 'Objective parsed. Identified required browser tools, knowledge retrieval, and verification gates.',
    },
    {
      id: `${taskId}-step-2`,
      stepIndex: 1,
      title: 'Execute live web & knowledge retrieval across verified sources',
      toolName: 'web_research_tool',
      status: 'pending',
      isSensitive: false,
      output: 'Waiting to run live source verification.',
    },
    {
      id: `${taskId}-step-3`,
      stepIndex: 2,
      title: 'Synthesize structured artifact & multilingual summary',
      toolName: 'llm_synthesizer',
      status: 'pending',
      isSensitive: false,
      output: 'Waiting for research output.',
    },
    {
      id: `${taskId}-step-4`,
      stepIndex: 3,
      title: hasSensitiveIntent
        ? 'Execute external action / dispatch deliverable (Requires User Approval)'
        : 'Commit verified deliverable to workspace audit log (Requires User Approval)',
      toolName: 'authorized_browser_action',
      status: 'awaiting_approval',
      isSensitive: true,
      output: 'Paused at security gate: Awaiting explicit user confirmation before executing sensitive action.',
    },
  ];

  return steps;
}

export function calculateTaskProgress(
  steps: Pick<PlannedStep, 'status' | 'isSensitive'>[]
): {
  progress: number;
  status: 'planning' | 'awaiting_approval' | 'running' | 'completed' | 'failed';
} {
  if (!steps.length) {
    return { progress: 0, status: 'planning' };
  }

  const completedCount = steps.filter(
    (s) => s.status === 'completed' || s.status === 'skipped'
  ).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  if (completedCount === steps.length) {
    return { progress: 100, status: 'completed' };
  }
  if (steps.some((s) => s.status === 'awaiting_approval')) {
    return { progress, status: 'awaiting_approval' };
  }
  if (steps.some((s) => s.status === 'running')) {
    return { progress, status: 'running' };
  }
  return { progress, status: 'running' };
}

export function evaluateSearchConfidence(
  sourceCount: number,
  queryLength: number
): {
  level: 'High Confidence' | 'Moderate Confidence' | 'Low / Verify Independently';
  uncertaintyNotice: string;
} {
  if (sourceCount >= 3) {
    return {
      level: 'High Confidence',
      uncertaintyNotice:
        'Cross-verified across multiple live web citations. Always inspect primary links for time-sensitive decisions.',
    };
  }
  if (sourceCount >= 1) {
    return {
      level: 'Moderate Confidence',
      uncertaintyNotice:
        'Grounded in limited web sources. Claims not covered by direct citations may carry model uncertainty.',
    };
  }
  return {
    level: 'Low / Verify Independently',
    uncertaintyNotice:
      queryLength > 0
        ? 'No live external citations matched this specific query; response relies on model knowledge and should be independently verified.'
        : 'Enter a specific research query to retrieve verified web citations.',
  };
}

export function sanitizeId(id: string): string {
  const cleaned = (id || '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned || `doc-${Date.now()}`;
}

export function truncateString(str: string, maxLength: number): string {
  const val = String(str ?? '');
  return val.length > maxLength ? val.slice(0, maxLength) : val;
}
