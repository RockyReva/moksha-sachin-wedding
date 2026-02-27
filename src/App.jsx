import { useState, useEffect, useRef } from "react";
import {
  submitRSVPToSheets,
  submitRSVPToFirebase,
  requestNotificationPermission,
  onForegroundMessage,
  getFCMTokenIfGranted,
} from "./firebase";

const SCREENS = ["home", "rsvp", "schedule", "venue", "stay", "notifications"];

// --- Coorg Coffee Estate Color Palette ---
const theme = {
  bg: "#F7F4F0",
  card: "#FFFFFF",
  accent: "#2D5016",
  accentDark: "#1A3409",
  accentLight: "#2D501615",
  accentWarm: "#8B6914",
  coffee: "#5C3D2E",
  coffeeLight: "#F5EDE6",
  mist: "#E8EDE5",
  mistDark: "#C5D1BF",
  gold: "#C4972A",
  text: "#2C2418",
  textMuted: "#7A6E5D",
  border: "#E2DDD6",
  success: "#3A7D34",
  white: "#FFFFFF",
};

// --- SVG Icons ---
const Icons = {
  Home: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  RSVP: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  Schedule: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Venue: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Stay: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M3 7v14M21 7v14M6 7V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3M9 21v-4h6v4M9 10h1M14 10h1M9 14h1M14 14h1" />
    </svg>
  ),
  Bell: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Heart: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  Star: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#C4972A" stroke="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Check: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3A7D34" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  ExternalLink: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
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
          <stop offset="0%" stopColor="#4A7C2E" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#2D5016" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="mist2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3D6B22" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#2D5016" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="mist3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5C3D2E" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#5C3D2E" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Far mountains */}
      <path d="M0 90 Q50 30 100 70 Q150 40 200 55 Q250 25 300 60 Q350 35 400 75 L400 120 L0 120Z" fill="url(#mist1)" />
      {/* Mid mountains */}
      <path d="M0 100 Q60 55 120 80 Q180 50 240 72 Q300 45 360 68 Q380 58 400 85 L400 120 L0 120Z" fill="url(#mist2)" />
      {/* Coffee plantation hills */}
      <path d="M0 108 Q80 75 160 95 Q240 70 320 88 Q370 78 400 100 L400 120 L0 120Z" fill="url(#mist3)" />
      {/* Mist layer */}
      <rect x="0" y="85" width="400" height="35" fill="white" opacity="0.25" />
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
    <div style={{ textAlign: "center", color: theme.accent, opacity: 0.4, fontSize: 14, letterSpacing: 12, ...style }}>
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
function HomeScreen() {
  const countdown = useCountdown("2026-12-19T10:00:00");

  return (
    <div style={{ padding: 0 }}>
      {/* Hero Banner with Mountains */}
      <div style={{
        background: `linear-gradient(170deg, #1A3409 0%, #2D5016 35%, #3D6B22 60%, #4A7C2E 100%)`,
        padding: "36px 24px 0", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        {/* Decorative coffee beans */}
        <CoffeeBeanDecor style={{ position: "absolute", top: 12, left: 20, transform: "rotate(30deg)" }} />
        <CoffeeBeanDecor style={{ position: "absolute", top: 50, right: 16, transform: "rotate(-15deg)" }} />
        <CoffeeBeanDecor style={{ position: "absolute", bottom: 40, left: 45, transform: "rotate(60deg)" }} />

        {/* Leaf ornament */}
        <div style={{ opacity: 0.4, marginBottom: 8 }}>
          <svg width="48" height="24" viewBox="0 0 60 30">
            <path d="M30 28 Q10 20 2 8 Q10 2 30 6 Q50 2 58 8 Q50 20 30 28Z" fill="none" stroke="#8DB77A" strokeWidth="1" />
            <path d="M30 6 L30 28" stroke="#8DB77A" strokeWidth="0.8" />
          </svg>
        </div>

        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 12, letterSpacing: 5, textTransform: "uppercase", color: "#A8C99A", marginBottom: 6 }}>
          Amidst the Coffee Estates of Coorg
        </p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 44, fontWeight: 300, color: "#FFFFFF", margin: "4px 0", lineHeight: 1.05 }}>
          Moksha <span style={{ color: "#C4972A", fontWeight: 400 }}>&</span> Sachin
        </h1>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: "#A8C99A", letterSpacing: 3, textTransform: "uppercase", marginBottom: 2 }}>
          Request the honour of your presence
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 3, margin: "12px 0 6px", opacity: 0.5 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} width="8" height="8" viewBox="0 0 10 10"><circle cx="5" cy="5" r="2" fill="#C4972A" /></svg>
          ))}
        </div>

        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: "#FFFFFF", fontWeight: 500, margin: "8px 0 2px" }}>
          December 19–20, 2026
        </p>
        <p style={{ fontSize: 12, color: "#A8C99A", lineHeight: 1.4, marginBottom: 8 }}>
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
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: theme.accent }}>{item.val}</div>
              <div style={{ fontSize: 10, color: theme.textMuted, textTransform: "uppercase", letterSpacing: 2, marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Welcome Card */}
        <div style={{
          background: `linear-gradient(135deg, ${theme.coffeeLight} 0%, ${theme.mist} 100%)`,
          borderRadius: 20, padding: "22px 20px", position: "relative", overflow: "hidden",
          border: `1px solid ${theme.mistDark}`,
        }}>
          <CoffeeBeanDecor style={{ position: "absolute", top: -4, right: 8, opacity: 0.6 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ color: theme.accent }}><Icons.Coffee /></span>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: theme.text }}>Welcome, Dear Guests</span>
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.75, color: theme.textMuted, margin: 0 }}>
            As the mist rolls over the Western Ghats and the aroma of freshly brewed coffee fills the air, 
            we invite you to celebrate the union of Moksha & Sachin in the enchanting hills of Coorg. 
            Your presence will make our celebration as warm as a cup of Kodagu's finest. ☕
          </p>
        </div>

        {/* Quick Info Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16, marginBottom: 20 }}>
          {[
            { icon: "🌿", label: "2-Day", desc: "Celebration" },
            { icon: "☕", label: "Kodava Samaja", desc: "Wedding Venue" },
            { icon: "🏔️", label: "Coorg", desc: "Kodagu, Karnataka" },
            { icon: "🌧️", label: "Dec Weather", desc: "18°C - 28°C" },
          ].map((item, i) => (
            <div key={i} style={{
              background: theme.card, borderRadius: 14, padding: "12px 14px",
              border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{item.label}</div>
                <div style={{ fontSize: 11, color: theme.textMuted }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========== RSVP SCREEN ==========
function RSVPScreen() {
  const [form, setForm] = useState({ name: "", phone: "", attending: "", meal: "", drink: "", dietary: "", guests: "1", plusOneName: "" });
  const [submitted, setSubmitted] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: typeof e === "string" ? e : e.target ? e.target.value : e });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.attending) return;
    setSubmitting(true);
    try {
      // Google Sheets is the main destination — wait for the request to complete
      await submitRSVPToSheets(form);
      setSubmitted(true);
      // Firebase backup: run in background so we don't block the UI if Firebase is slow or not set up
      submitRSVPToFirebase(form).catch((err) => console.error("Firebase backup error:", err));
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
        <div style={{ width: 68, height: 68, borderRadius: "50%", background: "#E8F5E4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Icons.Check />
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: theme.text, marginBottom: 8 }}>Dhanyavaadagalu! 🙏</h2>
        <p style={{ fontSize: 14, color: theme.textMuted, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
          Your RSVP has been received. We're so excited to celebrate with you amidst the coffee estates!
        </p>
        <VineBorder />
      </div>
    );
  }

  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: 12, border: `1px solid ${theme.border}`,
    fontSize: 14, color: theme.text, background: theme.card, outline: "none", boxSizing: "border-box",
    fontFamily: "inherit", transition: "border-color 0.2s",
  };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: theme.coffee, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6, display: "block" };

  const RadioGroup = ({ label, options, value, onChange }) => (
    <div style={{ marginBottom: 18 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {options.map((opt) => (
          <button key={opt} onClick={() => onChange(opt)} style={{
            padding: "9px 16px", borderRadius: 30, border: `1.5px solid ${value === opt ? theme.accent : theme.border}`,
            background: value === opt ? theme.accentLight : theme.card, color: value === opt ? theme.accent : theme.textMuted,
            fontSize: 12.5, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
          }}>{opt}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ padding: "10px 20px 30px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <span style={{ color: theme.accent, opacity: 0.5 }}><Icons.Leaf /></span>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: theme.text, margin: "6px 0 2px" }}>RSVP</h2>
        <p style={{ fontSize: 12, color: theme.textMuted }}>Kindly respond by November 15, 2026</p>
      </div>

      <div style={{ background: theme.card, borderRadius: 20, padding: 22, boxShadow: "0 2px 16px rgba(45,80,22,0.06)", border: `1px solid ${theme.mist}` }}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Full Name</label>
          <input style={inputStyle} placeholder="Your full name" value={form.name} onChange={set("name")} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Phone Number</label>
          <input style={inputStyle} placeholder="+91 98765 43210" value={form.phone} onChange={set("phone")} />
        </div>

        <RadioGroup label="Will you attend?" options={["Joyfully Accept", "Regretfully Decline"]} value={form.attending} onChange={set("attending")} />

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Number of Guests</label>
          <div style={{ display: "flex", gap: 8 }}>
            {["1", "2", "3", "4", "5+"].map((n) => (
              <button key={n} onClick={() => setForm({ ...form, guests: n })} style={{
                width: 44, height: 44, borderRadius: 12, border: `1.5px solid ${form.guests === n ? theme.accent : theme.border}`,
                background: form.guests === n ? theme.accentLight : theme.card,
                color: form.guests === n ? theme.accent : theme.textMuted,
                fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>{n}</button>
            ))}
          </div>
        </div>

        <RadioGroup label="Meal Preference" options={["Veg", "Non-Veg", "Jain", "Vegan"]} value={form.meal} onChange={set("meal")} />
        <RadioGroup label="Drink Preference" options={["Cocktails", "Mocktails", "Coorg Coffee", "No Preference"]} value={form.drink} onChange={set("drink")} />

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Dietary Requirements / Allergies</label>
          <input style={inputStyle} placeholder="Any restrictions..." value={form.dietary} onChange={set("dietary")} />
        </div>

        <button onClick={handleSubmit} disabled={submitting || !form.name || !form.attending} style={{
          width: "100%", padding: "14px", borderRadius: 30, border: "none",
          background: submitting || !form.name || !form.attending
            ? theme.mistDark
            : `linear-gradient(135deg, ${theme.accent}, ${theme.accentDark})`,
          color: "white", fontSize: 15, fontWeight: 600, cursor: submitting ? "wait" : "pointer", letterSpacing: 1,
          boxShadow: submitting ? "none" : "0 4px 20px rgba(45,80,22,0.3)", transition: "all 0.2s",
          opacity: !form.name || !form.attending ? 0.5 : 1,
        }}>
          {submitting ? "Sending..." : "Send RSVP 🌿"}
        </button>
      </div>
    </div>
  );
}

// ========== SCHEDULE SCREEN ==========
function ScheduleScreen() {
  const events = [
    { time: "Dec 19 · 10:00 AM", title: "Mehendi & Haldi", location: "Samaja Garden Lawn", icon: "🌿", desc: "Henna, turmeric ceremony & light bites amidst the coffee plantation" },
    { time: "Dec 19 · 1:00 PM", title: "Plantation Brunch", location: "Samaja Dining Hall", icon: "☕", desc: "Filter coffee, Coorgi cuisine & a guided coffee estate walk" },
    { time: "Dec 19 · 5:00 PM", title: "Cocktail Evening", location: "Misty Hilltop Deck", icon: "🥂", desc: "Sundowner cocktails, live jazz & Western Ghats sunset views" },
    { time: "Dec 19 · 8:00 PM", title: "Sangeet Night", location: "Samaja Open-Air Stage", icon: "🎶", desc: "Dance, music & a Kodava-style feast under the stars" },
    { time: "Dec 20 · 9:00 AM", title: "Baraat Procession", location: "Samaja Main Entrance", icon: "🐘", desc: "The groom's grand arrival through the coffee rows" },
    { time: "Dec 20 · 11:00 AM", title: "Wedding Ceremony", location: "Mandap, Samaja Grounds", icon: "💍", desc: "Sacred pheras overlooking the misty Kodagu hills" },
    { time: "Dec 20 · 7:30 PM", title: "Grand Reception", location: "Samaja Grand Hall", icon: "🎉", desc: "Dinner, toasts, Coorgi Kathi Kali dance & celebrations" },
  ];

  return (
    <div style={{ padding: "10px 20px 30px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: theme.text, margin: "0 0 2px" }}>Schedule</h2>
        <p style={{ fontSize: 12, color: theme.textMuted }}>Two days of love among the hills</p>
        <VineBorder />
      </div>

      <div style={{ position: "relative", paddingLeft: 30 }}>
        <div style={{ position: "absolute", left: 11, top: 8, bottom: 8, width: 2, background: `linear-gradient(180deg, ${theme.accent}, ${theme.mistDark}, ${theme.coffee})`, borderRadius: 1 }} />
        {events.map((ev, i) => (
          <div key={i} style={{ position: "relative", marginBottom: 14 }}>
            <div style={{
              position: "absolute", left: -23, top: 16, width: 12, height: 12, borderRadius: "50%",
              background: i === 5 ? theme.gold : theme.accent,
              border: `3px solid ${theme.bg}`, boxShadow: `0 0 0 2px ${i === 5 ? theme.gold : theme.accent}30`,
            }} />
            <div style={{
              background: i === 5 ? `linear-gradient(135deg, #FFF9ED, #FFFDF7)` : theme.card,
              borderRadius: 16, padding: "14px 16px",
              boxShadow: "0 2px 10px rgba(45,80,22,0.05)",
              border: `1px solid ${i === 5 ? theme.gold + "40" : theme.mist}`,
            }}>
              <div style={{ fontSize: 10, color: theme.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5 }}>
                {ev.time}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 20 }}>{ev.icon}</span>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontWeight: 600, color: theme.text }}>{ev.title}</span>
              </div>
              <p style={{ fontSize: 12.5, color: theme.textMuted, lineHeight: 1.5, margin: "0 0 4px" }}>{ev.desc}</p>
              <p style={{ fontSize: 11, color: theme.textMuted, display: "flex", alignItems: "center", gap: 4, margin: 0 }}>
                <span style={{ color: theme.accent }}><Icons.Venue /></span> {ev.location}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== VENUE SCREEN ==========
function VenueScreen() {
  return (
    <div style={{ padding: "10px 20px 30px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: theme.text, margin: "0 0 2px" }}>Venue</h2>
        <p style={{ fontSize: 12, color: theme.textMuted }}>Federation of Kodava Samaja</p>
      </div>

      {/* Map / Illustration */}
      <div style={{
        height: 180, borderRadius: 20, overflow: "hidden", marginBottom: 18, position: "relative",
        background: `linear-gradient(170deg, #2D5016 0%, #3D6B22 40%, #5A8A3C 70%, #7BA85E 100%)`,
      }}>
        <MistyMountains />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 4, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>📍</div>
            <p style={{ fontSize: 14, color: "white", fontWeight: 600, textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>Interactive Map</p>
            <p style={{ fontSize: 11, color: "#C5D1BF" }}>Google Maps embed here</p>
          </div>
        </div>
      </div>

      <div style={{ background: theme.card, borderRadius: 20, padding: 22, boxShadow: "0 2px 16px rgba(45,80,22,0.06)", border: `1px solid ${theme.mist}`, marginBottom: 14 }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: theme.text, margin: "0 0 12px" }}>Address & Directions</h3>
        <p style={{ fontSize: 13.5, color: theme.textMuted, lineHeight: 1.7, margin: "0 0 16px" }}>
          Federation of Kodava Samaja<br />
          Balugodu, Kodagu<br />
          Karnataka, India
        </p>

        <button style={{
          width: "100%", padding: "12px", borderRadius: 30, border: `1.5px solid ${theme.accent}`,
          background: "transparent", color: theme.accent, fontSize: 14, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14,
        }}>
          Open in Google Maps <Icons.ExternalLink />
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "From Mysore", value: "120 km · ~3 hrs" },
            { label: "From Bangalore", value: "265 km · ~5.5 hrs" },
            { label: "From Mangalore", value: "135 km · ~4 hrs" },
            { label: "Nearest Airport", value: "Mysore (MYQ)" },
            { label: "Parking", value: "Free on-site parking" },
            { label: "Dress Code", value: "Traditional / Smart" },
          ].map((item) => (
            <div key={item.label} style={{ background: theme.mist, borderRadius: 12, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, color: theme.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: theme.text }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Travel Tips */}
      <div style={{ background: theme.coffeeLight, borderRadius: 16, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>🚐</span>
        <p style={{ fontSize: 12.5, color: theme.coffee, margin: 0, lineHeight: 1.6 }}>
          <strong>Shuttle available!</strong> We'll arrange complimentary shuttle buses from Madikeri town and Mysore Railway Station on Dec 19. Details will be shared closer to the date.
        </p>
      </div>
    </div>
  );
}

// ========== STAY SCREEN ==========
function StayScreen() {
  const stays = [
    { name: "Evolve Back, Coorg", type: "5-Star Luxury Resort", distance: "8 km from venue", price: "₹28,000+/night", rating: 4.8, emoji: "🏡", tag: "Premium", desc: "300-acre coffee plantation resort with private pool villas — formerly Orange County", color: "#E8F0E2" },
    { name: "The Tamara Coorg", type: "Luxury Plantation Resort", distance: "12 km from venue", price: "₹22,000+/night", rating: 4.7, emoji: "🌺", tag: "Recommended", desc: "Stunning hilltop resort with spa, nature trails & panoramic Western Ghats views", color: "#F5EDE6" },
    { name: "Taj Madikeri Resort", type: "5-Star Spa Resort", distance: "5 km from venue", price: "₹18,000+/night", rating: 4.6, emoji: "✨", tag: "Luxury", desc: "World-class Jiva Spa, infinity pool & rainforest setting in Madikeri", color: "#EDE8F0" },
    { name: "Ayatana Coorg", type: "Boutique Resort", distance: "10 km from venue", price: "₹12,000+/night", rating: 4.5, emoji: "🌿", tag: "Boutique", desc: "Glass cottages, in-property waterfall & open-deck dining amidst the hills", color: "#E5EDE8" },
    { name: "Coorg Wilderness Resort", type: "Nature Resort", distance: "15 km from venue", price: "₹7,500+/night", rating: 4.4, emoji: "🦋", tag: "Mid-Range", desc: "Riverside cottages with campfire, plantation walks & adventure activities", color: "#F0EDE5" },
    { name: "Misty Woods Estate", type: "Heritage Homestay", distance: "3 km from venue", price: "₹3,500+/night", rating: 4.6, emoji: "🏠", tag: "Homely", desc: "Charming family-run Coorgi homestay amidst coffee & pepper vines", color: "#FEF4EB" },
    { name: "Zostel Coorg", type: "Backpacker Hostel", distance: "6 km from venue", price: "₹800+/night", rating: 4.2, emoji: "🎒", tag: "Budget", desc: "Fun, social vibes with dorms & private rooms, great for young guests", color: "#EEF2F0" },
  ];

  return (
    <div style={{ padding: "10px 20px 30px" }}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: theme.text, margin: "0 0 2px" }}>Where to Stay</h2>
        <p style={{ fontSize: 12, color: theme.textMuted }}>Handpicked stays near the wedding venue</p>
      </div>

      <div style={{
        background: `linear-gradient(135deg, ${theme.mist}, ${theme.coffeeLight})`,
        borderRadius: 16, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10,
        border: `1px solid ${theme.mistDark}`,
      }}>
        <span style={{ fontSize: 18, marginTop: 2 }}>☕</span>
        <p style={{ fontSize: 12.5, color: theme.coffee, margin: 0, lineHeight: 1.5 }}>
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
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: theme.text, margin: 0 }}>
            ✨ Recommended by Us
          </h3>
        </div>
        <p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12, marginLeft: 12 }}>
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
            background: `linear-gradient(135deg, #F9F3E8, #EDF5E8)`, padding: "16px 18px",
            display: "flex", gap: 14, alignItems: "flex-start",
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: "#FFF8ED",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, flexShrink: 0, border: `1px solid ${theme.gold}25`,
            }}>🌺</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{
                  fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1,
                  color: theme.gold, background: `${theme.gold}15`, padding: "2px 8px", borderRadius: 20,
                }}>⭐ Family Pick</span>
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontWeight: 700, color: theme.text, lineHeight: 1.2, marginBottom: 4 }}>
                Magnolia Resorts
              </div>
              <div style={{ fontSize: 12, color: theme.accent, fontWeight: 600, marginBottom: 4 }}>
                Luxury Plantation Resort · 70 Acres
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
                  fontSize: 11, fontWeight: 700, color: theme.accent, background: theme.accentLight,
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
            background: `linear-gradient(135deg, #F9F3E8, #EDF5E8)`, padding: "16px 18px",
            display: "flex", gap: 14, alignItems: "flex-start",
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: "#FFF8ED",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, flexShrink: 0, border: `1px solid ${theme.gold}25`,
            }}>🌿</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{
                  fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1,
                  color: theme.gold, background: `${theme.gold}15`, padding: "2px 8px", borderRadius: 20,
                }}>⭐ Family Pick</span>
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontWeight: 700, color: theme.text, lineHeight: 1.2, marginBottom: 4 }}>
                INIKA Resorts
              </div>
              <div style={{ fontSize: 12, color: theme.accent, fontWeight: 600, marginBottom: 4 }}>
                Luxury Cottage Resort · Coffee Estate
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
                  fontSize: 11, fontWeight: 700, color: theme.accent, background: theme.accentLight,
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
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: theme.text, margin: 0 }}>
          Other Stays Nearby
        </h3>
      </div>

      {stays.map((s, i) => (
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
                  fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1,
                  color: theme.accent, background: theme.accentLight, padding: "2px 7px", borderRadius: 20,
                }}>{s.tag}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11.5, color: theme.gold, fontWeight: 600 }}>
                  <Icons.Star /> {s.rating}
                </span>
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, color: theme.text, marginBottom: 1, lineHeight: 1.2 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 5, lineHeight: 1.4 }}>{s.desc}</div>
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
        <p style={{ fontSize: 12.5, color: theme.textMuted, margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: theme.text }}>Want a plantation experience?</strong> Many local coffee estate owners offer guest rooms. Ask us and we'll connect you with trusted Kodava families.
        </p>
      </div>
    </div>
  );
}

// ========== NOTIFICATIONS SCREEN ==========
function NotificationsScreen() {
  const [enabled, setEnabled] = useState({ events: true, schedule: true, travel: false, photos: false });
  const [pushStatus, setPushStatus] = useState("idle"); // idle | requesting | granted | denied | unsupported
  const [toastMessage, setToastMessage] = useState(null);
  const [tokenCopied, setTokenCopied] = useState(false);

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

  // Check existing permission on mount
  useEffect(() => {
    if (!("Notification" in window)) {
      setPushStatus("unsupported");
    } else if (Notification.permission === "granted") {
      setPushStatus("granted");
    } else if (Notification.permission === "denied") {
      setPushStatus("denied");
    }
  }, []);

  const handleEnablePush = async () => {
    setPushStatus("requesting");
    const result = await requestNotificationPermission();
    setPushStatus(result.success ? "granted" : "denied");
  };

  const notifications = [
    { title: "Sangeet Night Tomorrow! 🎶", time: "1 day ago", desc: "Get your dancing shoes ready — festivities begin at 8 PM", unread: true },
    { title: "Shuttle Bus Schedule Updated", time: "3 days ago", desc: "Buses from Mysore depart at 8 AM, 12 PM, and 4 PM on Dec 19", unread: true },
    { title: "Weather Advisory ☁️", time: "5 days ago", desc: "Light mist expected on ceremony day — carry a light shawl", unread: false },
    { title: "RSVP Reminder", time: "1 week ago", desc: "Please confirm your attendance by November 15", unread: false },
    { title: "Welcome to Our Wedding App! 🌿", time: "2 weeks ago", desc: "We're thrilled you're joining us in Coorg. Explore the app for all details!", unread: false },
  ];

  return (
    <div style={{ padding: "10px 20px 30px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: theme.text, margin: "0 0 2px" }}>Notifications</h2>
        <p style={{ fontSize: 12, color: theme.textMuted }}>Stay updated with wedding events</p>
      </div>

      {/* Foreground notification toast */}
      {toastMessage && (
        <div style={{
          background: theme.accent, borderRadius: 14, padding: "12px 16px", marginBottom: 14,
          color: "white", animation: "slideIn 0.3s ease",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{toastMessage.title}</div>
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>{toastMessage.body}</div>
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
            <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>Enable Push Notifications</span>
          </div>
          <p style={{ fontSize: 12.5, color: theme.textMuted, lineHeight: 1.5, margin: "0 0 12px" }}>
            Get reminders before each event, shuttle updates, and schedule changes — right on your phone.
          </p>
          <button onClick={handleEnablePush} disabled={pushStatus === "requesting"} style={{
            width: "100%", padding: "12px", borderRadius: 30, border: "none",
            background: pushStatus === "denied" ? theme.textMuted : `linear-gradient(135deg, ${theme.accent}, ${theme.accentDark})`,
            color: "white", fontSize: 13, fontWeight: 600, cursor: pushStatus === "requesting" ? "wait" : "pointer",
          }}>
            {pushStatus === "requesting" ? "Enabling..." :
             pushStatus === "denied" ? "Notifications Blocked — Enable in Browser Settings" :
             "Enable Notifications 🌿"}
          </button>
        </div>
      )}

      {pushStatus === "granted" && (
        <div style={{
          background: "#E8F5E4", borderRadius: 14, padding: "12px 16px", marginBottom: 18,
          border: `1px solid #C5E1C0`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <p style={{ fontSize: 13, color: theme.accent, margin: 0, fontWeight: 600, flex: 1 }}>
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
                fontSize: 11, color: theme.accent, background: "none", border: "none",
                cursor: "pointer", textDecoration: "underline", padding: 0, fontFamily: "inherit",
              }}
            >
              {tokenCopied ? "✓ Copied!" : "Copy FCM token (for Firebase test message)"}
            </button>
          )}
        </div>
      )}

      <div style={{ background: theme.card, borderRadius: 20, padding: 18, boxShadow: "0 2px 16px rgba(45,80,22,0.06)", border: `1px solid ${theme.mist}`, marginBottom: 22 }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, color: theme.text, margin: "0 0 12px" }}>Push Preferences</h3>
        {[
          { key: "events", label: "Event Reminders", desc: "30 min before each event" },
          { key: "schedule", label: "Schedule Changes", desc: "Instant updates" },
          { key: "travel", label: "Travel & Shuttle", desc: "Transport updates & tips" },
          { key: "photos", label: "Photo Sharing", desc: "When new albums drop" },
        ].map((item, idx) => (
          <div key={item.key} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "11px 0", borderBottom: idx < 3 ? `1px solid ${theme.border}` : "none",
          }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: theme.text }}>{item.label}</div>
              <div style={{ fontSize: 11.5, color: theme.textMuted }}>{item.desc}</div>
            </div>
            <button onClick={() => setEnabled({ ...enabled, [item.key]: !enabled[item.key] })} style={{
              width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
              background: enabled[item.key] ? theme.accent : theme.border, position: "relative", transition: "background 0.25s",
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%", background: "white", position: "absolute", top: 3,
                left: enabled[item.key] ? 23 : 3, transition: "left 0.25s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
          </div>
        ))}
      </div>

      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, color: theme.text, marginBottom: 12 }}>Recent</h3>
      {notifications.map((n, i) => (
        <div key={i} style={{
          background: n.unread ? `${theme.accent}08` : theme.card, borderRadius: 14, padding: "12px 14px", marginBottom: 8,
          border: `1px solid ${n.unread ? theme.accent + "25" : theme.border}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: theme.text }}>{n.title}</span>
            {n.unread && <span style={{ width: 8, height: 8, borderRadius: "50%", background: theme.accent, flexShrink: 0 }} />}
          </div>
          <p style={{ fontSize: 12.5, color: theme.textMuted, margin: "0 0 3px", lineHeight: 1.5 }}>{n.desc}</p>
          <span style={{ fontSize: 10.5, color: theme.textMuted }}>{n.time}</span>
        </div>
      ))}
    </div>
  );
}

// ========== MAIN APP ==========
export default function WeddingApp() {
  const [screen, setScreen] = useState("home");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [screen]);

  const screenMap = { home: HomeScreen, rsvp: RSVPScreen, schedule: ScheduleScreen, venue: VenueScreen, stay: StayScreen, notifications: NotificationsScreen };
  const iconMap = { home: Icons.Home, rsvp: Icons.RSVP, schedule: Icons.Schedule, venue: Icons.Venue, stay: Icons.Stay, notifications: Icons.Bell };
  const labelMap = { home: "Home", rsvp: "RSVP", schedule: "Schedule", venue: "Venue", stay: "Stay", notifications: "Alerts" };

  const Screen = screenMap[screen];

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh",
      background: `linear-gradient(160deg, #2D5016 0%, #3D6B22 30%, #5C3D2E 100%)`,
      padding: 16, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{
        width: 390, height: 760, background: theme.bg, borderRadius: 40,
        boxShadow: "0 25px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)",
        display: "flex", flexDirection: "column", overflow: "hidden", position: "relative",
      }}>
        {/* Status Bar */}
        <div style={{
          padding: "12px 28px 8px", display: "flex", justifyContent: "space-between", alignItems: "center",
          flexShrink: 0, background: screen === "home" ? theme.accentDark : theme.bg,
          transition: "background 0.3s",
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: screen === "home" ? "#fff" : theme.text }}>9:41</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <svg width="16" height="12" viewBox="0 0 16 12">
              <rect x="0" y="7" width="3" height="5" rx="0.5" fill={screen === "home" ? "#fff" : theme.text}/>
              <rect x="4.5" y="4" width="3" height="8" rx="0.5" fill={screen === "home" ? "#fff" : theme.text}/>
              <rect x="9" y="1" width="3" height="11" rx="0.5" fill={screen === "home" ? "#fff" : theme.text}/>
              <rect x="13" y="0" width="3" height="12" rx="0.5" fill={screen === "home" ? "#fff" : theme.text} opacity="0.3"/>
            </svg>
            <svg width="24" height="12" viewBox="0 0 24 12">
              <rect x="0" y="0" width="21" height="12" rx="2" stroke={screen === "home" ? "#fff" : theme.text} strokeWidth="1" fill="none"/>
              <rect x="22" y="4" width="2" height="4" rx="0.5" fill={screen === "home" ? "#fff" : theme.text}/>
              <rect x="1.5" y="1.5" width="15" height="9" rx="1" fill={theme.accent}/>
            </svg>
          </div>
        </div>

        {/* Content */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" }}>
          <Screen />
        </div>

        {/* Bottom Nav */}
        <div style={{
          display: "flex", justifyContent: "space-around", alignItems: "center",
          padding: "6px 4px 18px", background: theme.card, flexShrink: 0,
          borderTop: `1px solid ${theme.mist}`,
        }}>
          {SCREENS.map((s) => {
            const Icon = iconMap[s];
            const active = screen === s;
            return (
              <button key={s} onClick={() => setScreen(s)} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                background: "none", border: "none", cursor: "pointer", padding: "4px 8px",
                color: active ? theme.accent : theme.textMuted, transition: "color 0.2s",
                position: "relative",
              }}>
                {active && <div style={{
                  position: "absolute", top: -7, width: 20, height: 3, borderRadius: 2,
                  background: theme.accent,
                }} />}
                <Icon />
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: 0.3 }}>{labelMap[s]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
