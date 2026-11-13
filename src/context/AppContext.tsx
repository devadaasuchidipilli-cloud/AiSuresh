import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  SUPPORTED_INDIAN_LANGUAGES,
  detectIndianLanguage,
  buildAgentWorkflowSteps,
  calculateTaskProgress,
  sanitizeId,
  truncateString,
  PlannedStep,
} from '../utils/agentLogic';

export type PageId =
  | 'landing'
  | 'auth'
  | 'dashboard'
  | 'chat'
  | 'agent'
  | 'research'
  | 'voice'
  | 'files'
  | 'coding'
  | 'history'
  | 'settings'
  | 'usage'
  | 'admin';

export interface ProfileRecord {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  preferredLanguage: string;
  voicePersona: string;
  theme: 'dark' | 'light';
  createdAt: string;
  updatedAt: string;
}

export interface ConversationRecord {
  id: string;
  userId: string;
  title: string;
  language: string;
  domain: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  userId: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  detectedLanguage: string;
  createdAt: string;
}

export interface AgentTaskRecord {
  id: string;
  userId: string;
  title: string;
  goal: string;
  status: 'planning' | 'awaiting_approval' | 'running' | 'completed' | 'failed';
  progress: number;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStepRecord extends PlannedStep {
  userId: string;
  taskId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadedFileRecord {
  id: string;
  userId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  summary: string;
  extractedText: string;
  createdAt: string;
}

export interface SearchHistoryRecord {
  id: string;
  userId: string;
  query: string;
  summary: string;
  sourceCount: number;
  sources?: { title: string; uri: string }[];
  confidence: string;
  createdAt: string;
}

export interface UsageRecordItem {
  id: string;
  userId: string;
  feature: string;
  model: string;
  tokensUsed: number;
  latencyMs: number;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  userId: string;
  action: string;
  module: string;
  severity: 'info' | 'warning' | 'high';
  details: string;
  createdAt: string;
}

interface AppContextValue {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  user: User | null;
  authReady: boolean;
  aiStatus: {
    configured: boolean;
    models: Record<string, string>;
    rateLimitPerMinute: number;
  };
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  profile: ProfileRecord;
  updateProfileSettings: (updates: Partial<ProfileRecord>) => Promise<void>;
  conversations: ConversationRecord[];
  activeConversationId: string;
  setActiveConversationId: (id: string) => void;
  messages: MessageRecord[];
  createNewConversation: (title: string, language: string, domain: string) => Promise<string>;
  appendChatMessage: (
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    detectedLanguage?: string
  ) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  agentTasks: AgentTaskRecord[];
  taskSteps: TaskStepRecord[];
  createAgentTask: (title: string, goal: string) => Promise<string>;
  updateStepState: (
    stepId: string,
    status: TaskStepRecord['status'],
    output: string
  ) => Promise<void>;
  uploadedFiles: UploadedFileRecord[];
  addUploadedFileRecord: (
    file: Omit<UploadedFileRecord, 'id' | 'userId' | 'createdAt'>
  ) => Promise<UploadedFileRecord>;
  searchHistory: SearchHistoryRecord[];
  addSearchHistoryRecord: (
    record: Omit<SearchHistoryRecord, 'id' | 'userId' | 'createdAt'>
  ) => Promise<void>;
  usageRecords: UsageRecordItem[];
  recordUsage: (feature: string, model: string, tokensUsed: number, latencyMs: number) => Promise<void>;
  auditLogs: AuditLogItem[];
  recordAuditLog: (
    action: string,
    module: string,
    severity: 'info' | 'warning' | 'high',
    details: string
  ) => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const INITIAL_CONVERSATIONS: ConversationRecord[] = [
  {
    id: 'conv-telugu-welcome',
    userId: 'workspace-user',
    title: 'తెలుగు AI సహాయకుడు — వ్యవసాయం & సాంకేతికత',
    language: 'Telugu (తెలుగు)',
    domain: 'General Knowledge',
    messageCount: 2,
    createdAt: '2026-11-13T04:10:00Z',
    updatedAt: '2026-11-13T04:12:00Z',
  },
  {
    id: 'conv-india-stack',
    userId: 'workspace-user',
    title: 'DPI & ONDC Architecture Deep Dive',
    language: 'English (India)',
    domain: 'Technology & Engineering',
    messageCount: 2,
    createdAt: '2026-11-13T03:30:00Z',
    updatedAt: '2026-11-13T03:35:00Z',
  },
];

const INITIAL_MESSAGES: MessageRecord[] = [
  {
    id: 'msg-1',
    userId: 'workspace-user',
    conversationId: 'conv-telugu-welcome',
    role: 'user',
    content: 'నమస్కారం! ఆంధ్రప్రదేశ్ మరియు తెలంగాణలో ఆధునిక డ్రిప్ ఇరిగేషన్ (బిందు సేద్యం) ప్రయోజనాలు ఏమిటి?',
    detectedLanguage: 'Telugu (తెలుగు)',
    createdAt: '2026-11-13T04:10:10Z',
  },
  {
    id: 'msg-2',
    userId: 'workspace-user',
    conversationId: 'conv-telugu-welcome',
    role: 'assistant',
    content:
      'నమస్కారం! ఆంధ్రప్రదేశ్ మరియు తెలంగాణ రైతులకు ఆధునిక బిందు సేద్యం (Drip Irrigation) వల్ల కలిగే ముఖ్య ప్రయోజనాలు:\n\n1. **నీటి ఆదా (40%–60%)**: మొక్కల వేర్ల వద్దకు నేరుగా చుక్కల రూపంలో నీరు చేరడం వల్ల ఆవిరి నష్టం తగ్గుతుంది.\n2. **ఫెర్టిగేషన్ (Fertigation)**: నీటితో పాటే ద్రవ రూప ఎరువులు అందించడం వల్ల ఎరువుల ఖర్చు 30% తగ్గుతుంది.\n3. **అధిక దిగుబడి**: మిరప, పత్తి, పసుపు, మరియు ఉద్యానవన పంటలలో 25%–35% వరకు నాణ్యమైన దిగుబడి పెరుగుతుంది.',
    detectedLanguage: 'Telugu (తెలుగు)',
    createdAt: '2026-11-13T04:10:25Z',
  },
  {
    id: 'msg-3',
    userId: 'workspace-user',
    conversationId: 'conv-india-stack',
    role: 'user',
    content: 'How do UPI and ONDC interoperate for regional language merchants?',
    detectedLanguage: 'English (India)',
    createdAt: '2026-11-13T03:30:10Z',
  },
  {
    id: 'msg-4',
    userId: 'workspace-user',
    conversationId: 'conv-india-stack',
    role: 'assistant',
    content:
      'ONDC decouples buyer and seller platforms using open Beckn protocol APIs, while UPI provides instant settlement across banks. Combined with voice-first Telugu, Hindi, and Tamil catalog onboarding, small kirana stores can list inventory by speaking in their native language and receive instant settlement.',
    detectedLanguage: 'English (India)',
    createdAt: '2026-11-13T03:30:35Z',
  },
];

const INITIAL_TASKS: AgentTaskRecord[] = [
  {
    id: 'task-ev-policy',
    userId: 'workspace-user',
    title: 'Solar & EV Subsidy Compliance Audit (AP & Telangana)',
    goal: 'Compare state EV charging subsidies in Telugu & English and prepare executive compliance summary for approval.',
    status: 'awaiting_approval',
    progress: 50,
    requiresApproval: true,
    createdAt: '2026-11-13T04:00:00Z',
    updatedAt: '2026-11-13T04:15:00Z',
  },
];

const INITIAL_STEPS: TaskStepRecord[] = [
  {
    id: 'task-ev-policy-step-1',
    userId: 'workspace-user',
    taskId: 'task-ev-policy',
    stepIndex: 0,
    title: 'Parse state renewable & EV tariff notifications (2025–2026)',
    toolName: 'context_planner',
    status: 'completed',
    isSensitive: false,
    output: 'Indexed PM E-DRIVE guidelines and state DISCOM LT-EV tariff schedules.',
    createdAt: '2026-11-13T04:01:00Z',
    updatedAt: '2026-11-13T04:02:00Z',
  },
  {
    id: 'task-ev-policy-step-2',
    userId: 'workspace-user',
    taskId: 'task-ev-policy',
    stepIndex: 1,
    title: 'Cross-verify capital subsidy ceilings across commercial fleets',
    toolName: 'web_research_tool',
    status: 'completed',
    isSensitive: false,
    output: 'Verified 100% road tax exemption parameters and charging station capital grants.',
    createdAt: '2026-11-13T04:03:00Z',
    updatedAt: '2026-11-13T04:06:00Z',
  },
  {
    id: 'task-ev-policy-step-3',
    userId: 'workspace-user',
    taskId: 'task-ev-policy',
    stepIndex: 2,
    title: 'Draft bilingual (Telugu + English) compliance brief',
    toolName: 'llm_synthesizer',
    status: 'pending',
    isSensitive: false,
    output: 'Ready to synthesize bilingual summary.',
    createdAt: '2026-11-13T04:07:00Z',
    updatedAt: '2026-11-13T04:07:00Z',
  },
  {
    id: 'task-ev-policy-step-4',
    userId: 'workspace-user',
    taskId: 'task-ev-policy',
    stepIndex: 3,
    title: 'Publish approved compliance dossier to workspace audit log (Sensitive)',
    toolName: 'authorized_browser_action',
    status: 'awaiting_approval',
    isSensitive: true,
    output: 'Paused at security gate: Requires explicit user confirmation before publishing.',
    createdAt: '2026-11-13T04:08:00Z',
    updatedAt: '2026-11-13T04:08:00Z',
  },
];

const INITIAL_FILES: UploadedFileRecord[] = [
  {
    id: 'file-ap-agri-2026',
    userId: 'workspace-user',
    fileName: 'Telangana_AP_AgriTech_Report_2026.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 428500,
    summary:
      'Comprehensive survey of precision agriculture adoption across Guntur, Warangal, and Nizamabad districts. Highlights 48% reduction in water usage via sensor-guided drip irrigation and multilingual advisory bots in Telugu.',
    extractedText:
      'Section 1: Executive Overview — Precision irrigation and soil telemetry across 14,200 smallholder farms in Andhra Pradesh and Telangana. Section 2: Economic Impact — Average net income rose by ₹28,400 per acre for chili and cotton cultivators using real-time pest & weather alerts in Telugu (తెలుగు). Section 3: Policy Recommendations — Expand solar pump subsidies and localized voice AI advisories.',
    createdAt: '2026-11-13T03:45:00Z',
  },
];

const INITIAL_SEARCHES: SearchHistoryRecord[] = [
  {
    id: 'search-isro-2026',
    userId: 'workspace-user',
    query: 'ISRO Gaganyaan & Bharatiya Antariksh Station latest milestones',
    summary:
      'ISRO has progressed uncrewed orbital module validation and environmental control and life support system (ECLSS) testing for Gaganyaan, alongside module definition for the Bharatiya Antariksh Station (BAS).',
    sourceCount: 3,
    sources: [
      { title: 'ISRO Official Portal — Gaganyaan Programme', uri: 'https://www.isro.gov.in' },
      { title: 'Department of Space — Annual Report', uri: 'https://dos.gov.in' },
      { title: 'Press Information Bureau — Science & Tech', uri: 'https://pib.gov.in' },
    ],
    confidence: 'High Confidence',
    createdAt: '2026-11-13T03:55:00Z',
  },
];

const INITIAL_USAGE: UsageRecordItem[] = [
  {
    id: 'usage-1',
    userId: 'workspace-user',
    feature: 'Universal AI Chat (Telugu)',
    model: 'gemini-4-hydrogen',
    tokensUsed: 420,
    latencyMs: 640,
    createdAt: '2026-11-13T04:10:25Z',
  },
  {
    id: 'usage-2',
    userId: 'workspace-user',
    feature: 'Smart Web Research',
    model: 'gemini-4-hydrogen',
    tokensUsed: 890,
    latencyMs: 1120,
    createdAt: '2026-11-13T03:55:00Z',
  },
  {
    id: 'usage-3',
    userId: 'workspace-user',
    feature: 'File Intelligence PDF',
    model: 'gemini-4-hydrogen',
    tokensUsed: 1240,
    latencyMs: 980,
    createdAt: '2026-11-13T03:45:00Z',
  },
  {
    id: 'usage-4',
    userId: 'workspace-user',
    feature: 'Voice Assistant TTS',
    model: 'gemini-3.8-flash-lite-tts',
    tokensUsed: 185,
    latencyMs: 510,
    createdAt: '2026-11-13T03:20:00Z',
  },
];

const INITIAL_AUDIT: AuditLogItem[] = [
  {
    id: 'audit-1',
    userId: 'workspace-user',
    action: 'Sensitive Step Gate Enforced',
    module: 'AI Agent Workspace',
    severity: 'warning',
    details: 'Task "Solar & EV Subsidy Compliance Audit" paused at step 4 awaiting explicit user confirmation.',
    createdAt: '2026-11-13T04:08:00Z',
  },
  {
    id: 'audit-2',
    userId: 'workspace-user',
    action: 'Firestore Zero-Trust Rules Active',
    module: 'Security Engine',
    severity: 'info',
    details: 'All 9 collections protected with owner UID isolation, verified email checks, and schema bounds.',
    createdAt: '2026-11-13T03:00:00Z',
  },
];

function formatTimestamp(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val?.toDate === 'function') return val.toDate().toISOString();
  return new Date().toISOString();
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const params = new URLSearchParams(window.location.search);
  const initialPage: PageId = params.get('autostart') === '1' ? 'dashboard' : 'landing';

  const [activePage, setActivePage] = useState<PageId>(initialPage);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('Telugu (తెలుగు)');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [aiStatus, setAiStatus] = useState<{
    configured: boolean;
    models: Record<string, string>;
    rateLimitPerMinute: number;
  }>({
    configured: true,
    models: {
      chat: 'gemini-4-hydrogen',
      research: 'gemini-4-hydrogen',
      tts: 'gemini-3.8-flash-lite-tts',
      transcribe: 'gemini-3.5-transcribe',
    },
    rateLimitPerMinute: 45,
  });

  const [profile, setProfile] = useState<ProfileRecord>({
    id: 'workspace-user',
    userId: 'workspace-user',
    displayName: 'Devadaasu Chidipilli',
    email: 'devadaasuchidipilli@gmail.com',
    preferredLanguage: 'Telugu (తెలుగు)',
    voicePersona: 'Kore',
    theme: 'dark',
    createdAt: '2026-11-13T03:00:00Z',
    updatedAt: '2026-11-13T04:00:00Z',
  });

  const [conversations, setConversations] = useState<ConversationRecord[]>(INITIAL_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState<string>(
    INITIAL_CONVERSATIONS[0].id
  );
  const [messages, setMessages] = useState<MessageRecord[]>(INITIAL_MESSAGES);
  const [agentTasks, setAgentTasks] = useState<AgentTaskRecord[]>(INITIAL_TASKS);
  const [taskSteps, setTaskSteps] = useState<TaskStepRecord[]>(INITIAL_STEPS);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileRecord[]>(INITIAL_FILES);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryRecord[]>(INITIAL_SEARCHES);
  const [usageRecords, setUsageRecords] = useState<UsageRecordItem[]>(INITIAL_USAGE);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT);

  // Sync dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Check backend AI status
  useEffect(() => {
    fetch('/api/ai/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setAiStatus(data);
      })
      .catch(() => {});
  }, []);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);

      if (currentUser && currentUser.emailVerified) {
        const profileRef = doc(db, 'profiles', currentUser.uid);
        try {
          await setDoc(
            profileRef,
            {
              userId: currentUser.uid,
              displayName: truncateString(currentUser.displayName || 'Super AI User', 100),
              email: truncateString(currentUser.email || '', 200),
              preferredLanguage: 'Telugu (తెలుగు)',
              voicePersona: 'Kore',
              theme: 'dark',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch {
          // Profile may already exist with immutable createdAt; safe to ignore initial merge check
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore subscriptions when user is authenticated
  useEffect(() => {
    if (!authReady || !user) return;
    const uid = user.uid;

    const unsubProfile = onSnapshot(
      doc(db, 'profiles', uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setProfile({
            id: snap.id,
            userId: d.userId,
            displayName: d.displayName,
            email: d.email || user.email || '',
            preferredLanguage: d.preferredLanguage || 'Telugu (తెలుగు)',
            voicePersona: d.voicePersona || 'Kore',
            theme: d.theme === 'light' ? 'light' : 'dark',
            createdAt: formatTimestamp(d.createdAt),
            updatedAt: formatTimestamp(d.updatedAt),
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `profiles/${uid}`)
    );

    const unsubConvs = onSnapshot(
      query(collection(db, 'conversations'), where('userId', '==', uid)),
      (snap) => {
        if (!snap.empty) {
          const items: ConversationRecord[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              userId: d.userId,
              title: d.title,
              language: d.language,
              domain: d.domain,
              messageCount: d.messageCount,
              createdAt: formatTimestamp(d.createdAt),
              updatedAt: formatTimestamp(d.updatedAt),
            };
          });
          setConversations(items);
          setActiveConversationId((prev) =>
            items.some((i) => i.id === prev) ? prev : items[0].id
          );
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'conversations')
    );

    const unsubMsgs = onSnapshot(
      query(collection(db, 'messages'), where('userId', '==', uid)),
      (snap) => {
        if (!snap.empty) {
          const items: MessageRecord[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              userId: d.userId,
              conversationId: d.conversationId,
              role: d.role,
              content: d.content,
              detectedLanguage: d.detectedLanguage,
              createdAt: formatTimestamp(d.createdAt),
            };
          });
          setMessages(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'messages')
    );

    const unsubTasks = onSnapshot(
      query(collection(db, 'agent_tasks'), where('userId', '==', uid)),
      (snap) => {
        if (!snap.empty) {
          const items: AgentTaskRecord[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              userId: d.userId,
              title: d.title,
              goal: d.goal,
              status: d.status,
              progress: d.progress,
              requiresApproval: d.requiresApproval,
              createdAt: formatTimestamp(d.createdAt),
              updatedAt: formatTimestamp(d.updatedAt),
            };
          });
          setAgentTasks(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'agent_tasks')
    );

    const unsubSteps = onSnapshot(
      query(collection(db, 'task_steps'), where('userId', '==', uid)),
      (snap) => {
        if (!snap.empty) {
          const items: TaskStepRecord[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              userId: d.userId,
              taskId: d.taskId,
              stepIndex: d.stepIndex,
              title: d.title,
              toolName: d.toolName,
              status: d.status,
              isSensitive: d.isSensitive,
              output: d.output,
              createdAt: formatTimestamp(d.createdAt),
              updatedAt: formatTimestamp(d.updatedAt),
            };
          });
          setTaskSteps(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'task_steps')
    );

    const unsubFiles = onSnapshot(
      query(collection(db, 'uploaded_files'), where('userId', '==', uid)),
      (snap) => {
        if (!snap.empty) {
          const items: UploadedFileRecord[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              userId: d.userId,
              fileName: d.fileName,
              mimeType: d.mimeType,
              sizeBytes: d.sizeBytes,
              summary: d.summary,
              extractedText: d.extractedText,
              createdAt: formatTimestamp(d.createdAt),
            };
          });
          setUploadedFiles(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'uploaded_files')
    );

    const unsubSearches = onSnapshot(
      query(collection(db, 'search_history'), where('userId', '==', uid)),
      (snap) => {
        if (!snap.empty) {
          const items: SearchHistoryRecord[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              userId: d.userId,
              query: d.query,
              summary: d.summary,
              sourceCount: d.sourceCount,
              confidence: d.confidence,
              createdAt: formatTimestamp(d.createdAt),
            };
          });
          setSearchHistory(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'search_history')
    );

    const unsubUsage = onSnapshot(
      query(collection(db, 'usage_records'), where('userId', '==', uid)),
      (snap) => {
        if (!snap.empty) {
          const items: UsageRecordItem[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              userId: d.userId,
              feature: d.feature,
              model: d.model,
              tokensUsed: d.tokensUsed,
              latencyMs: d.latencyMs,
              createdAt: formatTimestamp(d.createdAt),
            };
          });
          setUsageRecords(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'usage_records')
    );

    const unsubAudit = onSnapshot(
      query(collection(db, 'audit_logs'), where('userId', '==', uid)),
      (snap) => {
        if (!snap.empty) {
          const items: AuditLogItem[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              userId: d.userId,
              action: d.action,
              module: d.module,
              severity: d.severity,
              details: d.details,
              createdAt: formatTimestamp(d.createdAt),
            };
          });
          setAuditLogs(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'audit_logs')
    );

    return () => {
      unsubProfile();
      unsubConvs();
      unsubMsgs();
      unsubTasks();
      unsubSteps();
      unsubFiles();
      unsubSearches();
      unsubUsage();
      unsubAudit();
    };
  }, [authReady, user]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      setProfile((p) => ({ ...p, theme: next }));
      return next;
    });
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setActivePage('dashboard');
    } catch (error: any) {
      setAuthError(error?.message || 'Google Sign-In failed.');
    }
  };

  const signOutUser = async () => {
    await firebaseSignOut(auth);
  };

  const updateProfileSettings = async (updates: Partial<ProfileRecord>) => {
    const nextProfile: ProfileRecord = {
      ...profile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setProfile(nextProfile);
    if (updates.theme) setTheme(updates.theme);
    if (updates.preferredLanguage) setSelectedLanguage(updates.preferredLanguage);

    if (user && user.emailVerified) {
      const path = `profiles/${user.uid}`;
      try {
        await setDoc(
          doc(db, 'profiles', user.uid),
          {
            userId: user.uid,
            displayName: truncateString(nextProfile.displayName, 100),
            email: truncateString(nextProfile.email, 200),
            preferredLanguage: truncateString(nextProfile.preferredLanguage, 32),
            voicePersona: truncateString(nextProfile.voicePersona, 32),
            theme: nextProfile.theme,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  const createNewConversation = async (
    title: string,
    language: string,
    domain: string
  ): Promise<string> => {
    const id = sanitizeId(`conv-${Date.now()}`);
    const now = new Date().toISOString();
    const uid = user?.uid || 'workspace-user';
    const newConv: ConversationRecord = {
      id,
      userId: uid,
      title: truncateString(title || 'New Conversation', 200),
      language: truncateString(language || selectedLanguage, 32),
      domain: truncateString(domain || 'General Knowledge', 64),
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(id);

    if (user && user.emailVerified) {
      try {
        await setDoc(doc(db, 'conversations', id), {
          userId: uid,
          title: newConv.title,
          language: newConv.language,
          domain: newConv.domain,
          messageCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `conversations/${id}`);
      }
    }

    return id;
  };

  const appendChatMessage = async (
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    detectedLanguage?: string
  ) => {
    const cleanContent = truncateString(content.trim(), 20000);
    if (!cleanContent) return;

    const id = sanitizeId(`msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    const now = new Date().toISOString();
    const uid = user?.uid || 'workspace-user';
    const langInfo = detectIndianLanguage(cleanContent);
    const detected = truncateString(
      detectedLanguage || `${langInfo.name} (${langInfo.nativeName})`,
      32
    );

    const newMsg: MessageRecord = {
      id,
      userId: uid,
      conversationId,
      role,
      content: cleanContent,
      detectedLanguage: detected,
      createdAt: now,
    };

    setMessages((prev) => [...prev, newMsg]);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messageCount: c.messageCount + 1,
              updatedAt: now,
            }
          : c
      )
    );

    if (user && user.emailVerified) {
      try {
        await setDoc(doc(db, 'messages', id), {
          userId: uid,
          conversationId,
          role,
          content: cleanContent,
          detectedLanguage: detected,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `messages/${id}`);
      }
    }
  };

  const deleteConversation = async (id: string) => {
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (activeConversationId === id && remaining.length > 0) {
        setActiveConversationId(remaining[0].id);
      }
      return remaining;
    });
    setMessages((prev) => prev.filter((m) => m.conversationId !== id));

    if (user && user.emailVerified) {
      try {
        await deleteDoc(doc(db, 'conversations', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `conversations/${id}`);
      }
    }
  };

  const createAgentTask = async (title: string, goal: string): Promise<string> => {
    const taskId = sanitizeId(`task-${Date.now()}`);
    const now = new Date().toISOString();
    const uid = user?.uid || 'workspace-user';
    const plannedSteps = buildAgentWorkflowSteps(goal, taskId);
    const { progress, status } = calculateTaskProgress(plannedSteps);

    const newTask: AgentTaskRecord = {
      id: taskId,
      userId: uid,
      title: truncateString(title || goal.slice(0, 80), 200),
      goal: truncateString(goal, 2000),
      status,
      progress,
      requiresApproval: plannedSteps.some((s) => s.isSensitive),
      createdAt: now,
      updatedAt: now,
    };

    const newSteps: TaskStepRecord[] = plannedSteps.map((s) => ({
      ...s,
      userId: uid,
      taskId,
      createdAt: now,
      updatedAt: now,
    }));

    setAgentTasks((prev) => [newTask, ...prev]);
    setTaskSteps((prev) => [...newSteps, ...prev]);

    if (user && user.emailVerified) {
      try {
        await setDoc(doc(db, 'agent_tasks', taskId), {
          userId: uid,
          title: newTask.title,
          goal: newTask.goal,
          status: newTask.status,
          progress: newTask.progress,
          requiresApproval: newTask.requiresApproval,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        for (const step of newSteps) {
          await setDoc(doc(db, 'task_steps', step.id), {
            userId: uid,
            taskId,
            stepIndex: step.stepIndex,
            title: truncateString(step.title, 200),
            toolName: truncateString(step.toolName, 64),
            status: step.status,
            isSensitive: step.isSensitive,
            output: truncateString(step.output, 5000),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `agent_tasks/${taskId}`);
      }
    }

    return taskId;
  };

  const updateStepState = async (
    stepId: string,
    status: TaskStepRecord['status'],
    output: string
  ) => {
    const now = new Date().toISOString();
    let targetTaskId = '';

    setTaskSteps((prev) => {
      const updated = prev.map((s) => {
        if (s.id === stepId) {
          targetTaskId = s.taskId;
          return {
            ...s,
            status,
            output: truncateString(output, 5000),
            updatedAt: now,
          };
        }
        return s;
      });

      if (targetTaskId) {
        const taskSpecificSteps = updated.filter((s) => s.taskId === targetTaskId);
        const calc = calculateTaskProgress(taskSpecificSteps);
        setAgentTasks((tasks) =>
          tasks.map((t) =>
            t.id === targetTaskId
              ? { ...t, progress: calc.progress, status: calc.status, updatedAt: now }
              : t
          )
        );
      }

      return updated;
    });

    if (user && user.emailVerified) {
      try {
        await updateDoc(doc(db, 'task_steps', stepId), {
          status,
          output: truncateString(output, 5000),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `task_steps/${stepId}`);
      }
    }
  };

  const addUploadedFileRecord = async (
    file: Omit<UploadedFileRecord, 'id' | 'userId' | 'createdAt'>
  ): Promise<UploadedFileRecord> => {
    const id = sanitizeId(`file-${Date.now()}`);
    const now = new Date().toISOString();
    const uid = user?.uid || 'workspace-user';
    const record: UploadedFileRecord = {
      id,
      userId: uid,
      fileName: truncateString(file.fileName, 255),
      mimeType: truncateString(file.mimeType, 100),
      sizeBytes: Math.min(Math.max(0, file.sizeBytes), 20971520),
      summary: truncateString(file.summary, 10000),
      extractedText: truncateString(file.extractedText, 20000),
      createdAt: now,
    };

    setUploadedFiles((prev) => [record, ...prev]);

    if (user && user.emailVerified) {
      try {
        await setDoc(doc(db, 'uploaded_files', id), {
          userId: uid,
          fileName: record.fileName,
          mimeType: record.mimeType,
          sizeBytes: record.sizeBytes,
          summary: record.summary,
          extractedText: record.extractedText,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `uploaded_files/${id}`);
      }
    }

    return record;
  };

  const addSearchHistoryRecord = async (
    record: Omit<SearchHistoryRecord, 'id' | 'userId' | 'createdAt'>
  ) => {
    const id = sanitizeId(`search-${Date.now()}`);
    const now = new Date().toISOString();
    const uid = user?.uid || 'workspace-user';
    const item: SearchHistoryRecord = {
      id,
      userId: uid,
      query: truncateString(record.query, 500),
      summary: truncateString(record.summary, 15000),
      sourceCount: Math.min(Math.max(0, record.sourceCount), 100),
      sources: record.sources || [],
      confidence: truncateString(record.confidence, 64),
      createdAt: now,
    };

    setSearchHistory((prev) => [item, ...prev]);

    if (user && user.emailVerified) {
      try {
        await setDoc(doc(db, 'search_history', id), {
          userId: uid,
          query: item.query,
          summary: item.summary,
          sourceCount: item.sourceCount,
          confidence: item.confidence,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `search_history/${id}`);
      }
    }
  };

  const recordUsage = async (
    feature: string,
    model: string,
    tokensUsed: number,
    latencyMs: number
  ) => {
    const id = sanitizeId(`usage-${Date.now()}`);
    const now = new Date().toISOString();
    const uid = user?.uid || 'workspace-user';
    const item: UsageRecordItem = {
      id,
      userId: uid,
      feature: truncateString(feature, 64),
      model: truncateString(model, 64),
      tokensUsed: Math.max(1, Math.round(tokensUsed)),
      latencyMs: Math.max(1, Math.round(latencyMs)),
      createdAt: now,
    };

    setUsageRecords((prev) => [item, ...prev]);

    if (user && user.emailVerified) {
      try {
        await setDoc(doc(db, 'usage_records', id), {
          userId: uid,
          feature: item.feature,
          model: item.model,
          tokensUsed: item.tokensUsed,
          latencyMs: item.latencyMs,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `usage_records/${id}`);
      }
    }
  };

  const recordAuditLog = async (
    action: string,
    module: string,
    severity: 'info' | 'warning' | 'high',
    details: string
  ) => {
    const id = sanitizeId(`audit-${Date.now()}`);
    const now = new Date().toISOString();
    const uid = user?.uid || 'workspace-user';
    const item: AuditLogItem = {
      id,
      userId: uid,
      action: truncateString(action, 120),
      module: truncateString(module, 64),
      severity,
      details: truncateString(details, 1000),
      createdAt: now,
    };

    setAuditLogs((prev) => [item, ...prev]);

    if (user && user.emailVerified) {
      try {
        await setDoc(doc(db, 'audit_logs', id), {
          userId: uid,
          action: item.action,
          module: item.module,
          severity: item.severity,
          details: item.details,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `audit_logs/${id}`);
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        activePage,
        setActivePage,
        theme,
        toggleTheme,
        selectedLanguage,
        setSelectedLanguage,
        user,
        authReady,
        aiStatus,
        authError,
        signInWithGoogle,
        signOutUser,
        profile,
        updateProfileSettings,
        conversations,
        activeConversationId,
        setActiveConversationId,
        messages,
        createNewConversation,
        appendChatMessage,
        deleteConversation,
        agentTasks,
        taskSteps,
        createAgentTask,
        updateStepState,
        uploadedFiles,
        addUploadedFileRecord,
        searchHistory,
        addSearchHistoryRecord,
        usageRecords,
        recordUsage,
        auditLogs,
        recordAuditLog,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
