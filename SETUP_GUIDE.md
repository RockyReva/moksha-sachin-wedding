# 🛠️ SETUP GUIDE — Firebase + Google Sheets Backend

This guide will walk you through setting up the RSVP database and push
notifications for Moksha & Sachin's wedding app. Budget: **₹0** — everything
here is free at wedding scale.

**Time needed:** ~30 minutes total

---

## 🔒 SECURITY: API Keys (Important)

**Never commit API keys or secrets to GitHub.** This app uses environment variables:

- **Local:** Create `.env` from `.env.example` and fill in your values. `.env` is gitignored.
- **Vercel:** Add the same variables in Project Settings → Environment Variables
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

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Timestamp | Name | Phone | Attending | Guests | Meal | Drink | Dietary | Plus One Name |

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
3. **Never commit `.env`** — it's in `.gitignore`. The service worker is generated at build time from `.env`.

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
5. **Add environment variables** before deploying: Project Settings → Environment Variables → add each variable from `.env` (VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, etc.). Use the same names as in `.env.example`.
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
6. Share this URL with guests!

**To update later:** Run `npx vercel` again from the same folder. Each run creates a new deployment. For automatic updates on every change, switch to Option A (GitHub).

---

## PART 4b: Updating Your Live Site (GitHub + Vercel)

If you used **Option A** (GitHub), use this workflow whenever you make edits:

| Step | Command / Action |
|------|------------------|
| 1. Make your edits | Edit files in your project (e.g. in Cursor) |
| 2. Open terminal | PowerShell or Terminal in your project folder |
| 3. Stage changes | `git add .` |
| 4. Commit | `git commit -m "Describe your changes"` |
| 5. Push | `git push` |
| 6. Wait | Vercel auto-redeploys in 1–2 minutes |

Your live site at `your-app.vercel.app` will update automatically. No need to log in to Vercel.

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
| `VITE_GOOGLE_SHEETS_URL` | Full Google Apps Script Web App URL |

---

## Troubleshooting

**RSVP not appearing in Google Sheet?**
→ Make sure the Apps Script is deployed as "Anyone" access.
→ Re-deploy if you made changes (Deploy → Manage → New Version).

**Push notifications not working?**
→ Must be HTTPS (localhost or Vercel — not plain HTTP).
→ Check browser console for errors.
→ Safari on iOS has limited push support — works best on Android Chrome.

**Firestore permission denied?**
→ Check Firestore Rules — make sure `allow create: if true` is set.

---

That's it! Your wedding app now has:
✅ RSVPs saved to Google Sheets (easy for the family to view)
✅ RSVPs backed up in Firebase Firestore
✅ Real push notifications to guests' phones
✅ Notification preferences per guest
