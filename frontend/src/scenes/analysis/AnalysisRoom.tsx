import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, ScatterChart, Scatter, ZAxis, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

export const AnalysisRoom: React.FC = () => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<'qber' | 'detection' | 'forgery' | 'latency' | 'scenario'>('qber');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch('/api/results');
        const data = await res.json();
        setResults(data);
      } catch (e) {
        console.error('Failed to load experiment results:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const chartTabs = [
    { id: 'qber', label: 'QBER vs Intercept' },
    { id: 'detection', label: 'Detection Prob' },
    { id: 'forgery', label: 'Forgery Outcomes' },
    { id: 'latency', label: 'Latency Overhead' },
    { id: 'scenario', label: 'Scenario Outcomes' },
  ] as const;

  const CHART_COLORS = {
    cyan: '#00f0ff',
    green: '#00ff88',
    yellow: '#ffbb00',
    red: '#ff0055',
    purple: '#aa00ff',
  };

  const tooltipStyle = {
    backgroundColor: '#0c1424',
    border: '1px solid #00f0ff44',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '11px',
    fontFamily: 'Fira Code, monospace'
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#080b11] overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#080b11]/95 border-b border-gray-800 px-6 pt-16 pb-3">
        <h2 className="font-orbitron text-xl font-bold text-cyan-300 mb-3">
          Analysis Room — Security Experiment Benchmarks
        </h2>
        <div className="flex gap-2 flex-wrap">
          {chartTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveChart(tab.id as any)}
              className={`px-3 py-1.5 rounded font-mono text-xs font-bold transition border ${
                activeChart === tab.id
                  ? 'bg-cyan-600 border-cyan-400 text-white'
                  : 'bg-[#0e1624] border-gray-700 text-gray-400 hover:text-cyan-300 hover:border-cyan-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-cyan-400 font-mono animate-pulse">Loading Qiskit simulation results…</div>
          </div>
        )}

        {!loading && results && activeChart === 'qber' && (
          <div className="space-y-4">
            <h3 className="font-orbitron text-sm text-cyan-400 font-bold">
              QBER vs Eve Intercept Percentage — Clopper-Pearson 95% Confidence Bound
            </h3>
            <p className="text-xs text-gray-400 font-mono">
              At 100% intercept, raw QBER stabilises at ~25%. Confidence bound stays above 11% threshold triggering COMPROMISED state.
            </p>
            <div className="glass-panel rounded-xl p-4" style={{ height: 380 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={results.qber_vs_intercept}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
                  <XAxis dataKey="intercept_pct" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }}
                    label={{ value: 'Eve Intercept %', position: 'insideBottom', offset: -4, fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis domain={[0, 0.35]} stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }}
                    label={{ value: 'QBER', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 11 }} />
                  <Line type="monotone" dataKey="raw_qber" name="Raw QBER" stroke={CHART_COLORS.green} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="qber_bound" name="95% C.I. Upper Bound" stroke={CHART_COLORS.red} strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {!loading && results && activeChart === 'detection' && (
          <div className="space-y-4">
            <h3 className="font-orbitron text-sm text-cyan-400 font-bold">
              Detection Probability vs Sample Size
            </h3>
            <p className="text-xs text-gray-400 font-mono">
              P_detect = 1 − (1 − 0.25·i)^n. At n=400 and 100% intercept, detection probability ≈ 1.000000.
            </p>
            <div className="glass-panel rounded-xl p-4" style={{ height: 380 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={results.detection_prob_vs_sample}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
                  <XAxis dataKey="sample_size" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis domain={[0, 1]} stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 11 }} />
                  <Line type="monotone" dataKey="p_detect_100pct" name="100% Intercept" stroke={CHART_COLORS.red} strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="p_detect_50pct" name="50% Intercept" stroke={CHART_COLORS.yellow} strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="p_detect_20pct" name="20% Intercept" stroke={CHART_COLORS.cyan} strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {!loading && results && activeChart === 'forgery' && (
          <div className="space-y-4">
            <h3 className="font-orbitron text-sm text-cyan-400 font-bold">
              Forgeries Accepted vs Rejected — Classical RSA vs QGridShield Hybrid
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-panel rounded-xl p-4" style={{ height: 320 }}>
                <h4 className="text-xs font-mono text-red-400 font-bold mb-2">Classical RSA Lane (UNSAFE)</h4>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={results.forgery_benchmark}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
                    <XAxis dataKey="attack_type" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="classical_accepted" name="Accepted (UNSAFE)" fill={CHART_COLORS.red} />
                    <Bar dataKey="classical_rejected" name="Rejected" fill={CHART_COLORS.green} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="glass-panel rounded-xl p-4" style={{ height: 320 }}>
                <h4 className="text-xs font-mono text-emerald-400 font-bold mb-2">QGridShield Hybrid Lane (SAFE)</h4>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={results.forgery_benchmark}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
                    <XAxis dataKey="attack_type" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="qgs_accepted" name="Accepted (SAFE)" fill={CHART_COLORS.green} />
                    <Bar dataKey="qgs_rejected" name="Rejected (SAFE)" fill={CHART_COLORS.cyan} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {!loading && results && activeChart === 'latency' && (
          <div className="space-y-4">
            <h3 className="font-orbitron text-sm text-cyan-400 font-bold">Latency & Overhead Comparison</h3>
            <div className="glass-panel rounded-xl p-4" style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={results.latency_overhead} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis type="category" dataKey="metric" width={190} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 11 }} />
                  <Bar dataKey="classical_rsa" name="Classical RSA" fill={CHART_COLORS.red} />
                  <Bar dataKey="qgs_qkd_pqc" name="QGS Hybrid (QKD+PQC)" fill={CHART_COLORS.cyan} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {!loading && results && activeChart === 'scenario' && (
          <div className="space-y-4">
            <h3 className="font-orbitron text-sm text-cyan-400 font-bold">Per-Scenario Command Outcomes Under Attack</h3>
            <div className="grid grid-cols-1 gap-4">
              {results.scenario_outcomes.map((item: any, idx: number) => (
                <div key={idx} className="glass-panel rounded-xl p-4 border border-gray-800">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                      {item.scenario.toUpperCase()}
                    </span>
                    <span className="font-mono text-sm font-bold text-gray-200">{item.command}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#1a0f0f] p-3 rounded border border-red-900">
                      <p className="text-[10px] font-mono text-red-400 font-bold mb-1">❌ CLASSICAL RSA OUTCOME</p>
                      <p className="text-xs text-red-300">{item.classical_outcome}</p>
                    </div>
                    <div className="bg-[#0a1a0f] p-3 rounded border border-emerald-900">
                      <p className="text-[10px] font-mono text-emerald-400 font-bold mb-1">✅ QGRIDSHIELD OUTCOME</p>
                      <p className="text-xs text-emerald-300">{item.qgs_outcome}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
