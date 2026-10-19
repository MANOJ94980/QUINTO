import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { useStore } from '../core/useStore';

type CommandOption = {
  label: string;
  commandType: string;
  criticality: string;
};

const commands: Record<'grid' | 'rail' | 'av', CommandOption[]> = {
  grid: [
    { label: 'Trip breaker', commandType: 'TRIP_BREAKER', criticality: 'critical' },
    { label: 'Close breaker', commandType: 'CLOSE_BREAKER', criticality: 'critical' },
    { label: 'Load shed', commandType: 'LOAD_SHED', criticality: 'high' },
  ],
  rail: [
    { label: 'Movement authority', commandType: 'MOVEMENT_AUTHORITY', criticality: 'critical' },
    { label: 'Clear signal', commandType: 'SIGNAL_CLEAR', criticality: 'critical' },
    { label: 'Set points', commandType: 'POINT_SET', criticality: 'critical' },
    { label: 'Emergency stop', commandType: 'EMERGENCY_STOP', criticality: 'critical' },
  ],
  av: [
    { label: 'Brake command', commandType: 'BRAKE_COMMAND', criticality: 'critical' },
    { label: 'Signal phase', commandType: 'SIGNAL_PHASE', criticality: 'high' },
    { label: 'Speed limit update', commandType: 'SPEED_LIMIT_UPDATE', criticality: 'high' },
    { label: 'HD map update', commandType: 'HD_MAP_UPDATE', criticality: 'routine' },
  ],
};

const scenarioLabels = {
  grid: 'Power grid dispatch',
  rail: 'Rail operations dispatch',
  av: 'Autonomous fleet dispatch',
};

export const SenderControls: React.FC = () => {
  const scenario = useStore((state) => state.scenario);
  const lane = useStore((state) => state.lane);
  const [sendingCommand, setSendingCommand] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; success: boolean } | null>(null);

  const sendCommand = async (command: CommandOption) => {
    setSendingCommand(command.commandType);
    setResult(null);

    try {
      const response = await fetch('/api/frame/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario,
          command_type: command.commandType,
          criticality: command.criticality,
          lane,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || `Hub returned HTTP ${response.status}`);
      }

      setResult({
        message: data.message || `Command ${String(data.status || 'received').toLowerCase()}.`,
        success: data.status === 'SUCCESS',
      });
    } catch (error) {
      setResult({
        message: error instanceof Error ? error.message : 'Could not connect to the hub.',
        success: false,
      });
    } finally {
      setSendingCommand(null);
    }
  };

  return (
    <section className="absolute z-30 bottom-4 right-4 w-[min(22rem,calc(100%-2rem))] max-h-[calc(100%-5rem)] overflow-y-auto rounded-lg border border-cyan-500/30 bg-[#080d16]/95 p-4 text-white shadow-2xl backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-gray-700/70 pb-3">
        <div>
          <h2 className="font-orbitron text-sm font-bold text-cyan-300">Sender Dispatch</h2>
          <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-gray-400">
            {scenarioLabels[scenario]} · {lane === 'qgs' ? 'QGS lane' : 'Classical lane'}
          </p>
        </div>
        <Send className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {commands[scenario].map((command) => {
          const isSending = sendingCommand === command.commandType;
          return (
            <button
              key={command.commandType}
              type="button"
              disabled={sendingCommand !== null}
              onClick={() => void sendCommand(command)}
              className="flex min-h-11 items-center justify-center gap-2 rounded border border-cyan-700/70 bg-[#101b2b] px-2 py-2 text-center text-xs font-semibold transition hover:border-cyan-400 hover:bg-cyan-950/70 disabled:cursor-wait disabled:opacity-60"
            >
              {isSending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              <span>{command.label}</span>
            </button>
          );
        })}
      </div>

      {sendingCommand && (
        <p className="mt-3 text-xs font-mono text-cyan-300" role="status">
          Sending command to hub…
        </p>
      )}
      {result && (
        <p
          className={`mt-3 border-l-2 py-1 pl-2 text-xs font-mono ${result.success ? 'border-emerald-400 text-emerald-300' : 'border-amber-400 text-amber-300'}`}
          role="status"
        >
          {result.message}
        </p>
      )}
    </section>
  );
};