/**
 * 24/7 Serverless Telegram Bot Webhook for Cinema Ecosystem
 * Deployed directly on Cloudflare Pages global edge.
 * Runs 24/7 without needing a laptop or separate VPS.
 */

import { BOT_TOKEN } from "./_botConfig.js";
import { handleMessage, handleCallbackQuery } from "./_botHandlers.js";

// Main Telegram Webhook Entry Point
export async function onRequestPost(context) {
  const { request, env } = context;
  const urlObj = new URL(request.url);
  const token = urlObj.searchParams.get('token') || env?.BOT_TOKEN || BOT_TOKEN;
  const db = env?.cinema_db;

  if (!token) {
    console.error("FATAL: Webhook received update but env.BOT_TOKEN is missing!");
    return new Response(JSON.stringify({ error: "BOT_TOKEN not configured in env" }), {
      status: 200, // Return 200 to prevent Telegram retry storm while diagnosing
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const update = await request.json();

    // 1. Handle Messages
    if (update.message) {
      await handleMessage(update.message, token, db, request.url);
    }

    // 2. Handle Callback Queries (Button clicks)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query, token, db, request.url);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200, // Return 200 to Telegram so it doesn't repeatedly retry failing updates
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestGet(context) {
  const { request, env } = context || {};
  const urlObj = request ? new URL(request.url) : null;
  const tok = urlObj?.searchParams?.get('token') || env?.BOT_TOKEN || BOT_TOKEN;
  const db = env?.cinema_db ? 'CONNECTED' : 'MISSING';
  const status = tok ? `OK (Prefix: ${tok.slice(0, 8)}...)` : 'MISSING';
  return new Response(`Cinema Telegram Webhook is Live (Cloudflare Edge 24/7)\nBOT_TOKEN: ${status}\nDATABASE: ${db}\n`, {
    status: 200,
    headers: { "Content-Type": "text/plain" }
  });
}
