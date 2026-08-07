import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  LogOut, 
  Users, 
  Tag, 
  Zap, 
  Key, 
  QrCode, 
  Clock, 
  BarChart2, 
  Bot,
  Brain,
  MessageSquare,
  Sparkles,
  Radio,
  Activity
} from 'lucide-react';
import ErrorBoundary from '../../components/admin/ErrorBoundary';
import DashboardOverviewPanel from './DashboardOverviewPanel';
import ClientMonitoringPanel from './ClientMonitoringPanel';
import PackagePricingPanel from './PackagePricingPanel';
import CustomAccessPanel from './CustomAccessPanel';
import ApiKeyManagementPanel from './ApiKeyManagementPanel';
import QrisManagementPanel from './QrisManagementPanel';
import PaymentVerificationPanel from './PaymentVerificationPanel';
import ContactSettingsPanel from './ContactSettingsPanel';
import AiAgentPanel from './AiAgentPanel';
import LearningReviewPanel from './LearningReviewPanel';
import { logoutUser, MASTER_ADMIN_EMAIL } from '../../lib/auth';
import { subscribeLiveGenerationEvents, ActiveGenerationItem } from '../../events/generationEvent';

interface AdminDashboardViewProps {
  onGoToWorkspace: () => void;
  onLogout: () => void;
  onOpenApiKeySettings?: () => void;
}

export default function AdminDashboardView({
  onGoToWorkspace,
  onLogout
}: AdminDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'clients' | 'packages' | 'custom_access' | 'apikeys' | 'ai_agents' | 'safe_learning' | 'payment_queue' | 'qris' | 'contact'
  >('overview');

  const [liveActiveGenerations, setLiveActiveGenerations] = useState<ActiveGenerationItem[]>([]);
  const [isLiveStreamActive, setIsLiveStreamActive] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = subscribeLiveGenerationEvents((data) => {
      setIsLiveStreamActive(true);
      if (data.activeGenerations) {
        setLiveActiveGenerations(data.activeGenerations);
      } else if (data.type === 'active_status_update' && data.activeGenerations) {
        setLiveActiveGenerations(data.activeGenerations);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const activeGenCount = liveActiveGenerations.filter(g => g.status === 'generating' || g.status === 'analyzing').length;

  const navTabs = [
    { id: 'overview', label: 'Ringkasan', icon: BarChart2 },
    { id: 'clients', label: 'Monitoring Client', icon: Users },
    { id: 'packages', label: 'Manajemen Paket', icon: Tag },
    { id: 'custom_access', label: 'Akses Custom', icon: Zap },
    { id: 'apikeys', label: 'API Keys', icon: Key },
    { id: 'ai_agents', label: 'AI Agents', icon: Bot },
    { id: 'safe_learning', label: 'Safe Learning', icon: Brain },
    { id: 'payment_queue', label: 'Verifikasi Bayar', icon: Clock },
    { id: 'qris', label: 'Pengaturan QRIS', icon: QrCode },
    { id: 'contact', label: 'Pengaturan WA', icon: MessageSquare }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-[#3525cd] selection:text-white pb-16">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3525cd] to-indigo-500 text-white font-extrabold flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight">Console Admin Tools Satset</h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">{MASTER_ADMIN_EMAIL}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live SSE Stream Status Indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-emerald-300 text-[11px]">Live Push Stream</span>
              {activeGenCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 text-[10px] font-extrabold animate-bounce">
                  ⚡ {activeGenCount} User Active
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onGoToWorkspace}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Buka Workspace</span>
            </button>

            <button
              type="button"
              onClick={() => {
                logoutUser();
                onLogout();
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200/80 scrollbar-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#3525cd] text-white shadow-md'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Panels with Isolated Error Boundaries */}
        <div className="transition-all duration-200">
          {activeTab === 'overview' && (
            <ErrorBoundary panelName="Ringkasan Dashboard">
              <DashboardOverviewPanel onNavigateTab={(tab) => setActiveTab(tab as any)} />
            </ErrorBoundary>
          )}

          {activeTab === 'clients' && (
            <ErrorBoundary panelName="Monitoring Client">
              <ClientMonitoringPanel />
            </ErrorBoundary>
          )}

          {activeTab === 'packages' && (
            <ErrorBoundary panelName="Manajemen Paket & Harga">
              <PackagePricingPanel />
            </ErrorBoundary>
          )}

          {activeTab === 'custom_access' && (
            <ErrorBoundary panelName="Akses Custom">
              <CustomAccessPanel />
            </ErrorBoundary>
          )}

          {activeTab === 'apikeys' && (
            <ErrorBoundary panelName="Manajemen API Key">
              <ApiKeyManagementPanel />
            </ErrorBoundary>
          )}

          {activeTab === 'ai_agents' && (
            <ErrorBoundary panelName="Manajemen AI Agents">
              <AiAgentPanel />
            </ErrorBoundary>
          )}

          {activeTab === 'safe_learning' && (
            <ErrorBoundary panelName="Safe Learning & Review">
              <LearningReviewPanel />
            </ErrorBoundary>
          )}

          {activeTab === 'payment_queue' && (
            <ErrorBoundary panelName="Verifikasi Pembayaran">
              <PaymentVerificationPanel />
            </ErrorBoundary>
          )}

          {activeTab === 'qris' && (
            <ErrorBoundary panelName="Pengaturan QRIS">
              <QrisManagementPanel />
            </ErrorBoundary>
          )}

          {activeTab === 'contact' && (
            <ErrorBoundary panelName="Pengaturan WhatsApp & Kontak">
              <ContactSettingsPanel />
            </ErrorBoundary>
          )}
        </div>
      </main>
    </div>
  );
}
