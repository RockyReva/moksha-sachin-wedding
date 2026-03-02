import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import {
  submitRSVPToSheets,
  submitRSVPToFirebase,
  requestNotificationPermission,
  onForegroundMessage,
  getFCMTokenIfGranted,
} from "./firebase";
import { WEDDING_DATE, SCHEDULE_EVENTS, RSVP_DEADLINE, WEDDING_DATES_DISPLAY, RSVP_ENABLED } from "./schedule-data";
import { fetchAlerts } from "./alerts";
import { ALERTS as STATIC_ALERTS } from "./alerts-data";

const ALERTS_READ_KEY = "wedding-alerts-read";
const ALERTS_RESET_VERSION_KEY = "wedding-alerts-reset-version";
const ALERTS_POLL_MS = 9 * 60 * 1000; // 9 minutes

const APP_PASSCODE = import.meta.env.VITE_APP_PASSCODE || "MS2026";
const PASSCODE_STORAGE_KEY = "wedding-passcode-unlocked";
// Some Android keyboards prepend chars instead of append; accept both directions
const isPasscodeValid = (code) => code === APP_PASSCODE || code.split("").reverse().join("") === APP_PASSCODE;

const colors = ["#E91E63", "#F06292", "#9C27B0", "#2196F3", "#42A5F5", "#00BCD4", "#4CAF50", "#66BB6A", "#2D5016", "#4a5d23", "#5C3D2E", "#6D4C41", "#8D6E63", "#C4972A", "#FFD700", "#B8860B", "#C0C0C0", "#B0BEC5", "#E0E0E0"];

const runConfetti = () => {
  const duration = 2500;
  const end = Date.now() + duration;
  (function frame() {
    confetti({ particleCount: 4, spread: 100, origin: { y: 0.6 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
};

const runConfettiFromTop = () => {
  const duration = 3500;
  const end = Date.now() + duration;
  (function frame() {
    confetti({
      particleCount: 4,
      angle: 90,
      spread: 120,
      origin: { x: Math.random(), y: 0 },
      colors,
      startVelocity: 20,
      gravity: 0.8,
      scalar: 0.9,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
};

// July 4th style fireworks — multiple bursts from different positions
const fireworksColors = ["#ff0000", "#ffffff", "#0066ff", "#ff6600", "#ffff00"];
const runFireworks = () => {
  const count = 5;
  const defaults = { spread: 360, ticks: 200, gravity: 0, scalar: 1.2, colors: fireworksColors };
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 80,
        origin: { x: 0.2 + Math.random() * 0.6, y: 0.1 + Math.random() * 0.3 },
        startVelocity: 25,
      });
      confetti({
        ...defaults,
        particleCount: 60,
        origin: { x: 0.2 + Math.random() * 0.6, y: 0.1 + Math.random() * 0.3 },
        startVelocity: 30,
        scalar: 1,
      });
    }, i * 280);
  }
};

const SCREENS = ["home", "rsvp", "schedule", "venue", "stay", "notifications"];

// Hero background: add main-banner-photo.png to public/home/ folder
const HERO_BG_FALLBACK = "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80";

// Venue: Federation of Kodava Samaja, Kandimakki, Karnataka 571218, India
const VENUE_LAT = 12.1476806;
const VENUE_LNG = 75.7980955;

// Venue gallery: add images to public/venue/ with prefix "venue-gallery-" (e.g. venue-gallery-1.png)
const VENUE_GALLERY_IMAGES = ["venue/venue-gallery-1.png", "venue/venue-gallery-2.png", "venue/venue-gallery-3.png", "venue/venue-gallery-4.png", "venue/venue-gallery-5.png", "venue/venue-gallery-6.png"];
// Add more as needed: venue-gallery-7.png, venue-gallery-8.png, etc.

// Venue video: Google Maps place (shows photos/videos) or YouTube link. Update if you have a specific video URL.
const VENUE_VIDEO_URL = "https://www.google.com/maps/place/Federation+of+Kodava+Samaja/@12.1456625,75.800733,3a,75y,90t/data=!3m8!1e5!3m6!1sCIHM0ogKEICAgICJ6JLEOg!2e10!3e10!6shttps:%2F%2Flh3.googleusercontent.com%2Fgps-cs-s%2FAHVAweo5z5q8RSrNeMwBtOyt9vhiqTYOvqyfnKZPlIT7K3SW_Vz5HHuqFzY-UmVi_6DdYJ_5gav0JxHkarCjOO0YAa4HzZUJCXcMd4W8ouG57tIrKe3Y8g8iQb7OgSKMeRxQQyOpf9cV%3Dw203-h114-k-no!7i848!8i480!4m16!1m8!3m7!1s0x3ba5b41b63ffffff:0xe828732414bae264!2sFederation+of+Kodava+Samaja!8m2!3d12.1456625!4d75.800733!10e5!16s%2Fg%2F11cjhbndmq!3m6!1s0x3ba5b41b63ffffff:0xe828732414bae264!8m2!3d12.1456625!4d75.800733!10e5!16s%2Fg%2F11cjhbndmq?entry=ttu&g_ep=EgoyMDI2MDIyNS4wIKXMDSoASAFQAw%3D%3D";
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY;
const VENUE_MAP_EMBED = GOOGLE_MAPS_KEY
  ? `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${VENUE_LAT},${VENUE_LNG}&zoom=9`
  : `https://www.openstreetmap.org/export/embed.html?bbox=75.5%2C12.0%2C76.8%2C12.5&marker=${VENUE_LAT}%2C${VENUE_LNG}&layer=mapnik`;
const WEATHER_URL = "https://www.accuweather.com/en/in/madikeri/188779/weather-forecast/188779";
const WEATHER_API = `https://api.open-meteo.com/v1/forecast?latitude=${VENUE_LAT}&longitude=${VENUE_LNG}&current=temperature_2m,weather_code,relative_humidity_2m,apparent_temperature&timezone=auto`;

// --- Coorg Coffee Estate Color Palette ---
const theme = {
  bg: "#F7F4F0",
  card: "#FFFFFF",
  accent: "#2D5016",
  accentDark: "#1A3409",
  accentLight: "#2D501615",
  accentWarm: "#8B6914",
  accentMid: "#3D6B22",
  accentLightGreen: "#4A7C2E",
  coffee: "#5C3D2E",
  coffeeDark: "#6D4C41",
  coffeeLight: "#F5EDE6",
  mist: "#E8EDE5",
  mistDark: "#C5D1BF",
  gold: "#C4972A",
  goldLight: "#E5C76B",
  goldDark: "#9A7209",
  text: "#2C2418",
  textMuted: "#7A6E5D",
  border: "#E2DDD6",
  success: "#3A7D34",
  successBg: "#E8F5E4",
  successBorder: "#C5E1C0",
  heroSubtitle: "#A8C99A",
  heroLocation: "#C5E1B8",
  leafOrnament: "#8DB77A",
  olive: "#4a5d23",
  navActive: "#B8860B",
  navInactive: "#4A5F2E",
  navIconFilterActive: "brightness(0) saturate(100%) invert(68%) sepia(51%) saturate(1827%) hue-rotate(10deg) brightness(0.95) contrast(0.95)",
  navIconFilterInactive: "brightness(0) saturate(100%) invert(31%) sepia(28%) saturate(756%) hue-rotate(75deg) brightness(0.95) contrast(0.9)",
  badge: "#E53935",
  white: "#FFFFFF",
  cream: "#FFF9ED",
  creamLight: "#FFFDF7",
  stayCardBg: "#F9F3E8",
  stayCardAccent: "#EDF5E8",
  stayIconBg: "#FFF8ED",
};

// --- Typography ---
const typo = {
  fontSerif: "'Cormorant Garamond', serif",
  fontSans: "'DM Sans', 'Helvetica Neue', sans-serif",
  h1: 44,
  h2: 28,
  h3: 20,
  h3Small: 17,
  body: 14,
  bodySmall: 13,
  caption: 13,
  small: 11,
  tiny: 10,
};

// --- SVG Icons ---
const sw = (p) => p?.strokeWidth ?? 1.8;
const Icons = {
  Home: (p) => (
    <svg width={p?.nav ? 24 : 22} height={p?.nav ? 24 : 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw(p)} strokeLinecap="round" strokeLinejoin="round" shapeRendering="geometricPrecision" style={{ flexShrink: 0 }}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  RSVP: (p) => (
    <svg width={p?.nav ? 24 : 22} height={p?.nav ? 24 : 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw(p)} strokeLinecap="round" strokeLinejoin="round" shapeRendering="geometricPrecision" style={{ flexShrink: 0 }}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  Schedule: (p) => (
    <svg width={p?.nav ? 24 : 22} height={p?.nav ? 24 : 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw(p)} strokeLinecap="round" strokeLinejoin="round" shapeRendering="geometricPrecision" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Venue: (p) => (
    <svg width={p?.nav ? 24 : 22} height={p?.nav ? 24 : 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw(p)} strokeLinecap="round" strokeLinejoin="round" shapeRendering="geometricPrecision" style={{ flexShrink: 0 }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Stay: (p) => (
    <svg width={p?.nav ? 24 : 22} height={p?.nav ? 24 : 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw(p)} strokeLinecap="round" strokeLinejoin="round" shapeRendering="geometricPrecision" style={{ flexShrink: 0 }}>
      <path d="M3 21h18M3 7v14M21 7v14M6 7V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3M9 21v-4h6v4M9 10h1M14 10h1M9 14h1M14 14h1" />
    </svg>
  ),
  Bell: (p) => (
    <svg width={p?.nav ? 24 : 22} height={p?.nav ? 24 : 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw(p)} strokeLinecap="round" strokeLinejoin="round" shapeRendering="geometricPrecision" style={{ flexShrink: 0 }}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Heart: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  Star: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={theme.gold} stroke="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Check: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  ExternalLink: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  Close: (p) => (
    <svg width={p?.size ?? 24} height={p?.size ?? 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Leaf: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-3.8 10-10 10z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  ),
  Coffee: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      <line x1="6" y1="2" x2="6" y2="4" /><line x1="10" y1="2" x2="10" y2="4" /><line x1="14" y1="2" x2="14" y2="4" />
    </svg>
  ),
  Mountain: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3l4 8 5-5 5 15H2L8 3z" />
    </svg>
  ),
};

// --- Golden Decorative Frame (ornate border around app) ---
function GoldenFrame({ children }) {
  // Stylized corner flourish — scrollwork inspired by traditional frames
  const CornerFlourish = ({ style }) => (
    <svg width="26" height="26" viewBox="0 0 26 26" style={{ position: "absolute", ...style }}>
      <path d="M2 2 v8 Q2 14 8 14 h8 M2 2 h8 Q14 2 14 8 v8" stroke={theme.gold} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 2 Q6 6 10 2 M2 2 Q6 6 2 10" stroke={theme.goldLight} strokeWidth="0.9" fill="none" opacity="0.75" strokeLinecap="round" />
    </svg>
  );
  // Repeating bead/dot pattern — small golden beads along the border
  const Bead = () => (
    <svg width="5" height="5" viewBox="0 0 6 6" style={{ flexShrink: 0 }}>
      <circle cx="3" cy="3" r="1.5" fill={theme.goldLight} opacity="0.95" />
      <circle cx="3" cy="3" r="0.8" fill={theme.gold} />
    </svg>
  );
  const beadCountH = 22;
  const beadCountV = 32;
  const topBeads = Array.from({ length: beadCountH }, (_, i) => <Bead key={`t-${i}`} />);
  const sideBeads = Array.from({ length: beadCountV }, (_, i) => <Bead key={`s-${i}`} />);
  return (
    <div style={{
      position: "relative",
      padding: 8,
      borderRadius: 48,
      background: `
        repeating-linear-gradient(45deg, transparent, transparent 5px, ${theme.goldLight}12 5px, ${theme.goldLight}12 6px),
        repeating-linear-gradient(-45deg, transparent, transparent 5px, ${theme.goldDark}08 5px, ${theme.goldDark}08 6px),
        linear-gradient(145deg, ${theme.goldDark} 0%, ${theme.gold} 35%, ${theme.goldLight} 70%, ${theme.gold} 100%)
      `,
      boxShadow: `inset 0 1px 0 ${theme.goldLight}99, inset 0 -1px 0 ${theme.goldDark}66, 0 0 24px ${theme.gold}25`,
    }}>
      {/* Edge patterns — beads along top, bottom, left, right */}
      <div style={{ position: "absolute", top: 11, left: 32, right: 32, display: "flex", justifyContent: "space-evenly", pointerEvents: "none" }}>
        {topBeads}
      </div>
      <div style={{ position: "absolute", bottom: 11, left: 32, right: 32, display: "flex", justifyContent: "space-evenly", pointerEvents: "none" }}>
        {topBeads}
      </div>
      <div style={{ position: "absolute", top: 32, bottom: 32, left: 11, display: "flex", flexDirection: "column", justifyContent: "space-evenly", pointerEvents: "none" }}>
        {sideBeads}
      </div>
      <div style={{ position: "absolute", top: 32, bottom: 32, right: 11, display: "flex", flexDirection: "column", justifyContent: "space-evenly", pointerEvents: "none" }}>
        {sideBeads}
      </div>
      <div style={{
        position: "relative",
        borderRadius: 40,
        padding: 4,
        background: `linear-gradient(180deg, ${theme.goldLight}25 0%, transparent 50%, ${theme.goldDark}15 100%)`,
      }}>
        <CornerFlourish style={{ top: 4, left: 4 }} />
        <CornerFlourish style={{ top: 4, right: 4, transform: "scaleX(-1)" }} />
        <CornerFlourish style={{ bottom: 4, left: 4, transform: "scaleY(-1)" }} />
        <CornerFlourish style={{ bottom: 4, right: 4, transform: "scale(-1)" }} />
        {children}
      </div>
    </div>
  );
}

// --- Coffee Bean Decorative SVG ---
function CoffeeBeanDecor({ style }) {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" style={style}>
      <ellipse cx="20" cy="20" rx="12" ry="16" fill={theme.coffee} opacity="0.12" transform="rotate(-20 20 20)" />
      <path d="M14 10 C18 20 18 28 14 34" stroke={theme.coffee} strokeWidth="1.2" fill="none" opacity="0.15" transform="rotate(-20 20 20)" />
    </svg>
  );
}

// --- Misty Mountain Illustration ---
function MistyMountains() {
  return (
    <svg width="100%" height="120" viewBox="0 0 400 120" preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="mist1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.accentLightGreen} stopOpacity="0.15" />
          <stop offset="100%" stopColor={theme.accent} stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="mist2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.accentMid} stopOpacity="0.12" />
          <stop offset="100%" stopColor={theme.accent} stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="mist3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.coffee} stopOpacity="0.08" />
          <stop offset="100%" stopColor={theme.coffee} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Far mountains */}
      <path d="M0 90 Q50 30 100 70 Q150 40 200 55 Q250 25 300 60 Q350 35 400 75 L400 120 L0 120Z" fill="url(#mist1)" />
      {/* Mid mountains */}
      <path d="M0 100 Q60 55 120 80 Q180 50 240 72 Q300 45 360 68 Q380 58 400 85 L400 120 L0 120Z" fill="url(#mist2)" />
      {/* Coffee plantation hills */}
      <path d="M0 108 Q80 75 160 95 Q240 70 320 88 Q370 78 400 100 L400 120 L0 120Z" fill="url(#mist3)" />
    </svg>
  );
}

// --- Pepper Vine Border ---
function VineBorder() {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 4, padding: "6px 0", opacity: 0.35 }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="4" fill={theme.accent} opacity={0.3 + (i % 3) * 0.15} />
          <circle cx="10" cy="10" r="2" fill={theme.accent} opacity={0.5 + (i % 3) * 0.1} />
        </svg>
      ))}
    </div>
  );
}

// --- Flourish ---
function Flourish({ style }) {
  return (
    <div style={{ fontFamily: typo.fontSans, textAlign: "center", color: theme.accent, opacity: 0.4, fontSize: typo.body, letterSpacing: 12, ...style }}>
      ❧ ☘ ❧
    </div>
  );
}

// --- Countdown Hook ---
function useCountdown(targetDate) {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) return;
      setTime({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return time;
}

// ========== HOME SCREEN ==========
// WMO weather codes → emoji + label
const WMO_WEATHER = {
  0: { icon: "☀️", label: "Clear" },
  1: { icon: "🌤️", label: "Mainly clear" },
  2: { icon: "⛅", label: "Partly cloudy" },
  3: { icon: "☁️", label: "Overcast" },
  45: { icon: "🌫️", label: "Foggy" },
  48: { icon: "🌫️", label: "Foggy" },
  51: { icon: "🌦️", label: "Light drizzle" },
  53: { icon: "🌦️", label: "Drizzle" },
  55: { icon: "🌦️", label: "Dense drizzle" },
  56: { icon: "🌦️", label: "Freezing drizzle" },
  57: { icon: "🌦️", label: "Dense freezing drizzle" },
  61: { icon: "🌧️", label: "Light rain" },
  63: { icon: "🌧️", label: "Rain" },
  65: { icon: "🌧️", label: "Heavy rain" },
  66: { icon: "🌧️", label: "Light freezing rain" },
  67: { icon: "🌧️", label: "Freezing rain" },
  71: { icon: "❄️", label: "Light snow" },
  73: { icon: "❄️", label: "Snow" },
  75: { icon: "❄️", label: "Heavy snow" },
  77: { icon: "❄️", label: "Snow grains" },
  80: { icon: "🌧️", label: "Rain showers" },
  81: { icon: "🌧️", label: "Rain showers" },
  82: { icon: "🌧️", label: "Heavy rain showers" },
  85: { icon: "❄️", label: "Snow showers" },
  86: { icon: "❄️", label: "Heavy snow showers" },
  95: { icon: "⛈️", label: "Thunderstorm" },
  96: { icon: "⛈️", label: "Thunderstorm" },
  99: { icon: "⛈️", label: "Thunderstorm" },
};
const getWeather = (code) => WMO_WEATHER[code] ?? { icon: "🌤️", label: "—" };

function LiveWeatherCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(WEATHER_API)
      .then((r) => r.json())
      .then((json) => {
        if (json.current) setData(json.current);
        else setError("No data");
      })
      .catch((err) => setError(err?.message || "Failed"))
      .finally(() => setLoading(false));
  }, []);

  const cardStyle = {
    background: theme.card, borderRadius: 14, padding: "12px 14px",
    border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", gap: 10,
    textDecoration: "none", color: "inherit", cursor: "pointer",
  };

  const content = loading ? (
    <>
      <span style={{ fontSize: 22 }}>🌤️</span>
      <div>
        <div style={{ fontFamily: typo.fontSerif, fontSize: typo.bodySmall, fontWeight: 700, color: theme.text }}>Weather</div>
        <div style={{ fontSize: typo.small, color: theme.textMuted }}>Loading…</div>
      </div>
    </>
  ) : error ? (
    <>
      <span style={{ fontSize: 22 }}>🌤️</span>
      <div>
        <div style={{ fontFamily: typo.fontSerif, fontSize: typo.bodySmall, fontWeight: 700, color: theme.text }}>Weather</div>
        <div style={{ fontSize: typo.small, color: theme.accent }}>Tap for forecast →</div>
      </div>
    </>
  ) : (
    <>
      <span style={{ fontSize: 28 }}>{getWeather(data.weather_code).icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: typo.fontSerif, fontSize: 18, fontWeight: 700, color: theme.text }}>
          {Math.round(data.temperature_2m)}°C
        </div>
        <div style={{ fontSize: typo.small, color: theme.textMuted }}>
          {getWeather(data.weather_code).label} · {data.relative_humidity_2m}% humidity
        </div>
      </div>
    </>
  );

  return (
    <a href={WEATHER_URL} target="_blank" rel="noopener noreferrer" style={cardStyle}>
      {content}
    </a>
  );
}

function HomeScreen({ onNavigate, onConfetti, onFireworks }) {
  const countdown = useCountdown(WEDDING_DATE);
  const [footerModal, setFooterModal] = useState(null);

  const DISCLAIMER_TEXT = "This application is developed as a private wedding event coordination tool and is provided \"as is\" without warranties of any kind. The developer does not guarantee uninterrupted availability, accuracy of information, or error-free operation. The developer shall not be liable for any loss, inconvenience, data issues, or event-related outcomes arising from the use of this platform. Users are responsible for independently confirming all event details with the hosts.";
  const PRIVACY_TEXT = "This platform collects limited personal information (such as name, contact details, and RSVP responses) solely for the purpose of coordinating wedding events. The information is accessible only to the event organizers and will not be sold, rented, or used for marketing purposes. Data may be retained temporarily for event management and may be deleted after the event concludes.";

  return (
    <div style={{ padding: 0 }}>
      {/* Hero Banner — uses public/home/main-banner-photo.png if present, else fallback */}
      <div style={{
        background: `linear-gradient(180deg, rgba(26,52,9,0.85) 0%, rgba(45,80,22,0.7) 40%, rgba(45,80,22,0.85) 100%), url("/home/main-banner-photo.png") center/cover no-repeat, url("${HERO_BG_FALLBACK}") center/cover no-repeat`,
        padding: "36px 24px 0", textAlign: "center", position: "relative", overflow: "hidden",
        minHeight: 320,
      }}>
        {/* Decorative coffee beans */}
        <CoffeeBeanDecor style={{ position: "absolute", top: 12, left: 20, transform: "rotate(30deg)" }} />
        <CoffeeBeanDecor style={{ position: "absolute", top: 50, right: 16, transform: "rotate(-15deg)" }} />
        <CoffeeBeanDecor style={{ position: "absolute", bottom: 40, left: 45, transform: "rotate(60deg)" }} />

        {/* Leaf ornament */}
        <div style={{ opacity: 0.4, marginBottom: 8 }}>
          <svg width="48" height="24" viewBox="0 0 60 30">
            <path d="M30 28 Q10 20 2 8 Q10 2 30 6 Q50 2 58 8 Q50 20 30 28Z" fill="none" stroke={theme.leafOrnament} strokeWidth="1" />
            <path d="M30 6 L30 28" stroke={theme.leafOrnament} strokeWidth="0.8" />
          </svg>
        </div>

        <p style={{ fontFamily: typo.fontSerif, fontSize: typo.caption, letterSpacing: 5, textTransform: "uppercase", color: theme.heroSubtitle, marginBottom: 6 }}>
          Amidst the Coffee Estates of Coorg
        </p>
        <h1 style={{ fontFamily: typo.fontSerif, fontSize: typo.h1, fontWeight: 300, color: theme.white, margin: "4px 0", lineHeight: 1.05 }}>
          Moksha <span style={{ color: theme.gold, fontWeight: 400 }}>&</span> Sachin
        </h1>
        <p style={{ fontFamily: typo.fontSerif, fontSize: typo.body, color: theme.heroSubtitle, letterSpacing: 3, textTransform: "uppercase", marginBottom: 2 }}>
          Request the honour of your presence
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 3, margin: "12px 0 6px", opacity: 0.5 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} width="8" height="8" viewBox="0 0 10 10"><circle cx="5" cy="5" r="2" fill={theme.gold} /></svg>
          ))}
        </div>

        <p style={{ fontFamily: typo.fontSerif, fontSize: 22, color: theme.white, fontWeight: 500, margin: "8px 0 10px" }}>
          {WEDDING_DATES_DISPLAY}
        </p>
        <p style={{ fontSize: typo.caption, color: theme.heroLocation, lineHeight: 1.4, margin: "0 0 8px" }}>
          Kodagu, Karnataka · The Scotland of India
        </p>

        <MistyMountains />
      </div>

      {/* Countdown */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { val: countdown.days, label: "Days" },
            { val: countdown.hours, label: "Hours" },
            { val: countdown.minutes, label: "Min" },
            { val: countdown.seconds, label: "Sec" },
          ].map((item) => (
            <div key={item.label} style={{
              background: theme.card, borderRadius: 16, padding: "14px 8px", textAlign: "center",
              boxShadow: "0 2px 12px rgba(45,80,22,0.06)", border: `1px solid ${theme.mist}`,
            }}>
              <div style={{ fontFamily: typo.fontSerif, fontSize: 30, fontWeight: 700, color: theme.accent }}>{item.val}</div>
              <div style={{ fontSize: typo.tiny, color: theme.textMuted, textTransform: "uppercase", letterSpacing: 2, marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Welcome Card */}
        <div style={{
          background: theme.card,
          borderRadius: 20, padding: "22px 20px", position: "relative", overflow: "hidden",
          boxShadow: "0 2px 12px rgba(45,80,22,0.06)", border: `1px solid ${theme.mist}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ color: theme.accent }}><Icons.Coffee /></span>
            <span style={{ fontFamily: typo.fontSerif, fontSize: 18, fontWeight: 600, color: theme.text }}>Welcome, Dear Guests</span>
          </div>
          <p style={{ fontSize: typo.bodySmall, lineHeight: 1.75, color: theme.textMuted, margin: 0 }}>
            As the mist rolls over the Western Ghats and the aroma of freshly brewed coffee fills the air, 
            we invite you to celebrate the union of Moksha & Sachin in the enchanting hills of Coorg. 
            Your presence will make our celebration as warm as a cup of Kodagu's finest. ☕
          </p>
        </div>

        {/* Quick Info Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16, marginBottom: 20 }}>
          {[
            { icon: "🎉", label: "2-Day", desc: "Celebration", screen: "schedule" },
            { icon: "💒", label: "Kodava Samaja", desc: "Wedding Venue", screen: "venue" },
            { icon: "🌿", label: "Coorg", desc: "Kodagu, Karnataka", url: "https://karnatakatourism.org/en/destinations/coorg" },
          ].map((item, i) => {
            const card = (
              <>
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                <div>
                  <div style={{ fontFamily: typo.fontSerif, fontSize: typo.bodySmall, fontWeight: 700, color: theme.text }}>{item.label}</div>
                  <div style={{ fontSize: typo.small, color: theme.textMuted }}>{item.desc}</div>
                </div>
              </>
            );
            const style = {
              background: theme.card, borderRadius: 14, padding: "12px 14px",
              border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", gap: 10,
              cursor: (item.screen || item.url) ? "pointer" : "default",
              textDecoration: "none", color: "inherit",
            };
            if (item.url) {
              return (
                <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" style={style}>
                  {card}
                </a>
              );
            }
            if (item.screen && onNavigate) {
              return (
                <button key={i} onClick={() => onNavigate(item.screen)} style={{ ...style, border: "none", textAlign: "left", font: "inherit", width: "100%" }}>
                  {card}
                </button>
              );
            }
            return <div key={i} style={style}>{card}</div>;
          })}
          <LiveWeatherCard />
        </div>

        <div style={{
          fontSize: typo.small, color: theme.olive, opacity: 0.75, marginTop: 16, marginBottom: 8, fontStyle: "italic", fontFamily: typo.fontSans,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <img src="/home/flowerpot-firework.png" alt="" onClick={() => onFireworks?.()} style={{ width: 27, height: 27, objectFit: "contain", flexShrink: 0, cursor: onFireworks ? "pointer" : "default" }} title="Click for fireworks!" />
          <img src="/home/flowerpot-firework.png" alt="" onClick={() => onFireworks?.()} style={{ width: 27, height: 27, objectFit: "contain", flexShrink: 0, cursor: onFireworks ? "pointer" : "default" }} title="Click for fireworks!" />
        </div>

        <div style={{ textAlign: "center", padding: "8px 16px 16px", fontSize: 11, color: theme.textMuted, lineHeight: 1.5 }}>
          <p style={{ margin: "0 0 4px", fontFamily: typo.fontSans }}>
            App developed & presented by CK Designs.
          </p>
          <p style={{ margin: "0 0 4px" }}>This app is a private wedding coordination app.</p>
          <p style={{ margin: 0 }}>
            <span onClick={() => setFooterModal("disclaimer")} style={{ color: theme.accent, cursor: "pointer", textDecoration: "underline" }}>Disclaimer</span>
            {" | "}
            <span onClick={() => setFooterModal("privacy")} style={{ color: theme.accent, cursor: "pointer", textDecoration: "underline" }}>Privacy Notice</span>
          </p>
        </div>
      </div>

      {footerModal && (
        <div
          onClick={() => setFooterModal(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.5)", padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: theme.card, borderRadius: 20, padding: 24, maxWidth: 360, width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)", border: `1px solid ${theme.mist}`,
            }}
          >
            <h3 style={{ fontFamily: typo.fontSerif, fontSize: typo.h3, color: theme.text, margin: "0 0 12px" }}>
              {footerModal === "disclaimer" ? "Disclaimer" : "Privacy Notice"}
            </h3>
            <p style={{ fontSize: typo.body, color: theme.textMuted, lineHeight: 1.6, margin: "0 0 20px" }}>
              {footerModal === "disclaimer" ? DISCLAIMER_TEXT : PRIVACY_TEXT}
            </p>
            <button onClick={() => setFooterModal(null)} style={{
              width: "100%", padding: "12px", borderRadius: 12, border: "none",
              background: theme.accent, color: "white", fontFamily: typo.fontSerif, fontSize: typo.body, fontWeight: 600, cursor: "pointer",
            }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== RSVP SCREEN ==========
function RSVPScreen() {
  const [form, setForm] = useState({ name: "", phone: "+91 ", attending: "", meal: "", drinkPreference: "", gangaPoojaDrink: "", guests: "1", vegCount: 0, consent: false });
  const [submitted, setSubmitted] = useState(false);
  const phoneInputRef = useRef(null);
  const set = (key) => (e) => setForm({ ...form, [key]: typeof e === "string" ? e : e.target ? e.target.value : e });
  const guestTotal = form.guests === "5+" ? 5 : parseInt(form.guests, 10) || 1;
  const isMultiGuest = guestTotal > 1;

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.attending || !form.consent) return;
    setSubmitting(true);
    const veg = isMultiGuest ? form.vegCount : (form.meal === "Veg" ? 1 : 0);
    const nonVeg = isMultiGuest ? guestTotal - form.vegCount : (form.meal === "Non-Veg" ? 1 : 0);
    const payload = { ...form, veg, nonVeg };
    try {
      // Google Sheets is the main destination — wait for the request to complete
      await submitRSVPToSheets(payload);
      setSubmitted(true);
      // Firebase backup: run in background so we don't block the UI if Firebase is slow or not set up
      submitRSVPToFirebase(payload).catch((err) => console.error("Firebase backup error:", err));
    } catch (err) {
      console.error("Submit error:", err);
      setSubmitted(true); // Sheets uses no-cors so we can't read response; assume sent
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ width: 68, height: 68, borderRadius: "50%", background: theme.successBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Icons.Check />
        </div>
        <h2 style={{ fontFamily: typo.fontSerif, fontSize: typo.h2, color: theme.text, marginBottom: 8 }}>Dhanyavaadagalu! 🙏</h2>
        <p style={{ fontSize: typo.body, color: theme.textMuted, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
          Your RSVP has been received. We're so excited to celebrate with you amidst the coffee estates!
        </p>
        <VineBorder />
      </div>
    );
  }

  if (!RSVP_ENABLED) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <h2 style={{ fontFamily: typo.fontSerif, fontSize: typo.h2, color: theme.text, marginBottom: 12 }}>RSVP</h2>
        <p style={{ fontSize: typo.body, color: theme.textMuted, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
          RSVP has closed. Thank you for your interest! For any queries, please contact the hosts directly.
        </p>
        <VineBorder />
      </div>
    );
  }

  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: 12, border: `1px solid ${theme.border}`,
    fontSize: typo.body, color: theme.text, background: theme.card, outline: "none", boxSizing: "border-box",
    fontFamily: typo.fontSans, transition: "border-color 0.2s",
  };
  const labelStyle = { fontFamily: typo.fontSerif, fontSize: typo.bodySmall, fontWeight: 800, color: theme.coffee, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6, display: "block" };

  const RadioGroup = ({ label, sublabel, options, value, onChange, centered, optionIcons, gridColumns, stretch, optionColors, bgOnlyWhenSelected }) => (
    <div style={{ marginBottom: 18 }}>
      <label style={labelStyle}>{label}</label>
      {sublabel && <p style={{ fontSize: typo.small, color: theme.textMuted, margin: "0 0 6px", fontStyle: "italic" }}>{sublabel}</p>}
      <div style={{
        display: stretch ? "flex" : gridColumns ? "grid" : "flex",
        gridTemplateColumns: gridColumns && !stretch ? `repeat(${gridColumns}, 1fr)` : undefined,
        gap: 7,
        flexWrap: gridColumns && !stretch ? undefined : "wrap",
        justifyContent: centered ? "center" : "flex-start",
      }}>
        {options.map((opt) => {
          const icon = optionIcons?.[opt];
          const colors = optionColors?.[opt];
          const isSelected = value === opt;
          const bg = colors
            ? (isSelected ? colors.bgSelected ?? colors.bg : (bgOnlyWhenSelected ? theme.card : colors.bg))
            : (isSelected ? theme.accentLight : theme.card);
          const borderColor = colors ? (isSelected ? colors.border : (colors.borderUnselected ?? colors.bg)) : (isSelected ? theme.accent : theme.border);
          const textColor = colors ? (isSelected ? colors.color : theme.textMuted) : (isSelected ? theme.accent : theme.textMuted);
          return (
            <button key={opt} onClick={() => onChange(isSelected ? "" : opt)} style={{
              padding: "9px 16px", borderRadius: 30, border: `1.5px solid ${borderColor}`,
              background: bg, color: textColor,
              fontSize: typo.caption, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, whiteSpace: "nowrap",
              ...(stretch && { flex: 1, minWidth: 0 }),
            }}>
              {icon && <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );

  const drinkIcons = {
    Whiskey: "🥃",
    Brandy: "🍷",
    Rum: "🍹",
    Gin: "🍸",
    Vodka: "🍶",
    Beer: "🍺",
    Wine: "🍇",
    "No Preference": "✨",
  };
  const gangaPoojaIcons = {
    Cocktails: "🍸",
    Mocktails: "🥤",
  };

  return (
    <div style={{ padding: "10px 20px 30px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <span style={{ color: theme.accent, opacity: 0.5 }}><Icons.Leaf /></span>
        <h2 style={{ fontFamily: typo.fontSerif, fontSize: typo.h2, color: theme.text, margin: "6px 0 2px" }}>RSVP</h2>
        <p style={{ fontSize: typo.caption, color: theme.textMuted }}>Kindly respond by {RSVP_DEADLINE}</p>
      </div>

      <div style={{ background: theme.card, borderRadius: 20, padding: 22, boxShadow: "0 2px 16px rgba(45,80,22,0.06)", border: `1px solid ${theme.mist}` }}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Full Name</label>
          <input style={inputStyle} placeholder="Your full name" value={form.name} onChange={set("name")} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Phone Number</label>
          <div style={{ position: "relative", ...inputStyle }}>
            {form.phone.length <= 4 && (
              <span style={{
                position: "absolute", left: 44, top: "50%", transform: "translateY(-50%)",
                fontSize: typo.body, color: theme.textMuted, opacity: 0.45, pointerEvents: "none",
                fontFamily: typo.fontSans,
              }}>98765 43210</span>
            )}
            <input
              ref={phoneInputRef}
              style={{ ...inputStyle, position: "absolute", inset: 0, background: "transparent", border: "none" }}
              value={form.phone}
              onChange={set("phone")}
              onFocus={() => {
                requestAnimationFrame(() => {
                  const el = phoneInputRef.current;
                  if (el) {
                    const len = el.value.length;
                    el.setSelectionRange(len, len);
                  }
                });
              }}
            />
          </div>
        </div>

        <RadioGroup label="Will you attend?" options={["Joyfully Accept", "Regretfully Decline"]} value={form.attending} onChange={set("attending")} />

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Number of Guests</label>
          <div style={{ display: "flex", gap: 8 }}>
            {["1", "2", "3", "4", "5+"].map((n) => (
              <button key={n} onClick={() => setForm({ ...form, guests: n, vegCount: n === "1" ? 0 : form.vegCount })} style={{
                width: 44, height: 44, borderRadius: 12, border: `1.5px solid ${form.guests === n ? theme.accent : theme.border}`,
                background: form.guests === n ? theme.accentLight : theme.card,
                color: form.guests === n ? theme.accent : theme.textMuted,
                fontSize: typo.body, fontWeight: 700, cursor: "pointer",
              }}>{n}</button>
            ))}
          </div>
        </div>

        <div style={{ minHeight: 95, marginBottom: 8 }}>
          {isMultiGuest ? (
            <div>
              <label style={labelStyle}>How many prefer vegetarian?</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "nowrap", marginTop: 8, width: 252, maxWidth: "100%" }}>
                {Array.from({ length: guestTotal + 1 }, (_, i) => i).map((n) => (
                <button key={n} onClick={() => setForm({ ...form, vegCount: n })} style={{
                  flex: "1 1 0", minWidth: 0, padding: "8px 4px", borderRadius: 20, border: `1.5px solid ${form.vegCount === n ? theme.accent : theme.border}`,
                  background: form.vegCount === n ? theme.accentLight : theme.card,
                  color: form.vegCount === n ? theme.accent : theme.textMuted,
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>{n}</button>
                ))}
              </div>
              <p style={{ fontSize: typo.body, fontWeight: 600, marginTop: 8, marginBottom: 0, textAlign: "center", width: 252, maxWidth: "100%" }}>
                <span style={{ color: theme.accent }}>{form.vegCount} Veg</span>
                <span style={{ color: theme.textMuted, margin: "0 10px", fontSize: 18, fontWeight: 700 }}>·</span>
                <span style={{ color: "#E65100" }}>{guestTotal - form.vegCount} Non-Veg</span>
              </p>
            </div>
          ) : (
            <RadioGroup
              label="Meal Preference"
              options={["Veg", "Non-Veg"]}
              value={form.meal}
              onChange={set("meal")}
              stretch
              bgOnlyWhenSelected
              optionColors={{
                Veg: { bg: "#E8F5E9", bgSelected: "#C8E6C9", border: "#4CAF50", borderUnselected: "#A5D6A7", color: "#2E7D32" },
                "Non-Veg": { bg: "#FFF3E0", bgSelected: "#FFE0B2", border: "#FF9800", borderUnselected: "#FFCC80", color: "#E65100" },
              }}
            />
          )}
        </div>
        <RadioGroup
          label="Drink Preference"
          sublabel="Adults only — soft drinks available for all"
          options={["Whiskey", "Brandy", "Rum", "Gin", "Vodka", "Beer", "Wine", "No Preference"]}
          value={form.drinkPreference}
          onChange={set("drinkPreference")}
          optionIcons={drinkIcons}
          gridColumns={2}
          bgOnlyWhenSelected
          optionColors={{
            Whiskey: { bg: "#F5E6D3", bgSelected: "#E8D4B8", border: "#B8860B", borderUnselected: "#D4A574", color: "#6D4C41" },
            Brandy: { bg: "#F5EDE0", bgSelected: "#E8DCC8", border: "#8B6914", borderUnselected: "#C4A35A", color: "#5C3D2E" },
            Rum: { bg: "#FFF3E0", bgSelected: "#FFE0B2", border: "#E65100", borderUnselected: "#FFCC80", color: "#BF360C" },
            Gin: { bg: "#E8F5E9", bgSelected: "#C8E6C9", border: "#2E7D32", borderUnselected: "#81C784", color: "#1B5E20" },
            Vodka: { bg: "#E3F2FD", bgSelected: "#BBDEFB", border: "#1976D2", borderUnselected: "#64B5F6", color: "#0D47A1" },
            Beer: { bg: "#FFE0B2", bgSelected: "#FFCC80", border: "#FF8F00", borderUnselected: "#FFB74D", color: "#E65100" },
            Wine: { bg: "#F3E5F5", bgSelected: "#E1BEE7", border: "#7B1FA2", borderUnselected: "#CE93D8", color: "#4A148C" },
            "No Preference": { bg: "#ECEFF1", bgSelected: "#CFD8DC", border: "#607D8B", borderUnselected: "#90A4AE", color: "#455A64" },
          }}
        />
        <RadioGroup
          label="Ganga Pooja Time"
          options={["Cocktails", "Mocktails"]}
          value={form.gangaPoojaDrink}
          onChange={set("gangaPoojaDrink")}
          optionIcons={gangaPoojaIcons}
          stretch
          bgOnlyWhenSelected
          optionColors={{
            Cocktails: { bg: "#FFAEC4", bgSelected: "#FF8FAB", border: "#E91E63", borderUnselected: "#F48FB1", color: "#AD1457" },
            Mocktails: { bg: "#E0F7FA", bgSelected: "#B2EBF2", border: "#0192B5", borderUnselected: "#4DD0E1", color: "#006064" },
          }}
        />
        <p style={{ fontSize: typo.small, color: theme.textMuted, marginBottom: 18, lineHeight: 1.5, fontStyle: "italic" }}>
          Soft drinks will be available during Oorkoduva, Muhurtha and other times at the bar as well.
        </p>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20, cursor: "pointer" }}>
          <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} style={{ marginTop: 4, flexShrink: 0, width: 18, height: 18, accentColor: theme.accent }} />
          <span style={{ fontSize: 10, color: theme.textMuted, lineHeight: 1.5 }}>
            I consent to sharing my name and phone number with the wedding organizers for communication and coordination related to this wedding. This information will not be shared further and will be deleted after the event.
          </span>
        </label>

        <button onClick={handleSubmit} disabled={submitting || !form.name || !form.attending || (!isMultiGuest && !form.meal) || !form.consent} style={{
          width: "100%", padding: "14px", borderRadius: 30, border: "none",
          background: submitting || !form.name || !form.attending || (!isMultiGuest && !form.meal) || !form.consent
            ? "rgba(107, 123, 94, 0.5)"
            : "linear-gradient(135deg, #152B06, #1E4512)",
          color: theme.white, fontSize: 16, fontWeight: 700, cursor: submitting ? "wait" : "pointer", letterSpacing: 1,
          boxShadow: submitting || !form.name || !form.attending || (!isMultiGuest && !form.meal) || !form.consent ? "none" : "0 4px 20px rgba(45,80,22,0.35)", transition: "all 0.2s",
          textShadow: "0 1px 2px rgba(0,0,0,0.25)",
        }}>
          {submitting ? "Sending..." : "🌿 Send RSVP 🌿"}
        </button>
      </div>
    </div>
  );
}

// ========== SCHEDULE SCREEN ==========
function ScheduleScreen() {
  return (
    <div style={{ padding: "10px 20px 30px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h2 style={{ fontFamily: typo.fontSerif, fontSize: typo.h2, color: theme.text, margin: "0 0 2px" }}>Schedule</h2>
        <p style={{ fontSize: typo.caption, color: theme.textMuted }}>Two days of love among the hills</p>
        <VineBorder />
      </div>

      <div style={{ position: "relative", paddingLeft: 30 }}>
        <div style={{ position: "absolute", left: 11, top: 8, bottom: 8, width: 2, background: `linear-gradient(180deg, ${theme.accent}, ${theme.mistDark}, ${theme.coffee})`, borderRadius: 1 }} />
        {SCHEDULE_EVENTS.map((ev, i) => {
          const isWedding = ev.title.includes("Dampathi Muhurtha");
          const photos = ev.photos || [];
          return (
            <div key={i} style={{ position: "relative", marginBottom: 18 }}>
              <div style={{
                position: "absolute", left: -23, top: 24, width: 12, height: 12, borderRadius: "50%",
                background: isWedding ? theme.gold : theme.accent,
                border: `3px solid ${theme.bg}`, boxShadow: `0 0 0 2px ${isWedding ? theme.gold : theme.accent}30`,
              }} />
              <div style={{
                background: `linear-gradient(135deg, ${theme.cream}, ${theme.creamLight})`,
                borderRadius: 16, overflow: "hidden",
                boxShadow: "0 2px 10px rgba(45,80,22,0.05)",
                border: `1px solid ${theme.gold + "40"}`,
              }}>
                <div style={{ padding: "14px 16px", overflow: "hidden" }}>
                  <div style={{ width: "100%", marginBottom: 10 }}>
                    <div style={{ fontFamily: typo.fontSerif, fontSize: 16, color: theme.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5 }}>
                      {ev.time}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {ev.customIcon ? (
                        <img src={ev.customIcon} alt="" style={{ width: 24, height: 24, objectFit: "contain", flexShrink: 0 }} />
                      ) : (
                        <span style={{ fontSize: 20 }}>{ev.icon}</span>
                      )}
                      <span style={{ fontFamily: typo.fontSerif, fontSize: 18, fontWeight: 700 }}>
                        {ev.title.includes(" | ") ? (
                          <>
                            <span style={{ color: theme.accent }}>{ev.title.split(" | ")[0]}</span>
                            <span style={{ color: theme.coffee }}> | {ev.title.split(" | ")[1]}</span>
                          </>
                        ) : (
                          <span style={{ color: theme.text }}>{ev.title}</span>
                        )}
                      </span>
                    </div>
                  </div>
                  {photos.length > 0 && (
                    <div style={{
                      float: "left", width: "50%", marginRight: 12, marginBottom: 8,
                      display: "flex", flexDirection: "column", gap: 4,
                    }}>
                      {photos.map((p, j) => (
                        <div key={j} style={{
                          width: "100%", aspectRatio: photos.length === 2 ? "4/3" : "3/4",
                          background: "#000", borderRadius: 12, overflow: "hidden",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <img src={`/${p}`} alt="" style={{
                            width: "100%", height: "100%",
                            objectFit: "contain", objectPosition: "center center",
                          }} />
                        </div>
                      ))}
                    </div>
                  )}
                  <p style={{ fontSize: typo.caption, color: theme.textMuted, lineHeight: 1.55, margin: "0 0 8px" }}>{ev.desc}</p>
                  <p style={{ fontSize: typo.small, color: theme.textMuted, display: "flex", alignItems: "center", gap: 4, margin: 0 }}>
                    <span style={{ color: theme.accent }}><Icons.Venue /></span> {ev.location}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========== VENUE SCREEN ==========
function VenueScreen() {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  return (
    <div style={{ padding: "10px 20px 30px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h2 style={{ fontFamily: typo.fontSerif, fontSize: typo.h2, color: theme.text, margin: "0 0 2px" }}>Venue</h2>
        <p style={{ fontSize: typo.caption, color: theme.textMuted }}>Federation of Kodava Samaja</p>
        <p style={{ fontSize: typo.small, color: theme.textMuted, marginTop: 4 }}>~7 km from Virajpet</p>
      </div>

      {/* Map: Google Maps (zoom 8) when API key set; else OpenStreetMap */}
      <div style={{
        height: 200, borderRadius: 20, overflow: "hidden", marginBottom: 18,
        border: `1px solid ${theme.mist}`,
      }}>
        <iframe
          src={VENUE_MAP_EMBED}
          width="100%"
          height="100%"
          style={{ border: 0, display: "block" }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Venue location - Federation of Kodava Samaja"
        />
      </div>

      {/* Venue Gallery */}
      {VENUE_GALLERY_IMAGES.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <h3 style={{ fontFamily: typo.fontSerif, fontSize: 18, color: theme.text, margin: "0 0 10px" }}>Gallery</h3>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6,
            borderRadius: 16, overflow: "hidden",
          }}>
            {VENUE_GALLERY_IMAGES.map((src, i) => (
              <button
                key={i}
                onClick={() => setLightboxIndex(i)}
                style={{
                  aspectRatio: "1", padding: 0, border: "none", cursor: "pointer", overflow: "hidden",
                  background: theme.mist, borderRadius: 8,
                }}
              >
                <img
                  src={`/${src}`}
                  alt={`Venue ${i + 1}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  loading="lazy"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          onClick={() => setLightboxIndex(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.95)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, boxSizing: "border-box",
          }}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            style={{
              position: "absolute", top: 16, right: 16, width: 44, height: 44, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Icons.Close size={22} />
          </button>
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              style={{
                position: "absolute", left: 12, width: 48, height: 48, borderRadius: "50%",
                background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Icons.ChevronLeft />
            </button>
          )}
          {lightboxIndex < VENUE_GALLERY_IMAGES.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              style={{
                position: "absolute", right: 12, width: 48, height: 48, borderRadius: "50%",
                background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Icons.ChevronRight />
            </button>
          )}
          <img
            src={`/${VENUE_GALLERY_IMAGES[lightboxIndex]}`}
            alt={`Venue ${lightboxIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain", borderRadius: 8 }}
          />
        </div>
      )}

      <div style={{ background: theme.card, borderRadius: 20, padding: 22, boxShadow: "0 2px 16px rgba(45,80,22,0.06)", border: `1px solid ${theme.mist}`, marginBottom: 14 }}>
        <h3 style={{ fontFamily: typo.fontSerif, fontSize: typo.h3, color: theme.text, margin: "0 0 12px" }}>Address & Directions</h3>
        <p style={{ fontSize: typo.bodySmall, color: theme.textMuted, lineHeight: 1.7, margin: "0 0 16px" }}>
          Federation of Kodava Samaja<br />
          Kandimakki, Karnataka 571218, India
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <a
            href="https://www.google.com/maps/search/Federation+of+Kodava+Samaja+Kandimakki+Karnataka+571218"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, minWidth: 140, padding: "12px", borderRadius: 30, border: `1.5px solid ${theme.accent}`,
              background: "transparent", color: theme.accent, fontFamily: typo.fontSerif, fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              textDecoration: "none", boxSizing: "border-box",
            }}
          >
            Open in Google Maps <Icons.ExternalLink />
          </a>
          <a
            href={VENUE_VIDEO_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, minWidth: 140, padding: "12px", borderRadius: 30, border: `1.5px solid ${theme.gold}`,
              background: "transparent", color: theme.accentWarm, fontFamily: typo.fontSerif, fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              textDecoration: "none", boxSizing: "border-box",
            }}
          >
            ▶ Watch venue video <Icons.ExternalLink />
          </a>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { city: "Virajpet", distance: "~7 km", time: "Closest town", dist: 7, directions: `https://www.google.com/maps/dir/?api=1&destination=${VENUE_LAT},${VENUE_LNG}&origin=Virajpet,Karnataka&travelmode=driving` },
            { city: "Mysore", distance: "~110 km", time: "~2 hrs", dist: 110, directions: `https://www.google.com/maps/dir/?api=1&destination=${VENUE_LAT},${VENUE_LNG}&origin=Mysore,Karnataka&travelmode=driving` },
            { city: "Mangalore", distance: "~170 km", time: "~2.5 hrs", dist: 170, directions: `https://www.google.com/maps/dir/?api=1&destination=${VENUE_LAT},${VENUE_LNG}&origin=Mangalore,Karnataka&travelmode=driving` },
            { city: "Bangalore", distance: "~245 km", time: "~3.5 hrs", dist: 245, directions: `https://www.google.com/maps/dir/?api=1&destination=${VENUE_LAT},${VENUE_LNG}&origin=Bangalore,Karnataka&travelmode=driving` },
            { city: null, label: "Parking", value: "Free on-site parking", dist: 300 },
            { city: null, label: "Dress Code", value: "Traditional / Smart", dist: 301 },
          ].sort((a, b) => a.dist - b.dist).map((item) => {
            const isCity = !!item.city;
            const headerStyle = { fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 4, fontFamily: typo.fontSerif };
            const detailStyle = { fontSize: typo.caption, color: theme.textMuted, lineHeight: 1.4, display: "flex", alignItems: "center", gap: 4 };
            const headerText = isCity ? item.city : item.label;
            const detailText = isCity ? `${item.distance} · ${item.time}` : item.value;
            const content = (
              <>
                <div style={headerStyle}>{headerText}</div>
                <div style={detailStyle}>
                  {detailText}
                  {item.directions && <Icons.ExternalLink style={{ fontSize: 11, opacity: 0.7 }} />}
                </div>
              </>
            );
            return item.directions ? (
              <a key={item.city || item.label} href={item.directions} target="_blank" rel="noopener noreferrer" style={{
                background: theme.mist, borderRadius: 12, padding: "12px 14px", textDecoration: "none", color: "inherit", cursor: "pointer",
                transition: "background 0.2s",
              }} onMouseOver={(e) => { e.currentTarget.style.background = theme.mistDark; }} onMouseOut={(e) => { e.currentTarget.style.background = theme.mist; }}>
                {content}
              </a>
            ) : (
              <div key={item.label} style={{ background: theme.mist, borderRadius: 12, padding: "12px 14px" }}>{content}</div>
            );
          })}
        </div>
      </div>

      {/* Travel Tips */}
      <div style={{ background: theme.coffeeLight, borderRadius: 16, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>🚐</span>
        <p style={{ fontSize: typo.caption, color: theme.coffee, margin: 0, lineHeight: 1.6 }}>
          <strong>Shuttle available!</strong> We'll arrange complimentary shuttle buses from Virajpet (closest town) on Dec 19 & 20. Details will be shared closer to the date.
        </p>
      </div>
    </div>
  );
}

// ========== STAY SCREEN ==========
function StayScreen() {
  const otherStays = [
    {
      name: "Bittangala",
      type: "Peaceful Village",
      distance: "~8 km from venue",
      price: "Various",
      rating: null,
      emoji: "🌳",
      tag: "Nature Base",
      desc: "A serene village in Virajpet taluk, surrounded by coffee estates and the Western Ghats. Gateway to Brahmagiri Wildlife Sanctuary, Barapole Dam & Perumbadi Lake. Ideal for guests who want a quiet, nature-immersed stay away from the bustle. Resorts and homestays available.",
      color: "#E8F0E2",
    },
    {
      name: "Virajpet",
      type: "Historic Town",
      distance: "~7 km from venue",
      price: "Various",
      rating: null,
      emoji: "🏘️",
      tag: "Gateway to Coorg",
      desc: "The second-largest town in Kodagu, steeped in Kodava heritage. Lined with coffee plantations, paddy fields & spice estates. Great base for Dubare Elephant Camp, Nagarhole safaris, rafting & plantation tours. Hotels: Club Mahindra Virajpet, Coorg Cliffs Resort.",
      color: "#F5EDE6",
    },
    {
      name: "Gonikoppa",
      type: "Junction Town",
      distance: "~18 km from venue",
      price: "Various",
      rating: null,
      emoji: "☕",
      tag: "Plantation Gateway",
      desc: "A bustling junction town where roads meet Madikeri, Virajpet & Kerala. Surrounded by lush coffee, pepper & cardamom plantations. Many homestays and budget-friendly stays. Hotels: The Cocoon (eco-boutique), Treebo Durga Boji Grand.",
      color: "#E5EDE8",
    },
  ];

  return (
    <div style={{ padding: "10px 20px 30px" }}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <h2 style={{ fontFamily: typo.fontSerif, fontSize: typo.h2, color: theme.text, margin: "0 0 2px" }}>Where to Stay</h2>
        <p style={{ fontSize: typo.caption, color: theme.textMuted }}>Handpicked stays near the wedding venue</p>
      </div>

      <div style={{
        background: `linear-gradient(135deg, ${theme.mist}, ${theme.coffeeLight})`,
        borderRadius: 16, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10,
        border: `1px solid ${theme.mistDark}`,
      }}>
        <span style={{ fontSize: 18, marginTop: 2 }}>☕</span>
        <p style={{ fontSize: typo.caption, color: theme.coffee, margin: 0, lineHeight: 1.5 }}>
          <strong>Book early!</strong> December is peak season in Coorg. We've arranged special group rates at a few properties — call us for details.
        </p>
      </div>

      {/* ===== RECOMMENDED SECTION ===== */}
      <div style={{ marginBottom: 22 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
        }}>
          <div style={{
            width: 4, height: 22, borderRadius: 2,
            background: `linear-gradient(180deg, ${theme.gold}, ${theme.accent})`,
          }} />
          <h3 style={{ fontFamily: typo.fontSerif, fontSize: typo.h3, fontWeight: 700, color: theme.text, margin: 0 }}>
            ✨ Recommended by Us
          </h3>
        </div>
        <p style={{ fontSize: typo.caption, color: theme.textMuted, marginBottom: 12, marginLeft: 12 }}>
          Handpicked by the family — closest to the venue & trusted stays
        </p>

        {/* Magnolia Resorts */}
        <div onClick={() => window.open("https://www.magnoliaresorts.com/", "_blank")} style={{
          background: theme.card, borderRadius: 18, marginBottom: 12, overflow: "hidden",
          boxShadow: "0 3px 16px rgba(45,80,22,0.08)", cursor: "pointer",
          border: `1.5px solid ${theme.gold}30`, position: "relative",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${theme.gold}, ${theme.accent}, ${theme.gold})`,
          }} />
          <div style={{
            background: `linear-gradient(135deg, ${theme.stayCardBg}, ${theme.stayCardAccent})`, padding: "16px 18px",
            display: "flex", gap: 14, alignItems: "flex-start",
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: theme.stayIconBg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, flexShrink: 0, border: `1px solid ${theme.gold}25`,
            }}>🌺</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{
                  fontFamily: typo.fontSerif, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1,
                  color: theme.gold, background: `${theme.gold}15`, padding: "2px 8px", borderRadius: 20,
                }}>⭐ Family Pick</span>
              </div>
              <div style={{ fontFamily: typo.fontSerif, fontSize: 19, fontWeight: 700, color: theme.text, lineHeight: 1.2, marginBottom: 4 }}>
                Magnolia Resorts
              </div>
              <div style={{ fontFamily: typo.fontSerif, fontSize: 12, color: theme.accent, fontWeight: 600, marginBottom: 4 }}>
                ~6 km from venue · Luxury Plantation Resort · 70 Acres
              </div>
              <p style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.5, margin: "0 0 8px" }}>
                Nestled in the Western Ghats forests with coffee, pepper & cinnamon plantations. Colonial-era cottages, swimming pool, spa, Italian restaurant & arboretum.
              </p>
              <div style={{ fontSize: 11.5, color: theme.textMuted, lineHeight: 1.6, marginBottom: 8 }}>
                📍 Arji Hills, Near Perumbadi Checkpost, Virajpet, Karnataka 571218
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: theme.textMuted }}>📞 +91 91089 47145</span>
                <span style={{
                  fontFamily: typo.fontSerif, fontSize: 11, fontWeight: 700, color: theme.accent, background: theme.accentLight,
                  padding: "4px 12px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4,
                }}>Visit Website <Icons.ExternalLink /></span>
              </div>
            </div>
          </div>
        </div>

        {/* INIKA Resorts */}
        <div onClick={() => window.open("https://inikaresorts.com/", "_blank")} style={{
          background: theme.card, borderRadius: 18, marginBottom: 12, overflow: "hidden",
          boxShadow: "0 3px 16px rgba(45,80,22,0.08)", cursor: "pointer",
          border: `1.5px solid ${theme.gold}30`, position: "relative",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${theme.gold}, ${theme.accent}, ${theme.gold})`,
          }} />
          <div style={{
            background: `linear-gradient(135deg, ${theme.stayCardBg}, ${theme.stayCardAccent})`, padding: "16px 18px",
            display: "flex", gap: 14, alignItems: "flex-start",
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: theme.stayIconBg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, flexShrink: 0, border: `1px solid ${theme.gold}25`,
            }}>🌿</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{
                  fontFamily: typo.fontSerif, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1,
                  color: theme.gold, background: `${theme.gold}15`, padding: "2px 8px", borderRadius: 20,
                }}>⭐ Family Pick</span>
              </div>
              <div style={{ fontFamily: typo.fontSerif, fontSize: 19, fontWeight: 700, color: theme.text, lineHeight: 1.2, marginBottom: 4 }}>
                INIKA Resorts
              </div>
              <div style={{ fontFamily: typo.fontSerif, fontSize: 12, color: theme.accent, fontWeight: 600, marginBottom: 4 }}>
                ~13 km from venue · Luxury Cottage Resort · Coffee Estate
              </div>
              <p style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.5, margin: "0 0 8px" }}>
                Nature-focused luxury amidst a coffee plantation near Madikeri. Luxury & premium wooden cottages, bunk house, row house, swimming pool, lake boating & curated plantation experiences.
              </p>
              <div style={{ fontSize: 11.5, color: theme.textMuted, lineHeight: 1.6, marginBottom: 8 }}>
                📍 Kuttandi, Virajpet, Coorg, Karnataka 571216
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: theme.textMuted }}>📞 +91 90357 40031</span>
                <span style={{
                  fontFamily: typo.fontSerif, fontSize: 11, fontWeight: 700, color: theme.accent, background: theme.accentLight,
                  padding: "4px 12px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4,
                }}>Visit Website <Icons.ExternalLink /></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== OTHER STAYS SECTION ===== */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
      }}>
        <div style={{
          width: 4, height: 22, borderRadius: 2, background: theme.mistDark,
        }} />
        <h3 style={{ fontFamily: typo.fontSerif, fontSize: typo.h3, fontWeight: 700, color: theme.text, margin: 0 }}>
          Other Stays Nearby
        </h3>
      </div>

      {otherStays.map((s, i) => (
        <div key={i} style={{
          background: theme.card, borderRadius: 18, marginBottom: 12, overflow: "hidden",
          boxShadow: "0 2px 10px rgba(45,80,22,0.05)", border: `1px solid ${theme.mist}`,
          cursor: "pointer", transition: "transform 0.2s",
        }}>
          <div style={{ display: "flex" }}>
            <div style={{
              width: 82, minHeight: 108, background: s.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 34, flexShrink: 0,
            }}>
              {s.emoji}
            </div>
            <div style={{ padding: "12px 14px", flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <span style={{
                  fontFamily: typo.fontSerif, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1,
                  color: theme.accent, background: theme.accentLight, padding: "2px 7px", borderRadius: 20,
                }}>{s.tag}</span>
                {s.rating != null && (
                  <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11.5, color: theme.gold, fontWeight: 600 }}>
                    <Icons.Star /> {s.rating}
                  </span>
                )}
              </div>
              <div style={{ fontFamily: typo.fontSerif, fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 1, lineHeight: 1.2 }}>{s.name}</div>
              <div style={{ fontSize: typo.small, color: theme.textMuted, marginBottom: 5, lineHeight: 1.4 }}>{s.desc}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: theme.textMuted }}>📍 {s.distance}</span>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: theme.accent }}>{s.price}</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Estate Stays Note */}
      <div style={{ background: theme.card, borderRadius: 16, padding: "14px 16px", border: `1px solid ${theme.border}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>🏡</span>
        <p style={{ fontSize: typo.caption, color: theme.textMuted, margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: theme.text }}>Want a plantation experience?</strong> Many local coffee estate owners offer guest rooms. Ask us and we'll connect you with trusted Kodava families.
        </p>
      </div>
    </div>
  );
}

// ========== NOTIFICATIONS SCREEN ==========
function NotificationsScreen({ onNavigate, onConfetti, readAlertIds = [], markAlertRead, alertsSorted = [], onRefreshAlerts, alertsLoading = false, scrollRef }) {
  const [pushStatus, setPushStatus] = useState("idle"); // idle | requesting | granted | denied | unsupported
  const [toastMessage, setToastMessage] = useState(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const pullStartY = useRef(0);

  const handlePullStart = (e) => {
    pullStartY.current = e.touches?.[0]?.clientY ?? e.clientY;
  };
  const handlePullEnd = (e) => {
    const endY = e.changedTouches?.[0]?.clientY ?? e.clientY;
    const atTop = scrollRef?.current && scrollRef.current.scrollTop <= 5;
    if (atTop && pullStartY.current - endY > 60 && onRefreshAlerts && !alertsLoading) onRefreshAlerts();
  };

  // Listen for foreground messages
  useEffect(() => {
    onForegroundMessage((payload) => {
      setToastMessage({
        title: payload.notification?.title || "Wedding Update",
        body: payload.notification?.body || "",
      });
      setTimeout(() => setToastMessage(null), 5000);
    });
  }, []);

  // Check existing permission on mount — if already granted, ensure we have token saved
  useEffect(() => {
    if (!("Notification" in window)) {
      setPushStatus("unsupported");
    } else if (Notification.permission === "granted") {
      setPushStatus("granted");
      // User may have allowed via browser settings; ensure token is obtained and saved
      requestNotificationPermission().catch(() => {});
    } else if (Notification.permission === "denied") {
      setPushStatus("denied");
    }
  }, []);

  const handleEnablePush = async () => {
    setPushStatus("requesting");
    const result = await requestNotificationPermission();
    setPushStatus(result.success ? "granted" : "denied");
  };

  const formatAlertTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week(s) ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div
      style={{ padding: "10px 20px 30px" }}
      onTouchStart={onRefreshAlerts ? handlePullStart : undefined}
      onTouchEnd={onRefreshAlerts ? handlePullEnd : undefined}
    >
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h2 style={{ fontFamily: typo.fontSerif, fontSize: typo.h2, color: theme.text, margin: "0 0 2px" }}>Notifications</h2>
        <p style={{ fontSize: typo.caption, color: theme.textMuted }}>Stay updated with wedding events</p>
      </div>

      {/* Foreground notification toast */}
      {toastMessage && (
        <div style={{
          background: theme.accent, borderRadius: 14, padding: "12px 16px", marginBottom: 14,
          color: "white", animation: "slideIn 0.3s ease",
        }}>
          <div style={{ fontFamily: typo.fontSerif, fontSize: typo.bodySmall, fontWeight: 700 }}>{toastMessage.title}</div>
          <div style={{ fontSize: typo.caption, opacity: 0.9, marginTop: 2 }}>{toastMessage.body}</div>
        </div>
      )}

      {/* Push notification enable banner */}
      {pushStatus !== "granted" && pushStatus !== "unsupported" && (
        <div style={{
          background: `linear-gradient(135deg, ${theme.mist}, ${theme.coffeeLight})`,
          borderRadius: 16, padding: "16px", marginBottom: 18,
          border: `1px solid ${theme.mistDark}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>🔔</span>
            <span style={{ fontFamily: typo.fontSerif, fontSize: typo.body, fontWeight: 700, color: theme.text }}>Enable Push Notifications</span>
          </div>
          <p style={{ fontSize: typo.caption, color: theme.textMuted, lineHeight: 1.5, margin: "0 0 12px" }}>
            Get reminders before each event, shuttle updates, and schedule changes — right on your phone.
          </p>
          <button onClick={handleEnablePush} disabled={pushStatus === "requesting"} style={{
            width: "100%", padding: "12px", borderRadius: 30, border: "none",
            background: pushStatus === "denied" ? theme.textMuted : `linear-gradient(135deg, ${theme.accent}, ${theme.accentDark})`,
            color: "white", fontFamily: typo.fontSerif, fontSize: typo.bodySmall, fontWeight: 600, cursor: pushStatus === "requesting" ? "wait" : "pointer",
          }}>
            {pushStatus === "requesting" ? "Enabling..." :
             pushStatus === "denied" ? "Notifications Blocked — Enable in Browser Settings" :
             "Enable Notifications 🌿"}
          </button>
        </div>
      )}

      {pushStatus === "granted" && (
        <div style={{
          background: theme.successBg, borderRadius: 14, padding: "12px 16px", marginBottom: 18,
          border: `1px solid ${theme.successBorder}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <p style={{ fontSize: typo.bodySmall, color: theme.accent, margin: 0, fontWeight: 600, flex: 1 }}>
              Push notifications are enabled! You'll receive event reminders.
            </p>
          </div>
          {import.meta.env.DEV && (
            <button
              onClick={async () => {
                const token = await getFCMTokenIfGranted();
                if (token) {
                  await navigator.clipboard.writeText(token);
                  console.log("FCM Token (also in clipboard):", token);
                  setTokenCopied(true);
                  setTimeout(() => setTokenCopied(false), 2000);
                }
              }}
              style={{
                fontSize: typo.small, color: theme.accent, background: "none", border: "none",
                cursor: "pointer", textDecoration: "underline", padding: 0, fontFamily: "inherit",
              }}
            >
              {tokenCopied ? "✓ Copied!" : "Copy FCM token (for Firebase test message)"}
            </button>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h3 style={{ fontFamily: typo.fontSerif, fontSize: typo.h3Small, color: theme.text, margin: 0 }}>Alert History</h3>
        {onRefreshAlerts && (
          <button
            onClick={onRefreshAlerts}
            disabled={alertsLoading}
            style={{
              padding: "6px 12px", borderRadius: 20, border: `1px solid ${theme.border}`,
              background: theme.card, color: theme.accent, fontFamily: typo.fontSans, fontSize: typo.caption, fontWeight: 600,
              cursor: alertsLoading ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <span style={{ fontSize: 14 }}>↻</span>
            {alertsLoading ? "Refreshing..." : "Refresh"}
          </button>
        )}
      </div>
      {onRefreshAlerts && (
        <p style={{ fontSize: typo.small, color: theme.textMuted, margin: "0 0 12px" }}>Pull down to refresh</p>
      )}
      {alertsSorted.length === 0 ? (
        <p style={{ fontSize: typo.caption, color: theme.textMuted, padding: "16px 0", lineHeight: 1.5 }}>
          No alerts yet. Add alerts in alerts-data.js and push to GitHub to broadcast updates to guests.
        </p>
      ) : alertsSorted.map((n) => {
        const unread = !readAlertIds.includes(n.id);
        return (
        <div
          key={n.id}
          onClick={() => markAlertRead && markAlertRead(n.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && markAlertRead?.(n.id)}
          style={{
            background: unread ? `${theme.accent}08` : theme.card, borderRadius: 14, padding: "12px 14px", marginBottom: 8,
            border: `1px solid ${unread ? theme.accent + "25" : theme.border}`,
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
            <span style={{ fontFamily: typo.fontSerif, fontSize: typo.bodySmall, fontWeight: unread ? 700 : 600, color: theme.text }}>{n.title}</span>
            {unread && <span style={{ width: 8, height: 8, borderRadius: "50%", background: theme.accent, flexShrink: 0 }} />}
          </div>
          <p style={{ fontSize: typo.caption, color: theme.textMuted, margin: "0 0 3px", lineHeight: 1.5 }}>{n.body}</p>
          <span style={{ fontSize: typo.small, color: theme.textMuted }}>{formatAlertTime(n.date)}</span>
        </div>
        );
      })}
    </div>
  );
}

// ========== ALERT BANNER (urgent, on load) ==========
function AlertBanner({ alert, onDismiss }) {
  if (!alert) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.5)", padding: 24,
    }}>
      <div style={{
        background: theme.card, borderRadius: 20, padding: 24, maxWidth: 340, width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)", border: `1px solid ${theme.mist}`,
      }}>
        <h3 style={{ fontFamily: typo.fontSerif, fontSize: typo.h3, color: theme.text, margin: "0 0 8px" }}>{alert.title}</h3>
        <p style={{ fontSize: typo.body, color: theme.textMuted, lineHeight: 1.5, margin: "0 0 8px" }}>{alert.body}</p>
        <p style={{ fontSize: typo.small, color: theme.textMuted, margin: "0 0 16px" }}>
          {new Date(alert.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
        <button onClick={onDismiss} style={{
          width: "100%", padding: "12px", borderRadius: 12, border: "none",
          background: theme.accent, color: "white", fontFamily: typo.fontSerif, fontSize: typo.body, fontWeight: 600, cursor: "pointer",
        }}>
          Got it
        </button>
      </div>
    </div>
  );
}

// ========== PASSCODE GATE (Option C) ==========
// Uses a single hidden input so the keyboard stays in the same mode on iPhone when typing
function PasscodeScreen({ onUnlock }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const v = (e.target.value || "").slice(0, 6).toUpperCase();
    setValue(v);
    setError("");
    if (v.length === 6) {
      if (isPasscodeValid(v)) {
        try { localStorage.setItem(PASSCODE_STORAGE_KEY, "1"); } catch (_) {}
        onUnlock();
      } else {
        setError("Incorrect passcode. Please try again.");
        setValue("");
        inputRef.current?.focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData?.getData("text") || "").slice(0, 6).toUpperCase();
    if (pasted.length > 0) {
      setValue(pasted);
      setError("");
      if (pasted.length === 6) {
        if (isPasscodeValid(pasted)) {
          try { localStorage.setItem(PASSCODE_STORAGE_KEY, "1"); } catch (_) {}
          onUnlock();
        } else {
          setError("Incorrect passcode. Please try again.");
          setValue("");
          inputRef.current?.focus();
        }
      }
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (value.length !== 6) return;
    setError("");
    if (isPasscodeValid(value)) {
      try { localStorage.setItem(PASSCODE_STORAGE_KEY, "1"); } catch (_) {}
      onUnlock();
    } else {
      setError("Incorrect passcode. Please try again.");
      setValue("");
      inputRef.current?.focus();
    }
  };

  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);
  const boxStyle = (i) => ({
    width: 40, height: 48, borderRadius: 12, border: `1.5px solid ${error ? "#E53935" : theme.border}`,
    fontSize: 20, fontWeight: 700, textAlign: "center", textTransform: "uppercase",
    background: theme.card, color: theme.text, display: "flex", alignItems: "center", justifyContent: "center",
    boxSizing: "border-box", fontFamily: typo.fontSans,
  });

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh",
      background: `linear-gradient(160deg, ${theme.accent} 0%, ${theme.accentMid} 30%, ${theme.coffee} 100%)`,
      padding: 20, fontFamily: typo.fontSans,
    }}>
      <div style={{
        background: theme.card, borderRadius: 24, padding: 32, maxWidth: 320, width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)", border: `1px solid ${theme.mist}`,
      }}>
        <p style={{ fontFamily: typo.fontSerif, fontSize: typo.h3, color: theme.text, margin: "0 0 8px", textAlign: "center" }}>Welcome</p>
        <p style={{ fontSize: typo.caption, color: theme.textMuted, margin: "0 0 24px", textAlign: "center" }}>Please enter the passcode shared with your invitation</p>
        <form onSubmit={handleSubmit}>
          <div
            onClick={() => inputRef.current?.focus()}
            style={{ position: "relative", display: "flex", justifyContent: "center", gap: 8, marginBottom: 20, cursor: "text" }}
          >
            <input
              ref={inputRef}
              type="text"
              maxLength={6}
              value={value}
              onChange={handleChange}
              onPaste={handlePaste}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              inputMode="text"
              autoComplete="off"
              autoFocus
              aria-label="Passcode"
              style={{
                position: "absolute", left: -9999, width: 1, height: 1, opacity: 0, pointerEvents: "none",
                fontSize: 16, fontFamily: typo.fontSans,
              }}
            />
            {digits.map((d, i) => (
              <div key={i} style={boxStyle(i)}>
                {d}
                {focused && i === value.length && value.length < 6 && (
                  <span style={{
                    width: 2, height: 24, background: theme.accent, marginLeft: 1,
                    animation: "passcode-cursor-blink 1s step-end infinite",
                    display: "inline-block", verticalAlign: "middle",
                  }} />
                )}
              </div>
            ))}
          </div>
          {error && <p style={{ fontSize: typo.small, color: "#E53935", margin: "0 0 16px", textAlign: "center" }}>{error}</p>}
          <button type="submit" style={{
            width: "100%", padding: "14px", borderRadius: 12, border: "none",
            background: theme.accent, color: "white", fontFamily: typo.fontSerif, fontSize: typo.body, fontWeight: 600, cursor: "pointer",
          }}>
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}

// ========== MAIN APP ==========
export default function WeddingApp() {
  const [unlocked, setUnlocked] = useState(() => {
    try { return localStorage.getItem(PASSCODE_STORAGE_KEY) === "1"; } catch { return false; }
  });

  if (!unlocked) return <PasscodeScreen onUnlock={() => setUnlocked(true)} />;

  return <WeddingAppInner />;
}

function WeddingAppInner() {
  const [screen, setScreen] = useState("home");
  const [readAlertIds, setReadAlertIds] = useState(() => {
    try {
      const s = localStorage.getItem(ALERTS_READ_KEY);
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });
  const [bannerAlert, setBannerAlert] = useState(null);
  const [alerts, setAlerts] = useState(STATIC_ALERTS);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const now = () => new Date();

  const loadAlerts = async () => {
    setAlertsLoading(true);
    const { alerts: next, resetReadVersion } = await fetchAlerts();
    setAlerts(next);
    // When you increment resetReadVersion in the Config sheet, all devices clear their "read" state on next poll
    if (resetReadVersion != null && resetReadVersion > 0) {
      try {
        const stored = parseInt(localStorage.getItem(ALERTS_RESET_VERSION_KEY) || "0", 10);
        if (resetReadVersion > stored) {
          localStorage.setItem(ALERTS_READ_KEY, "[]");
          localStorage.setItem(ALERTS_RESET_VERSION_KEY, String(resetReadVersion));
          setReadAlertIds([]);
        }
      } catch (_) {}
    }
    setAlertsLoading(false);
  };
  const [dateTime, setDateTime] = useState(() => {
    const d = now();
    return {
      date: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  });
  const scrollRef = useRef(null);

  const markAlertRead = (id) => {
    setReadAlertIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try { localStorage.setItem(ALERTS_READ_KEY, JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };

  const alertsSorted = [...alerts].sort((a, b) => new Date(b.date) - new Date(a.date));
  const unreadCount = alertsSorted.filter((a) => !readAlertIds.includes(a.id)).length;
  const firstUrgentUnread = alertsSorted.find((a) => a.urgent && !readAlertIds.includes(a.id));

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    const id = setInterval(loadAlerts, ALERTS_POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setBannerAlert(firstUrgentUnread || null);
  }, [firstUrgentUnread?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [screen]);

  // Auto-refresh alerts when user opens the Alerts tab
  useEffect(() => {
    if (screen === "notifications") loadAlerts();
  }, [screen]);

  useEffect(() => {
    if (!sessionStorage.getItem("wedding-confetti-shown")) {
      sessionStorage.setItem("wedding-confetti-shown", "1");
      runConfettiFromTop();
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      const d = now();
      setDateTime({
        date: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    };
    tick();
    const id = setInterval(tick, 60000); // Update every minute
    return () => clearInterval(id);
  }, []);

  const screenMap = { home: HomeScreen, rsvp: RSVPScreen, schedule: ScheduleScreen, venue: VenueScreen, stay: StayScreen, notifications: NotificationsScreen };
  const navItems = [
    { id: "home", label: "Home", icon: "home", customIcon: "/nav/home-icon.png" },
    { id: "rsvp", label: "RSVP", icon: "mail", customIcon: "/nav/rsvp-icon.png" },
    { id: "schedule", label: "Schedule", icon: "schedule", customIcon: "/nav/schedule-icon.png" },
    { id: "venue", label: "Venue", icon: "place", customIcon: "/nav/venue-icon.png" },
    { id: "stay", label: "Stay", icon: "apartment", customIcon: "/nav/stay-icon.png" },
    { id: "notifications", label: "Alerts", icon: "notifications", customIcon: "/nav/alerts-icon.png" },
  ];
  const navActive = theme.navActive;
  const navInactive = theme.navInactive;

  const Screen = screenMap[screen];

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh",
      background: `linear-gradient(160deg, ${theme.accent} 0%, ${theme.accentMid} 30%, ${theme.coffee} 100%)`,
      padding: 20, fontFamily: typo.fontSans,
    }}>
      <GoldenFrame>
      <div style={{
        width: 390, height: 760, background: theme.bg, borderRadius: 36,
        boxShadow: "0 25px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)",
        display: "flex", flexDirection: "column", overflow: "hidden", position: "relative",
      }}>
        {/* Status Bar */}
        <div style={{
          padding: "12px 28px 8px", display: "flex", justifyContent: "center", alignItems: "center",
          flexShrink: 0, background: theme.accentDark,
        }}>
          <span style={{ fontFamily: typo.fontSans, fontSize: typo.body, fontWeight: 600, color: theme.navActive }}>{dateTime.date} · {dateTime.time}</span>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="app-scroll" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", fontFamily: typo.fontSans }}>
          <Screen
            onNavigate={setScreen}
            onConfetti={runConfetti}
            onFireworks={runFireworks}
            readAlertIds={readAlertIds}
            markAlertRead={markAlertRead}
            alertsSorted={alertsSorted}
            onRefreshAlerts={loadAlerts}
            alertsLoading={alertsLoading}
            scrollRef={scrollRef}
          />
        </div>

        {/* Alert banner (urgent) */}
        <AlertBanner alert={bannerAlert} onDismiss={() => bannerAlert && markAlertRead(bannerAlert.id)} />

        {/* Bottom Nav — Material Symbols */}
        <nav style={{
          display: "flex", justifyContent: "space-around", alignItems: "flex-end",
          padding: "12px 8px 20px", paddingBottom: "max(20px, env(safe-area-inset-bottom))",
          background: theme.card, flexShrink: 0,
          borderTop: `1px solid ${theme.mist}`,
        }}>
          {navItems.map((item) => {
            const active = screen === item.id;
            const color = active ? navActive : navInactive;
            const showBadge = item.id === "notifications" && unreadCount > 0;
            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 6,
                  flex: 1, minWidth: 0, padding: "6px 4px", background: "none", border: "none", cursor: "pointer",
                  color, transition: "color 0.2s",
                }}
              >
                <span style={{
                  position: "relative", display: "inline-flex", alignItems: "flex-end", justifyContent: "center",
                  width: 28, height: 28, flexShrink: 0,
                }}>
                  {item.customIcon ? (
                    <img
                      src={item.customIcon}
                      alt=""
                      style={{
                        width: 24, height: 24, objectFit: "contain", objectPosition: "bottom center", display: "block",
                        filter: active ? theme.navIconFilterActive : theme.navIconFilterInactive,
                      }}
                    />
                  ) : (
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 24, color: "inherit", display: "block", lineHeight: 1, marginBottom: 0 }}
                    >
                      {item.icon}
                    </span>
                  )}
                  {showBadge && (
                    <span style={{
                      position: "absolute", top: -4, right: -8,
                      minWidth: 18, height: 18, borderRadius: 9, background: theme.badge, color: "white",
                      fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 4px",
                    }}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
                <span style={{
                  display: "flex", alignItems: "flex-end", justifyContent: "center", minHeight: 14, textAlign: "center",
                  fontSize: typo.small, fontWeight: active ? 600 : 500, color: "inherit",
                  fontFamily: typo.fontSans,
                  WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale",
                }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
      </GoldenFrame>
    </div>
  );
}
