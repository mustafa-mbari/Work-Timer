import {
  Timer, FolderKanban, BarChart3, ShieldCheck, Cloud, FileSpreadsheet,
  Download, FolderPlus, Play, ShieldCheck as Shield, WifiOff, Zap,
} from 'lucide-react'

export type AccentKey = 'indigo' | 'emerald' | 'violet'

export const ACCENT_CLASSES: Record<AccentKey, { bg: string; icon: string; pill: string }> = {
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    icon: 'text-indigo-500 dark:text-indigo-400',
    pill: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    icon: 'text-emerald-600 dark:text-emerald-400',
    pill: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    icon: 'text-violet-600 dark:text-violet-400',
    pill: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  },
}

export const PRIMARY_FEATURES = [
  {
    icon: Timer,
    title: 'Three Modes, One Extension',
    body: 'Stopwatch, manual entry, or disciplined Pomodoro focus sessions — switch any time. Your project and description carry over automatically so you never lose context.',
    accent: 'indigo' as AccentKey,
  },
  {
    icon: ShieldCheck,
    title: 'Your Data, Your Browser',
    body: 'Everything is stored directly in your browser via chrome.storage.local. No server ever sees your data unless you choose cloud sync. Works fully offline — on a plane, in a cabin, wherever you work.',
    accent: 'emerald' as AccentKey,
  },
  {
    icon: BarChart3,
    title: 'Know Your Patterns',
    body: 'Weekly and monthly analytics: time by project, daily session charts, and export-ready breakdowns for invoicing. Spot where your hours go and reclaim your focus.',
    accent: 'violet' as AccentKey,
  },
]

export const STEPS = [
  {
    icon: Download,
    title: 'Install in seconds',
    desc: 'Click "Add to Chrome". No permissions beyond storage and alarms. The extension icon appears instantly in your toolbar.',
  },
  {
    icon: FolderPlus,
    title: 'Create a project',
    desc: 'Name it, pick a colour, set an optional hour target. Takes 10 seconds. Up to 5 projects on the free plan.',
  },
  {
    icon: Play,
    title: 'Start tracking',
    desc: 'Hit the play button. Pause for breaks. Stop when done. Your history builds automatically — nothing to remember.',
  },
]

export const ALL_FEATURES = [
  { icon: Timer, title: 'Stopwatch, Manual & Pomodoro', desc: 'Three timer modes. Switch anytime, description carries over.' },
  { icon: FolderKanban, title: 'Project Tracking', desc: 'Colour-coded projects with optional hour targets.' },
  { icon: BarChart3, title: 'Weekly & Monthly Stats', desc: 'Clear charts showing exactly where your time goes.' },
  { icon: ShieldCheck, title: 'Privacy First', desc: 'Data lives in your browser. No tracking, no ads.' },
  { icon: Cloud, title: 'Cloud Sync (Premium)', desc: 'Sync across all your devices in real time.' },
  { icon: FileSpreadsheet, title: 'Export (Premium)', desc: 'Export to CSV or Excel for invoicing or reporting.' },
]

export const TESTIMONIALS = [
  {
    initials: 'SK',
    name: 'Sarah K.',
    role: 'Freelance Designer',
    quote: "I've tried every time tracker out there. Work Timer is the first one I actually keep using. It's in my browser, doesn't nag me, and just works.",
    stars: 5,
  },
  {
    initials: 'MT',
    name: 'Marcus T.',
    role: 'Software Engineer',
    quote: 'The Pomodoro integration alone is worth it. I pair it with my project board and know exactly how long each feature took. Billing clients is a breeze.',
    stars: 5,
  },
  {
    initials: 'PR',
    name: 'Priya R.',
    role: 'Agency Project Manager',
    quote: "We needed something the whole team could use without an IT budget. The free tier covers 80% of what we need, and the yearly plan is a no-brainer.",
    stars: 5,
  },
]

export const PAIN_POINTS = [
  'Losing track of billable hours across client projects',
  'Spreadsheets you forget to update mid-task',
  'Apps that need an account just to start a timer',
  'Heavy desktop apps eating RAM and disk space',
]

export const SOLUTIONS = [
  'One click to start — no login, no setup required',
  'Lives in your browser toolbar, always one click away',
  'All data stays on your device by default, offline-first',
  "Cloud sync across devices when you're ready (Premium)",
]

export const FAQS = [
  {
    q: 'Do I need an account to use it?',
    a: 'No. The extension works completely offline with zero account required. Create an account only when you want cloud sync or access to the companion dashboard.',
  },
  {
    q: 'Where is my data stored?',
    a: 'Locally in your browser via chrome.storage.local. Premium users can optionally enable Supabase cloud sync — your data is never sold or shared with third parties.',
  },
  {
    q: "What's the difference between Free and Premium?",
    a: 'Free gives you up to 5 projects, 30 days of history, and all three timer modes. Premium unlocks unlimited projects, full history, CSV & Excel export, cloud sync, and advanced analytics.',
  },
  {
    q: 'Can I export my time entries?',
    a: 'Yes, with a Premium plan. Export to CSV or Excel filtered by project and date range — formatted and ready for client invoicing.',
  },
  {
    q: 'Does it work offline?',
    a: 'Entirely. The extension uses browser storage and Chrome alarms — no internet connection is ever required. Cloud sync runs in the background when connectivity is available.',
  },
  {
    q: 'Is there a mobile app?',
    a: 'Work Timer is a Chrome extension today. A companion web dashboard is available for Premium users at w-timer.com for analytics and entry management on any screen.',
  },
]

export const TRUST_BADGES = [
  { icon: Shield, label: 'Privacy first' },
  { icon: WifiOff, label: 'Offline-first' },
  { icon: Zap, label: 'No account needed' },
]
