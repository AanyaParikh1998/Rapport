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

export const OB_RAW_LINKEDIN_PRIYA = `Priya Nair
VP of Product at Stripe India
Mumbai, Maharashtra, India · 500+ connections
28 mutual connections

About
VP of Product at Stripe India, building payments infrastructure for the Indian market. Previously product lead at Razorpay. IIM Ahmedabad.

Experience
Stripe India — VP of Product
2022 – Present · Mumbai, India

Razorpay — Senior Product Manager
2018 – 2022 · Bangalore, India

Education
Indian Institute of Management Ahmedabad — MBA, 2016 – 2018
BITS Pilani — BE Computer Science, 2012 – 2016`

export const OB_CONTACTS = {
  priya: {
    name: "Priya Nair",
    company: "Stripe India",
    role: "VP of Product",
    title: "VP of Product at Stripe India",
    city: "Mumbai",
    university: "IIM Ahmedabad",
    mutuals: "28",
    linkedinUrl: "linkedin.com/in/priya-nair",
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

export const OB_DRAFT_SUBJECT = "Connecting re: fintech at Stripe India"

export const OB_DRAFT_BODY_LINES = [
  "Hi Priya, I came across your profile and was impressed by your work leading product at Stripe India. Heading to Wharton this fall after four years in fintech.",
  "Would love 20 minutes to learn how you think about product in emerging markets.",
  "Best, Sarah",
] as const

export const STAGE_BORDER = {
  gray: "#888780",
  blue: "#378ADD",
  amber: "#EF9F27",
  green: "#639922",
} as const
