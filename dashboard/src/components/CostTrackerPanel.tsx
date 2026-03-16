import React, { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Cpu,
  Users,
  Calendar,
} from "lucide-react";

interface ModelUsage {
  model: string;
  provider: string;
  tokens: number;
  costUsd: number;
  calls: number;
}

interface DailyUsage {
  date: string;
  costUsd: number;
  tokens: number;
}

interface UserUsage {
  userId: string;
  costUsd: number;
  tokens: number;
  sessions: number;
}

// Demo data for the Cost Tracker dashboard panel
const DEMO_DAILY: DailyUsage[] = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  const cost = Math.random() * 0.5 + 0.05;
  const tokens = Math.floor(cost * 80000);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    costUsd: parseFloat(cost.toFixed(4)),
    tokens,
  };
});

const DEMO_MODELS: ModelUsage[] = [
  { model: "claude-3-5-sonnet-20241022", provider: "Anthropic", tokens: 128400, costUsd: 0.7062, calls: 84 },
  { model: "gpt-4o", provider: "OpenAI", tokens: 54200, costUsd: 1.084, calls: 32 },
  { model: "gpt-4o-mini", provider: "OpenAI", tokens: 92600, costUsd: 0.0695, calls: 210 },
  { model: "claude-3-haiku-20240307", provider: "Anthropic", tokens: 76800, costUsd: 0.096, calls: 145 },
  { model: "whisper-1", provider: "OpenAI", tokens: 18000, costUsd: 0.108, calls: 18 },
];

const DEMO_USERS: UserUsage[] = [
  { userId: "user-1 (Kunj)", costUsd: 1.24, tokens: 185000, sessions: 42 },
  { userId: "user-2 (Alex)", costUsd: 0.56, tokens: 84200, sessions: 18 },
  { userId: "user-3 (Sam)", costUsd: 0.28, tokens: 41600, sessions: 9 },
];

export default function CostTrackerPanel() {
  const [period, setPeriod] = useState<"7d" | "14d" | "30d">("14d");

  const displayDays = period === "7d" ? 7 : period === "14d" ? 14 : 30;
  const displayData = DEMO_DAILY.slice(-Math.min(displayDays, DEMO_DAILY.length));

  const totals = useMemo(() => {
    const totalCost = displayData.reduce((acc, d) => acc + d.costUsd, 0);
    const totalTokens = displayData.reduce((acc, d) => acc + d.tokens, 0);
    const avgDailyCost = totalCost / displayData.length;
    const prevCost = DEMO_DAILY.slice(0, DEMO_DAILY.length - displayData.length).reduce(
      (acc, d) => acc + d.costUsd,
      0
    );
    const trend = prevCost > 0 ? ((totalCost - prevCost) / prevCost) * 100 : 0;
    return { totalCost, totalTokens, avgDailyCost, trend };
  }, [displayData]);

  const maxDailyCost = Math.max(...displayData.map((d) => d.costUsd));

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">Cost Tracker</h2>
        </div>

        <div className="flex items-center gap-2">
          {(["7d", "14d", "30d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? "bg-primary-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Cost"
          value={`$${totals.totalCost.toFixed(4)}`}
          sub={`${period} period`}
          color="text-emerald-400"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatCard
          label="Total Tokens"
          value={totals.totalTokens.toLocaleString()}
          sub="all models"
          color="text-violet-400"
          icon={<Cpu className="w-4 h-4" />}
        />
        <StatCard
          label="Avg Daily Cost"
          value={`$${totals.avgDailyCost.toFixed(4)}`}
          sub="per day"
          color="text-amber-400"
          icon={<Calendar className="w-4 h-4" />}
        />
        <StatCard
          label="Trend"
          value={`${totals.trend >= 0 ? "+" : ""}${totals.trend.toFixed(1)}%`}
          sub="vs prev period"
          color={totals.trend < 0 ? "text-green-400" : "text-red-400"}
          icon={
            totals.trend < 0 ? (
              <TrendingDown className="w-4 h-4" />
            ) : (
              <TrendingUp className="w-4 h-4" />
            )
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Daily cost chart */}
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary-400" />
            Daily Spend (USD)
          </h3>
          <div className="flex items-end gap-1 h-24 mb-2">
            {displayData.map((d, i) => (
              <div
                key={i}
                className="flex-1 group relative"
                style={{ height: "100%" }}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 bg-primary-500/70 rounded-sm hover:bg-primary-400/90 transition-colors cursor-default"
                  style={{
                    height: `${Math.max(2, (d.costUsd / maxDailyCost) * 100)}%`,
                  }}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {d.date}: ${d.costUsd.toFixed(4)}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>{displayData[0]?.date}</span>
            <span>{displayData[displayData.length - 1]?.date}</span>
          </div>
        </div>

        {/* Token breakdown */}
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-violet-400" />
            Token Trend
          </h3>
          <div className="flex items-end gap-1 h-24 mb-2">
            {displayData.map((d, i) => {
              const maxTok = Math.max(...displayData.map((dd) => dd.tokens));
              return (
                <div
                  key={i}
                  className="flex-1 group relative"
                  style={{ height: "100%" }}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-violet-500/60 rounded-sm hover:bg-violet-400/80 transition-colors cursor-default"
                    style={{
                      height: `${Math.max(2, (d.tokens / maxTok) * 100)}%`,
                    }}
                  />
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {d.date}: {d.tokens.toLocaleString()} tok
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>{displayData[0]?.date}</span>
            <span>{displayData[displayData.length - 1]?.date}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Model breakdown */}
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            Cost by Model
          </h3>
          <div className="space-y-3">
            {DEMO_MODELS.sort((a, b) => b.costUsd - a.costUsd).map((m) => {
              const maxCost = Math.max(...DEMO_MODELS.map((mm) => mm.costUsd));
              const pct = (m.costUsd / maxCost) * 100;
              return (
                <div key={m.model}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300 truncate max-w-[160px]">
                      {m.model}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-slate-500">
                        {m.tokens.toLocaleString()} tok
                      </span>
                      <span className="text-emerald-400 font-medium">
                        ${m.costUsd.toFixed(4)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-emerald-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* User breakdown */}
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" />
            Cost by User
          </h3>
          <div className="space-y-4">
            {DEMO_USERS.map((u) => (
              <div
                key={u.userId}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-slate-200">{u.userId}</p>
                  <p className="text-xs text-slate-500">
                    {u.tokens.toLocaleString()} tokens · {u.sessions} sessions
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-emerald-400">
                    ${u.costUsd.toFixed(4)}
                  </p>
                  <p className="text-xs text-slate-500">
                    ${(u.costUsd / u.sessions).toFixed(4)}/session
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
      <div className="flex items-center gap-2 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  );
}
