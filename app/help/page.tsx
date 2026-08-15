import { Sidebar } from "@/components/sidebar"
import { GuideWalkthroughCard } from "@/components/guide-walkthrough-card"

const SECTIONS = [
  {
    title: "Getting started",
    body: [
      "Start on the Preferences page by pasting your LinkedIn profile text and clicking Auto-fill to populate your details. While you are there, switch to the My Voice tab and add a few writing samples so Rapport can draft outreach in your style.",
      "When your profile is set up, head to the Pipeline page and click Add contact to add your first person to track.",
    ],
  },
  {
    title: "Adding contacts",
    body: [
      "Click Add contact on the Pipeline page and paste the person's LinkedIn profile text to auto-fill their name, company, role, and education. Fill in the remaining fields manually: goal, source, connection type, mutual count, and LinkedIn URL.",
      "New contacts land in the Not contacted column by default, ready for you to start outreach when the time is right.",
    ],
  },
  {
    title: "The pipeline",
    body: [
      "The pipeline is a kanban board with four columns that track where each contact sits in your outreach: Not contacted, In progress, Responded, and Met / Connected. Drag cards between columns to update their status as things move forward.",
      "Each card shows connection type, mutual count, and relationship strength at a glance. When a contact has gone too long without action, a warning icon appears on their card to remind you to follow up.",
    ],
  },
  {
    title: "Drafting outreach",
    body: [
      "Select any contact and click Draft outreach message to generate an email or LinkedIn message written in your voice. Choose a voice profile before generating so the tone matches the context.",
      "Edit the draft directly in the text area, or use the suggestions field to tell Rapport what to change and regenerate. When you are happy with it, save the draft to the contact's record or copy it to your clipboard and send.",
    ],
  },
  {
    title: "Warm intro requests",
    body: [
      "When a contact shares a company or university with someone already in your Responded or Met / Connected columns, Rapport surfaces that person as a potential introducer in the Outreach tab of the contact detail panel.",
      "Click Draft intro request to generate two messages at once: one to your mutual asking for the introduction, and one forwardable message the introducer can pass along to the target contact.",
    ],
  },
  {
    title: "The network graph",
    body: [
      "The Network page visualises all your contacts as a graph. Lines between nodes show shared company or university connections, and node size reflects relationship strength.",
      "Hover over a node to see their connections highlighted. Click a node to lock the selection. Use the search box to find and highlight a specific contact in a large network.",
    ],
  },
  {
    title: "Follow-ups",
    body: [
      "The Follow-ups page shows contacts that need attention, grouped into three columns: Not yet contacted, Awaiting response, and Ready to reconnect. A contact appears here when they have been in their current status for seven or more days.",
      "Use the quick notes field on each card to jot down context without opening the full contact detail panel.",
    ],
  },
  {
    title: "Tracking interactions",
    body: [
      "Open any contact in the Responded or Met / Connected column and go to the History tab to log interactions with quick-tap buttons like Call scheduled or Met in person.",
      "Rapport automatically logs when a contact is added and when you move them to In progress. The full interaction timeline on the History tab shows the complete history of your relationship with each contact.",
    ],
  },
]

export default function GuidePage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="shrink-0 border-b border-border px-5 py-5">
          <h1 className="text-lg font-semibold text-foreground">Guide</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Learn how Rapport works</p>
        </header>

        <article className="mx-auto w-full max-w-2xl px-5 py-8">
          <GuideWalkthroughCard />

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-[12px] font-medium text-muted-foreground">
                or read the guide
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-10">
            {SECTIONS.map((section, index) => (
              <section
                key={section.title}
                className={index > 0 ? "border-t border-border pt-10" : undefined}
              >
                <h2 className="mb-3 text-[14px] font-semibold text-foreground">
                  {section.title}
                </h2>
                <div className="flex flex-col gap-3">
                  {section.body.map((paragraph) => (
                    <p
                      key={paragraph.slice(0, 40)}
                      className="text-[13px] leading-relaxed text-foreground/85"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>
    </div>
  )
}
