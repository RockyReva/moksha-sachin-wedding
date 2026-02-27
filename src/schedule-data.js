/**
 * Wedding Schedule — Edit dates, times, and text here.
 * Changes here will appear on the Schedule screen, countdown, and RSVP.
 */

// Countdown target (used on home page)
export const WEDDING_DATE = "2026-12-19T10:00:00";

// RSVP deadline text (shown on RSVP screen)
export const RSVP_DEADLINE = "November 15, 2026";

// Wedding dates (shown on hero banner)
export const WEDDING_DATES_DISPLAY = "December 19–20, 2026";

// Schedule events — edit time, title, location, icon, and desc for each
// export const SCHEDULE_EVENTS = [
//   { time: "Dec 19 · 10:00 AM", title: "Mehendi & Haldi", location: "Samaja Garden Lawn", icon: "🌿", desc: "Henna, turmeric ceremony & light bites amidst the coffee plantation" },
//   { time: "Dec 19 · 1:00 PM", title: "Plantation Brunch", location: "Samaja Dining Hall", icon: "☕", desc: "Filter coffee, Coorgi cuisine & a guided coffee estate walk" },
//   { time: "Dec 19 · 5:00 PM", title: "Cocktail Evening", location: "Misty Hilltop Deck", icon: "🥂", desc: "Sundowner cocktails, live jazz & Western Ghats sunset views" },
//   { time: "Dec 19 · 8:00 PM", title: "Sangeet Night", location: "Samaja Open-Air Stage", icon: "🎶", desc: "Dance, music & a Kodava-style feast under the stars" },
//   { time: "Dec 20 · 9:00 AM", title: "Baraat Procession", location: "Samaja Main Entrance", icon: "🐘", desc: "The groom's grand arrival through the coffee rows" },
//   { time: "Dec 20 · 11:00 AM", title: "Wedding Ceremony", location: "Mandap, Samaja Grounds", icon: "💍", desc: "Sacred pheras overlooking the misty Kodagu hills" },
//   { time: "Dec 20 · 7:30 PM", title: "Grand Reception", location: "Samaja Grand Hall", icon: "🎉", desc: "Dinner, toasts, Coorgi Kathi Kali dance & celebrations" },
// ];

// Photos go in public/ folder. Add image filenames to events.
export const SCHEDULE_EVENTS = [
  {
    time: "Dec 19 · 5:00 PM",
    title: "Wedding Eve | Oorukuduva",
    location: "Samaja Garden Lawn",
    icon: "🌿",
    desc: "On the day before the wedding, members of the groom's and bride's 'oor' (village) assemble (Oorukuduva) in the wedding house to assist the families in the preparations for the feasts that follow. The bride & the groom are led by their 'Bojakaara' (best man) & 'Bojakarthi' (maid of honour) respectively to the sacred hanging lamp kept at the dais, where they offer prayers to their ancestors. The mother of both, the groom & bride then places the 'pawala maale' (chain of gold & coral beads) and the 'pathaak' (short chain of coral, gold & black beads) around the neck of the groom & bride respectively to mark their status as groom and bride. They then seek blessings of their parents and all the elders.",
    photos: ["1-Oorukuduva.jpeg", "1b-lamp.jpeg"],
  },
  {
    time: "Dec 19 · 7:00 PM",
    title: "Honour of cutting the banana plant stems | Bale Birud",
    location: "Path to Wedding Hall",
    icon: "☕",
    desc: "On the path leading to the wedding hall, a row of nine banana plant stems are placed, where a maternal uncle of both, the bride & groom, each in turn are given the honour of cutting these stems when they arrive. After offering prayers to their ancestors and village gods, walking thrice around the stems, they then cut the stems one by one, each with a single stroke, exhibiting strength and skill.",
    photos: ["2-Bale_Birud.jpeg"],
  },
  {
    time: "Dec 20 · 10:00 AM",
    title: "Auspicious Wedding Day | Dampathi Muhurtha",
    location: "Kodava Samaja Wedding Hall",
    icon: "🥂",
    desc: "As the groom and bride are seated, they are blessed and given gifts in the traditional manner with rice showered on them. The mother is the first one to bless her child, followed by the father and then by other elders and relatives. At the end of the 'Dampathi Muhurtha', the couple exchanges their garlands, the essential ceremony that solemnizes the marriage. This is then followed by the 'Sammanda Kodupa', where the bride receives the rights of relationship in her groom's family via a traditional dialogue between the elders of the couple's family.",
    photos: ["3-Wedding_Day.jpeg"],
  },
  {
    time: "Dec 20 · 4:00 PM",
    title: "Ganga Pooja | Neer Edpa",
    location: "Kodava Samaja",
    icon: "🎉",
    desc: "This ceremony symbolizes the bride becoming a part of the groom's family. The bride draws water from the well into four small pots. She balances two small pots on her head. A procession returns to the wedding hall, accompanied by the wedding band playing the valaga where members of the groom's family dance in front of the bride, welcoming her to the house. The intention is to slow the bride's walk, to test her stamina.",
  },
];
