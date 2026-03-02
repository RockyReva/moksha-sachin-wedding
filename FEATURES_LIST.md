# Wedding App — Complete Feature List

A comprehensive list of all UI features, design elements, and functionality. Perfect for sharing with friends or adapting for other celebrations (birthdays, anniversaries, etc.).

---

## 🎨 UI Design Features

### Overall App Shell
- **Phone-frame layout** — App displayed in a 390×760px card with rounded corners (36px radius), mimicking a mobile device
- **Golden ornate frame** — Decorative border around the entire app with:
  - Corner flourishes (scrollwork)
  - Repeating bead/dot pattern along top, bottom, left, and right edges
  - Gold gradient border (goldDark → gold → goldLight)
  - Subtle diagonal stripe pattern
- **Status bar** — Fixed top bar showing live date and time (updates every minute), green background on all tabs
- **Bottom navigation** — 6 tabs with custom icons, bottom-aligned labels, spacing between icon and text
- **Custom favicon** — "MS" initials in cream on green background (SVG)
- **Scrollbar hidden** — Clean scroll experience; content still scrolls via touch, wheel, trackpad

### Color Palette (Coorg Coffee Estate Theme)
- **Background:** Cream (#F7F4F0)
- **Accent:** Forest green (#2D5016)
- **Gold accents:** #C4972A, #E5C76B, #9A7209
- **Coffee browns:** #5C3D2E, #6D4C41
- **Cards:** White with mist borders
- **Success states:** Light green (#E8F5E4)

### Typography
- **Serif font:** Cormorant Garamond (headings, titles, accents)
- **Sans font:** DM Sans (body text, menus)
- **Hierarchy:** h1 (44px), h2 (28px), h3 (20px), body (14px), caption (13px), small (11px)

---

## 🎊 Confetti & Fireworks (Celebration Effects)

### Confetti
- **Trigger:** Click "Mandara Boys" text (underline, clickable)
- **Configuration:**
  - Duration: 2.5 seconds
  - Particle count: 4 per frame
  - Spread: 100°
  - Origin: Center-bottom (y: 0.6)
  - Colors: 19 custom colors (pinks, purples, blues, greens, golds, browns)
- **Auto-confetti on first visit:** Runs from top of screen (3.5 sec) when user opens app for the first time (session-based)

### Fireworks (July 4th Style)
- **Triggers:** Click the group icon (👥) OR either flower pot firework icon (🧨)
- **Configuration:**
  - 5 bursts, each 280ms apart
  - Each burst: 80 + 60 particles (two overlapping explosions)
  - Colors: Red, white, blue, orange, yellow (#ff0000, #ffffff, #0066ff, #ff6600, #ffff00)
  - Spread: 360° (full circle)
  - Origin: Random positions in upper 20–80% width, 10–40% height (sky-like)
  - Gravity: 0 (particles float outward)
  - Start velocity: 25 and 30

### Interactive Credits Section
- **"Mandara Boys"** — Underlined, clickable → confetti
- **Group icon** — Colorful gradient (green→gold), underlined, clickable → fireworks
- **Flower pot icons** — Custom image on left and right, clickable → fireworks

---

## 📱 HOME PAGE

### Hero Banner
- **Full-width background image** — Custom photo (main-banner-photo.png) with fallback to Unsplash coffee estate
- **Gradient overlay** — Dark green gradient (rgba(26,52,9,0.85) → rgba(45,80,22,0.85)) for text readability
- **Decorative elements:**
  - Coffee bean SVG ornaments (3 placed around hero)
  - Leaf ornament SVG above subtitle
  - 5 golden dots between subtitle and date
- **Content:** Subtitle, couple names (with gold "&"), date range, location
- **Misty Mountains illustration** — SVG gradient at bottom of hero (layered mountain silhouettes)

### Countdown Timer
- **Live countdown** — Days, Hours, Minutes, Seconds until event
- **4-column grid** — Each unit in its own card with label
- **Updates every second**

### Welcome Card
- **Gradient background** — Coffee light → mist
- **Icon + heading** — Coffee cup icon, "Welcome, Dear Guests"
- **Custom welcome message** — Editable text

### Quick Info Cards (2×2 grid)
- **2-Day Celebration** — Tappable, navigates to Schedule
- **Kodava Samaja** — Tappable, navigates to Venue
- **Coorg** — External link to Karnataka tourism
- **Live Weather** — Fetches from Open-Meteo API; shows current temp, condition, humidity; links to AccuWeather forecast

---

## 📝 RSVP PAGE

### Form Fields
- **Full Name** — Text input
- **Phone Number** — Text input
- **Will you attend?** — Radio: "Joyfully Accept" / "Regretfully Decline"
- **Number of Guests** — 1, 2, 3, 4, 5+ (button grid)
- **Meal Preference** (single guest) — Veg / Non-Veg
- **Meal Preference** (multi-guest) — "How many prefer vegetarian?" with count selector; shows "X Veg · Y Non-Veg" summary
- **Drink Preference** — 8 options in 2-column grid with emoji icons (Whiskey, Brandy, Rum, Gin, Vodka, Beer, Wine, No Preference)
- **Ganga Pooja Time** — Cocktails / Mocktails (2-column grid with emoji icons)
- **Soft drinks note** — Italic helper text below

### Submit Button
- **Gradient** — Green gradient when enabled
- **Disabled state** — Grayed out when required fields missing
- **Loading state** — "Sending..." text

### Success Screen
- **Checkmark icon** — Green circle with check
- **Thank you message** — "Dhanyavaadagalu! 🙏"
- **Vine border** — Decorative divider

### Backend
- **Google Sheets** — Primary RSVP storage
- **Firebase** — Backup storage (runs in background)

---

## 📅 SCHEDULE PAGE

### Header
- **Title** — "Schedule"
- **Subtitle** — "Two days of love among the hills"
- **Vine border** — Decorative divider

### Timeline Events
- **Vertical timeline** — Gradient line (green → mist → coffee)

- **Each event card:**
  - **Timeline dot** — Gold for wedding day, green for others
  - **Cream gradient background** — All cards
  - **Date/time** — Uppercase, serif, accent color
  - **Icon** — Emoji or custom image (SVG/PNG) per event
  - **Title** — Event name
  - **Image** — Inline, 50% width, floats left; text wraps around
  - **Description** — Full text
  - **Location** — With venue pin icon

### Event Icons
- Supports: emoji (🪔, 🌴, 🙏, 🏺) or custom image (e.g. ganga_pooja_icon.svg)

---

## 🗺️ VENUE PAGE

### Header
- **Title** — "Venue"
- **Subtitle** — Venue name
- **Distance** — "~7 km from Virajpet"

### Interactive Map
- **Embedded map** — Google Maps (if API key) or OpenStreetMap
- **Height:** 200px, rounded corners

### Gallery
- **3-column grid** — Thumbnail images
- **Lightbox** — Tap any image to open full-screen viewer
  - Left/right arrows to navigate
  - Close button
  - Dark overlay (95% black)

### Address & Directions
- **Full address** — Editable text
- **Buttons** — "Open in Google Maps" and "Watch venue video" (Google Maps or YouTube links)

### Directions from Cities
- **Grid of cards** — Virajpet, Mysore, Mangalore, Bangalore (distance, time, link to directions)
- **Parking** — "Free on-site parking"
- **Dress Code** — "Traditional / Smart"

### Travel Tips
- **Shuttle notice** — Highlighted card with bus emoji

---

## 🏨 STAY PAGE

### Header
- **Title** — "Where to Stay"
- **Subtitle** — "Handpicked stays near the wedding venue"

### Book Early Banner
- **Gradient card** — "December is peak season" notice

### Recommended Section
- **Family Pick badge** — Gold pill on featured stays
- **Featured stays** — Magnolia Resorts, INIKA Resorts
  - Gradient top border (gold → green)
  - Icon, name, description, address, phone, "Visit Website" link
  - Tappable (opens external URL)

### Other Stays
- **Card layout** — Emoji, tag, name, description, distance, price
- **Tags** — "Nature Base", "Gateway to Coorg", "Plantation Gateway"

### Estate Stays Note
- **Card** — "Want a plantation experience?" with homestay info

---

## 🔔 ALERTS (Notifications) PAGE

### Header
- **Title** — "Notifications"
- **Subtitle** — "Stay updated with wedding events"

### Push Notifications
- **Enable banner** — Shown when not granted; gradient background, "Enable Notifications" button
- **Success state** — Green checkmark when enabled
- **Dev-only** — "Copy FCM token" button for testing

### Foreground Toast
- **In-app notification** — When push arrives while app is open; shows title + body for 5 seconds

### Alert History
- **Refresh button** — Manual refresh
- **Pull-to-refresh** — Pull down at top to refresh
- **Alert cards** — Title, body, relative date ("Today", "Yesterday", "X days ago")
- **Unread styling** — Accent background, accent border, bold title, dot indicator
- **Read styling** — White card, normal border
- **Tap to mark read** — Persisted in localStorage

### Alert Source
- **Google Sheets** — When configured, fetches from URL
- **Static fallback** — alerts-data.js
- **Polling** — Every 9 minutes (configurable)
- **Cache** — Offline support; cached when fetch fails

---

## 🚨 URGENT ALERT BANNER

- **Modal overlay** — Full-screen dark overlay (50% black)
- **Card** — White, rounded, max 340px width
- **Content** — Title, body, date
- **"Got it" button** — Dismisses and marks as read
- **One at a time** — Shows newest urgent unread; after dismiss, next urgent appears
- **Triggers** — On app load when there are unread urgent alerts

---

## 🔧 Technical Configurations

### Confetti (canvas-confetti)
- Colors: 19 custom hex values
- runConfetti: 2.5s, 4 particles/frame, spread 100, origin y:0.6
- runConfettiFromTop: 3.5s, 4 particles/frame, angle 90, spread 120, random x origin, top

### Fireworks
- 5 bursts, 280ms apart
- Colors: Red, white, blue, orange, yellow
- 80+60 particles per burst, spread 360, gravity 0

### Alerts
- Poll interval: 9 minutes (ALERTS_POLL_MS)
- Config sheet: resetReadVersion to clear read state on all devices
- Cache overwritten when sheet returns (even empty)

### Images (Organized in public/)
- **public/nav/** — Bottom nav icons
- **public/home/** — Hero banner, flower pot icons
- **public/venue/** — Gallery images
- **public/schedule/** — Event photos, custom icons

---

## 📋 Summary for Your Friend

**What you get:**
- A beautiful, mobile-first celebration app (wedding, birthday, anniversary, etc.)
- Confetti and fireworks on tap
- RSVP with Google Sheets + Firebase backup
- Live countdown, weather, maps, directions
- Push notifications (Firebase)
- Alerts from Google Sheets or code
- Customizable colors, fonts, images, text
- Golden frame, misty mountains, coffee bean ornaments
- Lightbox gallery, timeline schedule, stay recommendations

**Easy to customize:** Change names, dates, colors, images, and copy in a few config files. No coding required for most content.
