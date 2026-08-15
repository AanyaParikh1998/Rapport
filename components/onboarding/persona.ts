export const OB_USER = {
  name: "Sarah Chen",
  company: "Wharton School",
  role: "MBA Candidate",
  location: "Philadelphia, PA",
  undergrad: "UC Berkeley",
  grad: "Wharton School of Business",
  background: "4 years investment banking at Goldman",
  linkedinUrl: "linkedin.com/in/sarah-chen",
  headline: "MBA Candidate at Wharton, ex-Goldman",
  voiceProfile: "VC and fintech outreach",
  secondaryVoiceProfile: "MBA networking",
  emailSampleLabel: "Cold outreach to investor",
  linkedinSampleLabel: "Cold LinkedIn note",
  styleInstructions:
    "Under 150 words. Reference something specific. End with a clear ask. No corporate jargon.",
  secondaryStyleInstructions:
    "Warm and personal. Reference shared experiences. Under 100 words.",
  sampleEmail:
    "Hi Marcus, I came across your piece on fintech infrastructure. Goldman M&A to Wharton MBA. Would love 20 minutes to learn how you think about the space. Best, Sarah",
  sampleLinkedIn:
    "Hi Marcus, loved your fintech piece. Goldman M&A to Wharton. Would love to connect.",
} as const

export const OB_RAW_LINKEDIN_SARAH = `Sarah Chen
MBA Candidate at Wharton, ex-Goldman
Philadelphia, Pennsylvania, United States · 500+ connections

About
MBA candidate at the Wharton School. Previously four years in Technology M&A at Goldman Sachs. Interested in fintech, venture capital, and growth equity.

Experience
Wharton School — MBA Candidate
2024 – 2026 · Philadelphia, PA

Goldman Sachs — Technology M&A, Associate
2019 – 2023 · 4 yrs · New York, NY

Education
The Wharton School — MBA, 2024 – 2026
University of California, Berkeley — BA Economics, 2015 – 2019`

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
