/**
 * Manual Alerts — Add alerts here and push to GitHub.
 * urgent: true = shows banner on app load; false = only in history.
 * Newest alerts appear first in the list.
 * See SETUP_GUIDE.md PART 5b for more examples.
 */

export const ALERTS = [
  {
    id: "Book-roms",
    title: "Book Rooms now",
    body: "Rooms are filling fast - Reserve now to guarantee your spot.",
    date: "2026-03-01",
    urgent: true,
  },
  {
    id: "welcome",
    title: "Welcome to Our Wedding App! 🌿",
    body: "We're thrilled you're joining us in Coorg. Explore the app for schedule, venue, and stay details!",
    date: "2026-02-15",
    urgent: false,
  },
  {
    id: "rsvp-reminder",
    title: "RSVP Reminder",
    body: "Please confirm your attendance by November 15, 2026.",
    date: "2026-02-20",
    urgent: false,
  },
  // More examples (uncomment and edit as needed):
  // { id: "venue-change", title: "Cocktail venue update", body: "Due to weather, cocktail evening moved to Samaja Grand Hall. Same time — 5:00 PM.", date: "2026-12-19", urgent: true },
  // { id: "parking-update", title: "Parking for wedding day", body: "Additional parking at the coffee estate lot 200m past the main gate. Shuttle runs from there.", date: "2026-12-20", urgent: true },
  // { id: "sangeet-reminder", title: "Sangeet Night tonight! 🎶", body: "Starts at 8:00 PM at the Samaja Open-Air Stage.", date: "2026-12-19", urgent: false },
];
