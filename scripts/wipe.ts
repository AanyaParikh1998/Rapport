import { supabase } from "../lib/supabase"

async function wipe() {
  const { data: testContacts, error: fetchError } = await supabase
    .from("contacts")
    .select("id, name")
    .like("name", "Test:%")

  if (fetchError) throw fetchError

  const contactsToDelete = testContacts ?? []

  if (contactsToDelete.length === 0) {
    console.log("Deleted 0 test contacts.")
    return
  }

  const contactIds = contactsToDelete.map((contact) => contact.id)

  const { error: deleteError } = await supabase
    .from("contacts")
    .delete()
    .in("id", contactIds)

  if (deleteError) throw deleteError

  console.log(`Deleted ${contactsToDelete.length} test contacts.`)
}

wipe().catch((error) => {
  console.error("Wipe failed:", error)
  process.exit(1)
})
