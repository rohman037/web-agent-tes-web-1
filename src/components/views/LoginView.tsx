import React, { useState, useEffect } from 'react';
import { Key, ArrowRight, HelpCircle, Lock, ShieldCheck, Headphones, Sparkles, Lightbulb, Video, Camera, Crop, MessageCircle } from 'lucide-react';
import { verifyAccessCode, setUserSession, UserSession } from '../../lib/auth';
import { getWhatsAppUrl, syncContactSettingsWithBackend } from '../../lib/admin/contactSettings';

interface LoginViewProps {
  onLoginSuccess: (session: UserSession) => void;
  onOpenPaketAkses?: () => void;
}

export default function LoginView({ onLoginSuccess, onOpenPaketAkses }: LoginViewProps) {
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    syncContactSettingsWithBackend();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const res = verifyAccessCode(accessCodeInput);
      if (res.success && res.role) {
        const session: UserSession = {
          code: res.code || accessCodeInput,
          role: res.role,
          email: res.email,
          loginTime: Date.now(),
        };
        setUserSession(session);
        onLoginSuccess(session);
      } else {
        setErrorMsg(res.error || 'Kode Akses tidak valid.');
      }
      setIsSubmitting(false);
    }, 400);
  };

  const openWhatsApp = () => {
    const url = getWhatsAppUrl();
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#fcf8ff] text-[#1b1b24] flex flex-col font-sans selection:bg-[#4f46e5] selection:text-white">
      {/* Header */}
      <header className="w-full h-20 shrink-0 border-b border-transparent relative z-10">
        <div className="h-full max-w-7xl mx-auto px-4 md:px-10 flex justify-between items-center">
          <div className="text-2xl font-extrabold text-[#3525cd] tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#3525cd] text-white flex items-center justify-center text-sm font-black shadow-md shadow-indigo-200">
              TS
            </span>
            <span>Tools Satset</span>
          </div>

          <button
            type="button"
            onClick={openWhatsApp}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#3525cd] transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Bantuan</span>
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-grow flex items-center justify-center py-8 px-4 md:px-10 relative z-0">
        <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
          {/* Left Column: Visual Brand */}
          <div className="hidden md:flex flex-col gap-8 pr-4 lg:pr-8">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-[#1b1b24] leading-tight tracking-tight">
              Buat lebih banyak konten dari satu video
            </h1>

            {/* Graphic / Visual Element */}
            <div className="w-full aspect-[4/3] rounded-[24px] bg-gradient-to-br from-indigo-900 via-[#3525cd] to-purple-800 relative overflow-hidden flex items-center justify-center p-8 shadow-xl shadow-indigo-100 border border-indigo-200/40">
              {/* Background ambient lighting */}
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-indigo-400/30 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-purple-400/30 rounded-full blur-3xl" />

              <div className="relative z-10 text-center text-white space-y-4 max-w-md">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
                  <Sparkles className="w-8 h-8 text-amber-300" />
                </div>
                <h3 className="text-xl font-bold">Workspace AI All-in-One</h3>
                <p className="text-xs text-indigo-100/90 leading-relaxed font-normal">
                  Generator Ide Konten, Video-to-Prompt, Prompt Foto Nano Banana Ultra, dan Frame Extractor dalam satu platform satset.
                </p>
              </div>
            </div>

            {/* Feature Points Bento-style */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#3525cd]">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div className="font-bold text-sm text-slate-900">Ide konten</div>
              </div>

              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Video className="w-5 h-5" />
                </div>
                <div className="font-bold text-sm text-slate-900">Prompt video</div>
              </div>

              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <Camera className="w-5 h-5" />
                </div>
                <div className="font-bold text-sm text-slate-900">Prompt foto</div>
              </div>

              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                  <Crop className="w-5 h-5" />
                </div>
                <div className="font-bold text-sm text-slate-900">Ekstraksi frame</div>
              </div>
            </div>
          </div>

          {/* Right Column: Login Form Panel */}
          <div className="w-full max-w-md mx-auto md:mr-0 md:ml-auto">
            <div className="bg-white rounded-[24px] shadow-xl shadow-indigo-100/50 border border-slate-200/80 p-8 md:p-10 flex flex-col gap-6 relative overflow-hidden">
              {/* Decorative ambient blur top right */}
              <div className="absolute -top-16 -right-16 w-32 h-32 bg-indigo-200/40 blur-3xl rounded-full pointer-events-none" />

              <div className="flex flex-col gap-1.5 relative z-10">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1b1b24] tracking-tight">
                  Masuk ke workspace Anda
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Gunakan Kode Akses Anda untuk melanjutkan.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="access_code">
                    Kode Akses
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Key className="w-4 h-4" />
                    </span>
                    <input
                      id="access_code"
                      type="text"
                      value={accessCodeInput}
                      onChange={(e) => setAccessCodeInput(e.target.value)}
                      placeholder="Masukkan kode akses Anda"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-sm placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#3525cd] focus:border-[#3525cd] transition-all outline-none"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-[#3525cd] hover:bg-[#2c1eb3] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-300/40 cursor-pointer disabled:opacity-60"
                >
                  <span>{isSubmitting ? 'Memverifikasi...' : 'Masuk ke aplikasi'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="flex flex-col gap-4 relative z-10 pt-2 border-t border-slate-100">
                {onOpenPaketAkses && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={onOpenPaketAkses}
                      className="text-xs text-[#3525cd] font-bold hover:underline cursor-pointer"
                    >
                      Belum punya kode akses? Lihat paket akses
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="h-px bg-slate-200 flex-grow" />
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">atau</span>
                  <div className="h-px bg-slate-200 flex-grow" />
                </div>

                {/* WhatsApp Consultation Button */}
                <button
                  type="button"
                  onClick={openWhatsApp}
                  className="w-full py-3 rounded-xl border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/60 text-[#25D366] font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span>Konsultasi melalui WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full shrink-0 border-t border-slate-200/60 bg-white/80 backdrop-blur-sm mt-auto py-4 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex justify-center items-center">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Akses aman</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300 hidden sm:block" />
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Tanpa password</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300 hidden sm:block" />
            <span className="flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5 text-slate-400" />
              <span>Bantuan langsung</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
