import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  ChevronRight,
  Clock,
  Code,
  Database,
  Search,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Loader,
  Play,
  Pause,
  Trash2,
} from "lucide-react";

export type TraceEventType =
  | "llm_call"
  | "tool_call"
  | "memory_lookup"
  | "memory_write"
  | "safety_check"
  | "user_message"
  | "agent_response"
  | "error";

export interface TraceEvent {
  id: string;
  type: TraceEventType;
  timestamp: Date;
  duration?: number;
  label: string;
  details?: Record<string, unknown>;
  status: "running" | "success" | "error" | "pending";
  tokens?: { prompt: number; completion: number };
}

interface AgentTraceProps {
  events?: TraceEvent[];
}

const DEMO_EVENTS: TraceEvent[] = [
  {
    id: "1",
    type: "user_message",
    timestamp: new Date(Date.now() - 12000),
    label: "User: What's the weather in Tokyo?",
    status: "success",
  },
  {
    id: "2",
    type: "safety_check",
    timestamp: new Date(Date.now() - 11800),
    duration: 15,
    label: "Constitutional AI check",
    status: "success",
    details: { safe: true, score: 0.98 },
  },
  {
    id: "3",
    type: "memory_lookup",
    timestamp: new Date(Date.now() - 11700),
    duration: 42,
    label: "Memory: user preferences lookup",
    status: "success",
    details: { store: "sqlite", matches: 3, query: "weather tokyo" },
  },
  {
    id: "4",
    type: "llm_call",
    timestamp: new Date(Date.now() - 11600),
    duration: 1230,
    label: "LLM: claude-3-5-sonnet (plan step)",
    status: "success",
    tokens: { prompt: 820, completion: 145 },
    details: { model: "claude-3-5-sonnet-20241022", temperature: 0.7 },
  },
  {
    id: "5",
    type: "tool_call",
    timestamp: new Date(Date.now() - 10300),
    duration: 680,
    label: "Tool: web_search",
    status: "success",
    details: { query: "Tokyo weather forecast", results: 5 },
  },
  {
    id: "6",
    type: "llm_call",
    timestamp: new Date(Date.now() - 9600),
    duration: 890,
    label: "LLM: claude-3-5-sonnet (synthesis)",
    status: "success",
    tokens: { prompt: 1100, completion: 280 },
  },
  {
    id: "7",
    type: "memory_write",
    timestamp: new Date(Date.now() - 8700),
    duration: 18,
    label: "Memory: store conversation",
    status: "success",
    details: { store: "sqlite", type: "conversation" },
  },
  {
    id: "8",
    type: "agent_response",
    timestamp: new Date(Date.now() - 8680),
    label: "Agent: The weather in Tokyo is...",
    status: "success",
  },
];

const TYPE_CONFIG: Record<
  TraceEventType,
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  llm_call: {
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    color: "text-violet-400",
    bgColor: "bg-violet-500/20",
  },
  tool_call: {
    icon: <Code className="w-3.5 h-3.5" />,
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
  memory_lookup: {
    icon: <Search className="w-3.5 h-3.5" />,
    color: "text-sky-400",
    bgColor: "bg-sky-500/20",
  },
  memory_write: {
    icon: <Database className="w-3.5 h-3.5" />,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
  },
  safety_check: {
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
  },
  user_message: {
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  agent_response: {
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    color: "text-green-400",
    bgColor: "bg-green-500/20",
  },
  error: {
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
};

function StatusIcon({ status }: { status: TraceEvent["status"] }) {
  if (status === "running") {
    return (
      <Loader className="w-3.5 h-3.5 text-blue-400 animate-spin" />
    );
  }
  if (status === "success") {
    return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
  }
  if (status === "error") {
    return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
  }
  return <Clock className="w-3.5 h-3.5 text-slate-400" />;
}

function TraceEventRow({
  event,
  isExpanded,
  onToggle,
}: {
  event: TraceEvent;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const config = TYPE_CONFIG[event.type];
  const hasDetails =
    event.details && Object.keys(event.details).length > 0;

  return (
    <div className="border-b border-slate-800 last:border-0">
      <button
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/50 transition-colors text-left group"
        onClick={onToggle}
        disabled={!hasDetails}
      >
        {/* Timeline dot */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${config.bgColor}`}
          >
            <span className={config.color}>{config.icon}</span>
          </div>
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <span className="text-sm text-slate-200 truncate block">
            {event.label}
          </span>
        </div>

        {/* Tokens */}
        {event.tokens && (
          <span className="text-xs text-slate-500 flex-shrink-0">
            {event.tokens.prompt + event.tokens.completion} tok
          </span>
        )}

        {/* Duration */}
        {event.duration !== undefined && (
          <span className="text-xs text-slate-500 w-14 text-right flex-shrink-0">
            {event.duration}ms
          </span>
        )}

        {/* Status */}
        <div className="flex-shrink-0">
          <StatusIcon status={event.status} />
        </div>

        {/* Expand arrow */}
        {hasDetails && (
          <ChevronRight
            className={`w-4 h-4 text-slate-500 transition-transform flex-shrink-0 ${
              isExpanded ? "rotate-90" : ""
            }`}
          />
        )}
      </button>

      {/* Expanded details */}
      {isExpanded && hasDetails && (
        <div className="px-14 pb-3">
          <div className="bg-slate-900 rounded-lg p-3 text-xs font-mono">
            {Object.entries(event.details!).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="text-slate-500">{key}:</span>
                <span className="text-slate-300">
                  {typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value)}
                </span>
              </div>
            ))}
            {event.tokens && (
              <>
                <div className="flex gap-2 mt-1 pt-1 border-t border-slate-700">
                  <span className="text-slate-500">prompt_tokens:</span>
                  <span className="text-violet-300">{event.tokens.prompt}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-500">completion_tokens:</span>
                  <span className="text-violet-300">
                    {event.tokens.completion}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentTrace({ events: propEvents }: AgentTraceProps) {
  const [events, setEvents] = useState<TraceEvent[]>(
    propEvents ?? DEMO_EVENTS
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isLive, setIsLive] = useState(false);
  const [filterType, setFilterType] = useState<TraceEventType | "all">("all");
  const bottomRef = useRef<HTMLDivElement>(null);
  const liveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulate live events
  useEffect(() => {
    if (isLive) {
      let seq = events.length + 1;
      const LIVE_TYPES: TraceEventType[] = [
        "llm_call",
        "tool_call",
        "memory_lookup",
        "safety_check",
      ];
      liveIntervalRef.current = setInterval(() => {
        const type = LIVE_TYPES[Math.floor(Math.random() * LIVE_TYPES.length)];
        const newEvent: TraceEvent = {
          id: String(Date.now()),
          type,
          timestamp: new Date(),
          duration: Math.floor(Math.random() * 1500) + 50,
          label: `${type.replace("_", " ")}: live event #${seq++}`,
          status: Math.random() > 0.1 ? "success" : "error",
          tokens:
            type === "llm_call"
              ? {
                  prompt: Math.floor(Math.random() * 800) + 200,
                  completion: Math.floor(Math.random() * 400) + 50,
                }
              : undefined,
        };
        setEvents((prev) => [...prev.slice(-50), newEvent]);
      }, 2000);
    } else if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }

    return () => {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
      }
    };
  }, [isLive]);

  // Auto-scroll when live
  useEffect(() => {
    if (isLive) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [events, isLive]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredEvents =
    filterType === "all"
      ? events
      : events.filter((e) => e.type === filterType);

  const totalTokens = events.reduce(
    (acc, e) =>
      acc + (e.tokens ? e.tokens.prompt + e.tokens.completion : 0),
    0
  );

  const totalDuration = events.reduce(
    (acc, e) => acc + (e.duration ?? 0),
    0
  );

  const errorCount = events.filter((e) => e.status === "error").length;

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-white">
            Live Agent Trace
          </h2>
          {isLive && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              LIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <select
            value={filterType}
            onChange={(e) =>
              setFilterType(e.target.value as TraceEventType | "all")
            }
            className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-2 py-1.5"
          >
            <option value="all">All Events</option>
            <option value="llm_call">LLM Calls</option>
            <option value="tool_call">Tool Calls</option>
            <option value="memory_lookup">Memory Lookups</option>
            <option value="memory_write">Memory Writes</option>
            <option value="safety_check">Safety Checks</option>
          </select>

          {/* Live toggle */}
          <button
            onClick={() => setIsLive((v) => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isLive
                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {isLive ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isLive ? "Pause" : "Go Live"}
          </button>

          {/* Clear */}
          <button
            onClick={() => setEvents([])}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            title="Clear trace"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-6 py-2.5 bg-slate-900 border-b border-slate-800 text-sm">
        <span className="text-slate-400">
          <span className="text-white font-medium">{events.length}</span>{" "}
          events
        </span>
        <span className="text-slate-400">
          <span className="text-violet-400 font-medium">
            {totalTokens.toLocaleString()}
          </span>{" "}
          tokens
        </span>
        <span className="text-slate-400">
          <span className="text-amber-400 font-medium">
            {totalDuration >= 1000
              ? `${(totalDuration / 1000).toFixed(1)}s`
              : `${totalDuration}ms`}
          </span>{" "}
          total time
        </span>
        {errorCount > 0 && (
          <span className="text-red-400 font-medium">
            {errorCount} error{errorCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Activity className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm">
              {isLive
                ? "Waiting for agent events..."
                : "No trace events yet. Click Go Live or send a message."}
            </p>
          </div>
        ) : (
          <div>
            {filteredEvents.map((event) => (
              <TraceEventRow
                key={event.id}
                event={event}
                isExpanded={expandedIds.has(event.id)}
                onToggle={() => toggleExpand(event.id)}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
