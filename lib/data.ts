import type { PreCallTalkingPoints } from "@/lib/post-call-context"

export type Stage = "not_contacted" | "in_progress" | "responded" | "met_connected"

export type TagTone = "industry" | "warm" | "cold" | "followup"

export interface Tag {
  label: string
  tone: TagTone
}

export interface Contact {
  id: string
  name: string
  role: string
  company: string
  priorCompany?: string
  priorRole?: string
  city?: string
  undergraduateUniversity?: string
  graduateUniversity?: string
  stage: Stage
  tags: Tag[]
  daysAgo: number
  daysLabel: string
  connectionType: string
  source: string
  goal: string
  notes: string
  linkedinUrl?: string
  email?: string
  mutualCount?: number | null
  lastActionAt?: string | null
  lastEmailedAt?: string | null
  createdAt?: string
  followupNote?: string | null
  followUpOverdue: boolean
  followUpNote?: string
  preCallNotes?: string
  preCallTalkingPoints?: PreCallTalkingPoints | null
  trackCalendar: boolean
}

export type { PreCallTalkingPoints } from "@/lib/post-call-context"

export const STAGES: { id: Stage; label: string }[] = [
  { id: "not_contacted", label: "Not contacted" },
  { id: "in_progress", label: "In progress" },
  { id: "responded", label: "Responded" },
  { id: "met_connected", label: "Met / Connected" },
]

export const contacts: Contact[] = [
  {
    id: "1",
    name: "Maya Chen",
    role: "VP of Engineering",
    company: "Stripe",
    stage: "not_contacted",
    tags: [
      { label: "Fintech", tone: "industry" },
      { label: "Cold", tone: "cold" },
    ],
    daysAgo: 2,
    daysLabel: "Added 2d ago",
    connectionType: "2nd degree (via LinkedIn)",
    source: "LinkedIn search",
    goal: "Learn about platform engineering roles and team structure.",
    notes: "Recently spoke at a fintech conference about scaling payment systems. Shared interest in distributed systems.",
    followUpOverdue: false,
    trackCalendar: true,
  },
  {
    id: "2",
    name: "David Okafor",
    role: "Senior Recruiter",
    company: "Notion",
    stage: "not_contacted",
    tags: [
      { label: "SaaS", tone: "industry" },
      { label: "Warm", tone: "warm" },
    ],
    daysAgo: 5,
    daysLabel: "Added 5d ago",
    connectionType: "Mutual connection (Sara P.)",
    source: "Referral from Sara",
    goal: "Get introduced to the product design hiring team.",
    notes: "Sara mentioned he's very responsive. Best to reference our mutual connection in the intro.",
    followUpOverdue: false,
    trackCalendar: true,
  },
  {
    id: "3",
    name: "Priya Sharma",
    role: "Product Lead",
    company: "Figma",
    stage: "not_contacted",
    tags: [
      { label: "Design", tone: "industry" },
      { label: "Warm", tone: "warm" },
    ],
    daysAgo: 1,
    daysLabel: "Added 1d ago",
    connectionType: "1st degree",
    source: "Alumni network",
    goal: "Explore product management opportunities and learn about Figma's roadmap process.",
    notes: "We attended the same university. Draft references our shared alma mater and her recent blog post on product discovery.",
    followUpOverdue: false,
    trackCalendar: true,
  },
  {
    id: "4",
    name: "James Liu",
    role: "Founder & CEO",
    company: "Ramp",
    stage: "in_progress",
    tags: [
      { label: "Fintech", tone: "industry" },
      { label: "Cold", tone: "cold" },
    ],
    daysAgo: 3,
    daysLabel: "In progress 3d ago",
    connectionType: "No connection",
    source: "Company blog",
    goal: "Understand early-stage growth strategy and potential advisory fit.",
    notes: "Draft is ready but needs a stronger hook. Consider referencing their recent Series C announcement.",
    followUpOverdue: false,
    trackCalendar: true,
  },
  {
    id: "5",
    name: "Elena Rossi",
    role: "Engineering Manager",
    company: "Linear",
    stage: "in_progress",
    tags: [
      { label: "SaaS", tone: "industry" },
      { label: "Follow up", tone: "followup" },
    ],
    daysAgo: 9,
    daysLabel: "In progress 9d ago",
    connectionType: "2nd degree",
    source: "Twitter / X",
    goal: "Discuss engineering culture and remote-first team practices.",
    notes: "Sent a thoughtful note about their approach to async work. No reply yet. A gentle nudge may help.",
    followUpOverdue: true,
    followUpNote: "Follow-up was due 2 days ago. Send a short, friendly check-in.",
    trackCalendar: true,
  },
  {
    id: "6",
    name: "Marcus Bell",
    role: "Head of Talent",
    company: "Vercel",
    stage: "in_progress",
    tags: [
      { label: "DevTools", tone: "industry" },
      { label: "Warm", tone: "warm" },
    ],
    daysAgo: 4,
    daysLabel: "In progress 4d ago",
    connectionType: "Mutual connection (Alex R.)",
    source: "Referral from Alex",
    goal: "Get on the radar for upcoming frontend platform roles.",
    notes: "Sent intro referencing Alex. He typically replies within a week, so no action needed yet.",
    followUpOverdue: false,
    trackCalendar: true,
  },
  {
    id: "7",
    name: "Aisha Patel",
    role: "Director of Product",
    company: "Airtable",
    stage: "responded",
    tags: [
      { label: "SaaS", tone: "industry" },
      { label: "Warm", tone: "warm" },
    ],
    daysAgo: 1,
    daysLabel: "Replied 1d ago",
    connectionType: "1st degree",
    source: "Conference (SaaStr)",
    goal: "Schedule a 30-min intro call to discuss the senior PM opening.",
    notes: "Replied positively and is open to a call next week. Need to send calendar availability.",
    followUpOverdue: false,
    trackCalendar: true,
  },
  {
    id: "8",
    name: "Tom Becker",
    role: "Staff Engineer",
    company: "Datadog",
    stage: "met_connected",
    tags: [
      { label: "Infra", tone: "industry" },
      { label: "Follow up", tone: "followup" },
    ],
    daysAgo: 6,
    daysLabel: "Met / Connected 6d ago",
    connectionType: "2nd degree",
    source: "GitHub",
    goal: "Trade notes on observability tooling and explore a referral.",
    notes: "Met for coffee and offered to refer me. Need to send my resume. This is overdue.",
    followUpOverdue: true,
    followUpNote: "He offered a referral 4 days ago. Send your resume to keep momentum.",
    trackCalendar: true,
  },
]
