# 💍 Moksha & Sachin's Wedding App

A beautiful wedding web app set amidst the coffee estates of Coorg, Karnataka.

Built with React + Vite. Works as a PWA (guests can "Add to Home Screen" on their phones).

---

## 🚀 Deploy in 3 Steps (Vercel — Recommended)

### Step 1: Push to GitHub
```bash
# Unzip this project, then:
cd wedding-deploy
git init
git add .
git commit -m "Wedding app 🌿"

# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/wedding-app.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Vercel (Free)
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"New Project"**
3. Import your `wedding-app` repo
4. Click **"Deploy"** — that's it!

### Step 3: Share the Link
Vercel gives you a URL like `wedding-app.vercel.app`.
Share it with your friend — it works on phones, tablets, and desktops.

**Custom domain?** In Vercel dashboard → Settings → Domains → add `mokshasachin.com`

---

## 🖥️ Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

## 📦 Build for Production

```bash
npm run build
```

Output goes to `dist/` folder.

---

## 📱 PWA: "Add to Home Screen"

This app includes a web manifest so guests can install it like a native app:
- **iPhone**: Open in Safari → Share → "Add to Home Screen"
- **Android**: Chrome will auto-prompt, or tap ⋮ → "Add to Home Screen"

---

## 🔧 Customization

All content is in `src/App.jsx`:
- **Names & dates**: Search for "Moksha" and "Sachin"
- **Colors**: Edit the `theme` object at the top
- **Events**: Edit the `events` array in `ScheduleScreen`
- **Stays**: Edit the `stays` array in `StayScreen`
- **Venue**: Edit details in `VenueScreen`

---

## Alternative Deployment Options

| Platform | Effort | Cost | URL |
|----------|--------|------|-----|
| **Vercel** | Easiest | Free | yourapp.vercel.app |
| **Netlify** | Easy | Free | yourapp.netlify.app |
| **Firebase Hosting** | Medium | Free | yourapp.web.app |
| **GitHub Pages** | Easy | Free | username.github.io/wedding |

All support custom domains if you buy one (~₹800/year on GoDaddy or Namecheap).
