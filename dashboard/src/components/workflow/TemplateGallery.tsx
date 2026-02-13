import React, { useState } from "react";
import {
  Search,
  Star,
  Download,
  Eye,
  Clock,
  Zap,
  MessageSquare,
  Mail,
  FileText,
  Shield,
  CheckCircle,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  downloads: number;
  rating: number;
  tags: string[];
  preview: string;
  createdAt: string;
}

const templates: Template[] = [
  {
    id: "welcome-bot",
    name: "Welcome Bot",
    description:
      "Automatically welcome new members and provide onboarding information",
    category: "community",
    author: "SentinelBot Team",
    downloads: 1234,
    rating: 4.8,
    tags: ["welcome", "community", "telegram"],
    preview:
      "New member joins → Send welcome message → Show rules → Assign role",
    createdAt: "2026-01-15",
  },
  {
    id: "auto-reply",
    name: "AI Auto-Responder",
    description: "AI-powered automatic responses based on message content",
    category: "messaging",
    author: "Community",
    downloads: 2567,
    rating: 4.6,
    tags: ["ai", "auto-reply", "support"],
    preview:
      "Message received → Analyze intent → Generate response → Send reply",
    createdAt: "2026-01-10",
  },
  {
    id: "daily-digest",
    name: "Daily Digest Generator",
    description: "Compile and send daily news digests from multiple sources",
    category: "productivity",
    author: "SentinelBot Team",
    downloads: 892,
    rating: 4.9,
    tags: ["digest", "news", "automation"],
    preview: "Scheduled trigger → Fetch RSS feeds → Summarize → Send digest",
    createdAt: "2026-01-20",
  },
  {
    id: "ticket-system",
    name: "Support Ticket System",
    description: "Complete support ticket workflow with prioritization",
    category: "support",
    author: "Enterprise User",
    downloads: 654,
    rating: 4.7,
    tags: ["support", "tickets", "workflow"],
    preview:
      "New ticket → Categorize → Assign → Notify team → Track resolution",
    createdAt: "2026-01-18",
  },
  {
    id: "content-moderator",
    name: "Content Moderator",
    description: "AI-powered content moderation for communities",
    category: "moderation",
    author: "Security Team",
    downloads: 1890,
    rating: 4.5,
    tags: ["moderation", "ai", "safety"],
    preview: "New message → AI analysis → Check rules → Flag/Approve/Delete",
    createdAt: "2026-01-12",
  },
  {
    id: "event-reminder",
    name: "Event Reminder",
    description: "Smart event reminders with timezone support",
    category: "productivity",
    author: "Community",
    downloads: 1123,
    rating: 4.4,
    tags: ["reminder", "events", "calendar"],
    preview: "Event scheduled → Calculate time → Send reminder → Follow-up",
    createdAt: "2026-01-22",
  },
];

const categories = [
  { id: "all", label: "All Templates", icon: <Zap className="w-4 h-4" /> },
  {
    id: "messaging",
    label: "Messaging",
    icon: <MessageSquare className="w-4 h-4" />,
  },
  {
    id: "productivity",
    label: "Productivity",
    icon: <FileText className="w-4 h-4" />,
  },
  { id: "community", label: "Community", icon: <Users className="w-4 h-4" /> },
  { id: "support", label: "Support", icon: <Shield className="w-4 h-4" /> },
  {
    id: "moderation",
    label: "Moderation",
    icon: <CheckCircle className="w-4 h-4" />,
  },
];

function Users(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

interface TemplateGalleryProps {
  onSelectTemplate: (template: Template) => void;
}

export default function TemplateGallery({
  onSelectTemplate,
}: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    const matchesCategory =
      selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">
          Template Gallery
        </h2>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${
                  selectedCategory === cat.id
                    ? "bg-primary-500 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }
              `}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-slate-800 rounded-lg border border-slate-700 hover:border-primary-500 transition-colors cursor-pointer overflow-hidden group"
              onClick={() => onSelectTemplate(template)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-white group-hover:text-primary-400 transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {template.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm">{template.rating}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    {template.downloads.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {template.createdAt}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-3 p-2 bg-slate-900 rounded text-xs text-slate-400 font-mono">
                  {template.preview}
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTemplate(template);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Use Template
                  </button>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
