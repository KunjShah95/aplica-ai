import { useState, useCallback, useRef } from 'react';
import {
  User, Mail, Phone, MapPin, Globe, Briefcase, GraduationCap,
  Star, FolderOpen, Award, MessageSquare, Plus, Trash2, Sparkles,
  Download, FileText, Copy, ChevronDown, ChevronRight, X, Check,
  Save, RefreshCw, Zap, Target, BarChart3, Link2, ExternalLink,
  AlignLeft, Hash, Building2, Clock, BookOpen, Layers,
  Linkedin, Github, Wand2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type SectionId =
  | 'personal'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'languages';

type TemplateId = 'modern' | 'classic' | 'minimal';
type SkillCategory = 'technical' | 'soft' | 'tools' | 'langSkills';
type CompletionStatus = 'complete' | 'partial' | 'empty';

interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
}

interface Experience {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  remote: boolean;
  bullets: string[];
}

interface Education {
  id: string;
  degree: string;
  school: string;
  year: string;
  gpa: string;
  courses: string;
}

interface Skills {
  technical: string[];
  soft: string[];
  tools: string[];
  langSkills: string[];
}

interface Project {
  id: string;
  name: string;
  url: string;
  description: string;
  techStack: string[];
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialId: string;
}

interface Language {
  id: string;
  language: string;
  proficiency: string;
}

// ── Static Config ─────────────────────────────────────────────────────────────

const SECTION_ORDER: SectionId[] = [
  'personal', 'summary', 'experience', 'education',
  'skills', 'projects', 'certifications', 'languages',
];

const SECTION_LABELS: Record<SectionId, string> = {
  personal: 'Personal Info',
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  languages: 'Languages',
};

const SECTION_ICONS: Record<SectionId, JSX.Element> = {
  personal: <User className="w-3.5 h-3.5" />,
  summary: <AlignLeft className="w-3.5 h-3.5" />,
  experience: <Briefcase className="w-3.5 h-3.5" />,
  education: <GraduationCap className="w-3.5 h-3.5" />,
  skills: <Star className="w-3.5 h-3.5" />,
  projects: <FolderOpen className="w-3.5 h-3.5" />,
  certifications: <Award className="w-3.5 h-3.5" />,
  languages: <MessageSquare className="w-3.5 h-3.5" />,
};

const TEMPLATE_CONFIG: Record<
  TemplateId,
  {
    label: string;
    accentText: string;
    accentBg: string;
    accentBorder: string;
    inactiveBorder: string;
    gradientFrom: string;
    gradientTo: string;
    barColor: string;
  }
> = {
  modern: {
    label: 'Modern',
    accentText: 'text-neon-cyan',
    accentBg: 'bg-neon-cyan/10',
    accentBorder: 'border-neon-cyan',
    inactiveBorder: 'border-dark-600',
    gradientFrom: 'from-neon-cyan/20',
    gradientTo: 'to-neon-purple/10',
    barColor: 'bg-neon-cyan',
  },
  classic: {
    label: 'Classic',
    accentText: 'text-neon-purple',
    accentBg: 'bg-neon-purple/10',
    accentBorder: 'border-neon-purple',
    inactiveBorder: 'border-dark-600',
    gradientFrom: 'from-neon-purple/20',
    gradientTo: 'to-neon-magenta/10',
    barColor: 'bg-neon-purple',
  },
  minimal: {
    label: 'Minimal',
    accentText: 'text-neon-green',
    accentBg: 'bg-neon-green/10',
    accentBorder: 'border-neon-green',
    inactiveBorder: 'border-dark-600',
    gradientFrom: 'from-neon-green/20',
    gradientTo: 'to-neon-cyan/10',
    barColor: 'bg-neon-green',
  },
};

const SKILL_TABS: { id: SkillCategory; label: string; activeText: string; activeBg: string; activeBorder: string }[] = [
  { id: 'technical', label: 'Technical', activeText: 'text-neon-cyan',   activeBg: 'bg-neon-cyan/10',   activeBorder: 'border-neon-cyan/40' },
  { id: 'soft',      label: 'Soft',      activeText: 'text-neon-purple', activeBg: 'bg-neon-purple/10', activeBorder: 'border-neon-purple/40' },
  { id: 'tools',     label: 'Tools',     activeText: 'text-neon-amber',  activeBg: 'bg-neon-amber/10',  activeBorder: 'border-neon-amber/40' },
  { id: 'langSkills',label: 'Languages', activeText: 'text-neon-green',  activeBg: 'bg-neon-green/10',  activeBorder: 'border-neon-green/40' },
];

const SKILL_TAG_COLORS: Record<SkillCategory, { pill: string; pillText: string; x: string }> = {
  technical: { pill: 'bg-neon-cyan/10 border border-neon-cyan/30',   pillText: 'text-neon-cyan',   x: 'text-neon-cyan/60 hover:text-neon-cyan' },
  soft:      { pill: 'bg-neon-purple/10 border border-neon-purple/30', pillText: 'text-neon-purple', x: 'text-neon-purple/60 hover:text-neon-purple' },
  tools:     { pill: 'bg-neon-amber/10 border border-neon-amber/30',  pillText: 'text-neon-amber',  x: 'text-neon-amber/60 hover:text-neon-amber' },
  langSkills:{ pill: 'bg-neon-green/10 border border-neon-green/30',  pillText: 'text-neon-green',  x: 'text-neon-green/60 hover:text-neon-green' },
};

const PROFICIENCY_LEVELS = ['Native', 'Fluent', 'Professional', 'Conversational', 'Elementary'];

const PROF_COLOR: Record<string, string> = {
  Native: 'text-neon-green',
  Fluent: 'text-neon-cyan',
  Professional: 'text-neon-purple',
  Conversational: 'text-neon-amber',
  Elementary: 'text-dark-400',
};

const ATS_CIRCUMFERENCE = 238.76; // 2π × 38

const TARGET_KEYWORDS = [
  'React', 'TypeScript', 'Next.js', 'GraphQL', 'REST API',
  'CI/CD', 'Agile', 'Performance', 'Team Lead', 'AWS',
];

const ATS_SUGGESTIONS = [
  'Add "Next.js" to your skills or project stack',
  'Mention "REST API" design experience in bullets',
  'Include "Agile" or "Scrum" in your soft skills',
  'Quantify performance improvements with metrics',
];

const RESUME_VERSIONS = ['v2.0 – Current', 'v1.2 – Tech Focus', 'v1.1 – ATS Optimized', 'v1.0 – Initial Draft'];

// ── Sample Data ───────────────────────────────────────────────────────────────

const SAMPLE_PERSONAL: PersonalInfo = {
  name: 'Alex Chen',
  email: 'alex.chen@email.com',
  phone: '+1 (555) 012-3456',
  location: 'San Francisco, CA',
  linkedin: 'linkedin.com/in/alexchen',
  github: 'github.com/alexchen',
  portfolio: 'alexchen.dev',
};

const SAMPLE_SUMMARY =
  'Experienced full-stack engineer with 5+ years building scalable web applications and AI-powered tools. ' +
  'Passionate about developer experience, clean architecture, and shipping products users love. ' +
  'Led cross-functional teams at Series A/B startups and contributed to open-source projects with 2K+ GitHub stars.';

const SAMPLE_EXPERIENCES: Experience[] = [
  {
    id: 'exp-1',
    title: 'Senior Software Engineer',
    company: 'TechCorp Inc.',
    location: 'San Francisco, CA',
    startDate: '2022-03',
    endDate: '',
    remote: true,
    bullets: [
      'Led migration to microservices architecture, reducing deploy time by 65% across 8 services.',
      'Reduced API latency by 40% through Redis caching strategy and query optimization.',
      'Mentored 4 junior engineers via weekly 1:1s, code reviews, and pair programming sessions.',
      'Owned end-to-end delivery of AI-powered search feature serving 200K+ monthly active users.',
    ],
  },
  {
    id: 'exp-2',
    title: 'Software Engineer',
    company: 'StartupXYZ',
    location: 'New York, NY',
    startDate: '2020-06',
    endDate: '2022-02',
    remote: false,
    bullets: [
      'Built React dashboard from scratch, serving 50K+ users with sub-200ms load times.',
      'Implemented GitHub Actions CI/CD pipelines, cutting release cycle from 2 weeks to 2 days.',
      'Integrated Stripe payment processing handling $2M+ in annual transaction volume.',
    ],
  },
];

const SAMPLE_EDUCATION: Education[] = [
  {
    id: 'edu-1',
    degree: 'B.S. Computer Science',
    school: 'University of California, Berkeley',
    year: '2020',
    gpa: '3.82',
    courses: 'Data Structures, Algorithms, Machine Learning, Distributed Systems, Operating Systems',
  },
];

const SAMPLE_SKILLS: Skills = {
  technical: ['React', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL', 'Docker', 'AWS', 'GraphQL', 'Redis', 'Kubernetes'],
  soft: ['Leadership', 'Communication', 'Problem Solving', 'Team Collaboration', 'Mentorship', 'Agile'],
  tools: ['Git', 'Jira', 'Figma', 'VS Code', 'Postman', 'Datadog', 'Terraform'],
  langSkills: ['JavaScript', 'TypeScript', 'Python', 'Go', 'SQL', 'Bash'],
};

const SAMPLE_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'AplicaAI',
    url: 'github.com/alexchen/aplica-ai',
    description: 'Open-source AI-powered job application tracker with automated resume tailoring, ATS scoring, and multi-agent research capabilities.',
    techStack: ['Electron', 'React', 'TypeScript', 'PostgreSQL', 'Prisma', 'LangChain'],
  },
  {
    id: 'proj-2',
    name: 'NeuralSearch',
    url: 'neuralsearch.io',
    description: 'Semantic search engine built on vector embeddings with hybrid BM25 + cosine similarity ranking for enterprise knowledge bases.',
    techStack: ['Python', 'FastAPI', 'Pinecone', 'OpenAI', 'Next.js'],
  },
];

const SAMPLE_CERTIFICATIONS: Certification[] = [
  { id: 'cert-1', name: 'AWS Solutions Architect – Associate', issuer: 'Amazon Web Services', date: '2023-08', credentialId: 'SAA-C03-123456' },
  { id: 'cert-2', name: 'Professional Scrum Master I', issuer: 'Scrum.org', date: '2022-04', credentialId: 'PSM-I-789012' },
];

const SAMPLE_LANGUAGES: Language[] = [
  { id: 'lang-1', language: 'English', proficiency: 'Native' },
  { id: 'lang-2', language: 'Mandarin', proficiency: 'Professional' },
  { id: 'lang-3', language: 'Spanish', proficiency: 'Conversational' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResumeBuilder() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [activeSection, setActiveSection] = useState<SectionId>('personal');
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>(SAMPLE_PERSONAL);
  const [summary, setSummary] = useState(SAMPLE_SUMMARY);
  const [experiences, setExperiences] = useState<Experience[]>(SAMPLE_EXPERIENCES);
  const [education, setEducation] = useState<Education[]>(SAMPLE_EDUCATION);
  const [skills, setSkills] = useState<Skills>(SAMPLE_SKILLS);
  const [projects, setProjects] = useState<Project[]>(SAMPLE_PROJECTS);
  const [certifications, setCertifications] = useState<Certification[]>(SAMPLE_CERTIFICATIONS);
  const [languages, setLanguages] = useState<Language[]>(SAMPLE_LANGUAGES);

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('modern');
  const [targetJob, setTargetJob] = useState('Senior Frontend Engineer');
  const [activeSkillTab, setActiveSkillTab] = useState<SkillCategory>('technical');
  const [newSkillInput, setNewSkillInput] = useState('');
  const [newBullets, setNewBullets] = useState<Record<string, string>>({});
  const [newTechInputs, setNewTechInputs] = useState<Record<string, string>>({});
  const [expandedExps, setExpandedExps] = useState<Set<string>>(new Set(['exp-1', 'exp-2']));
  const [newLangInput, setNewLangInput] = useState('');
  const [newLangProf, setNewLangProf] = useState('Professional');
  const [showVersions, setShowVersions] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // ── Derived: ATS score ────────────────────────────────────────────────────

  const atsScore = (() => {
    let s = 0;
    if (personalInfo.name && personalInfo.email) s += 10;
    if (summary.length > 100) s += 15;
    if (experiences.length >= 2) s += 20;
    else if (experiences.length === 1) s += 12;
    if (education.length > 0 && education[0].degree) s += 10;
    const totalSkills = skills.technical.length + skills.soft.length;
    if (totalSkills >= 8) s += 15;
    else if (totalSkills > 0) s += 8;
    if (projects.length >= 2) s += 10;
    else if (projects.length === 1) s += 6;
    if (certifications.length > 0) s += 10;
    if (languages.length > 0) s += 5;
    if (targetJob.length > 0) s += 5;
    return Math.min(s, 100);
  })();

  const atsOffset = ATS_CIRCUMFERENCE - (atsScore / 100) * ATS_CIRCUMFERENCE;
  const atsStroke = atsScore >= 80 ? '#39ff14' : atsScore >= 60 ? '#ffbe0b' : '#ff073a';
  const atsScoreLabel = atsScore >= 80 ? 'Excellent' : atsScore >= 60 ? 'Good' : 'Needs Work';
  const atsScoreTextCls = atsScore >= 80 ? 'text-neon-green' : atsScore >= 60 ? 'text-neon-amber' : 'text-red-400';

  // ── Derived: keyword analysis ─────────────────────────────────────────────

  const allResumeText = [
    summary,
    ...experiences.flatMap(e => [e.title, e.company, ...e.bullets]),
    ...skills.technical, ...skills.soft, ...skills.tools, ...skills.langSkills,
    ...projects.flatMap(p => [p.name, p.description, ...p.techStack]),
    ...certifications.map(c => c.name),
  ].join(' ').toLowerCase();

  const matchedKws = TARGET_KEYWORDS.filter(kw => allResumeText.includes(kw.toLowerCase()));
  const missingKws = TARGET_KEYWORDS.filter(kw => !allResumeText.includes(kw.toLowerCase()));
  const kwMatchPct = Math.round((matchedKws.length / TARGET_KEYWORDS.length) * 100);

  // ── Section completion ────────────────────────────────────────────────────

  const getSectionStatus = useCallback((id: SectionId): CompletionStatus => {
    switch (id) {
      case 'personal': {
        const { name, email, phone, location } = personalInfo;
        if (name && email && phone && location) return 'complete';
        if (name || email) return 'partial';
        return 'empty';
      }
      case 'summary':
        if (summary.length >= 100) return 'complete';
        if (summary.length > 0) return 'partial';
        return 'empty';
      case 'experience':
        if (experiences.length >= 2) return 'complete';
        if (experiences.length === 1) return 'partial';
        return 'empty';
      case 'education':
        if (education.length > 0 && education[0].degree && education[0].school) return 'complete';
        if (education.length > 0) return 'partial';
        return 'empty';
      case 'skills': {
        const total = skills.technical.length + skills.soft.length;
        if (total >= 8) return 'complete';
        if (total > 0) return 'partial';
        return 'empty';
      }
      case 'projects':
        if (projects.length >= 2) return 'complete';
        if (projects.length === 1) return 'partial';
        return 'empty';
      case 'certifications':
        if (certifications.length > 0) return 'complete';
        return 'empty';
      case 'languages':
        if (languages.length >= 2) return 'complete';
        if (languages.length === 1) return 'partial';
        return 'empty';
      default:
        return 'empty';
    }
  }, [personalInfo, summary, experiences, education, skills, projects, certifications, languages]);

  const completionDotCls = (status: CompletionStatus) =>
    status === 'complete' ? 'bg-neon-green' : status === 'partial' ? 'bg-neon-amber' : 'bg-dark-600';

  // ── Experience handlers ───────────────────────────────────────────────────

  const updateExp = (id: string, field: keyof Experience, value: string | boolean | string[]) =>
    setExperiences(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));

  const addBullet = (expId: string) => {
    const text = (newBullets[expId] ?? '').trim();
    if (!text) return;
    const exp = experiences.find(e => e.id === expId);
    if (!exp) return;
    updateExp(expId, 'bullets', [...exp.bullets, text]);
    setNewBullets(prev => ({ ...prev, [expId]: '' }));
  };

  const removeBullet = (expId: string, idx: number) => {
    const exp = experiences.find(e => e.id === expId);
    if (!exp) return;
    updateExp(expId, 'bullets', exp.bullets.filter((_, i) => i !== idx));
  };

  const addExperience = () => {
    const id = `exp-${Date.now()}`;
    setExperiences(prev => [...prev, { id, title: '', company: '', location: '', startDate: '', endDate: '', remote: false, bullets: [] }]);
    setExpandedExps(prev => new Set([...prev, id]));
  };

  // ── Education handlers ────────────────────────────────────────────────────

  const updateEdu = (id: string, field: keyof Education, value: string) =>
    setEducation(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));

  const addEducation = () =>
    setEducation(prev => [...prev, { id: `edu-${Date.now()}`, degree: '', school: '', year: '', gpa: '', courses: '' }]);

  // ── Skills handlers ───────────────────────────────────────────────────────

  const addSkill = () => {
    const s = newSkillInput.trim();
    if (!s) return;
    setSkills(prev => ({ ...prev, [activeSkillTab]: [...prev[activeSkillTab], s] }));
    setNewSkillInput('');
  };

  const removeSkill = (cat: SkillCategory, idx: number) =>
    setSkills(prev => ({ ...prev, [cat]: prev[cat].filter((_, i) => i !== idx) }));

  // ── Project handlers ──────────────────────────────────────────────────────

  const updateProject = (id: string, field: keyof Project, value: string | string[]) =>
    setProjects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

  const addProjectTech = (projId: string) => {
    const text = (newTechInputs[projId] ?? '').trim();
    if (!text) return;
    const proj = projects.find(p => p.id === projId);
    if (!proj) return;
    updateProject(projId, 'techStack', [...proj.techStack, text]);
    setNewTechInputs(prev => ({ ...prev, [projId]: '' }));
  };

  const removeProjectTech = (projId: string, idx: number) => {
    const proj = projects.find(p => p.id === projId);
    if (!proj) return;
    updateProject(projId, 'techStack', proj.techStack.filter((_, i) => i !== idx));
  };

  const addProject = () =>
    setProjects(prev => [...prev, { id: `proj-${Date.now()}`, name: '', url: '', description: '', techStack: [] }]);

  // ── Certification handlers ────────────────────────────────────────────────

  const updateCert = (id: string, field: keyof Certification, value: string) =>
    setCertifications(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));

  const addCertification = () =>
    setCertifications(prev => [...prev, { id: `cert-${Date.now()}`, name: '', issuer: '', date: '', credentialId: '' }]);

  // ── Language handlers ─────────────────────────────────────────────────────

  const addLanguage = () => {
    if (!newLangInput.trim()) return;
    setLanguages(prev => [...prev, { id: `lang-${Date.now()}`, language: newLangInput.trim(), proficiency: newLangProf }]);
    setNewLangInput('');
  };

  // ── Simulate AI generation ────────────────────────────────────────────────

  const simulateAi = () => {
    setIsAiGenerating(true);
    setTimeout(() => setIsAiGenerating(false), 1600);
  };

  // ── Section navigation ────────────────────────────────────────────────────

  const navigateTo = (id: SectionId) => {
    setActiveSection(id);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  // ── Shared class strings ──────────────────────────────────────────────────

  const inputCls = 'w-full bg-dark-950 border border-glass-border rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-dark-500 focus:outline-none focus:border-neon-cyan/50 transition-colors';
  const labelCls = 'block text-xs text-dark-400 uppercase tracking-wider mb-1';
  const cardCls = 'bg-dark-800 border border-glass-border rounded-xl p-4 mb-4';

  // ── Section renderers ─────────────────────────────────────────────────────

  const renderPersonal = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
            <input className="w-full bg-dark-950 border border-glass-border rounded-lg pl-9 pr-3 py-2 text-sm text-slate-300 placeholder-dark-500 focus:outline-none focus:border-neon-cyan/50 transition-colors"
              value={personalInfo.name}
              onChange={e => setPersonalInfo(p => ({ ...p, name: e.target.value }))}
              placeholder="Alex Chen" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
            <input className="w-full bg-dark-950 border border-glass-border rounded-lg pl-9 pr-3 py-2 text-sm text-slate-300 placeholder-dark-500 focus:outline-none focus:border-neon-cyan/50 transition-colors"
              value={personalInfo.email}
              onChange={e => setPersonalInfo(p => ({ ...p, email: e.target.value }))}
              placeholder="alex@email.com" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
            <input className="w-full bg-dark-950 border border-glass-border rounded-lg pl-9 pr-3 py-2 text-sm text-slate-300 placeholder-dark-500 focus:outline-none focus:border-neon-cyan/50 transition-colors"
              value={personalInfo.phone}
              onChange={e => setPersonalInfo(p => ({ ...p, phone: e.target.value }))}
              placeholder="+1 (555) 000-0000" />
          </div>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
            <input className="w-full bg-dark-950 border border-glass-border rounded-lg pl-9 pr-3 py-2 text-sm text-slate-300 placeholder-dark-500 focus:outline-none focus:border-neon-cyan/50 transition-colors"
              value={personalInfo.location}
              onChange={e => setPersonalInfo(p => ({ ...p, location: e.target.value }))}
              placeholder="City, State" />
          </div>
        </div>
        <div>
          <label className={labelCls}>LinkedIn URL</label>
          <div className="relative">
            <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
            <input className="w-full bg-dark-950 border border-glass-border rounded-lg pl-9 pr-3 py-2 text-sm text-slate-300 placeholder-dark-500 focus:outline-none focus:border-neon-cyan/50 transition-colors"
              value={personalInfo.linkedin}
              onChange={e => setPersonalInfo(p => ({ ...p, linkedin: e.target.value }))}
              placeholder="linkedin.com/in/username" />
          </div>
        </div>
        <div>
          <label className={labelCls}>GitHub URL</label>
          <div className="relative">
            <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
            <input className="w-full bg-dark-950 border border-glass-border rounded-lg pl-9 pr-3 py-2 text-sm text-slate-300 placeholder-dark-500 focus:outline-none focus:border-neon-cyan/50 transition-colors"
              value={personalInfo.github}
              onChange={e => setPersonalInfo(p => ({ ...p, github: e.target.value }))}
              placeholder="github.com/username" />
          </div>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Portfolio / Website</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
            <input className="w-full bg-dark-950 border border-glass-border rounded-lg pl-9 pr-3 py-2 text-sm text-slate-300 placeholder-dark-500 focus:outline-none focus:border-neon-cyan/50 transition-colors"
              value={personalInfo.portfolio}
              onChange={e => setPersonalInfo(p => ({ ...p, portfolio: e.target.value }))}
              placeholder="yoursite.dev" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderSummary = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-dark-400">Craft a compelling 2–4 sentence overview of your expertise and value.</p>
        <span className={`text-xs font-mono ${summary.length >= 100 ? 'text-neon-green' : 'text-neon-amber'}`}>
          {summary.length} chars
        </span>
      </div>
      <textarea
        className="w-full h-40 bg-dark-950 border border-glass-border rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-dark-500 focus:outline-none focus:border-neon-cyan/50 transition-colors resize-none leading-relaxed"
        value={summary}
        onChange={e => setSummary(e.target.value)}
        placeholder="Experienced engineer with…"
      />
      <button
        onClick={simulateAi}
        disabled={isAiGenerating}
        className="flex items-center gap-2 px-4 py-2 bg-neon-purple/10 border border-neon-purple/30 rounded-lg text-neon-purple text-xs font-semibold hover:bg-neon-purple/20 transition-colors disabled:opacity-50"
      >
        {isAiGenerating
          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          : <Wand2 className="w-3.5 h-3.5" />}
        {isAiGenerating ? 'Generating…' : 'AI Generate Summary'}
      </button>
    </div>
  );

  const renderExperience = () => (
    <div className="space-y-4">
      {experiences.map(exp => {
        const isOpen = expandedExps.has(exp.id);
        return (
          <div key={exp.id} className={cardCls}>
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setExpandedExps(prev => {
                  const s = new Set(prev);
                  isOpen ? s.delete(exp.id) : s.add(exp.id);
                  return s;
                })}
                className="flex items-center gap-2 flex-1 text-left"
              >
                <ChevronRight className={`w-3.5 h-3.5 text-dark-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                <div>
                  <span className="text-sm font-semibold text-white">{exp.title || 'New Position'}</span>
                  {exp.company && <span className="text-xs text-dark-400 ml-2">@ {exp.company}</span>}
                </div>
              </button>
              <button onClick={() => setExperiences(prev => prev.filter(e => e.id !== exp.id))}
                className="p-1 text-dark-600 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {isOpen && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Job Title</label>
                    <input className={inputCls} value={exp.title}
                      onChange={e => updateExp(exp.id, 'title', e.target.value)}
                      placeholder="Senior Engineer" />
                  </div>
                  <div>
                    <label className={labelCls}>Company</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
                      <input className="w-full bg-dark-950 border border-glass-border rounded-lg pl-9 pr-3 py-2 text-sm text-slate-300 placeholder-dark-500 focus:outline-none focus:border-neon-cyan/50 transition-colors"
                        value={exp.company}
                        onChange={e => updateExp(exp.id, 'company', e.target.value)}
                        placeholder="TechCorp Inc." />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Location</label>
                    <input className={inputCls} value={exp.location}
                      onChange={e => updateExp(exp.id, 'location', e.target.value)}
                      placeholder="City, State" />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className={labelCls}>Start</label>
                      <input className={inputCls} type="month" value={exp.startDate}
                        onChange={e => updateExp(exp.id, 'startDate', e.target.value)} />
                    </div>
                    <div className="flex-1">
                      <label className={labelCls}>End</label>
                      <input className={inputCls} type="month" value={exp.endDate}
                        placeholder="Present"
                        onChange={e => updateExp(exp.id, 'endDate', e.target.value)} />
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <div className={`w-8 h-4 rounded-full transition-all ${exp.remote ? 'bg-neon-cyan/80' : 'bg-dark-600'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow mt-0.5 transition-transform ${exp.remote ? 'translate-x-4 ml-0.5' : 'ml-0.5'}`} />
                  </div>
                  <input type="checkbox" className="hidden" checked={exp.remote}
                    onChange={e => updateExp(exp.id, 'remote', e.target.checked)} />
                  <span className="text-xs text-dark-400">Remote position</span>
                </label>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls}>Bullet Points</label>
                    <button onClick={simulateAi} className="flex items-center gap-1 text-xs text-neon-purple hover:text-neon-purple/80 transition-colors">
                      <Sparkles className="w-3 h-3" /> AI Generate
                    </button>
                  </div>
                  <ul className="space-y-2 mb-2">
                    {exp.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 group">
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan/60 mt-2 flex-shrink-0" />
                        <span className="flex-1 text-sm text-slate-300 leading-relaxed">{b}</span>
                        <button onClick={() => removeBullet(exp.id, i)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-dark-600 hover:text-red-400 transition-all flex-shrink-0 mt-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <input className="flex-1 bg-dark-950 border border-glass-border rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-dark-500 focus:outline-none focus:border-neon-cyan/50 transition-colors"
                      value={newBullets[exp.id] ?? ''}
                      onChange={e => setNewBullets(prev => ({ ...prev, [exp.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addBullet(exp.id)}
                      placeholder="Add achievement with metrics…" />
                    <button onClick={() => addBullet(exp.id)}
                      className="px-3 py-2 bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-neon-cyan/20 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <button onClick={addExperience}
        className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-neon-cyan/20 rounded-xl text-neon-cyan/60 hover:border-neon-cyan/40 hover:text-neon-cyan hover:bg-neon-cyan/5 transition-all text-sm">
        <Plus className="w-4 h-4" /> Add Experience
      </button>
    </div>
  );

  const renderEducation = () => (
    <div className="space-y-4">
      {education.map(edu => (
        <div key={edu.id} className={cardCls}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-neon-green" />
              <span className="text-sm font-semibold text-white">{edu.degree || 'New Degree'}</span>
            </div>
            <button onClick={() => setEducation(prev => prev.filter(e => e.id !== edu.id))}
              className="p-1 text-dark-600 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Degree & Major</label>
              <input className={inputCls} value={edu.degree}
                onChange={e => updateEdu(edu.id, 'degree', e.target.value)}
                placeholder="B.S. Computer Science" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>School / University</label>
              <input className={inputCls} value={edu.school}
                onChange={e => updateEdu(edu.id, 'school', e.target.value)}
                placeholder="University of California, Berkeley" />
            </div>
            <div>
              <label className={labelCls}>Graduation Year</label>
              <input className={inputCls} value={edu.year}
                onChange={e => updateEdu(edu.id, 'year', e.target.value)}
                placeholder="2024" />
            </div>
            <div>
              <label className={labelCls}>GPA (optional)</label>
              <input className={inputCls} value={edu.gpa}
                onChange={e => updateEdu(edu.id, 'gpa', e.target.value)}
                placeholder="3.8 / 4.0" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>
                <BookOpen className="inline w-3 h-3 mr-1" />
                Relevant Courses
              </label>
              <input className={inputCls} value={edu.courses}
                onChange={e => updateEdu(edu.id, 'courses', e.target.value)}
                placeholder="Data Structures, Algorithms, ML…" />
            </div>
          </div>
        </div>
      ))}
      <button onClick={addEducation}
        className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-neon-green/20 rounded-xl text-neon-green/60 hover:border-neon-green/40 hover:text-neon-green hover:bg-neon-green/5 transition-all text-sm">
        <Plus className="w-4 h-4" /> Add Education
      </button>
    </div>
  );

  const renderSkills = () => {
    const tab = SKILL_TABS.find(t => t.id === activeSkillTab)!;
    const tagStyle = SKILL_TAG_COLORS[activeSkillTab];
    return (
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {SKILL_TABS.map(t => (
            <button key={t.id}
              onClick={() => setActiveSkillTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${activeSkillTab === t.id ? `${t.activeBg} ${t.activeText} ${t.activeBorder}` : 'bg-transparent border-glass-border text-dark-400 hover:text-dark-300'}`}>
              {t.label}
              <span className="ml-1.5 text-dark-500 font-normal">{skills[t.id].length}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 min-h-12 p-3 bg-dark-950 border border-glass-border rounded-xl">
          {skills[activeSkillTab].map((skill, i) => (
            <span key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${tagStyle.pill} ${tagStyle.pillText}`}>
              {skill}
              <button onClick={() => removeSkill(activeSkillTab, i)} className={`transition-colors ${tagStyle.x}`}>
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {skills[activeSkillTab].length === 0 && (
            <span className="text-xs text-dark-600 self-center ml-1">No {tab.label.toLowerCase()} skills yet…</span>
          )}
        </div>

        <div className="flex gap-2">
          <input className="flex-1 bg-dark-950 border border-glass-border rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-dark-500 focus:outline-none focus:border-neon-cyan/50 transition-colors"
            value={newSkillInput}
            onChange={e => setNewSkillInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSkill()}
            placeholder={`Add ${tab.label.toLowerCase()} skill…`} />
          <button onClick={addSkill}
            className={`px-3 py-2 rounded-lg border transition-colors ${tab.activeBg} ${tab.activeText} ${tab.activeBorder} hover:opacity-80`}>
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 pt-2">
          {SKILL_TABS.map(t => {
            const tc = SKILL_TAG_COLORS[t.id];
            return (
              <div key={t.id} className="text-center">
                <div className={`text-lg font-bold font-mono ${tc.pillText}`}>{skills[t.id].length}</div>
                <div className="text-xs text-dark-500">{t.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderProjects = () => (
    <div className="space-y-4">
      {projects.map(proj => (
        <div key={proj.id} className={cardCls}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-neon-cyan" />
              <span className="text-sm font-semibold text-white">{proj.name || 'New Project'}</span>
            </div>
            <button onClick={() => setProjects(prev => prev.filter(p => p.id !== proj.id))}
              className="p-1 text-dark-600 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Project Name</label>
              <input className={inputCls} value={proj.name}
                onChange={e => updateProject(proj.id, 'name', e.target.value)}
                placeholder="AplicaAI" />
            </div>
            <div>
              <label className={labelCls}>URL / Repo</label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
                <input className="w-full bg-dark-950 border border-glass-border rounded-lg pl-9 pr-3 py-2 text-sm text-slate-300 placeholder-dark-500 focus:outline-none focus:border-neon-cyan/50 transition-colors"
                  value={proj.url}
                  onChange={e => updateProject(proj.id, 'url', e.target.value)}
                  placeholder="github.com/you/project" />
              </div>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Description</label>
              <textarea className="w-full bg-dark-950 border border-glass-border rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-dark-500 focus:outline-none focus:border-neon-cyan/50 transition-colors resize-none h-20 leading-relaxed"
                value={proj.description}
                onChange={e => updateProject(proj.id, 'description', e.target.value)}
                placeholder="Describe your project and its impact…" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Tech Stack</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {proj.techStack.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-neon-cyan/10 border border-neon-cyan/20 rounded-full text-xs text-neon-cyan">
                    {t}
                    <button onClick={() => removeProjectTech(proj.id, i)} className="text-neon-cyan/50 hover:text-neon-cyan transition-colors">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="flex-1 bg-dark-950 border border-glass-border rounded-lg px-3 py-1.5 text-sm text-slate-300 placeholder-dark-500 focus:outline-none focus:border-neon-cyan/50 transition-colors"
                  value={newTechInputs[proj.id] ?? ''}
                  onChange={e => setNewTechInputs(prev => ({ ...prev, [proj.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addProjectTech(proj.id)}
                  placeholder="Add technology…" />
                <button onClick={() => addProjectTech(proj.id)}
                  className="px-3 py-1.5 bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-neon-cyan/20 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
      <button onClick={addProject}
        className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-neon-cyan/20 rounded-xl text-neon-cyan/60 hover:border-neon-cyan/40 hover:text-neon-cyan hover:bg-neon-cyan/5 transition-all text-sm">
        <Plus className="w-4 h-4" /> Add Project
      </button>
    </div>
  );

  const renderCertifications = () => (
    <div className="space-y-4">
      {certifications.map(cert => (
        <div key={cert.id} className={cardCls}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-neon-amber" />
              <span className="text-sm font-semibold text-white">{cert.name || 'New Certification'}</span>
            </div>
            <button onClick={() => setCertifications(prev => prev.filter(c => c.id !== cert.id))}
              className="p-1 text-dark-600 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Certification Name</label>
              <input className={inputCls} value={cert.name}
                onChange={e => updateCert(cert.id, 'name', e.target.value)}
                placeholder="AWS Solutions Architect – Associate" />
            </div>
            <div>
              <label className={labelCls}>Issuing Organization</label>
              <input className={inputCls} value={cert.issuer}
                onChange={e => updateCert(cert.id, 'issuer', e.target.value)}
                placeholder="Amazon Web Services" />
            </div>
            <div>
              <label className={labelCls}>Issue Date</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
                <input className="w-full bg-dark-950 border border-glass-border rounded-lg pl-9 pr-3 py-2 text-sm text-slate-300 placeholder-dark-500 focus:outline-none focus:border-neon-cyan/50 transition-colors"
                  type="month" value={cert.date}
                  onChange={e => updateCert(cert.id, 'date', e.target.value)} />
              </div>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>
                <Hash className="inline w-3 h-3 mr-1" />
                Credential ID
              </label>
              <input className={inputCls} value={cert.credentialId}
                onChange={e => updateCert(cert.id, 'credentialId', e.target.value)}
                placeholder="SAA-C03-123456" />
            </div>
          </div>
        </div>
      ))}
      <button onClick={addCertification}
        className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-neon-amber/20 rounded-xl text-neon-amber/60 hover:border-neon-amber/40 hover:text-neon-amber hover:bg-neon-amber/5 transition-all text-sm">
        <Plus className="w-4 h-4" /> Add Certification
      </button>
    </div>
  );

  const renderLanguages = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        {languages.map(lang => (
          <div key={lang.id} className="flex items-center gap-3 px-4 py-3 bg-dark-800 border border-glass-border rounded-xl group">
            <MessageSquare className="w-4 h-4 text-neon-green flex-shrink-0" />
            <span className="flex-1 text-sm text-white font-medium">{lang.language}</span>
            <span className={`text-xs font-mono font-semibold ${PROF_COLOR[lang.proficiency] ?? 'text-dark-400'}`}>
              {lang.proficiency}
            </span>
            <div className="flex gap-0.5">
              {PROFICIENCY_LEVELS.map((_, lvlIdx) => {
                const profIdx = PROFICIENCY_LEVELS.indexOf(lang.proficiency);
                const filled = lvlIdx >= profIdx;
                return (
                  <div key={lvlIdx}
                    className={`w-2 h-2 rounded-full ${filled ? 'bg-neon-green' : 'bg-dark-600'}`} />
                );
              })}
            </div>
            <button onClick={() => setLanguages(prev => prev.filter(l => l.id !== lang.id))}
              className="opacity-0 group-hover:opacity-100 p-1 text-dark-600 hover:text-red-400 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input className="flex-1 bg-dark-950 border border-glass-border rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-dark-500 focus:outline-none focus:border-neon-green/50 transition-colors"
          value={newLangInput}
          onChange={e => setNewLangInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addLanguage()}
          placeholder="Language name…" />
        <select
          className="bg-dark-950 border border-glass-border rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-neon-green/50 transition-colors"
          value={newLangProf}
          onChange={e => setNewLangProf(e.target.value)}>
          {PROFICIENCY_LEVELS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={addLanguage}
          className="px-3 py-2 bg-neon-green/10 border border-neon-green/30 rounded-lg text-neon-green hover:bg-neon-green/20 transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="bg-dark-800 border border-glass-border rounded-xl p-3">
        <p className="text-xs text-dark-400 mb-2">Proficiency Scale</p>
        <div className="flex gap-3 flex-wrap">
          {PROFICIENCY_LEVELS.map(p => (
            <div key={p} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${PROF_COLOR[p] ?? 'bg-dark-600'} bg-current`} />
              <span className="text-xs text-dark-500">{p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────────

  const tmpl = TEMPLATE_CONFIG[selectedTemplate];

  return (
    <div className="flex h-full bg-dark-950 text-white overflow-hidden font-body">

      {/* ── LEFT SIDEBAR ────────────────────────────────────────────────── */}
      <div className="w-56 flex-shrink-0 border-r border-glass-border flex flex-col bg-dark-900">

        {/* Header */}
        <div className="p-4 border-b border-glass-border">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-neon-cyan" />
            <h2 className="text-xs font-bold text-neon-cyan tracking-widest uppercase font-display">Resume Builder</h2>
          </div>
        </div>

        {/* ATS Score Arc */}
        <div className="p-4 border-b border-glass-border flex flex-col items-center">
          <p className="text-xs text-dark-400 uppercase tracking-wider mb-3 font-mono">ATS Score</p>
          <div className="relative w-24 h-24">
            <svg width="96" height="96" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="38" fill="none" stroke="#1a1a25" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="38" fill="none"
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray="238.76 238.76"
                transform="rotate(-90 50 50)"
                style={{ strokeDashoffset: atsOffset, stroke: atsStroke, transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold font-mono leading-none ${atsScoreTextCls}`}>{atsScore}</span>
              <span className="text-xs text-dark-500 font-mono">/ 100</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: atsStroke }} />
            <span className={`text-xs font-mono ${atsScoreTextCls}`}>{atsScoreLabel}</span>
          </div>
        </div>

        {/* Section Navigator */}
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-xs text-dark-600 uppercase tracking-wider px-2 mb-2 mt-1">Sections</p>
          {SECTION_ORDER.map(id => {
            const status = getSectionStatus(id);
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => navigateTo(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors mb-0.5 border ${isActive ? 'bg-neon-cyan/10 border-neon-cyan/20 text-neon-cyan' : 'border-transparent text-dark-400 hover:bg-dark-800 hover:text-dark-200'}`}
              >
                <span className={isActive ? 'text-neon-cyan' : 'text-dark-600'}>{SECTION_ICONS[id]}</span>
                <span className="flex-1 text-xs font-medium">{SECTION_LABELS[id]}</span>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${completionDotCls(status)}`} />
              </button>
            );
          })}
        </div>

        {/* Completion legend */}
        <div className="p-3 border-t border-glass-border">
          <div className="flex items-center justify-around text-xs text-dark-600">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-neon-green inline-block" />Done</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-neon-amber inline-block" />Partial</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-dark-600 inline-block" />Empty</span>
          </div>
        </div>
      </div>

      {/* ── CENTER PANEL ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Section header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border bg-dark-900/50">
          <div className="flex items-center gap-3">
            <span className="text-neon-cyan">{SECTION_ICONS[activeSection]}</span>
            <h3 className="text-sm font-bold text-white tracking-wide">{SECTION_LABELS[activeSection]}</h3>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              getSectionStatus(activeSection) === 'complete'
                ? 'bg-neon-green/10 text-neon-green border border-neon-green/20'
                : getSectionStatus(activeSection) === 'partial'
                ? 'bg-neon-amber/10 text-neon-amber border border-neon-amber/20'
                : 'bg-dark-700 text-dark-500 border border-dark-600'
            }`}>
              {getSectionStatus(activeSection) === 'complete' && <Check className="w-2.5 h-2.5" />}
              {getSectionStatus(activeSection) === 'complete' ? 'Complete' : getSectionStatus(activeSection) === 'partial' ? 'Partial' : 'Empty'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Prev / Next section buttons */}
            <button
              onClick={() => {
                const idx = SECTION_ORDER.indexOf(activeSection);
                if (idx > 0) navigateTo(SECTION_ORDER[idx - 1]);
              }}
              disabled={SECTION_ORDER.indexOf(activeSection) === 0}
              className="px-2.5 py-1.5 text-xs text-dark-400 hover:text-white border border-glass-border hover:border-dark-500 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              ← Prev
            </button>
            <button
              onClick={() => {
                const idx = SECTION_ORDER.indexOf(activeSection);
                if (idx < SECTION_ORDER.length - 1) navigateTo(SECTION_ORDER[idx + 1]);
              }}
              disabled={SECTION_ORDER.indexOf(activeSection) === SECTION_ORDER.length - 1}
              className="px-2.5 py-1.5 text-xs text-dark-400 hover:text-white border border-glass-border hover:border-dark-500 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              Next →
            </button>
            <button
              onClick={simulateAi}
              disabled={isAiGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg text-neon-cyan text-xs font-semibold hover:bg-neon-cyan/20 transition-colors disabled:opacity-50">
              {isAiGenerating
                ? <RefreshCw className="w-3 h-3 animate-spin" />
                : <Sparkles className="w-3 h-3" />}
              {isAiGenerating ? 'Enhancing…' : 'AI Enhance'}
            </button>
          </div>
        </div>

        {/* Section content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
          {activeSection === 'personal' && renderPersonal()}
          {activeSection === 'summary' && renderSummary()}
          {activeSection === 'experience' && renderExperience()}
          {activeSection === 'education' && renderEducation()}
          {activeSection === 'skills' && renderSkills()}
          {activeSection === 'projects' && renderProjects()}
          {activeSection === 'certifications' && renderCertifications()}
          {activeSection === 'languages' && renderLanguages()}
        </div>

        {/* Section progress bar */}
        <div className="px-6 py-3 border-t border-glass-border bg-dark-900/30">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-dark-500">Overall completion</span>
            <span className="text-xs font-mono text-neon-cyan">
              {SECTION_ORDER.filter(id => getSectionStatus(id) === 'complete').length} / {SECTION_ORDER.length} sections
            </span>
          </div>
          <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full transition-all duration-500"
              style={{ width: `${(SECTION_ORDER.filter(id => getSectionStatus(id) === 'complete').length / SECTION_ORDER.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDEBAR ───────────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 border-l border-glass-border flex flex-col bg-dark-900 overflow-y-auto">

        {/* Template Selector */}
        <div className="p-4 border-b border-glass-border">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-3.5 h-3.5 text-neon-purple" />
            <h4 className="text-xs font-bold text-neon-purple tracking-wider uppercase">Template</h4>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(TEMPLATE_CONFIG) as [TemplateId, typeof tmpl][]).map(([tid, tc]) => (
              <button
                key={tid}
                onClick={() => setSelectedTemplate(tid)}
                className={`relative p-2 rounded-xl border transition-all ${selectedTemplate === tid ? `${tc.accentBorder} ${tc.accentBg}` : `${tc.inactiveBorder} hover:border-dark-500`}`}
              >
                {/* Mini preview */}
                <div className={`h-14 rounded-lg bg-gradient-to-br ${tc.gradientFrom} ${tc.gradientTo} mb-1.5 overflow-hidden flex flex-col gap-1 p-1.5`}>
                  <div className={`h-1.5 rounded-full w-3/4 ${tc.barColor} opacity-80`} />
                  <div className="h-1 rounded-full w-1/2 bg-dark-500" />
                  <div className="h-1 rounded-full w-2/3 bg-dark-500 opacity-60" />
                  <div className="h-1 rounded-full w-1/2 bg-dark-500 opacity-40" />
                  <div className={`h-1 rounded-full w-1/3 ${tc.barColor} opacity-50 mt-0.5`} />
                </div>
                <div className={`text-center text-xs font-semibold ${selectedTemplate === tid ? tc.accentText : 'text-dark-400'}`}>{tc.label}</div>
                {selectedTemplate === tid && (
                  <span className="absolute top-1 right-1">
                    <Check className={`w-3 h-3 ${tc.accentText}`} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Target Job */}
        <div className="p-4 border-b border-glass-border">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-3.5 h-3.5 text-neon-amber" />
            <h4 className="text-xs font-bold text-neon-amber tracking-wider uppercase">Target Role</h4>
          </div>
          <input
            className="w-full bg-dark-950 border border-glass-border rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-dark-500 focus:outline-none focus:border-neon-amber/50 transition-colors"
            value={targetJob}
            onChange={e => setTargetJob(e.target.value)}
            placeholder="e.g. Senior Frontend Engineer" />
          <p className="text-xs text-dark-600 mt-1.5">Optimizes keyword matching for ATS systems</p>
        </div>

        {/* ATS Analysis */}
        <div className="p-4 border-b border-glass-border">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-3.5 h-3.5 text-neon-cyan" />
            <h4 className="text-xs font-bold text-neon-cyan tracking-wider uppercase">ATS Analysis</h4>
          </div>

          {/* Keyword match % */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-dark-400">Keyword match</span>
              <span className={`text-sm font-bold font-mono ${kwMatchPct >= 70 ? 'text-neon-green' : kwMatchPct >= 50 ? 'text-neon-amber' : 'text-red-400'}`}>
                {kwMatchPct}%
              </span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${kwMatchPct >= 70 ? 'bg-neon-green' : kwMatchPct >= 50 ? 'bg-neon-amber' : 'bg-red-400'}`}
                style={{ width: `${kwMatchPct}%` }}
              />
            </div>
          </div>

          {/* Missing keywords */}
          {missingKws.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-dark-500 mb-1.5 uppercase tracking-wider">Missing Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {missingKws.map(kw => (
                  <span key={kw} className="px-2 py-0.5 bg-red-400/10 border border-red-400/20 rounded-full text-xs text-red-400">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Matched keywords */}
          {matchedKws.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-dark-500 mb-1.5 uppercase tracking-wider">Matched</p>
              <div className="flex flex-wrap gap-1.5">
                {matchedKws.slice(0, 5).map(kw => (
                  <span key={kw} className="px-2 py-0.5 bg-neon-green/10 border border-neon-green/20 rounded-full text-xs text-neon-green">
                    {kw}
                  </span>
                ))}
                {matchedKws.length > 5 && (
                  <span className="text-xs text-dark-500 self-center">+{matchedKws.length - 5} more</span>
                )}
              </div>
            </div>
          )}

          {/* Suggestions */}
          <div>
            <p className="text-xs text-dark-500 mb-1.5 uppercase tracking-wider">Suggestions</p>
            <ul className="space-y-1.5">
              {ATS_SUGGESTIONS.slice(0, missingKws.length > 0 ? 3 : 1).map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-dark-400">
                  <span className="w-1 h-1 rounded-full bg-neon-amber mt-1.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Export */}
        <div className="p-4 border-b border-glass-border">
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-3.5 h-3.5 text-neon-cyan" />
            <h4 className="text-xs font-bold text-neon-cyan tracking-wider uppercase">Export</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="glow-button-cyan col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold">
              <Download className="w-4 h-4" /> Export PDF
            </button>
            <button className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-neon-purple/10 border border-neon-purple/30 text-neon-purple text-xs hover:bg-neon-purple/20 transition-colors">
              <FileText className="w-3.5 h-3.5" /> DOCX
            </button>
            <button className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-neon-amber/10 border border-neon-amber/30 text-neon-amber text-xs hover:bg-neon-amber/20 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> JSON
            </button>
            <button className="col-span-2 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-dark-800 border border-glass-border text-dark-300 text-xs hover:bg-dark-700 hover:text-white transition-colors">
              <Copy className="w-3.5 h-3.5" /> Copy as Markdown
            </button>
          </div>
        </div>

        {/* Auto-fill + Actions */}
        <div className="p-4 border-b border-glass-border">
          <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-neon-cyan/5 border border-neon-cyan/20 rounded-xl text-neon-cyan text-xs font-semibold hover:bg-neon-cyan/10 hover:border-neon-cyan/40 transition-colors">
            <Zap className="w-3.5 h-3.5" />
            Auto-fill from LinkedIn
          </button>
        </div>

        {/* Save / Load Versions */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Save className="w-3.5 h-3.5 text-neon-green" />
            <h4 className="text-xs font-bold text-neon-green tracking-wider uppercase">Versions</h4>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowVersions(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 bg-dark-800 border border-glass-border rounded-lg text-sm text-slate-300 hover:border-neon-green/30 transition-colors">
              <span className="text-xs">{RESUME_VERSIONS[0]}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-dark-400 transition-transform ${showVersions ? 'rotate-180' : ''}`} />
            </button>
            {showVersions && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-dark-800 border border-glass-border rounded-xl shadow-xl overflow-hidden z-10">
                {RESUME_VERSIONS.map((v, i) => (
                  <button
                    key={v}
                    onClick={() => setShowVersions(false)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors hover:bg-dark-700 ${i === 0 ? 'text-neon-green border-b border-glass-border' : 'text-dark-400'}`}>
                    {i === 0 && <span className="w-1.5 h-1.5 rounded-full bg-neon-green flex-shrink-0" />}
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-neon-green/10 border border-neon-green/30 rounded-lg text-neon-green text-xs hover:bg-neon-green/20 transition-colors">
              <Save className="w-3 h-3" /> Save
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-dark-800 border border-glass-border rounded-lg text-dark-400 text-xs hover:bg-dark-700 hover:text-white transition-colors">
              <Copy className="w-3 h-3" /> Duplicate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
