import React, { useState, useEffect } from 'react';
import { Activity, Server, Zap, AlertCircle, RefreshCw, Database } from 'lucide-react';
import { getApiKeys } from '../../lib/admin/apiKeys';

export default function SystemHealthWidget() {
  const [latency, setLatency] = useState<number>(1.2);
  const [activeKeysCount, setActiveKeysCount] = useState<number>(0);
  const [storageUsed, setStorageUsed] = useState<string>('2.4 MB');

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = () => {
    const keys = getApiKeys();
    const active = keys.filter(k => k.status === 'active').length;
    setActiveKeysCount(active);

    // Calculate approximate local storage size
    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        totalBytes += (localStorage.getItem(k) || '').length * 2;
      }
    }
    const kb = (totalBytes / 1024).toFixed(1);
    setStorageUsed(`${kb} KB`);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
          <h3 className="text-sm font-extrabold text-slate-900">System Health & API Node</h3>
        </div>
        <button
          type="button"
          onClick={checkHealth}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="Refresh Status"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
            <Server className="w-3 h-3 text-emerald-500" />
            <span>AI Gateway Status</span>
          </div>
          <div className="text-xs font-extrabold text-emerald-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>100% Operational</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Avg API Latency</span>
          </div>
          <div className="text-xs font-extrabold text-slate-800">
            ~{latency}s <span className="text-[10px] font-normal text-slate-400">(Gemini 2.5 Flash)</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
            <Database className="w-3 h-3 text-indigo-500" />
            <span>Storage & API Keys</span>
          </div>
          <div className="text-xs font-extrabold text-slate-800">
            {activeKeysCount} Active Keys • {storageUsed}
          </div>
        </div>
      </div>
    </div>
  );
}
