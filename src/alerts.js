/**
 * Alerts — fetch from Google Sheets or use static fallback.
 * When VITE_ALERTS_SHEETS_URL is set, fetches from that URL.
 * Caches in localStorage for offline. Polls every 15 minutes.
 */

import { ALERTS as STATIC_ALERTS } from "./alerts-data";

const ALERTS_CACHE_KEY = "wedding-alerts-cache";

export const ALERTS_SHEETS_URL = import.meta.env.VITE_ALERTS_SHEETS_URL;

function parseAlerts(data) {
  const list = Array.isArray(data?.alerts) ? data.alerts : [];
  return list
    .filter((a) => a && a.id)
    .map((a) => ({
      id: String(a.id).trim(),
      title: String(a.title || "").trim(),
      body: String(a.body || "").trim(),
      date: String(a.date || "").trim(),
      urgent: a.urgent === true || String(a.urgent).toLowerCase() === "true",
    }));
}

function getCached() {
  try {
    const s = localStorage.getItem(ALERTS_CACHE_KEY);
    if (s) return parseAlerts(JSON.parse(s));
  } catch (_) {}
  return null;
}

function setCache(alerts) {
  try {
    localStorage.setItem(ALERTS_CACHE_KEY, JSON.stringify({ alerts }));
  } catch (_) {}
}

export async function fetchAlerts() {
  const url = ALERTS_SHEETS_URL;
  if (!url) return { alerts: STATIC_ALERTS, fromCache: false };

  try {
    const res = await fetch(url);
    const data = await res.json();
    const alerts = parseAlerts(data);
    if (alerts.length > 0) {
      setCache(alerts);
      return { alerts, fromCache: false };
    }
  } catch (_) {}

  const cached = getCached();
  return { alerts: cached || STATIC_ALERTS, fromCache: !!cached };
}
