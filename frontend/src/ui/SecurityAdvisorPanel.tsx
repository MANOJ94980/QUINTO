import React from 'react';
import { useStore } from '../core/useStore';
import { AlertTriangle, ShieldAlert, CheckCircle, RefreshCw, XCircle } from 'lucide-react';

export const SecurityAdvisorPanel: React.FC = () => {
  const activeAlert = useStore((s) => s.activeAlert);
  const setActiveAlert = useStore((s) => s.setActiveAlert);

  if (!activeAlert) return null;

  const handleConfirmAction = async (actionId: string) => {
    try {
      const res = await fetch('/api/advisor/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_id: activeAlert.alert_id,
          action_id: actionId,
          operator_id: 'Alice_Operator'
        })
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setActiveAlert(null);
      }
    } catch (err) {
      console.error("Advisor confirm error:", err);
    }
  };

  return (
    <div className="absolute top-16 right-6 z-50 w-96 glass-panel rounded-xl p-4 border-l-4 border-l-[#ff0055] text-white shadow-2xl animate-fade-in">
      <div className="flex items-center justify-between border-b border-gray-700/60 pb-3 mb-3">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-6 h-6 text-[#ff0055] animate-pulse" />
          <h3 className="font-orbitron font-bold text-sm tracking-wide text-red-400">
            SECURITY ADVISOR ALERT
          </h3>
        </div>
        <button 
          onClick={() => setActiveAlert(null)}
          className="text-gray-400 hover:text-white transition"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-3">
        <div className="text-xs font-mono font-semibold text-yellow-400 mb-1 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 inline" />
          {activeAlert.title}
        </div>
        <p className="text-xs text-gray-300 leading-relaxed bg-[#0a0f18]/80 p-2 rounded border border-red-500/20">
          {activeAlert.description}
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
          Recommended Mitigation Actions:
        </div>
        {activeAlert.tips && activeAlert.tips.map((tip: any) => (
          <div 
            key={tip.action_id}
            className="p-2.5 rounded bg-[#162032] border border-cyan-500/30 hover:border-cyan-400 transition group flex flex-col space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-200 group-hover:text-cyan-300">
                {tip.title}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                {tip.severity}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 leading-tight">
              {tip.explanation}
            </p>
            <button
              onClick={() => handleConfirmAction(tip.action_id)}
              className="mt-1 w-full bg-cyan-600/80 hover:bg-cyan-500 text-white font-mono text-[11px] py-1 rounded flex items-center justify-center gap-1 font-semibold transition"
            >
              <CheckCircle className="w-3 h-3" />
              CONFIRM & EXECUTE
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
