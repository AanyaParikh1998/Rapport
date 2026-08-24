export const OB_USER = {
  name: "Aanya Parikh",
  company: "The Wharton School",
  role: "MBA Candidate",
  location: "Philadelphia, Pennsylvania, United States",
  undergrad: "Brown University",
  grad: "The Wharton School",
  background: "3 years in private equity secondaries at Hollyport Capital",
  linkedinUrl: "linkedin.com/in/aanya-parikh",
  headline: "MBA Candidate at The Wharton School",
  voiceProfile: "VC outreach",
  secondaryVoiceProfile: "Consulting outreach",
  emailSampleLabel: "Cold outreach to investor",
  linkedinSampleLabel: "Cold outreach to consultant",
  styleInstructions:
    "Concise, confident, and specific. Reference a portfolio company or thesis. Lead with genuine interest, not a pitch. End with a clear, low-friction ask (15-20 min call).",
  secondaryStyleInstructions:
    "Professional and warm. Reference a shared connection or specific project/practice area. Show you've done homework on the firm. Ask for a short informational call, not a job.",
  sampleEmail:
    "Hi Marcus, I came across your piece on fintech infrastructure. I'm an MBA candidate at Wharton and would love 20 minutes to learn how you think about the space. Best, Aanya",
  sampleLinkedIn:
    "Hi David, I read your post on PE due diligence and it really resonated with my time in secondaries at Hollyport. Would love to connect and hear more about the private equity practice at Bain — open to a quick call sometime?",
} as const

export const OB_RAW_LINKEDIN_USER = `Aanya Parikh
MBA Candidate at The Wharton School
Philadelphia, Pennsylvania, United States · 500+ connections

About
MBA Candidate at The Wharton School, Class of 2028. Previously spent three years in private equity secondaries at Hollyport Capital.

Experience
Hollyport Capital — Private Equity Secondaries
2021 – 2024 · London

Education
The Wharton School — MBA Candidate, Class of 2028
Brown University — Class of 2021`

export const OB_RAW_LINKEDIN_JOHN = `John Smith
Consulting Manager at Accenture
Chicago, Illinois, United States · 500+ connections
28 mutual connections

About
Consulting Manager at Accenture, focused on strategy & operations consulting for Fortune 500 clients. Previously a senior consultant at Accenture. Kellogg MBA.

Experience
Accenture — Consulting Manager
2022 – Present · Chicago, IL

Accenture — Senior Consultant
2018 – 2022 · Chicago, IL

Education
Kellogg School of Management — MBA, 2016 – 2018
University of Michigan — BA Economics, 2012 – 2016`

export const OB_CONTACTS = {
  john: {
    name: "John Smith",
    company: "Accenture",
    role: "Consulting Manager",
    title: "Consulting Manager at Accenture",
    city: "Chicago",
    university: "Kellogg",
    mutuals: "28",
    linkedinUrl: "linkedin.com/in/john-smith-consulting",
  },
  james: {
    name: "James Liu",
    company: "Sequoia",
    role: "VP",
    title: "VP at Sequoia",
    followUpDetail: "VP at Sequoia · Added 12 days ago",
  },
  alex: {
    name: "Alex Kim",
    company: "Bloom",
    role: "Founder",
    title: "Founder at Bloom",
    followUpDetail: "Founder at Bloom · Last contacted 9 days ago",
  },
  marcus: {
    name: "Marcus Rivera",
    company: "Sequoia",
    role: "Partner",
    title: "Partner at Sequoia",
    followUpDetail: "Partner at Sequoia · Last interaction 15 days ago",
  },
  consultant: {
    name: "David Chen",
    company: "Bain & Company",
    role: "Engagement Manager",
    title: "Engagement Manager at Bain & Company",
  },
} as const

export const OB_DRAFT_SUBJECT = "Connecting re: consulting at Accenture"

export const OB_DRAFT_BODY_LINES = [
  "Hi John, I came across your profile and was impressed by your work in strategy consulting at Accenture. Heading to Wharton this fall after three years in PE.",
  "Would love 20 minutes to learn how you think about case work and client strategy.",
  "Best, Aanya",
] as const

export const STAGE_BORDER = {
  gray: "#888780",
  blue: "#378ADD",
  amber: "#EF9F27",
  green: "#639922",
} as const
