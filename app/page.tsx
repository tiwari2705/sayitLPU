import { redirect } from "next/navigation"

// We no longer need to check the session here because 
// the Feed page now handles both Guests and Users.

export default function Home() {
  // Instantly redirect everyone to the Feed
  redirect("/feed")
}