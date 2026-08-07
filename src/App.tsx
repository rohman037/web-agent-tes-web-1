import React, { useState, useEffect } from 'react';
import LoginView from './components/views/LoginView';
import PaketAksesView from './components/views/PaketAksesView';
import AdminDashboardView from './components/views/AdminDashboardView';
import UserLayout from './components/layouts/UserLayout';
import { getUserSession, logoutUser, UserSession } from './lib/auth';
import { initAutoTrainerScheduler } from './agents/autoTrainer';

export default function App() {
  useEffect(() => {
    initAutoTrainerScheduler();
  }, []);
  const [session, setSession] = useState<UserSession | null>(() => {
    const current = getUserSession();
    if (current && current.code === 'GUEST-ACCESS') {
      logoutUser();
      return null;
    }
    return current;
  });

  const [publicView, setPublicView] = useState<'login' | 'pricing'>('login');
  const [adminViewMode, setAdminViewMode] = useState<'admin_dashboard' | 'workspace'>('admin_dashboard');

  const handleLogout = () => {
    logoutUser();
    setSession(null);
    setPublicView('login');
  };

  // Proteksi: Jika belum ada session resmi atau terdeteksi guest access, render tampilan publik
  if (!session || session.code === 'GUEST-ACCESS') {
    if (publicView === 'pricing') {
      return (
        <div className="min-h-screen bg-[#fcf8ff] p-4 sm:p-8">
          <PaketAksesView
            onBackToLogin={() => setPublicView('login')}
            onSuccessLogin={() => {
              const current = getUserSession();
              if (current && current.code !== 'GUEST-ACCESS') {
                setSession(current);
                setPublicView('login');
              }
            }}
          />
        </div>
      );
    }

    return (
      <LoginView
        onLoginSuccess={(s) => {
          if (s.code !== 'GUEST-ACCESS') {
            setSession(s);
            setPublicView('login');
          }
        }}
        onOpenPaketAkses={() => {
          setPublicView('pricing');
        }}
      />
    );
  }

  // Tampilan Admin Dashboard
  if (session.role === 'admin' && adminViewMode === 'admin_dashboard') {
    return (
      <AdminDashboardView
        onGoToWorkspace={() => setAdminViewMode('workspace')}
        onLogout={handleLogout}
        onOpenApiKeySettings={() => setAdminViewMode('workspace')}
      />
    );
  }

  // Workspace User Layout (Hanya untuk pengguna terautentikasi resmi)
  return (
    <UserLayout
      session={session}
      onLogout={handleLogout}
      onGoToAdmin={session.role === 'admin' ? () => setAdminViewMode('admin_dashboard') : undefined}
    />
  );
}
