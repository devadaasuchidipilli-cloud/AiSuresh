/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Cpu,
  Search,
  Mic,
  FileText,
  Code2,
  History,
  Settings,
  BarChart3,
  Shield,
  Sun,
  Moon,
  Menu,
  X,
  Home,
  LogIn,
} from 'lucide-react';
import { AppProvider, useApp, PageId } from './context/AppContext';
import { LandingPage, AuthPage } from './components/LandingAndAuth';
import { DashboardView, ChatView } from './components/DashboardAndChat';
import { AgentWorkspaceView, WebResearchView } from './components/AgentAndResearch';
import {
  VoiceAssistantView,
  FileIntelligenceView,
  CodingAssistantView,
} from './components/VoiceFilesCoding';
import {
  HistoryView,
  SettingsView,
  UsageDashboardView,
  AdminDashboardView,
} from './components/HistorySettingsUsageAdmin';

const NAV_ITEMS: { id: PageId; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'dashboard', label: 'AI Dashboard', icon: LayoutDashboard },
  { id: 'chat', label: 'Universal AI Chat', icon: MessageSquare },
  { id: 'agent', label: 'AI Agent Workspace', icon: Cpu },
  { id: 'research', label: 'Web Research', icon: Search },
  { id: 'voice', label: 'Voice Assistant', icon: Mic },
  { id: 'files', label: 'File Analysis', icon: FileText },
  { id: 'coding', label: 'Coding Assistant', icon: Code2 },
  { id: 'history', label: 'Conversation History', icon: History },
  { id: 'usage', label: 'Usage Dashboard', icon: BarChart3 },
  { id: 'settings', label: 'User Settings', icon: Settings },
  { id: 'admin', label: 'Admin Dashboard', icon: Shield },
];

const WorkspaceShell: React.FC = () => {
  const {
    activePage,
    setActivePage,
    theme,
    toggleTheme,
    selectedLanguage,
    user,
    profile,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (activePage === 'landing') {
    return <LandingPage />;
  }

  const currentNav = NAV_ITEMS.find((n) => n.id === activePage);

  const renderPage = () => {
    switch (activePage) {
      case 'auth':
        return <AuthPage />;
      case 'dashboard':
        return <DashboardView />;
      case 'chat':
        return <ChatView />;
      case 'agent':
        return <AgentWorkspaceView />;
      case 'research':
        return <WebResearchView />;
      case 'voice':
        return <VoiceAssistantView />;
      case 'files':
        return <FileIntelligenceView />;
      case 'coding':
        return <CodingAssistantView />;
      case 'history':
        return <HistoryView />;
      case 'settings':
        return <SettingsView />;
      case 'usage':
        return <UsageDashboardView />;
      case 'admin':
        return <AdminDashboardView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar Navigation (260px) */}
      <aside
        aria-label="Workspace Sidebar Navigation"
        className="hidden lg:flex flex-col justify-between w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2 pt-1">
            <button
              type="button"
              onClick={() => setActivePage('landing')}
              className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white font-display whitespace-nowrap"
            >
              Super AI Agent
            </button>
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActivePage(item.id)}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button
            type="button"
            onClick={() => setActivePage('landing')}
            className="w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Landing Page</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePage('auth')}
            className="w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-between gap-2"
          >
            <span className="truncate">
              {user ? user.displayName || profile.displayName : 'Sign In / Account'}
            </span>
            <LogIn className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Contextual Workspace Header (3-Zone SaaS Contract) */}
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
          {/* Left Breadcrumb + Mobile Menu Button */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Toggle Mobile Navigation"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              <span>Workspace</span>
              <span aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900 dark:text-white truncate">
                {currentNav?.label || 'Authentication'}
              </span>
              <span aria-hidden="true" className="hidden sm:inline">
                ·
              </span>
              <span className="hidden sm:inline text-blue-600 dark:text-blue-400">
                {selectedLanguage}
              </span>
            </div>
          </div>

          {/* Right Primary Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              aria-label={
                theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'
              }
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActivePage('auth')}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {user ? 'Account Synced' : 'Sign In'}
            </button>
          </div>
        </header>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile Navigation Drawer"
            className="lg:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActivePage(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <WorkspaceShell />
    </AppProvider>
  );
}
