import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  MessageSquare,
  Clock,
  Users,
  ChevronUp,
  ChevronDown,
  Download,
  Calendar,
  BarChart3,
  Activity,
  Award,
  Zap,
  Building2,
  Target,
  Filter,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status =
  | "Applied"
  | "Screening"
  | "Interview"
  | "Technical"
  | "Offer"
  | "Rejected"
  | "Hired";

type DateRange = "7d" | "30d" | "90d" | "all";
type SortDir = "asc" | "desc";

interface Application {
  id: string;
  company: string;
  role: string;
  appliedDate: string;
  status: Status;
  responseTime: number | null;
  matchScore: number;
  industry: string;
  companySize: "Startup" | "SMB" | "Enterprise" | "FAANG";
}

interface WeekData {
  week: string;
  applied: number;
  interviews: number;
  offers: number;
}

// ─── Style Maps ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<
  Status,
  { bar: string; text: string; badge: string; dot: string }
> = {
  Applied: {
    bar: "bg-neon-cyan",
    text: "text-neon-cyan",
    badge: "border-neon-cyan/30 bg-neon-cyan/10",
    dot: "bg-neon-cyan",
  },
  Screening: {
    bar: "bg-neon-purple",
    text: "text-neon-purple",
    badge: "border-neon-purple/30 bg-neon-purple/10",
    dot: "bg-neon-purple",
  },
  Interview: {
    bar: "bg-neon-amber",
    text: "text-neon-amber",
    badge: "border-neon-amber/30 bg-neon-amber/10",
    dot: "bg-neon-amber",
  },
  Technical: {
    bar: "bg-neon-magenta",
    text: "text-neon-magenta",
    badge: "border-neon-magenta/30 bg-neon-magenta/10",
    dot: "bg-neon-magenta",
  },
  Offer: {
    bar: "bg-neon-green",
    text: "text-neon-green",
    badge: "border-neon-green/30 bg-neon-green/10",
    dot: "bg-neon-green",
  },
  Rejected: {
    bar: "bg-neon-pink",
    text: "text-neon-pink",
    badge: "border-neon-pink/30 bg-neon-pink/10",
    dot: "bg-neon-pink",
  },
  Hired: {
    bar: "bg-neon-green",
    text: "text-neon-green",
    badge: "border-neon-green/30 bg-neon-green/10",
    dot: "bg-neon-green",
  },
};

const INDUSTRY_COLORS: Record<string, string> = {
  Tech: "bg-neon-cyan",
  Finance: "bg-neon-purple",
  Healthcare: "bg-neon-green",
  Retail: "bg-neon-amber",
  Education: "bg-neon-magenta",
  Other: "bg-dark-500",
};

const INDUSTRY_TEXT: Record<string, string> = {
  Tech: "text-neon-cyan",
  Finance: "text-neon-purple",
  Healthcare: "text-neon-green",
  Retail: "text-neon-amber",
  Education: "text-neon-magenta",
  Other: "text-dark-300",
};

const SIZE_COLORS: Record<string, string> = {
  Startup: "bg-neon-purple",
  SMB: "bg-neon-cyan",
  Enterprise: "bg-neon-amber",
  FAANG: "bg-neon-green",
};

const SIZE_TEXT: Record<string, string> = {
  Startup: "text-neon-purple",
  SMB: "text-neon-cyan",
  Enterprise: "text-neon-amber",
  FAANG: "text-neon-green",
};

const DAY_COLORS = [
  "bg-dark-600",
  "bg-neon-cyan",
  "bg-neon-cyan/80",
  "bg-neon-purple",
  "bg-neon-purple/80",
  "bg-neon-cyan/60",
  "bg-dark-600",
];

const FUNNEL_CARD = [
  "bg-neon-cyan/10 border-neon-cyan/40",
  "bg-neon-purple/10 border-neon-purple/40",
  "bg-neon-amber/10 border-neon-amber/40",
  "bg-neon-green/10 border-neon-green/40",
  "bg-neon-magenta/10 border-neon-magenta/40",
];

const FUNNEL_TEXT = [
  "text-neon-cyan",
  "text-neon-purple",
  "text-neon-amber",
  "text-neon-green",
  "text-neon-magenta",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const matchScoreClass = (score: number): string => {
  if (score >= 90) return "text-neon-green";
  if (score >= 75) return "text-neon-cyan";
  if (score >= 60) return "text-neon-amber";
  return "text-neon-pink";
};

const matchScoreBar = (score: number): string => {
  if (score >= 90) return "bg-neon-green";
  if (score >= 75) return "bg-neon-cyan";
  if (score >= 60) return "bg-neon-amber";
  return "bg-neon-pink";
};

const dAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

// ─── Static Mock Data ─────────────────────────────────────────────────────────

const MOCK_APPS: Application[] = [
  { id: "1",  company: "Google",        role: "Senior Software Engineer",   appliedDate: dAgo(2),  status: "Screening",  responseTime: 2,    matchScore: 92, industry: "Tech",       companySize: "FAANG"      },
  { id: "2",  company: "Stripe",        role: "Frontend Engineer",          appliedDate: dAgo(3),  status: "Interview",  responseTime: 1,    matchScore: 88, industry: "Finance",    companySize: "Enterprise" },
  { id: "3",  company: "Anthropic",     role: "ML Engineer",                appliedDate: dAgo(4),  status: "Applied",    responseTime: null, matchScore: 95, industry: "Tech",       companySize: "Startup"    },
  { id: "4",  company: "Netflix",       role: "Staff Engineer",             appliedDate: dAgo(5),  status: "Rejected",   responseTime: 3,    matchScore: 78, industry: "Tech",       companySize: "FAANG"      },
  { id: "5",  company: "Vercel",        role: "Developer Advocate",         appliedDate: dAgo(6),  status: "Technical",  responseTime: 2,    matchScore: 84, industry: "Tech",       companySize: "Startup"    },
  { id: "6",  company: "Figma",         role: "Product Engineer",           appliedDate: dAgo(7),  status: "Offer",      responseTime: 4,    matchScore: 90, industry: "Tech",       companySize: "Enterprise" },
  { id: "7",  company: "Plaid",         role: "Backend Engineer",           appliedDate: dAgo(8),  status: "Interview",  responseTime: 3,    matchScore: 81, industry: "Finance",    companySize: "SMB"        },
  { id: "8",  company: "Notion",        role: "Full Stack Engineer",        appliedDate: dAgo(9),  status: "Screening",  responseTime: 5,    matchScore: 76, industry: "Tech",       companySize: "SMB"        },
  { id: "9",  company: "Linear",        role: "Software Engineer",          appliedDate: dAgo(10), status: "Applied",    responseTime: null, matchScore: 89, industry: "Tech",       companySize: "Startup"    },
  { id: "10", company: "OpenAI",        role: "Research Engineer",          appliedDate: dAgo(11), status: "Rejected",   responseTime: 7,    matchScore: 74, industry: "Tech",       companySize: "Enterprise" },
  { id: "11", company: "Rippling",      role: "Senior Frontend",            appliedDate: dAgo(12), status: "Interview",  responseTime: 2,    matchScore: 86, industry: "Tech",       companySize: "SMB"        },
  { id: "12", company: "Scale AI",      role: "Software Engineer",          appliedDate: dAgo(13), status: "Applied",    responseTime: null, matchScore: 91, industry: "Tech",       companySize: "Enterprise" },
  { id: "13", company: "Coinbase",      role: "Blockchain Engineer",        appliedDate: dAgo(14), status: "Rejected",   responseTime: 6,    matchScore: 70, industry: "Finance",    companySize: "Enterprise" },
  { id: "14", company: "Datadog",       role: "Site Reliability Engineer",  appliedDate: dAgo(15), status: "Technical",  responseTime: 4,    matchScore: 83, industry: "Tech",       companySize: "Enterprise" },
  { id: "15", company: "Twilio",        role: "Platform Engineer",          appliedDate: dAgo(16), status: "Screening",  responseTime: 3,    matchScore: 77, industry: "Tech",       companySize: "Enterprise" },
  { id: "16", company: "Square",        role: "Android Engineer",           appliedDate: dAgo(17), status: "Applied",    responseTime: null, matchScore: 80, industry: "Finance",    companySize: "Enterprise" },
  { id: "17", company: "Brex",          role: "Infrastructure Engineer",    appliedDate: dAgo(18), status: "Rejected",   responseTime: 5,    matchScore: 72, industry: "Finance",    companySize: "SMB"        },
  { id: "18", company: "Mercury",       role: "Full Stack Developer",       appliedDate: dAgo(19), status: "Offer",      responseTime: 8,    matchScore: 87, industry: "Finance",    companySize: "Startup"    },
  { id: "19", company: "Loom",          role: "Video Platform Engineer",    appliedDate: dAgo(20), status: "Interview",  responseTime: 2,    matchScore: 85, industry: "Tech",       companySize: "Startup"    },
  { id: "20", company: "Miro",          role: "Senior Engineer",            appliedDate: dAgo(21), status: "Applied",    responseTime: null, matchScore: 79, industry: "Tech",       companySize: "SMB"        },
  { id: "21", company: "Airtable",      role: "Backend Engineer",           appliedDate: dAgo(22), status: "Screening",  responseTime: 4,    matchScore: 82, industry: "Tech",       companySize: "SMB"        },
  { id: "22", company: "Coda",          role: "Developer",                  appliedDate: dAgo(23), status: "Rejected",   responseTime: 3,    matchScore: 68, industry: "Tech",       companySize: "Startup"    },
  { id: "23", company: "Retool",        role: "Full Stack Engineer",        appliedDate: dAgo(24), status: "Applied",    responseTime: null, matchScore: 93, industry: "Tech",       companySize: "Startup"    },
  { id: "24", company: "Supabase",      role: "Open Source Engineer",       appliedDate: dAgo(25), status: "Applied",    responseTime: null, matchScore: 88, industry: "Tech",       companySize: "Startup"    },
  { id: "25", company: "PlanetScale",   role: "Database Engineer",          appliedDate: dAgo(26), status: "Screening",  responseTime: 6,    matchScore: 86, industry: "Tech",       companySize: "Startup"    },
  { id: "26", company: "Cloudflare",    role: "Systems Engineer",           appliedDate: dAgo(27), status: "Interview",  responseTime: 3,    matchScore: 90, industry: "Tech",       companySize: "Enterprise" },
  { id: "27", company: "Fastly",        role: "Edge Network Engineer",      appliedDate: dAgo(28), status: "Rejected",   responseTime: 4,    matchScore: 71, industry: "Tech",       companySize: "Enterprise" },
  { id: "28", company: "Snowflake",     role: "Data Engineer",              appliedDate: dAgo(29), status: "Applied",    responseTime: null, matchScore: 84, industry: "Tech",       companySize: "Enterprise" },
  { id: "29", company: "dbt Labs",      role: "Analytics Engineer",         appliedDate: dAgo(30), status: "Interview",  responseTime: 2,    matchScore: 89, industry: "Tech",       companySize: "SMB"        },
  { id: "30", company: "Amplitude",     role: "Product Engineer",           appliedDate: dAgo(31), status: "Applied",    responseTime: null, matchScore: 75, industry: "Tech",       companySize: "SMB"        },
  { id: "31", company: "Mixpanel",      role: "Frontend Engineer",          appliedDate: dAgo(32), status: "Rejected",   responseTime: 7,    matchScore: 69, industry: "Tech",       companySize: "SMB"        },
  { id: "32", company: "Segment",       role: "Data Platform Engineer",     appliedDate: dAgo(33), status: "Applied",    responseTime: null, matchScore: 82, industry: "Tech",       companySize: "Enterprise" },
  { id: "33", company: "Heap",          role: "Software Engineer",          appliedDate: dAgo(34), status: "Screening",  responseTime: 5,    matchScore: 78, industry: "Tech",       companySize: "Startup"    },
  { id: "34", company: "FullStory",     role: "Backend Engineer",           appliedDate: dAgo(35), status: "Applied",    responseTime: null, matchScore: 76, industry: "Tech",       companySize: "SMB"        },
  { id: "35", company: "Hotjar",        role: "Frontend Developer",         appliedDate: dAgo(36), status: "Rejected",   responseTime: 8,    matchScore: 65, industry: "Tech",       companySize: "SMB"        },
  { id: "36", company: "Intercom",      role: "Platform Engineer",          appliedDate: dAgo(37), status: "Applied",    responseTime: null, matchScore: 81, industry: "Tech",       companySize: "Enterprise" },
  { id: "37", company: "Zendesk",       role: "Senior Engineer",            appliedDate: dAgo(38), status: "Screening",  responseTime: 3,    matchScore: 73, industry: "Tech",       companySize: "Enterprise" },
  { id: "38", company: "HubSpot",       role: "Full Stack Engineer",        appliedDate: dAgo(39), status: "Interview",  responseTime: 4,    matchScore: 87, industry: "Tech",       companySize: "Enterprise" },
  { id: "39", company: "Salesforce",    role: "Software Engineer",          appliedDate: dAgo(40), status: "Rejected",   responseTime: 6,    matchScore: 70, industry: "Tech",       companySize: "Enterprise" },
  { id: "40", company: "Workday",       role: "Application Engineer",       appliedDate: dAgo(41), status: "Applied",    responseTime: null, matchScore: 74, industry: "Tech",       companySize: "Enterprise" },
  { id: "41", company: "ServiceNow",    role: "Platform Developer",         appliedDate: dAgo(42), status: "Applied",    responseTime: null, matchScore: 72, industry: "Tech",       companySize: "Enterprise" },
  { id: "42", company: "Palantir",      role: "Forward Deployed Engineer",  appliedDate: dAgo(43), status: "Rejected",   responseTime: 5,    matchScore: 66, industry: "Tech",       companySize: "Enterprise" },
  { id: "43", company: "Databricks",    role: "Spark Engineer",             appliedDate: dAgo(44), status: "Screening",  responseTime: 4,    matchScore: 88, industry: "Tech",       companySize: "Enterprise" },
  { id: "44", company: "Confluent",     role: "Kafka Engineer",             appliedDate: dAgo(45), status: "Applied",    responseTime: null, matchScore: 83, industry: "Tech",       companySize: "Enterprise" },
  { id: "45", company: "HashiCorp",     role: "Infrastructure Engineer",    appliedDate: dAgo(46), status: "Interview",  responseTime: 3,    matchScore: 91, industry: "Tech",       companySize: "Enterprise" },
  { id: "46", company: "Elastic",       role: "Search Engineer",            appliedDate: dAgo(47), status: "Applied",    responseTime: null, matchScore: 80, industry: "Tech",       companySize: "Enterprise" },
  { id: "47", company: "Grafana Labs",  role: "Observability Engineer",     appliedDate: dAgo(48), status: "Rejected",   responseTime: 9,    matchScore: 69, industry: "Tech",       companySize: "SMB"        },
  { id: "48", company: "Temporal",      role: "Backend Engineer",           appliedDate: dAgo(49), status: "Screening",  responseTime: 2,    matchScore: 94, industry: "Tech",       companySize: "Startup"    },
  { id: "49", company: "Pulumi",        role: "Cloud Engineer",             appliedDate: dAgo(50), status: "Applied",    responseTime: null, matchScore: 85, industry: "Tech",       companySize: "Startup"    },
  { id: "50", company: "Prefect",       role: "Data Engineer",              appliedDate: dAgo(51), status: "Applied",    responseTime: null, matchScore: 79, industry: "Tech",       companySize: "Startup"    },
  { id: "51", company: "Flatiron",      role: "Software Engineer",          appliedDate: dAgo(10), status: "Screening",  responseTime: 3,    matchScore: 83, industry: "Healthcare", companySize: "Enterprise" },
  { id: "52", company: "Ro Health",     role: "Full Stack Developer",       appliedDate: dAgo(15), status: "Rejected",   responseTime: 5,    matchScore: 71, industry: "Healthcare", companySize: "SMB"        },
  { id: "53", company: "Hims & Hers",   role: "Backend Engineer",           appliedDate: dAgo(20), status: "Applied",    responseTime: null, matchScore: 77, industry: "Healthcare", companySize: "SMB"        },
  { id: "54", company: "Carbon Health", role: "Platform Engineer",          appliedDate: dAgo(25), status: "Interview",  responseTime: 4,    matchScore: 85, industry: "Healthcare", companySize: "Startup"    },
  { id: "55", company: "Headspace",     role: "Software Engineer",          appliedDate: dAgo(30), status: "Applied",    responseTime: null, matchScore: 80, industry: "Healthcare", companySize: "SMB"        },
  { id: "56", company: "Noom",          role: "Frontend Engineer",          appliedDate: dAgo(35), status: "Rejected",   responseTime: 6,    matchScore: 68, industry: "Healthcare", companySize: "SMB"        },
  { id: "57", company: "Calm",          role: "Mobile Engineer",            appliedDate: dAgo(40), status: "Applied",    responseTime: null, matchScore: 74, industry: "Healthcare", companySize: "Startup"    },
  { id: "58", company: "Oscar Health",  role: "Data Engineer",              appliedDate: dAgo(45), status: "Screening",  responseTime: 7,    matchScore: 79, industry: "Healthcare", companySize: "Enterprise" },
  { id: "59", company: "Veeva Systems", role: "Software Engineer",          appliedDate: dAgo(50), status: "Applied",    responseTime: null, matchScore: 76, industry: "Healthcare", companySize: "Enterprise" },
  { id: "60", company: "Zocdoc",        role: "Backend Developer",          appliedDate: dAgo(55), status: "Rejected",   responseTime: 4,    matchScore: 70, industry: "Healthcare", companySize: "SMB"        },
  { id: "61", company: "Robinhood",     role: "Senior Engineer",            appliedDate: dAgo(12), status: "Interview",  responseTime: 3,    matchScore: 86, industry: "Finance",    companySize: "Enterprise" },
  { id: "62", company: "Chime",         role: "Backend Engineer",           appliedDate: dAgo(18), status: "Applied",    responseTime: null, matchScore: 81, industry: "Finance",    companySize: "SMB"        },
  { id: "63", company: "Betterment",    role: "Full Stack Engineer",        appliedDate: dAgo(24), status: "Screening",  responseTime: 5,    matchScore: 75, industry: "Finance",    companySize: "SMB"        },
  { id: "64", company: "Wealthfront",   role: "Frontend Engineer",          appliedDate: dAgo(30), status: "Rejected",   responseTime: 8,    matchScore: 66, industry: "Finance",    companySize: "SMB"        },
  { id: "65", company: "Acorns",        role: "Mobile Developer",           appliedDate: dAgo(36), status: "Applied",    responseTime: null, matchScore: 73, industry: "Finance",    companySize: "Startup"    },
  { id: "66", company: "Dave",          role: "Software Engineer",          appliedDate: dAgo(42), status: "Applied",    responseTime: null, matchScore: 70, industry: "Finance",    companySize: "Startup"    },
  { id: "67", company: "Blend",         role: "Platform Engineer",          appliedDate: dAgo(48), status: "Offer",      responseTime: 6,    matchScore: 89, industry: "Finance",    companySize: "SMB"        },
  { id: "68", company: "Finix",         role: "Payments Engineer",          appliedDate: dAgo(54), status: "Applied",    responseTime: null, matchScore: 84, industry: "Finance",    companySize: "Startup"    },
  { id: "69", company: "Duolingo",      role: "Software Engineer",          appliedDate: dAgo(8),  status: "Screening",  responseTime: 4,    matchScore: 88, industry: "Education",  companySize: "Enterprise" },
  { id: "70", company: "Coursera",      role: "Frontend Developer",         appliedDate: dAgo(16), status: "Rejected",   responseTime: 7,    matchScore: 72, industry: "Education",  companySize: "Enterprise" },
  { id: "71", company: "Udemy",         role: "Backend Engineer",           appliedDate: dAgo(24), status: "Applied",    responseTime: null, matchScore: 75, industry: "Education",  companySize: "Enterprise" },
  { id: "72", company: "Khan Academy",  role: "Full Stack Engineer",        appliedDate: dAgo(32), status: "Applied",    responseTime: null, matchScore: 82, industry: "Education",  companySize: "SMB"        },
  { id: "73", company: "Quizlet",       role: "Software Engineer",          appliedDate: dAgo(40), status: "Rejected",   responseTime: 5,    matchScore: 69, industry: "Education",  companySize: "SMB"        },
  { id: "74", company: "Chegg",         role: "Platform Engineer",          appliedDate: dAgo(48), status: "Applied",    responseTime: null, matchScore: 71, industry: "Education",  companySize: "Enterprise" },
  { id: "75", company: "Shopify",       role: "Commerce Engineer",          appliedDate: dAgo(6),  status: "Offer",      responseTime: 5,    matchScore: 93, industry: "Retail",     companySize: "Enterprise" },
  { id: "76", company: "Etsy",          role: "Senior Engineer",            appliedDate: dAgo(12), status: "Technical",  responseTime: 3,    matchScore: 87, industry: "Retail",     companySize: "Enterprise" },
  { id: "77", company: "Faire",         role: "Backend Developer",          appliedDate: dAgo(18), status: "Applied",    responseTime: null, matchScore: 81, industry: "Retail",     companySize: "SMB"        },
  { id: "78", company: "Attentive",     role: "Growth Engineer",            appliedDate: dAgo(24), status: "Rejected",   responseTime: 6,    matchScore: 68, industry: "Retail",     companySize: "SMB"        },
  { id: "79", company: "Klaviyo",       role: "Software Engineer",          appliedDate: dAgo(30), status: "Screening",  responseTime: 4,    matchScore: 85, industry: "Retail",     companySize: "SMB"        },
  { id: "80", company: "BigCommerce",   role: "API Engineer",               appliedDate: dAgo(36), status: "Applied",    responseTime: null, matchScore: 76, industry: "Retail",     companySize: "Enterprise" },
  { id: "81", company: "Amazon",        role: "SDE II",                     appliedDate: dAgo(3),  status: "Interview",  responseTime: 1,    matchScore: 89, industry: "Tech",       companySize: "FAANG"      },
  { id: "82", company: "Meta",          role: "Senior SWE",                 appliedDate: dAgo(7),  status: "Rejected",   responseTime: 4,    matchScore: 76, industry: "Tech",       companySize: "FAANG"      },
  { id: "83", company: "Apple",         role: "iOS Engineer",               appliedDate: dAgo(14), status: "Applied",    responseTime: null, matchScore: 88, industry: "Tech",       companySize: "FAANG"      },
  { id: "84", company: "Microsoft",     role: "Software Engineer II",       appliedDate: dAgo(21), status: "Screening",  responseTime: 3,    matchScore: 84, industry: "Tech",       companySize: "FAANG"      },
  { id: "85", company: "Twitter/X",     role: "Backend Engineer",           appliedDate: dAgo(28), status: "Rejected",   responseTime: 8,    matchScore: 65, industry: "Tech",       companySize: "FAANG"      },
  { id: "86", company: "Uber",          role: "Senior Engineer",            appliedDate: dAgo(35), status: "Applied",    responseTime: null, matchScore: 83, industry: "Tech",       companySize: "FAANG"      },
  { id: "87", company: "Lyft",          role: "Platform Engineer",          appliedDate: dAgo(42), status: "Applied",    responseTime: null, matchScore: 80, industry: "Tech",       companySize: "FAANG"      },
  { id: "88", company: "Airbnb",        role: "Full Stack Engineer",        appliedDate: dAgo(49), status: "Rejected",   responseTime: 6,    matchScore: 74, industry: "Tech",       companySize: "FAANG"      },
  { id: "89", company: "Vercel",        role: "Staff Engineer",             appliedDate: dAgo(62), status: "Hired",      responseTime: 10,   matchScore: 96, industry: "Tech",       companySize: "Startup"    },
  { id: "90", company: "Mercury",       role: "Senior Full Stack",          appliedDate: dAgo(75), status: "Hired",      responseTime: 14,   matchScore: 94, industry: "Finance",    companySize: "Startup"    },
];

const WEEK_DATA: WeekData[] = [
  { week: "Wk 1", applied: 8,  interviews: 2, offers: 0 },
  { week: "Wk 2", applied: 11, interviews: 3, offers: 0 },
  { week: "Wk 3", applied: 9,  interviews: 2, offers: 1 },
  { week: "Wk 4", applied: 14, interviews: 4, offers: 0 },
  { week: "Wk 5", applied: 12, interviews: 3, offers: 1 },
  { week: "Wk 6", applied: 16, interviews: 5, offers: 1 },
  { week: "Wk 7", applied: 10, interviews: 4, offers: 2 },
  { week: "Wk 8", applied: 7,  interviews: 3, offers: 1 },
];

const SPARKLINES = {
  total:        [5, 8, 6, 12, 9, 11, 14],
  responseRate: [28, 32, 30, 35, 33, 38, 35],
  interviewRate:[15, 18, 16, 20, 17, 22, 19],
  avgDays:      [5,  4,  6,  3,  5,  4,  4 ],
};

const MAX_WEEK_TOTAL = Math.max(
  ...WEEK_DATA.map((w) => w.applied + w.interviews + w.offers)
);

// ─── Component ────────────────────────────────────────────────────────────────

const JobAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [sortCol, setSortCol] = useState<keyof Application>("appliedDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ── Derived Data ──────────────────────────────────────────────────────────

  const filteredApps = useMemo(() => {
    if (dateRange === "all") return MOCK_APPS;
    const cutoff = new Date();
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    cutoff.setDate(cutoff.getDate() - days);
    return MOCK_APPS.filter((a) => new Date(a.appliedDate) >= cutoff);
  }, [dateRange]);

  const stats = useMemo(() => {
    const total = filteredApps.length;
    const responded = filteredApps.filter((a) => a.responseTime !== null).length;
    const interviewed = filteredApps.filter((a) =>
      ["Interview", "Technical", "Offer", "Hired"].includes(a.status)
    ).length;
    const times = filteredApps
      .filter((a) => a.responseTime !== null)
      .map((a) => a.responseTime as number);
    const avgResponseTime =
      times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    return {
      total,
      responseRate: total > 0 ? (responded / total) * 100 : 0,
      interviewRate: total > 0 ? (interviewed / total) * 100 : 0,
      avgResponseTime,
    };
  }, [filteredApps]);

  const statusRows = useMemo(() => {
    const order: Status[] = [
      "Applied",
      "Screening",
      "Interview",
      "Technical",
      "Offer",
      "Rejected",
    ];
    const counts: Partial<Record<Status, number>> = {};
    filteredApps.forEach((a) => {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    });
    const total = filteredApps.length || 1;
    const max = Math.max(...order.map((s) => counts[s] ?? 0), 1);
    return order.map((status) => ({
      status,
      count: counts[status] ?? 0,
      barPct: ((counts[status] ?? 0) / max) * 100,
      totalPct: ((counts[status] ?? 0) / total) * 100,
    }));
  }, [filteredApps]);

  const funnelSteps = useMemo(() => {
    const total = filteredApps.length || 1;
    const steps = [
      { label: "Applied",   count: filteredApps.length },
      { label: "Screening", count: filteredApps.filter((a) => ["Screening", "Interview", "Technical", "Offer", "Hired"].includes(a.status)).length },
      { label: "Interview", count: filteredApps.filter((a) => ["Interview", "Technical", "Offer", "Hired"].includes(a.status)).length },
      { label: "Offer",     count: filteredApps.filter((a) => ["Offer", "Hired"].includes(a.status)).length },
      { label: "Hired",     count: filteredApps.filter((a) => a.status === "Hired").length },
    ];
    return steps.map((step, i) => ({
      ...step,
      widthPct: Math.max((step.count / total) * 100, 8),
      convRate:
        i > 0 && steps[i - 1].count > 0
          ? (step.count / steps[i - 1].count) * 100
          : null,
    }));
  }, [filteredApps]);

  const industryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredApps.forEach((a) => {
      counts[a.industry] = (counts[a.industry] ?? 0) + 1;
    });
    const max = Math.max(...Object.values(counts), 1);
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([industry, count]) => ({
        industry,
        count,
        barPct: (count / max) * 100,
      }));
  }, [filteredApps]);

  const companySizeStats = useMemo(() => {
    const sizes = ["Startup", "SMB", "Enterprise", "FAANG"] as const;
    const data = sizes.map((size) => {
      const apps = filteredApps.filter((a) => a.companySize === size);
      const responded = apps.filter((a) => a.responseTime !== null).length;
      return {
        size,
        total: apps.length,
        responseRate: apps.length > 0 ? (responded / apps.length) * 100 : 0,
      };
    });
    const maxRate = Math.max(...data.map((d) => d.responseRate), 1);
    return data.map((d) => ({ ...d, barPct: (d.responseRate / maxRate) * 100 }));
  }, [filteredApps]);

  const dayOfWeekData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = new Array(7).fill(0) as number[];
    filteredApps.forEach((a) => {
      // Parse as local date to avoid UTC-offset day-of-week skew
      const [y, m, day] = a.appliedDate.split("-").map(Number);
      const d = new Date(y, m - 1, day).getDay();
      counts[d]++;
    });
    const max = Math.max(...counts, 1);
    return days.map((day, i) => ({
      day,
      count: counts[i],
      barPct: (counts[i] / max) * 100,
      colorClass: DAY_COLORS[i],
    }));
  }, [filteredApps]);

  const sortedApps = useMemo(() => {
    return [...filteredApps]
      .sort((a, b) => {
        const av = a[sortCol] ?? "";
        const bv = b[sortCol] ?? "";
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      })
      .slice(0, 20);
  }, [filteredApps, sortCol, sortDir]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSort = (col: keyof Application) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  const exportCSV = () => {
    const headers = [
      "Company",
      "Role",
      "Applied Date",
      "Status",
      "Response Time (days)",
      "Match Score",
    ];
    const rows = filteredApps.map((a) => [
      a.company,
      a.role,
      a.appliedDate,
      a.status,
      a.responseTime != null ? String(a.responseTime) : "",
      String(a.matchScore),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => '"' + v.replace(/"/g, '""') + '"').join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "job-applications.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── Sort icon helper ───────────────────────────────────────────────────────

  const renderSortIcon = (col: keyof Application) => {
    if (sortCol !== col)
      return <ChevronDown className="w-3 h-3 text-dark-600 opacity-50" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-neon-cyan" />
    ) : (
      <ChevronDown className="w-3 h-3 text-neon-cyan" />
    );
  };

  // ── KPI card definitions ───────────────────────────────────────────────────

  const kpiCards = [
    {
      title: "Total Applications",
      value: String(stats.total),
      change: "+12",
      positive: true,
      sub: "vs previous period",
      Icon: Briefcase,
      color: "text-neon-cyan",
      iconBg: "bg-neon-cyan/10",
      border: "border-neon-cyan/20",
      sparkline: SPARKLINES.total,
      barColor: "bg-neon-cyan",
    },
    {
      title: "Response Rate",
      value: stats.responseRate.toFixed(1) + "%",
      change: "+2.4%",
      positive: true,
      sub: "received a reply",
      Icon: MessageSquare,
      color: "text-neon-purple",
      iconBg: "bg-neon-purple/10",
      border: "border-neon-purple/20",
      sparkline: SPARKLINES.responseRate,
      barColor: "bg-neon-purple",
    },
    {
      title: "Interview Rate",
      value: stats.interviewRate.toFixed(1) + "%",
      change: "+1.2%",
      positive: true,
      sub: "reached interview stage",
      Icon: Users,
      color: "text-neon-amber",
      iconBg: "bg-neon-amber/10",
      border: "border-neon-amber/20",
      sparkline: SPARKLINES.interviewRate,
      barColor: "bg-neon-amber",
    },
    {
      title: "Avg. Response Time",
      value: stats.avgResponseTime.toFixed(1) + "d",
      change: "-0.8d",
      positive: true,
      sub: "days until first reply",
      Icon: Clock,
      color: "text-neon-green",
      iconBg: "bg-neon-green/10",
      border: "border-neon-green/20",
      sparkline: SPARKLINES.avgDays,
      barColor: "bg-neon-green",
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full bg-dark-950 text-white">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border sticky top-0 bg-dark-950/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20">
            <BarChart3 className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-white tracking-wide">
              Job Application Analytics
            </h1>
            <p className="text-xs text-dark-500 font-mono mt-0.5">
              {filteredApps.length} applications &middot;{" "}
              {dateRange === "all" ? "All time" : "Last " + dateRange}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(["7d", "30d", "90d", "all"] as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={
                dateRange === r
                  ? "px-3 py-1.5 text-xs font-mono rounded border border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan transition-colors"
                  : "px-3 py-1.5 text-xs font-mono rounded border border-dark-600 text-dark-400 hover:border-dark-500 hover:text-dark-300 transition-colors"
              }
            >
              {r === "all" ? "All" : r}
            </button>
          ))}
          <div className="w-px h-5 bg-dark-700 mx-1" />
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border border-dark-600 text-dark-400 hover:border-neon-cyan/40 hover:text-neon-cyan transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 p-6 space-y-5 overflow-y-auto">

        {/* ── KPI Cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          {kpiCards.map((card) => {
            const maxSpark = Math.max(...card.sparkline);
            return (
              <div
                key={card.title}
                className={"bg-dark-900 rounded-xl border p-5 flex flex-col gap-3 " + card.border}
              >
                <div className="flex items-start justify-between">
                  <div className={"p-2 rounded-lg " + card.iconBg}>
                    <card.Icon className={"w-5 h-5 " + card.color} />
                  </div>
                  <span
                    className={
                      "text-xs font-mono flex items-center gap-0.5 " +
                      (card.positive ? "text-neon-green" : "text-neon-pink")
                    }
                  >
                    {card.positive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {card.change}
                  </span>
                </div>

                <div>
                  <p className={"text-3xl font-display font-bold " + card.color}>
                    {card.value}
                  </p>
                  <p className="text-sm font-medium text-white/80 mt-0.5">
                    {card.title}
                  </p>
                  <p className="text-xs text-dark-500 font-mono mt-0.5">
                    {card.sub}
                  </p>
                </div>

                {/* Mini sparkline */}
                <div>
                  <div className="flex items-end gap-0.5 h-8">
                    {card.sparkline.map((val, i) => (
                      <div
                        key={i}
                        className={"flex-1 rounded-sm opacity-70 " + card.barColor}
                        style={{
                          height: Math.max((val / maxSpark) * 100, 8) + "%",
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-dark-600 font-mono mt-1">
                    7-day trend
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Row 2: Status Distribution + Funnel ─────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Applications by Status */}
          <div className="bg-dark-900 rounded-xl border border-dark-700 p-5">
            <div className="flex items-center gap-2 mb-5">
              <Activity className="w-4 h-4 text-neon-cyan" />
              <h2 className="text-sm font-display font-semibold text-white">
                Applications by Status
              </h2>
              <span className="ml-auto text-xs font-mono text-dark-500">
                {filteredApps.length} total
              </span>
            </div>
            <div className="space-y-3.5">
              {statusRows.map((row) => (
                <div key={row.status} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={"w-2 h-2 rounded-full " + STATUS_STYLES[row.status].dot}
                      />
                      <span className="text-xs font-mono text-dark-300">
                        {row.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={"text-xs font-mono font-semibold " + STATUS_STYLES[row.status].text}
                      >
                        {row.count}
                      </span>
                      <span className="text-xs font-mono text-dark-500 w-12 text-right">
                        {row.totalPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                    <div
                      className={"h-full rounded-full transition-all duration-500 " + STATUS_STYLES[row.status].bar}
                      style={{ width: row.barPct + "%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Application Funnel */}
          <div className="bg-dark-900 rounded-xl border border-dark-700 p-5">
            <div className="flex items-center gap-2 mb-5">
              <Target className="w-4 h-4 text-neon-purple" />
              <h2 className="text-sm font-display font-semibold text-white">
                Application Funnel
              </h2>
            </div>
            <div className="space-y-0.5">
              {funnelSteps.map((step, i) => (
                <div key={step.label}>
                  <div className="flex justify-center">
                    <div
                      className={
                        "rounded border flex items-center justify-between px-3 py-2.5 transition-all duration-500 " +
                        FUNNEL_CARD[i]
                      }
                      style={{ width: Math.max(step.widthPct, 20) + "%" }}
                    >
                      <span
                        className={
                          "text-xs font-mono font-semibold whitespace-nowrap " +
                          FUNNEL_TEXT[i]
                        }
                      >
                        {step.label}
                      </span>
                      <span
                        className={
                          "text-xs font-mono ml-2 whitespace-nowrap " +
                          FUNNEL_TEXT[i]
                        }
                      >
                        {step.count}
                      </span>
                    </div>
                  </div>
                  {step.convRate != null && (
                    <div className="text-center py-1">
                      <span className="text-xs font-mono text-dark-500">
                        &#8595; {step.convRate.toFixed(1)}% conversion
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 3: Industry + Company Size + Day of Week ─────────────────── */}
        <div className="grid grid-cols-3 gap-4">

          {/* Applications by Industry */}
          <div className="bg-dark-900 rounded-xl border border-dark-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-neon-cyan" />
              <h2 className="text-sm font-display font-semibold text-white">
                By Industry
              </h2>
            </div>
            <div className="space-y-3">
              {industryCounts.map(({ industry, count, barPct }) => (
                <div key={industry} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={
                        "text-xs font-mono " +
                        (INDUSTRY_TEXT[industry] ?? "text-dark-300")
                      }
                    >
                      {industry}
                    </span>
                    <span className="text-xs font-mono text-dark-400">
                      {count}
                    </span>
                  </div>
                  <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
                    <div
                      className={
                        "h-full rounded-full transition-all duration-500 " +
                        (INDUSTRY_COLORS[industry] ?? "bg-dark-500")
                      }
                      style={{ width: barPct + "%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Response Rate by Company Size */}
          <div className="bg-dark-900 rounded-xl border border-dark-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-neon-amber" />
              <h2 className="text-sm font-display font-semibold text-white">
                Response Rate by Size
              </h2>
            </div>
            <div className="space-y-3">
              {companySizeStats.map(({ size, responseRate, total, barPct }) => (
                <div key={size} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={
                        "text-xs font-mono " + (SIZE_TEXT[size] ?? "text-dark-300")
                      }
                    >
                      {size}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-dark-500">
                        {total} apps
                      </span>
                      <span
                        className={
                          "text-xs font-mono font-semibold " +
                          (SIZE_TEXT[size] ?? "text-dark-300")
                        }
                      >
                        {responseRate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
                    <div
                      className={
                        "h-full rounded-full transition-all duration-500 " +
                        (SIZE_COLORS[size] ?? "bg-dark-500")
                      }
                      style={{ width: barPct + "%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Applications by Day of Week */}
          <div className="bg-dark-900 rounded-xl border border-dark-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-neon-purple" />
              <h2 className="text-sm font-display font-semibold text-white">
                By Day of Week
              </h2>
            </div>
            <div className="flex items-end justify-between gap-1 px-1" style={{ height: "96px" }}>
              {dayOfWeekData.map(({ day, count, barPct, colorClass }) => (
                <div
                  key={day}
                  className="flex-1 flex flex-col items-center justify-end gap-1"
                  style={{ height: "100%" }}
                >
                  <span className="text-xs font-mono text-dark-400 leading-none">
                    {count > 0 ? count : ""}
                  </span>
                  <div
                    className={"w-full rounded-t-sm " + colorClass}
                    style={{ height: Math.max(barPct, 4) + "%" }}
                  />
                  <span className="text-xs font-mono text-dark-500 leading-none">
                    {day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Timeline ────────────────────────────────────────────────────── */}
        <div className="bg-dark-900 rounded-xl border border-dark-700 p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-neon-cyan" />
              <h2 className="text-sm font-display font-semibold text-white">
                Weekly Activity Timeline
              </h2>
              <span className="text-xs text-dark-500 font-mono">
                &mdash; last 8 weeks
              </span>
            </div>
            <div className="flex items-center gap-5 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-neon-cyan/70" />
                <span className="text-dark-400">Applied</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-neon-amber/70" />
                <span className="text-dark-400">Interviews</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-neon-green/70" />
                <span className="text-dark-400">Offers</span>
              </div>
            </div>
          </div>

          <div className="flex items-end gap-3 px-1" style={{ height: "112px" }}>
            {WEEK_DATA.map((week) => {
              const total = week.applied + week.interviews + week.offers;
              const barH = Math.round((total / MAX_WEEK_TOTAL) * 88);
              const offerH =
                total > 0 ? Math.round((week.offers / total) * barH) : 0;
              const interviewH =
                total > 0 ? Math.round((week.interviews / total) * barH) : 0;
              const appliedH = barH - offerH - interviewH;

              return (
                <div
                  key={week.week}
                  className="flex-1 flex flex-col items-center gap-1"
                  style={{ height: "100%" }}
                >
                  <div className="flex-1 flex flex-col justify-end w-full">
                    <div
                      className="relative w-full overflow-hidden rounded-sm"
                      style={{ height: barH + "px" }}
                    >
                      <div
                        className="absolute top-0 left-0 right-0 bg-neon-green/75"
                        style={{ height: offerH + "px" }}
                      />
                      <div
                        className="absolute left-0 right-0 bg-neon-amber/75"
                        style={{ top: offerH + "px", height: interviewH + "px" }}
                      />
                      <div
                        className="absolute left-0 right-0 bottom-0 bg-neon-cyan/70"
                        style={{ height: appliedH + "px" }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-mono text-dark-500 leading-none">
                    {week.week}
                  </span>
                  <span className="text-xs font-mono text-dark-600 leading-none">
                    {total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Data Table ──────────────────────────────────────────────────── */}
        <div className="bg-dark-900 rounded-xl border border-dark-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-neon-cyan" />
              <h2 className="text-sm font-display font-semibold text-white">
                Recent Applications
              </h2>
              <span className="text-xs font-mono text-dark-500 bg-dark-800 border border-dark-600 px-2 py-0.5 rounded-full">
                {sortedApps.length} / {filteredApps.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-dark-500">
              <Filter className="w-3 h-3" />
              Click column headers to sort
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-800">
                  {(
                    [
                      { col: "company"      as keyof Application, label: "Company" },
                      { col: "role"         as keyof Application, label: "Role" },
                      { col: "appliedDate"  as keyof Application, label: "Applied" },
                      { col: "status"       as keyof Application, label: "Status" },
                      { col: "responseTime" as keyof Application, label: "Response" },
                      { col: "matchScore"   as keyof Application, label: "Match" },
                    ] as { col: keyof Application; label: string }[]
                  ).map(({ col, label }) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left cursor-pointer select-none group"
                      onClick={() => handleSort(col)}
                    >
                      <div className="flex items-center gap-1 text-xs font-mono text-dark-400 group-hover:text-neon-cyan transition-colors">
                        {label}
                        {renderSortIcon(col)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedApps.map((app, i) => (
                  <tr
                    key={app.id}
                    className={
                      (i % 2 === 0 ? "bg-transparent" : "bg-dark-800/30") +
                      " border-b border-dark-800/40 hover:bg-dark-800/60 transition-colors"
                    }
                  >
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-white">
                        {app.company}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-dark-300 max-w-xs truncate block">
                        {app.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-dark-400">
                        {app.appliedDate}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-mono " +
                          STATUS_STYLES[app.status].badge
                        }
                      >
                        <span
                          className={
                            "w-1.5 h-1.5 rounded-full shrink-0 " +
                            STATUS_STYLES[app.status].dot
                          }
                        />
                        <span className={STATUS_STYLES[app.status].text}>
                          {app.status}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-dark-400">
                        {app.responseTime != null
                          ? app.responseTime + "d"
                          : "\u2014"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-1.5 bg-dark-700 rounded-full overflow-hidden"
                          style={{ width: "40px" }}
                        >
                          <div
                            className={
                              "h-full rounded-full " + matchScoreBar(app.matchScore)
                            }
                            style={{ width: app.matchScore + "%" }}
                          />
                        </div>
                        <span
                          className={
                            "text-xs font-mono font-semibold " +
                            matchScoreClass(app.matchScore)
                          }
                        >
                          {app.matchScore}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredApps.length > 20 && (
            <div className="px-5 py-3 border-t border-dark-800 text-center">
              <span className="text-xs font-mono text-dark-500">
                Showing top 20 of {filteredApps.length} applications &mdash; export CSV for full list
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobAnalytics;
