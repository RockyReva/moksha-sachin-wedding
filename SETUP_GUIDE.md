# 🛠️ SETUP GUIDE — Firebase + Google Sheets Backend

This guide will walk you through setting up the RSVP database and push
notifications for Moksha & Sachin's wedding app. Budget: **₹0** — everything
here is free at wedding scale.

**Time needed:** ~30 minutes total

---

## 🔒 SECURITY: API Keys (Important)

**Never commit API keys or secrets to GitHub.** This app uses environment variables:

- **Local:** Create `.env` from `.env.example` and fill in your values. `.env` is gitignored.
- **Vercel:** Add the same variables in Project Settings → Environment Variables. **Important:** The service worker (`firebase-messaging-sw.js`) is generated at build time from `process.env` on Vercel — not from `.env` (which doesn't exist on Vercel's servers). If you skip adding Firebase vars to Vercel, push notifications will not work on your live site.
- **If you got a "suspicious activity" email from Google:** Your API key was exposed. Regenerate it:
  1. Go to [Google Cloud Console](https://console.cloud.google.com) → Credentials
  2. Find your API key → Edit → **Regenerate key**
  3. Update your `.env` file with the new key
  4. Add API key restrictions: **Application restrictions** → HTTP referrers → add `localhost:*` and `*.vercel.app/*`

**Migrating from old setup (keys in code):**
1. Copy `.env.example` to `.env` and paste your values from the old `firebase.js` and `firebase-messaging-sw.js`
2. Regenerate the Firebase API key (see above)
3. Remove the old file from Git: `git rm --cached public/firebase-messaging-sw.js`
4. Run `npm run dev` — the service worker will be generated from `.env`

---

## PART 1: Google Sheets (RSVP Storage) — ~10 minutes

This lets RSVPs land in a Google Spreadsheet your friend can view and manage.

### Step 1: Create the Spreadsheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it **"Moksha & Sachin Wedding RSVPs"**
4. In **Row 1**, add these headers:

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Timestamp | Name | Phone | Attending | Guests | Veg | Non-Veg | Drink Preference | Ganga Pooja Drink | Consent |

**Note:** Veg and Non-Veg are filled automatically: for 1 guest, Meal preference sets one to 1; for 2+ guests, the app sends the veg/non-veg breakup. **Drink Preference** and **Ganga Pooja Drink** (Cocktails/Mocktails) are captured from the RSVP form. **Consent** records "Yes" or "No" based on the privacy consent checkbox.

**Tip:** Name the sheet tab **"RSVPs"** so the script finds it reliably. If not, the first sheet is used. Each submission adds a new row; if a guest resubmits, use the latest row.

### Step 2: Deploy the Apps Script

1. In your spreadsheet, click **Extensions → Apps Script**
2. Delete any existing code in the editor
3. Open the file `google-apps-script.js` from this project
4. Copy ALL the code and paste it into the Apps Script editor
5. Click **💾 Save** (or Ctrl+S)
6. Click **Deploy → New deployment**
7. Click the gear icon ⚙️ → Select **Web app**
8. Set these options:
   - **Description:** "Wedding RSVP"
   - **Execute as:** "Me"
   - **Who has access:** "Anyone"
9. Click **Deploy**
10. You may be asked to authorize — click through the permissions
11. **Copy the full Web App URL** — it must start with `https://script.google.com/macros/s/` and end with `/exec`. Copy the **entire** URL (do not copy only the long ID in the middle).

### Step 3: Add the URL to Your App

Add the full Web App URL to your `.env` file (create it from `.env.example` if needed):
```
VITE_GOOGLE_SHEETS_URL=https://script.google.com/macros/s/AKfycbx...your-long-id.../exec
```
The URL must start with `https://script.google.com/macros/s/` and end with `/exec`.

### Step 4: Test It

1. Run `npm run dev` and submit a test RSVP
2. Check your Google Sheet — a new row should appear!

**RSVP updates not saving?** If duplicate submissions don't create new rows but the existing row doesn't update either, check:
- **Execute as:** must be **"Me"** (not "User accessing the web app"). With "Anyone" access, the script runs as anonymous when the app sends the request; only "Me" has write permission.
- **Deploy → Manage deployments** → Edit → **New version** → Deploy (after any script change).

---

## PART 1b: Using a different Google Sheet (for another couple)

When you hand off the app to a friend (e.g. whose daughter is getting married), they need their **own** Google Sheet so RSVPs land in their spreadsheet, not yours.

### Option A: Same app, different sheet (you keep hosting)

1. **Your friend** creates a new Google Spreadsheet at [sheets.google.com](https://sheets.google.com)
2. They add the same headers in Row 1: `Timestamp | Name | Phone | Attending | Guests | Veg | Non-Veg | Drink Preference | Ganga Pooja Drink | Consent`
3. They name the sheet tab **"RSVPs"**
4. They go to **Extensions → Apps Script**, paste the code from `google-apps-script.js` (in this project), and click **Save**
5. They click **Deploy → New deployment** → gear icon → **Web app**
6. Set **Execute as:** "Me", **Who has access:** "Anyone" → **Deploy**
7. They **copy the full Web App URL** (starts with `https://script.google.com/macros/s/` and ends with `/exec`)
8. **You** update your `.env` file: replace `VITE_GOOGLE_SHEETS_URL` with their new URL
9. If using Alerts from Google Sheets, set `VITE_ALERTS_SHEETS_URL` to the same URL (or leave it if they use static alerts)
10. **Push to GitHub** — Vercel will redeploy. Or, if you use Vercel: go to **Project → Settings → Environment Variables**, edit `VITE_GOOGLE_SHEETS_URL` with the new URL, then **Deployments → Redeploy**

RSVPs will now go to your friend's sheet. When you switch back to your own wedding, change the URL back to your sheet's Apps Script URL.

### Option B: Full handoff (they host everything)

Your friend gets a full copy of the app and runs it themselves:

1. **Give them the project** — e.g. they fork/clone the repo, or you zip and send the `wedding-deploy` folder
2. They follow **PART 1** to create their own Google Sheet and deploy the Apps Script
3. They follow **PART 2** to create their own Firebase project (for push notifications)
4. They copy `.env.example` to `.env` and fill in **their** values (Firebase config, Google Sheets URL, etc.)
5. They deploy to Vercel (or another host) and add their environment variables
6. They edit `src/schedule-data.js` and `src/App.jsx` for their wedding details (names, dates, venue, etc.)

---

## PART 2: Firebase (Push Notifications + Backup DB) — ~20 minutes

### Step 1: Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Create a project"**
3. Name it **"moksha-sachin-wedding"**
4. Disable Google Analytics (not needed) → **Create Project**

### Step 2: Add a Web App

1. On the Project Overview page, click the **web icon** (`</>`)
2. Nickname: **"wedding-app"**
3. ✅ Check "Also set up Firebase Hosting" (optional but handy)
4. Click **Register app**
5. You'll see a config object like this:

```js
const firebaseConfig = {
  apiKey: "AIzaSyB...",
  authDomain: "moksha-sachin-wedding.firebaseapp.com",
  projectId: "moksha-sachin-wedding",
  storageBucket: "moksha-sachin-wedding.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

6. **Copy these values.**

### Step 3: Add Config via Environment Variables (Secure — Never Commit Keys)

1. Copy the example env file:
   ```powershell
   copy .env.example .env
   ```
2. Open `.env` and fill in your Firebase values (and Google Sheets URL from Part 1):
   ```
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=moksha-sachin-wedding.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=moksha-sachin-wedding
   VITE_FIREBASE_STORAGE_BUCKET=moksha-sachin-wedding.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   VITE_FIREBASE_VAPID_KEY=   (from Step 5 below)
   VITE_GOOGLE_SHEETS_URL=    (from Part 1)
   ```
3. **Never commit `.env`** — it's in `.gitignore`. The service worker is generated at build time: locally from `.env`, on Vercel from `process.env` (Vercel's Environment Variables). Add all Firebase vars to Vercel for push notifications to work on the live site.

### Step 4: Enable Firestore Database

1. In Firebase Console → **Build → Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (we'll secure it later)
4. Pick a region close to India (e.g., `asia-south1`)
5. Click **Enable**

### Step 5: Enable Cloud Messaging & Get VAPID Key

1. In Firebase Console → **Project Settings** (gear icon) → **Cloud Messaging** tab
2. Under **Web Push certificates**, click **Generate key pair**
3. Copy the key (a long string starting with `B...`)
4. Add the VAPID key to your `.env` file:
   ```
   VITE_FIREBASE_VAPID_KEY=BHx7a...your-actual-key
   ```

### Step 6: Test Push Notifications

1. Run `npm run dev`
2. Go to the **Alerts** tab in the app
3. Click **"Enable Notifications"**
4. Allow the browser notification prompt
5. You should see "Push notifications are enabled!"

### Step 7: Send a Test Notification

1. In Firebase Console → **Engage → Messaging**
2. Click **"Create your first campaign"** → **Notifications**
3. Title: "Sangeet Night Tomorrow! 🎶"
4. Body: "Get your dancing shoes ready!"
5. Click **"Send test message"**
6. Paste your FCM token (check browser console for it)
7. Click **Test** — you should see the notification pop up!

---

## PART 3: Secure Firestore (Before Going Live)

Replace the Firestore rules:

1. Go to [Firebase Console](https://console.firebase.google.com) and select your project
2. In the left sidebar, under **Build**, click **Firestore Database**
3. Click the **Rules** tab at the top (next to Data, Indexes, Usage)
4. Replace the existing rules with the rules below

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Anyone can submit an RSVP
    match /rsvps/{rsvp} {
      allow create: if true;
      allow read, update, delete: if false;
    }
    // Anyone can register for notifications
    match /notification_tokens/{token} {
      allow create: if true;
      allow read, update, delete: if false;
    }
  }
}
```

This means guests can submit RSVPs and register for notifications,
but only you (the admin) can read or delete them.

---

## PART 4: Deploy to Vercel

You have two options. **Option A** uses GitHub (good for updates later). **Option B** uses the Vercel CLI (simpler, no GitHub needed).

---

### Option A: Deploy via GitHub (recommended if you want to update the site later)

**Step 1: Create a GitHub account**

1. Go to [github.com](https://github.com) and click **Sign up**
2. Create a free account (email, password, username)

**Step 2: Install Git on your computer**

1. Download Git from [git-scm.com/downloads](https://git-scm.com/downloads)
2. Run the installer (default options are fine)
3. Open a new terminal/PowerShell window when done

**Step 3: Create a new repository on GitHub**

1. Log in to GitHub
2. Click the **+** icon (top right) → **New repository**
3. Name it: `moksha-sachin-wedding` (or any name you like)
4. Leave it **empty** (don't add README, .gitignore, or license)
5. Click **Create repository**

**Step 4: Push your project to GitHub**

In PowerShell or Terminal, go to your project folder and run:

```powershell
cd C:\Users\ckani\Downloads\moksha-sachin-wedding\wedding-deploy

git init
git add .
git commit -m "Initial wedding app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/moksha-sachin-wedding.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username. When prompted for password, use a **Personal Access Token** (GitHub no longer accepts account passwords):

- GitHub → Settings → Developer settings → Personal access tokens → Generate new token
- Give it a name, check "repo", and generate. Copy the token and paste it when Git asks for a password.

**Step 5: Deploy on Vercel**

1. Go to [vercel.com](https://vercel.com) and sign up (use "Continue with GitHub" — easiest)
2. Click **Add New** → **Project**
3. Import your `moksha-sachin-wedding` repository (it should appear in the list)
4. Click **Import**
5. **Add environment variables** before deploying: Project Settings → Environment Variables → add each variable from `.env` (VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, etc.). Use the same names as in `.env.example`. The service worker reads from `process.env` during the Vercel build — without these, push notifications will not work on the live site.
6. Vercel will detect it's a Vite project. Click **Deploy** (don't change any settings)
7. Wait 1–2 minutes. Your site will be live at `https://moksha-sachin-wedding.vercel.app` (or a similar URL)
8. Share this URL with guests!

**Step 6: Propagate changes to GitHub and Vercel (when you make edits)**

Whenever you change the app (e.g. update text, add venue photo, fix the map), push your changes so the live site updates:

1. Open PowerShell or Terminal and go to your project folder:
   ```powershell
   cd C:\Users\ckani\Downloads\moksha-sachin-wedding\wedding-deploy
   ```

2. Stage all changes:
   ```powershell
   git add .
   ```

3. Commit with a short message describing what you changed:
   ```powershell
   git commit -m "Add venue photo and update map"
   ```
   (Use any message, e.g. "Fix RSVP form", "Update schedule", "Add hero image")

4. Push to GitHub:
   ```powershell
   git push
   ```

5. **That's it!** Vercel automatically detects the push and redeploys your site within 1–2 minutes. No need to do anything on Vercel — just wait and refresh your live URL.

**Tip:** Run `git status` anytime to see which files have changed.

---

### Option B: Deploy without GitHub (quick one-time deploy)

1. Go to [vercel.com](https://vercel.com) and sign up (email or Google)
2. Install Vercel CLI: open PowerShell and run `npm install -g vercel`
3. Go to your project folder:
   ```powershell
   cd C:\Users\ckani\Downloads\moksha-sachin-wedding\wedding-deploy
   ```
4. Run `npx vercel` and follow the prompts:
   - Log in when asked
   - Accept default project name
   - Accept default settings (just press Enter)
5. Vercel will build and deploy. You'll get a URL like `https://wedding-deploy-xxx.vercel.app`
6. **Add environment variables:** Go to [vercel.com](https://vercel.com) → your project → Settings → Environment Variables. Add all vars from `.env` (Firebase, Google Sheets, etc.). Redeploy (Deployments → ⋮ → Redeploy) so the service worker is rebuilt with the correct config.
7. Share this URL with guests!

**To update later:** Run `npx vercel` again from the same folder. Each run creates a new deployment. For automatic updates on every change, switch to Option A (GitHub).

---

## PART 4b: Push Updates to Git and Vercel

Whenever you make changes to the app (text, images, styling, features), follow these steps to update your live site.

### Step-by-step workflow

**1. Open a terminal in your project folder**

```powershell
cd C:\Users\ckani\Downloads\moksha-sachin-wedding\wedding-deploy
```

(Or your actual project path.)

**2. Check what has changed**

```powershell
git status
```

This lists modified, added, or deleted files.

**3. Stage all changes**

```powershell
git add .
```

Or stage specific files: `git add src/App.jsx public/home/main-banner-photo.png`

**4. Commit with a descriptive message**

```powershell
git commit -m "Update venue map and add weather link"
```

Examples: `"Fix RSVP form"`, `"Add hero image"`, `"Update schedule dates"`, `"Change bottom nav colors"`

**5. Push to GitHub**

```powershell
git push
```

If this is your first push from this machine, you may need:

```powershell
git push -u origin main
```

**6. Vercel auto-deploys**

Vercel detects the push and rebuilds your site. In 1–2 minutes, your live URL (e.g. `https://moksha-sachin-wedding.vercel.app`) will show the updates. No need to log in to Vercel.

### Quick reference

| Step | Command |
|------|---------|
| See changes | `git status` |
| Stage all | `git add .` |
| Commit | `git commit -m "Your message"` |
| Push to GitHub | `git push` |

### If you get errors

**"fatal: not a git repository"**  
→ Run `git init` first. If the project was never pushed, follow **Step 4** in Option A (create repo on GitHub, add remote, push).

**"Updates were rejected"**  
→ Someone else pushed changes. Run `git pull` then `git push`.

**"Authentication failed"**  
→ Use a [Personal Access Token](https://github.com/settings/tokens) instead of your password when Git asks for credentials.

### If you deployed without GitHub (Option B)

Run `npx vercel` again from your project folder. Each run creates a new deployment. For automatic updates on every push, connect your project to GitHub (Vercel Dashboard → Project Settings → Git).

---

## Venue Gallery & Video

**Gallery:** Add 6–10 images to the `public/venue/` folder with the prefix `venue-gallery-`, e.g. `venue-gallery-1.png`, `venue-gallery-2.png`, … Edit the `VENUE_GALLERY_IMAGES` array in `src/App.jsx` to add or remove filenames (paths use `venue/` prefix).

**Video link:** The "Watch venue video" button opens `VENUE_VIDEO_URL` in `src/App.jsx`. By default it links to the Google Maps place page (which may show photos/videos if the venue has them). To use a YouTube or other video URL instead, change `VENUE_VIDEO_URL` to that link.

---

## PART 5: Sending Notifications to All Guests

Once guests have subscribed, you can send notifications via:

### Option A: Firebase Console (Easiest — No Code)
1. Firebase Console → Engage → Messaging
2. "New campaign" → Notifications
3. Write your message → Target "Web" → Schedule & Send

### Option B: Scheduled Notifications (Advanced)
Use Firebase Cloud Functions to auto-send reminders:
- "Sangeet Night starts in 1 hour!"
- "The baraat procession begins at 9 AM tomorrow"

This requires Firebase Cloud Functions (Blaze plan — pay as you go,
but wedding-scale usage would cost < ₹100 total).

---

## PART 5b: Manual Alerts (In-App) — Setup Guide

**Manual alerts** appear inside the app for all guests — no Firebase or push setup needed. Use this when Firebase push isn't working (e.g. on iPhone) or when you want a reliable fallback.

**Default:** The app already includes sample alerts from `alerts-data.js`. You can edit that file and push to GitHub, or switch to Google Sheets for no-code updates.

### Choose your method

| Method | Best for | To add an alert |
|--------|----------|-----------------|
| **Code** (PART 5b) | You're comfortable with Git | Edit `alerts-data.js`, push to GitHub |
| **Google Sheets** (PART 5c) | Non-technical family, last-minute changes | Add a row in the spreadsheet |

### How alerts work in the app

- **Urgent alerts** (`urgent: true`) → Show a banner modal when the app loads. Guest clicks "Got it" to dismiss.
- **Regular alerts** (`urgent: false`) → Appear only in the Alerts history (no banner).
- **Badge** → Red number on the bell icon in the bottom nav shows unread count.
- **History** → All alerts appear in the Alerts tab, newest first. Tap to mark as read.
- **Refresh** → Tap the Refresh button or pull down on the Alerts screen to fetch the latest (when using Google Sheets).

---

### Option A: Alerts from Code (`alerts-data.js`)

**Time needed:** ~5 minutes per alert

#### Step 1: Open the alerts file

1. In your project folder, open `src/alerts-data.js` in your code editor (VS Code, Cursor, etc.).

#### Step 2: Add a new alert object

2. Find the `ALERTS` array (it looks like `export const ALERTS = [ ... ]`).
3. Add a new object inside the array. Each alert needs these fields:

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `id` | Yes | Unique identifier, no spaces | `"shuttle-update"` |
| `title` | Yes | Short title shown in banner and list | `"Shuttle time change"` |
| `body` | Yes | Full message content | `"The shuttle will depart 15 min earlier..."` |
| `date` | Yes | Date in YYYY-MM-DD format | `"2026-12-18"` |
| `urgent` | Yes | `true` = banner on load; `false` = history only | `true` |

4. Make sure each object is separated by a comma. Example:

```js
export const ALERTS = [
  {
    id: "shuttle-update",
    title: "Shuttle time change",
    body: "The shuttle will depart 15 minutes earlier. Please arrive by 8:45 AM.",
    date: "2026-12-18",
    urgent: true,
  },
  // ... more alerts
];
```

#### Step 3: Save and push to GitHub

5. Save the file (Ctrl+S or Cmd+S).
6. Open a terminal in your project folder and run:

```powershell
git add src/alerts-data.js
git commit -m "Add shuttle time change alert"
git push
```

7. Wait 1–2 minutes for Vercel to redeploy. Guests will see the alert when they next open or refresh the app.

#### Step 4: Test it

8. Open your live app URL (e.g. `https://moksha-sachin-wedding.vercel.app`).
9. If the alert is urgent, you should see a banner modal. Click "Got it".
10. Go to the **Alerts** tab — the alert should appear in the history.

---

### Realistic examples (for code-based alerts)

**Shuttle or transport change (urgent)**
```js
{
  id: "shuttle-earlier",
  title: "Shuttle departure time change",
  body: "The shuttle from Madikeri will now depart at 8:45 AM instead of 9:00 AM. Please arrive at the pickup point 15 minutes earlier.",
  date: "2026-12-18",
  urgent: true,
},
```

**Venue or room change (urgent)**
```js
{
  id: "venue-room-change",
  title: "Cocktail venue update",
  body: "Due to weather, the cocktail evening has moved from the Misty Hilltop Deck to the Samaja Grand Hall. Same time — 5:00 PM.",
  date: "2026-12-19",
  urgent: true,
},
```

**Schedule reminder (not urgent)**
```js
{
  id: "sangeet-reminder",
  title: "Sangeet Night tonight! 🎶",
  body: "Starts at 8:00 PM at the Samaja Open-Air Stage. Get your dancing shoes ready!",
  date: "2026-12-19",
  urgent: false,
},
```

**Welcome message (not urgent)**
```js
{
  id: "welcome",
  title: "Welcome to Our Wedding App! 🌿",
  body: "We're thrilled you're joining us in Coorg. Explore the app for schedule, venue, and stay details!",
  date: "2026-02-15",
  urgent: false,
},
```

**RSVP deadline (not urgent)**
```js
{
  id: "rsvp-deadline",
  title: "RSVP by November 15",
  body: "Please confirm your attendance and meal preference by November 15, 2026. Tap RSVP in the app to respond.",
  date: "2026-11-01",
  urgent: false,
},
```

**Last-minute parking info (urgent)**
```js
{
  id: "parking-update",
  title: "Parking update for wedding day",
  body: "Additional parking is available at the coffee estate lot 200m past the main gate. Shuttle will run from there to the venue.",
  date: "2026-12-20",
  urgent: true,
},
```

### Quick reference (code-based alerts)

```powershell
# After editing src/alerts-data.js:
git add src/alerts-data.js
git commit -m "Add shuttle time change alert"
git push
```

Vercel deploys in 1–2 minutes. Guests see the alert when they next open or refresh the app.

---

## PART 5c: Alerts from Google Sheets (Optional)

Manage alerts from a spreadsheet — add a row and guests see it within 15 minutes (or immediately if they tap Refresh). No code or Git needed after setup.

**Time needed:** ~15 minutes for initial setup

---

### Step 1: Open your wedding spreadsheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Open the spreadsheet you use for RSVPs (the one connected to your wedding app)

---

### Step 2: Add an "Alerts" sheet

3. At the bottom of the spreadsheet, click the **+** button (or **Add sheet**) to create a new sheet tab.
4. Right-click the new tab and choose **Rename**. Name it exactly: **Alerts**
5. Click on cell **A1** and type: `id`
6. In **B1** type: `title`
7. In **C1** type: `body`
8. In **D1** type: `date`
9. In **E1** type: `urgent`

Your Row 1 should look like this:

| A | B | C | D | E |
|---|---|---|---|---|
| id | title | body | date | urgent |

10. Add at least one sample row so the sheet works. Example:

| id | title | body | date | urgent |
|----|-------|------|------|--------|
| welcome | Welcome! 🌿 | We're thrilled you're joining us in Coorg. | 2026-02-15 | false |

**Column rules:**
- **id** — Unique, no spaces (e.g. `shuttle-update`, `parking-info`)
- **title** — Short title (e.g. "Shuttle time change")
- **body** — Full message (can be long)
- **date** — YYYY-MM-DD (e.g. `2026-12-18`)
- **urgent** — `true` or `false` (or `1`/`0`). `true` = banner on app load; `false` = history only

---

### Step 3: Update the Apps Script

11. In your spreadsheet, click **Extensions → Apps Script**
12. You should see the existing script (the one that handles RSVPs). **Select all the code** (Ctrl+A or Cmd+A) and delete it.
13. Open the file `google-apps-script.js` from this project folder on your computer.
14. Copy **all** the code from that file and paste it into the Apps Script editor.
15. Click **💾 Save** (or Ctrl+S). The script now includes both RSVP (POST) and Alerts (GET).

---

### Step 4: Create a new deployment (or update existing)

**If this is your first time deploying:**

16. Click **Deploy → New deployment**
17. Click the gear icon ⚙️ → Select **Web app**
18. Set:
   - **Description:** "Wedding RSVP + Alerts"
   - **Execute as:** "Me"
   - **Who has access:** "Anyone"
19. Click **Deploy**
20. Authorize if prompted (click through the permissions)
21. **Copy the Web App URL** — it must start with `https://script.google.com/macros/s/` and end with `/exec`

**If you already have a deployment (from RSVP setup):**

16. Click **Deploy → Manage deployments**
17. Click the **pencil icon** (Edit) next to your existing deployment
18. Under **Version**, select **New version**
19. Click **Deploy**
20. The URL stays the same — no need to copy it again

---

### Step 5: Add the URL to your app

21. Open your project folder and edit the `.env` file (create from `.env.example` if needed).
22. Add this line (use your actual Web App URL):

```
VITE_ALERTS_SHEETS_URL=https://script.google.com/macros/s/YOUR_ACTUAL_ID/exec
```

**Important:** Use the **same URL** as `VITE_GOOGLE_SHEETS_URL` — the script handles both RSVP and Alerts. You can set both to the same value:

```
VITE_GOOGLE_SHEETS_URL=https://script.google.com/macros/s/ABC123.../exec
VITE_ALERTS_SHEETS_URL=https://script.google.com/macros/s/ABC123.../exec
```

23. If you deploy to Vercel, add `VITE_ALERTS_SHEETS_URL` in **Vercel Dashboard → Project → Settings → Environment Variables**. Use the same value as above.

---

### Step 6: Redeploy your app

24. Push your changes to GitHub (or run `npx vercel`):

```powershell
git add .
git commit -m "Enable alerts from Google Sheets"
git push
```

25. Wait 1–2 minutes for Vercel to redeploy.

---

### Step 7: Test it

26. Open your live app URL.
27. Go to the **Alerts** tab — you should see the alerts from your sheet.
28. Add a new row in the Alerts sheet with `urgent` = `true`. Tap **Refresh** on the Alerts screen — the new alert should appear. If it's urgent, close and reopen the app to see the banner.

---

### Adding new alerts (after setup)

1. Open your Google Sheet → **Alerts** tab
2. Add a new row with: id, title, body, date, urgent
3. Save (Google Sheets auto-saves)
4. Guests see it within 15 minutes, or immediately if they tap **Refresh** or pull down on the Alerts screen

---

### Resetting test alerts for all devices

If you've been testing with alerts and want to clear them for everyone (including testers on their phones):

**1. Clear the Alerts sheet** — Delete all rows (or leave only real alerts). On the next poll or refresh, everyone will see the updated list (empty or fresh).

**2. Reset "read" state (so urgent banners show again)** — Add a **Config** sheet:
- Create a new sheet tab named **Config**
- Row 1: `key` | `value`
- Row 2: `resetReadVersion` | `1`

When you want to clear everyone's "read" state (e.g. after testing), change the value to `2`, then `3`, etc. On the next poll, all devices will clear their read list and urgent banners will appear again for any urgent alerts.

---

### How it works

| Feature | Behavior |
|---------|----------|
| **Fetch on load** | Alerts load when the app opens |
| **Poll every 15 minutes** | New alerts appear automatically while the app is open |
| **Refresh button** | Tap to fetch the latest immediately |
| **Pull down to refresh** | On the Alerts screen, pull down when at the top to refresh |
| **Offline** | Cached alerts are shown when there's no network |

---

### Troubleshooting

**Alerts not showing from the sheet?**
- Check that the sheet tab is named exactly **Alerts** (case-sensitive)
- Check that Row 1 has the headers: id, title, body, date, urgent
- Verify `VITE_ALERTS_SHEETS_URL` is set in `.env` and Vercel
- Test the URL: open it in a browser — you should see JSON like `{"alerts":[...]}`

**"Alerts" sheet doesn't exist?**
- The script looks for a sheet named "Alerts". Create it and ensure the name matches exactly.

---

## PART 6: Google Maps Embed (Optional) — ~5 minutes

The Venue tab shows a map of the wedding location. By default it uses OpenStreetMap. If you want Google Maps instead (with zoom level 8):

### Step 1: Enable Maps Embed API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create one)
3. Go to **APIs & Services → Library**
4. Search for **Maps Embed API**
5. Click it and click **Enable**

### Step 2: Create an API Key

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → API key**
3. A **Create API key** modal appears — this is the configuration screen. The key is shown only *after* you click **Create**.
4. **Name** (optional): Keep the default or enter something like "Wedding App Maps"
5. **Application restrictions** (recommended): Select **Websites**, then add:
   - `localhost:*` (for local dev)
   - `*.vercel.app/*` (for Vercel)
   - Your custom domain if you use one (e.g. `yourdomain.com/*`)
6. **API restrictions** (recommended): Select **Restrict key**, then choose **Maps Embed API**
7. Click the blue **Create** button
8. A popup will show your new API key — **copy it now** (you may not see it again in full)
9. If you skipped restrictions, you can edit the key later in Credentials → click the pencil icon next to the key

### Step 3: Add to `.env`

Add to your `.env` file:
```
VITE_GOOGLE_MAPS_EMBED_KEY=your-api-key-here
```

Add the same variable in Vercel → Project Settings → Environment Variables.

When set, the Venue tab uses Google Maps with zoom level 8. When empty, it falls back to OpenStreetMap.

---

## Vercel Analytics

The app includes **Vercel Analytics** for page views and basic usage metrics. No extra setup is required.

### What's already done

- **Package:** `@vercel/analytics` is installed
- **Integration:** The `<Analytics />` component is added in `src/main.jsx`

### How it works

- **Local dev:** Analytics does not send data (Vercel only tracks production deployments)
- **On Vercel:** When you deploy to Vercel, analytics starts automatically. No API keys or env vars needed
- **Dashboard:** View metrics at [vercel.com](https://vercel.com) → your project → **Analytics** tab

### Optional: Custom events

To track custom events (e.g. RSVP submitted, button clicks):

```js
import { track } from '@vercel/analytics';

// Example: track when RSVP is sent
track('rsvp_submitted');
```

Add `track('event_name')` wherever you want to log an action. Events appear in the Vercel Analytics dashboard.

---

## Passcode Gate (Option C)

The app includes a passcode gate to limit access when the URL is shared widely. Guests must enter a 6-character passcode before seeing the wedding content.

**How it works:**
- Share the **URL** and **passcode separately** (e.g. URL in one message, passcode on the printed invite or via WhatsApp)
- Guests enter the passcode once per device; it is remembered in that browser
- Default passcode: **MS2026** (change via `VITE_APP_PASSCODE` in `.env`)

**Setup:**
1. Add `VITE_APP_PASSCODE=MS2026` to your `.env` (or your preferred 6-character code)
2. Add the same variable in Vercel → Project Settings → Environment Variables
3. Share the passcode only with invited guests

**To change the passcode:** Update `VITE_APP_PASSCODE` in `.env` and Vercel, then redeploy. Existing guests who already unlocked will keep access until they clear browser data or use a new device.

### Passcode management

**Test or retest the passcode screen**

The app stores the unlock state in `localStorage`. To see the passcode screen again (e.g. to test a new passcode):

1. Open the app in your browser
2. Open DevTools: **F12** or **Ctrl+Shift+I** (Windows) / **Cmd+Option+I** (Mac)
3. Go to **Application** (Chrome) or **Storage** (Firefox) → **Local Storage** → your site
4. Delete the key `wedding-passcode-unlocked`
5. Refresh the page — the passcode screen will appear again

Or run this in the **Console** tab:
```javascript
localStorage.removeItem('wedding-passcode-unlocked')
```
Then refresh.

**Change the passcode**

1. Update `VITE_APP_PASSCODE` in `.env` (e.g. `VITE_APP_PASSCODE=NEW123`)
2. Add or update the same variable in Vercel → Project Settings → Environment Variables
3. Redeploy (push to GitHub, or Vercel → Deployments → Redeploy)
4. New visitors must enter the new passcode. Existing guests who already unlocked keep access on that device until they clear browser data.

**Revoke access for everyone**

Change the passcode (steps above). Guests who had previously unlocked will keep access only on devices where they already entered the old passcode. On any new device or after clearing browser data, they will need the new passcode.

---

## Enable or Disable RSVP

You can turn RSVP on or off (e.g. close it after the deadline, or reopen if needed) without changing Google Sheets or Firebase.

**To disable RSVP:**

1. Open `src/schedule-data.js`
2. Change `RSVP_ENABLED` from `true` to `false`:
   ```javascript
   export const RSVP_ENABLED = false;
   ```
3. Push to GitHub (or redeploy on Vercel)

Guests will see "RSVP has closed. Thank you for your interest! For any queries, please contact the hosts directly." instead of the form. The RSVP tab stays visible so they can see the message.

**To re-enable RSVP:**

1. Open `src/schedule-data.js`
2. Change `RSVP_ENABLED` back to `true`:
   ```javascript
   export const RSVP_ENABLED = true;
   ```
3. Push to GitHub (or redeploy)

---

## Summary: What Goes in `.env` (and Vercel Environment Variables)

| Variable | What to Put |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_VAPID_KEY` | Web push VAPID key |
| `VITE_GOOGLE_SHEETS_URL` | Full Google Apps Script Web App URL (RSVP) |
| `VITE_ALERTS_SHEETS_URL` | Same URL for Alerts from sheet (optional; when empty, uses static alerts) |
| `VITE_GOOGLE_MAPS_EMBED_KEY` | Google Maps Embed API key (optional; when empty, uses OpenStreetMap) |
| `VITE_APP_PASSCODE` | 6-character passcode for app access (Option C). Default: MS2026. Share only with invited guests. |

---

## Troubleshooting

**RSVP not appearing in Google Sheet?**
→ Make sure the Apps Script is deployed as "Anyone" access.
→ Re-deploy if you made changes (Deploy → Manage → New Version).

**Push notifications not working?**
→ Must be HTTPS (localhost or Vercel — not plain HTTP).
→ **On live site (Vercel):** Ensure all Firebase env vars are in Vercel → Project Settings → Environment Variables. The service worker is built from `process.env`; if vars are missing, the worker has empty config and push won't work.
→ Check browser console for errors.
→ Safari on iOS has limited push support — works best on Android Chrome.

**Firestore permission denied?**
→ Check Firestore Rules — make sure `allow create: if true` is set.

**Manual alerts not showing?**
→ Ensure each alert has a unique `id`. Push to GitHub and wait for Vercel to redeploy. Guests must refresh or reopen the app to see new alerts.

---

That's it! Your wedding app now has:
✅ RSVPs saved to Google Sheets (easy for the family to view)
✅ RSVPs backed up in Firebase Firestore
✅ Real push notifications to guests' phones
✅ Manual in-app alerts (edit `src/alerts-data.js` and push — works on all devices)
✅ Notification preferences per guest
✅ Vercel Analytics (page views and metrics when deployed to Vercel)
