#!/usr/bin/env node
/**
 * Generates firebase-messaging-sw.js from template using .env values.
 * Run automatically before dev/build. Never commit the generated file with real keys.
 */

const { readFileSync, writeFileSync, existsSync } = require("fs");
const { join } = require("path");

const root = join(__dirname, "..");

// Parse .env manually (no extra dependency)
function loadEnv() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = loadEnv();

const templatePath = join(root, "public", "firebase-messaging-sw.template.js");
const outputPath = join(root, "public", "firebase-messaging-sw.js");

const replacements = {
  __FIREBASE_API_KEY__: env.VITE_FIREBASE_API_KEY || "",
  __FIREBASE_AUTH_DOMAIN__: env.VITE_FIREBASE_AUTH_DOMAIN || "",
  __FIREBASE_PROJECT_ID__: env.VITE_FIREBASE_PROJECT_ID || "",
  __FIREBASE_STORAGE_BUCKET__: env.VITE_FIREBASE_STORAGE_BUCKET || "",
  __FIREBASE_MESSAGING_SENDER_ID__: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  __FIREBASE_APP_ID__: env.VITE_FIREBASE_APP_ID || "",
};

if (!existsSync(templatePath)) {
  console.error("Template not found:", templatePath);
  process.exit(1);
}

let content = readFileSync(templatePath, "utf8");
for (const [placeholder, value] of Object.entries(replacements)) {
  content = content.split(placeholder).join(value);
}

writeFileSync(outputPath, content);
console.log("Generated firebase-messaging-sw.js from .env");
