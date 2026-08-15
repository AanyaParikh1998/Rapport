import { supabase } from "../lib/supabase"

type Stage = "not_contacted" | "in_progress" | "responded" | "met_connected"

type ContactSeed = {
  name: string
  role: string
  company: string
  city: string
  connectionType: string
  source: string
  goal: string
  mutualCount: number
  undergraduateUniversity: string
  graduateUniversity: string
  linkedinUrl: string
  email: string
  status: Stage
  createdAtDaysAgo: number
  lastActionAtDaysAgo: number | null
  trackCalendar: boolean
  interactions: { type: "auto" | "manual"; notes: string }[]
  draft?: {
    format: "email" | "linkedin_note" | "linkedin_message"
    subject: string
    body: string
    sentAtDaysAgo?: number
    wasSuccessful?: boolean
  }
}

const CONTACTS: ContactSeed[] = [
  {
    name: "Test: Priya Sharma",
    role: "Product Manager",
    company: "Razorpay",
    city: "Mumbai",
    connectionType: "Cold",
    source: "LinkedIn",
    goal: "Informational call",
    mutualCount: 23,
    undergraduateUniversity: "Delhi University",
    graduateUniversity: "ISB Hyderabad",
    linkedinUrl: "https://linkedin.com/in/test-priya",
    email: "priya.sharma@razorpay.com",
    status: "not_contacted",
    createdAtDaysAgo: 10,
    lastActionAtDaysAgo: 10,
    trackCalendar: true,
    interactions: [],
  },
  {
    name: "Test: Rohan Mehta",
    role: "Investment Analyst",
    company: "Sequoia India",
    city: "Bangalore",
    connectionType: "Warm",
    source: "Warm intro",
    goal: "Referral",
    mutualCount: 67,
    undergraduateUniversity: "IIT Bombay",
    graduateUniversity: "Wharton",
    linkedinUrl: "https://linkedin.com/in/test-rohan",
    email: "rohan.mehta@sequoiacap.com",
    status: "in_progress",
    createdAtDaysAgo: 14,
    lastActionAtDaysAgo: 9,
    trackCalendar: true,
    interactions: [{ type: "auto", notes: "Message sent, awaiting response" }],
    draft: {
      format: "email",
      subject: "Connecting re: fintech and supply chain finance",
      body: "Hi Rohan, I came across your profile and wanted to reach out. I have been working in supply chain finance and am heading to Wharton this fall. Would love to learn more about your work at Sequoia India and how you think about fintech investing. Would you be open to a quick call? Best, Aanya",
      sentAtDaysAgo: 9,
      wasSuccessful: false,
    },
  },
  {
    name: "Test: Kavya Iyer",
    role: "VP Strategy",
    company: "Stripe India",
    city: "Mumbai",
    connectionType: "Warm",
    source: "Conference",
    goal: "Mentorship",
    mutualCount: 41,
    undergraduateUniversity: "Wesleyan University",
    graduateUniversity: "Wharton",
    linkedinUrl: "https://linkedin.com/in/test-kavya",
    email: "kavya.iyer@stripe.com",
    status: "responded",
    createdAtDaysAgo: 20,
    lastActionAtDaysAgo: 12,
    trackCalendar: true,
    interactions: [
      { type: "auto", notes: "Contact added" },
      { type: "auto", notes: "Message sent, awaiting response" },
      { type: "manual", notes: "Call scheduled" },
    ],
    draft: {
      format: "email",
      subject: "Following up on our conversation",
      body: "Hi Kavya, it was great connecting last week. Best, Aanya",
    },
  },
  {
    name: "Test: Arjun Singh",
    role: "Founder",
    company: "Setu",
    city: "Bangalore",
    connectionType: "Hot",
    source: "Personal",
    goal: "Informational call",
    mutualCount: 89,
    undergraduateUniversity: "IIT Delhi",
    graduateUniversity: "Stanford GSB",
    linkedinUrl: "https://linkedin.com/in/test-arjun",
    email: "arjun.singh@setu.co",
    status: "met_connected",
    createdAtDaysAgo: 30,
    lastActionAtDaysAgo: 8,
    trackCalendar: false,
    interactions: [
      { type: "auto", notes: "Contact added" },
      { type: "auto", notes: "Message sent, awaiting response" },
      { type: "manual", notes: "Call scheduled" },
      { type: "manual", notes: "Had a call" },
    ],
  },
  {
    name: "Test: Meera Pillai",
    role: "Partner",
    company: "Sequoia India",
    city: "Mumbai",
    connectionType: "Hot",
    source: "LinkedIn",
    goal: "Referral",
    mutualCount: 112,
    undergraduateUniversity: "Delhi University",
    graduateUniversity: "Harvard Business School",
    linkedinUrl: "https://linkedin.com/in/test-meera",
    email: "meera.pillai@sequoiacap.com",
    status: "met_connected",
    createdAtDaysAgo: 15,
    lastActionAtDaysAgo: 3,
    trackCalendar: false,
    interactions: [
      { type: "auto", notes: "Contact added" },
      { type: "manual", notes: "Met in person" },
    ],
  },
]

function daysAgo(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000
}

function daysAgoIso(days: number): string {
  return new Date(daysAgo(days)).toISOString()
}

function interactionTimestamp(baseTime: number, index: number, total: number): string {
  if (total <= 1) return new Date(baseTime).toISOString()
  const start = baseTime - (total - 1) * 60_000
  return new Date(start + index * 60_000).toISOString()
}

async function insertContact(contact: ContactSeed) {
  const createdAt = daysAgoIso(contact.createdAtDaysAgo)
  const lastActionAt =
    contact.lastActionAtDaysAgo != null
      ? daysAgoIso(contact.lastActionAtDaysAgo)
      : null
  const lastActionMs =
    contact.lastActionAtDaysAgo != null ? daysAgo(contact.lastActionAtDaysAgo) : daysAgo(contact.createdAtDaysAgo)

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      name: contact.name,
      role: contact.role,
      company: contact.company,
      city: contact.city,
      connection_type: contact.connectionType,
      source: contact.source,
      goal: contact.goal,
      mutual_count: contact.mutualCount,
      undergraduate_university: contact.undergraduateUniversity,
      graduate_university: contact.graduateUniversity,
      linkedin_url: contact.linkedinUrl,
      email: contact.email,
      status: contact.status,
      created_at: createdAt,
      last_action_at: lastActionAt,
      track_calendar: contact.trackCalendar,
    })
    .select("id")
    .single()

  if (error) throw error

  const contactId = data.id as string

  if (contact.interactions.length > 0) {
    const interactionRows = contact.interactions.map((interaction, index) => ({
      contact_id: contactId,
      type: interaction.type,
      notes: interaction.notes,
      created_at: interactionTimestamp(
        lastActionMs,
        index,
        contact.interactions.length,
      ),
    }))

    const { error: interactionError } = await supabase
      .from("interactions")
      .insert(interactionRows)

    if (interactionError) throw interactionError
  }

  if (contact.draft) {
    const { error: draftError } = await supabase.from("outreach_drafts").insert({
      contact_id: contactId,
      format: contact.draft.format,
      profile_id: null,
      subject: contact.draft.subject,
      body: contact.draft.body,
      status: "draft",
      sent_at:
        contact.draft.sentAtDaysAgo != null
          ? daysAgoIso(contact.draft.sentAtDaysAgo)
          : null,
      was_successful: contact.draft.wasSuccessful ?? false,
    })

    if (draftError) throw draftError
  }

  return contactId
}

async function seed() {
  let createdCount = 0

  for (const contact of CONTACTS) {
    await insertContact(contact)
    createdCount += 1
  }

  console.log(`Created ${createdCount} test contacts.`)
}

seed().catch((error) => {
  console.error("Seed failed:", error)
  process.exit(1)
})
