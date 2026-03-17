import { useState, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Tag,
  Trash2,
  Edit3,
  FileText,
  Brain,
  Globe,
  Star,
  StarOff,
  Clock,
  Download,
  ChevronRight,
  ChevronDown,
  Check,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type NoteType = 'note' | 'research' | 'code' | 'bookmark' | 'summary';

interface KnowledgeNote {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  source?: string;
}

const TYPE_CONFIG: Record<NoteType, { label: string; icon: React.ReactNode; color: string }> = {
  note: { label: 'Note', icon: <FileText className="w-3.5 h-3.5" />, color: 'text-neon-cyan' },
  research: { label: 'Research', icon: <Brain className="w-3.5 h-3.5" />, color: 'text-neon-purple' },
  code: { label: 'Code', icon: <FileText className="w-3.5 h-3.5" />, color: 'text-neon-green' },
  bookmark: { label: 'Bookmark', icon: <Globe className="w-3.5 h-3.5" />, color: 'text-neon-amber' },
  summary: { label: 'Summary', icon: <FileText className="w-3.5 h-3.5" />, color: 'text-neon-magenta' },
};

const SAMPLE_NOTES: KnowledgeNote[] = [
  {
    id: '1',
    title: 'LLM Benchmark Comparison 2024',
    content:
      'GPT-4o, Claude 3.5 Sonnet, and Gemini 1.5 Pro dominate across code, reasoning, and instruction-following benchmarks. Open-source: Llama-3-70B and Mistral-Large are strong runners-up at a fraction of the API cost.',
    type: 'research',
    tags: ['LLM', 'benchmarks', 'AI'],
    pinned: true,
    createdAt: '2024-11-01T10:00:00Z',
    updatedAt: '2024-11-01T10:00:00Z',
    source: 'https://artificialanalysis.ai',
  },
  {
    id: '2',
    title: 'Agentic Framework Notes',
    content:
      'Key frameworks: LangGraph (stateful graphs), AutoGen (multi-agent conversation), CrewAI (role-based), OpenAgents. LangGraph excels at complex conditional workflows; AutoGen for collaborative problem-solving.',
    type: 'note',
    tags: ['agents', 'LangGraph', 'AutoGen', 'frameworks'],
    pinned: false,
    createdAt: '2024-10-20T14:30:00Z',
    updatedAt: '2024-10-22T09:15:00Z',
  },
  {
    id: '3',
    title: 'RAG Pipeline Architecture',
    content:
      '1. Document ingestion (chunking, embedding)\n2. Vector store (Pinecone/Weaviate/pgvector)\n3. Retrieval (similarity + BM25 hybrid)\n4. Re-ranking (cross-encoder)\n5. Generation with retrieved context\n\nHybrid retrieval typically outperforms pure vector search by 15-20%.',
    type: 'summary',
    tags: ['RAG', 'embeddings', 'vector-db'],
    pinned: true,
    createdAt: '2024-09-15T11:00:00Z',
    updatedAt: '2024-11-05T16:00:00Z',
  },
  {
    id: '4',
    title: 'Playwright Web Automation',
    content:
      'Key patterns: page.waitForSelector(), page.evaluate(), intercept network with page.route(). For dynamic SPAs always use waitForLoadState("networkidle"). Screenshot with page.screenshot({ fullPage: true }).',
    type: 'code',
    tags: ['playwright', 'automation', 'browser'],
    pinned: false,
    createdAt: '2024-08-10T09:00:00Z',
    updatedAt: '2024-08-10T09:00:00Z',
  },
];

// ── Note editor ───────────────────────────────────────────────────────────────

interface NoteEditorProps {
  note: KnowledgeNote | null;
  onSave: (note: KnowledgeNote) => void;
  onCancel: () => void;
}

function NoteEditor({ note, onSave, onCancel }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [type, setType] = useState<NoteType>(note?.type ?? 'note');
  const [tags, setTags] = useState(note?.tags.join(', ') ?? '');
  const [source, setSource] = useState(note?.source ?? '');

  const handleSave = () => {
    if (!title.trim()) return;
    const now = new Date().toISOString();
    onSave({
      id: note?.id ?? `note-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      type,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      pinned: note?.pinned ?? false,
      createdAt: note?.createdAt ?? now,
      updatedAt: now,
      source: source.trim() || undefined,
    });
  };

  return (
    <div className="flex flex-col h-full p-6 bg-dark-950">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-white">{note ? 'Edit Note' : 'New Note'}</h2>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-dark-400 border border-glass-border rounded-lg hover:bg-dark-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-3 py-1.5 text-sm text-neon-cyan border border-neon-cyan/30 rounded-lg hover:bg-neon-cyan/10 transition-colors disabled:opacity-40"
          >
            <Check className="w-4 h-4 inline mr-1" />
            Save
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-dark-400 uppercase tracking-widest mb-1 block">Title</label>
          <input
            className="w-full bg-dark-900 border border-glass-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-cyan/60"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title…"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-dark-400 uppercase tracking-widest mb-1 block">Type</label>
            <select
              className="w-full bg-dark-900 border border-glass-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-cyan/60"
              value={type}
              onChange={(e) => setType(e.target.value as NoteType)}
            >
              {(Object.keys(TYPE_CONFIG) as NoteType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_CONFIG[t].label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-dark-400 uppercase tracking-widest mb-1 block">Tags (comma-separated)</label>
            <input
              className="w-full bg-dark-900 border border-glass-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-cyan/60"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-dark-400 uppercase tracking-widest mb-1 block">Content</label>
          <textarea
            className="w-full bg-dark-900 border border-glass-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-cyan/60 resize-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note here…"
            rows={10}
          />
        </div>

        <div>
          <label className="text-xs text-dark-400 uppercase tracking-widest mb-1 block">
            Source URL (optional)
          </label>
          <input
            className="w-full bg-dark-900 border border-glass-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-cyan/60"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="https://…"
          />
        </div>
      </div>
    </div>
  );
}

// ── Note Card ─────────────────────────────────────────────────────────────────

interface NoteCardProps {
  note: KnowledgeNote;
  selected: boolean;
  onSelect: () => void;
  onPin: () => void;
  onDelete: () => void;
}

function NoteCard({ note, selected, onSelect, onPin, onDelete }: NoteCardProps) {
  const cfg = TYPE_CONFIG[note.type];
  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-colors group ${
        selected
          ? 'border-neon-cyan/50 bg-neon-cyan/5'
          : 'border-glass-border hover:border-dark-600 bg-dark-900/40'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <span className={cfg.color}>{cfg.icon}</span>
          <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className={`p-0.5 rounded hover:text-neon-amber transition-colors ${note.pinned ? 'text-neon-amber' : 'text-dark-500'}`}
            onClick={(e) => { e.stopPropagation(); onPin(); }}
          >
            {note.pinned ? <Star className="w-3 h-3" /> : <StarOff className="w-3 h-3" />}
          </button>
          <button
            className="p-0.5 rounded text-dark-500 hover:text-red-400 transition-colors"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      <h4 className="text-sm font-medium text-white mb-1 line-clamp-1">{note.title}</h4>
      <p className="text-xs text-dark-500 line-clamp-2">{note.content}</p>
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {note.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 rounded bg-dark-800 text-dark-400 border border-glass-border"
            >
              #{tag}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="text-xs text-dark-600">+{note.tags.length - 3}</span>
          )}
        </div>
      )}
      <div className="flex items-center gap-1 mt-2 text-xs text-dark-600">
        <Clock className="w-3 h-3" />
        <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
        {note.pinned && <Star className="w-3 h-3 text-neon-amber ml-auto" />}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function KnowledgeBase() {
  const [notes, setNotes] = useState<KnowledgeNote[]>(SAMPLE_NOTES);
  const [selectedId, setSelectedId] = useState<string | null>(notes[0]?.id ?? null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<NoteType | 'all'>('all');
  const [editing, setEditing] = useState(false);
  const [editingNote, setEditingNote] = useState<KnowledgeNote | null>(null);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(true);

  const filtered = notes.filter((n) => {
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (showPinnedOnly && !n.pinned) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags))).sort();

  const saveNote = useCallback((note: KnowledgeNote) => {
    setNotes((prev) => {
      const existing = prev.find((n) => n.id === note.id);
      if (existing) return prev.map((n) => (n.id === note.id ? note : n));
      return [note, ...prev];
    });
    setSelectedId(note.id);
    setEditing(false);
    setEditingNote(null);
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const togglePin = useCallback((id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
    );
  }, []);

  const exportAll = useCallback(() => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aplica-knowledge-base.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [notes]);

  if (editing) {
    return (
      <NoteEditor
        note={editingNote}
        onSave={saveNote}
        onCancel={() => { setEditing(false); setEditingNote(null); }}
      />
    );
  }

  const cfg = selectedNote ? TYPE_CONFIG[selectedNote.type] : null;

  return (
    <div className="flex h-full bg-dark-950 text-white font-mono">
      {/* ── Left sidebar ── */}
      <div className="w-72 flex-shrink-0 border-r border-glass-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-glass-border">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-neon-cyan" />
            <h2 className="text-sm font-bold text-neon-cyan tracking-wider">KNOWLEDGE BASE</h2>
          </div>
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-dark-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full bg-dark-900 border border-glass-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-neon-cyan/60"
              placeholder="Search notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setEditing(true); setEditingNote(null); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-neon-cyan/30 text-neon-cyan text-xs hover:bg-neon-cyan/10 transition-colors"
            >
              <Plus className="w-3 h-3" /> New Note
            </button>
            <button
              onClick={() => setShowPinnedOnly((p) => !p)}
              className={`p-1.5 rounded-lg border transition-colors ${
                showPinnedOnly
                  ? 'border-neon-amber/40 bg-neon-amber/10 text-neon-amber'
                  : 'border-glass-border text-dark-500 hover:border-dark-600'
              }`}
              title="Pinned only"
            >
              <Star className="w-4 h-4" />
            </button>
            <button
              onClick={exportAll}
              className="p-1.5 rounded-lg border border-glass-border text-dark-500 hover:border-dark-600 hover:text-dark-300 transition-colors"
              title="Export all"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Type filter */}
        <div className="px-4 py-2 border-b border-glass-border overflow-x-auto flex gap-1">
          <button
            onClick={() => setFilterType('all')}
            className={`whitespace-nowrap text-xs px-2 py-1 rounded transition-colors ${
              filterType === 'all'
                ? 'bg-dark-700 text-white'
                : 'text-dark-500 hover:text-dark-300'
            }`}
          >
            All
          </button>
          {(Object.keys(TYPE_CONFIG) as NoteType[]).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`whitespace-nowrap text-xs px-2 py-1 rounded transition-colors ${
                filterType === t
                  ? `bg-dark-700 ${TYPE_CONFIG[t].color}`
                  : 'text-dark-500 hover:text-dark-300'
              }`}
            >
              {TYPE_CONFIG[t].label}
            </button>
          ))}
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 && (
            <p className="text-xs text-dark-600 text-center py-8">No notes found</p>
          )}
          {/* Pinned first */}
          {filtered
            .slice()
            .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
            .map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                selected={note.id === selectedId}
                onSelect={() => setSelectedId(note.id)}
                onPin={() => togglePin(note.id)}
                onDelete={() => deleteNote(note.id)}
              />
            ))}
        </div>

        {/* Tags panel */}
        <div className="border-t border-glass-border p-3">
          <button
            className="flex items-center gap-2 text-xs text-dark-400 hover:text-dark-300 transition-colors w-full mb-2"
            onClick={() => setTagsOpen((o) => !o)}
          >
            <Tag className="w-3.5 h-3.5" />
            <span className="font-bold uppercase tracking-widest">Tags</span>
            {tagsOpen ? (
              <ChevronDown className="w-3 h-3 ml-auto" />
            ) : (
              <ChevronRight className="w-3 h-3 ml-auto" />
            )}
          </button>
          {tagsOpen && (
            <div className="flex flex-wrap gap-1">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearch(tag)}
                  className="text-xs px-1.5 py-0.5 rounded bg-dark-800 text-dark-400 border border-glass-border hover:border-neon-cyan/40 hover:text-neon-cyan transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Detail view ── */}
      {selectedNote ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`${cfg?.color ?? ''}`}>{cfg?.icon}</span>
                <span className={`text-xs font-bold ${cfg?.color ?? ''}`}>{cfg?.label}</span>
                {selectedNote.pinned && <Star className="w-3 h-3 text-neon-amber" />}
              </div>
              <h1 className="text-2xl font-bold text-white">{selectedNote.title}</h1>
              {selectedNote.source && (
                <a
                  href={selectedNote.source}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-neon-cyan hover:underline mt-1 block"
                >
                  <Globe className="w-3 h-3 inline mr-1" />
                  {selectedNote.source}
                </a>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setEditingNote(selectedNote); setEditing(true); }}
                className="p-2 rounded-lg bg-dark-900 border border-glass-border text-dark-400 hover:text-neon-cyan hover:border-neon-cyan/40 transition-colors"
                title="Edit"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => togglePin(selectedNote.id)}
                className={`p-2 rounded-lg bg-dark-900 border transition-colors ${
                  selectedNote.pinned
                    ? 'border-neon-amber/40 text-neon-amber'
                    : 'border-glass-border text-dark-400 hover:text-neon-amber hover:border-neon-amber/40'
                }`}
                title="Toggle pin"
              >
                <Star className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedNote.content);
                }}
                className="p-2 rounded-lg bg-dark-900 border border-glass-border text-dark-400 hover:text-neon-cyan hover:border-neon-cyan/40 transition-colors"
                title="Copy content"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dates */}
          <div className="flex gap-4 text-xs text-dark-600 mb-4">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Created: {new Date(selectedNote.createdAt).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Updated: {new Date(selectedNote.updatedAt).toLocaleString()}
            </span>
          </div>

          {/* Tags */}
          {selectedNote.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedNote.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 rounded-full bg-dark-900 border border-glass-border text-dark-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="bg-dark-900/40 border border-glass-border rounded-xl p-5">
            <pre className="text-sm text-dark-200 whitespace-pre-wrap font-mono leading-relaxed">
              {selectedNote.content}
            </pre>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <BookOpen className="w-16 h-16 text-dark-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-dark-500 mb-2">No Note Selected</h3>
            <p className="text-dark-600 max-w-sm text-sm">
              Select a note from the sidebar or create a new one to get started.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
