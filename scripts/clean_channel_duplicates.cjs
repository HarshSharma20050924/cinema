#!/usr/bin/env node

/**
 * 🧹 Cinema Channel Duplicate Cleaner
 * Scans messages in the Telegram channel.
 * Rules:
 * 1. Different extensions can post the same title (ALLOWED).
 * 2. Same extension posting the same title is a DUPLICATE (DELETED from channel).
 */

const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN || '8887103348:AAFYcYbWEm8adSF4fpLUcUliJKTmqGxvEe4';
const CHANNEL_ID = process.env.CHANNEL_ID || '-1004363607477';
const ADMIN_ID = 1872734142;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function cleanMediaTitle(raw) {
  if (!raw) return '';
  let str = String(raw).replace(/^[\s🎬📺📥⚡📦⬇️▶️]+/gu, '').trim();
  str = str.replace(/^(?:download|watch(?:\s+online)?|stream)\s+/i, '').trim();
  str = str.replace(/\[\s*18\+\s*\]|\(\s*18\+\s*\)|\[Adult\]/gi, '').trim();
  str = str.replace(/\{[^}]*\}/g, ' ');
  str = str.replace(/\[\s*(?:dual\s*audio|hindi|eng|org|bluray|hevc|x264|x265|720p|1080p|480p|2160p|4k)[^\]]*\]/gi, ' ');
  str = str.replace(/\((?:season\s*\d+\s*[-+–—]\s*\d+|seasons?\s*\d+[^)]*)\)/gi, ' ');
  str = str.split(/\b(?:480p|720p|1080p|2160p|4k)\s*[|•·–—-]/i)[0];
  str = str.split(/\b(?:dual\s*audio|multi\s*audio|hindi\s*dubbed|org\s*2\.0|org\s*5\.1|multi\s*sub)\b/i)[0];
  str = str.replace(/\b(?:480p|720p|1080p|2160p|4k|bluray|web-dl|webrip|hdrip)\b.*$/i, '');
  str = str.replace(/\b(?:complete|hindi|english|telugu|tamil|malayalam|kannada)\b.*$/i, '');
  str = str.replace(/[\s|·–—\-_:]+$/g, '').trim();
  str = str.replace(/\s{2,}/g, ' ').trim();
  return str.toLowerCase();
}

function extractSeason(str) {
  if (!str) return '';
  const m = str.match(/\b(?:season\s*(\d{1,2})|s(\d{1,2}))\b/i);
  return m ? `_s${m[1] || m[2]}` : '';
}

async function tgCall(method, payload) {
  try {
    const res = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, payload, { timeout: 10000 });
    return res.data;
  } catch (err) {
    if (err.response?.status === 429) {
      const waitSec = (err.response?.data?.parameters?.retry_after || 5) + 1;
      console.warn(`⏳ Rate limited. Waiting ${waitSec}s...`);
      await sleep(waitSec * 1000);
      return tgCall(method, payload);
    }
    return null;
  }
}

async function cleanDuplicates() {
  console.log(`🔍 Checking channel message bounds...`);

  // Find latest message ID
  let probe = await tgCall('sendMessage', { chat_id: CHANNEL_ID, text: '🔍 Cleaning duplicates...' });
  if (!probe?.result?.message_id) {
    console.error('Failed to probe channel!');
    return;
  }
  const maxId = probe.result.message_id;
  await tgCall('deleteMessage', { chat_id: CHANNEL_ID, message_id: maxId });

  console.log(`📊 Scanning messages 1 to ${maxId}...`);

  // Map of provider+title -> originalMessageId
  const seenMap = new Map();
  let deletedCount = 0;
  let scannedCount = 0;

  for (let id = 45; id < maxId; id++) {
    // Forward message to admin to inspect its content
    const forward = await tgCall('forwardMessage', {
      chat_id: ADMIN_ID,
      from_chat_id: CHANNEL_ID,
      message_id: id
    });

    if (!forward?.result) {
      continue;
    }

    const forwardMsgId = forward.result.message_id;
    const text = forward.result.text || forward.result.caption || '';
    const markup = forward.result.reply_markup;

    // Immediately remove forward from admin chat
    await tgCall('deleteMessage', { chat_id: ADMIN_ID, message_id: forwardMsgId });

    // Skip pinned guide message (ID 49) or non-media messages
    if (id === 49 || !text.includes('🎬')) {
      continue;
    }

    scannedCount++;

    // Extract title
    const titleMatch = text.match(/🎬\s*([^\n]+)/);
    const rawTitle = titleMatch ? titleMatch[1].trim() : '';

    // Extract provider
    let prov = '';
    const provMatch = text.match(/Source:[\s\S]*?([a-zA-Z0-9_-]+)/i);
    if (provMatch) {
      prov = provMatch[1].trim().toLowerCase();
    } else if (markup?.inline_keyboard) {
      for (const row of markup.inline_keyboard) {
        for (const btn of row) {
          if (btn.url && btn.url.includes('start=p_')) {
            const parts = btn.url.split('start=p_')[1]?.split('_') || [];
            if (parts.length > 1) {
              prov = parts[parts[0] === 'arch' ? 1 : 1].toLowerCase();
              break;
            }
          }
        }
        if (prov) break;
      }
    }

    if (!prov || !rawTitle) continue;

    const cleanTitle = cleanMediaTitle(rawTitle) + extractSeason(rawTitle);
    const key = `${prov}:${cleanTitle}`;

    if (seenMap.has(key)) {
      const origId = seenMap.get(key);
      console.log(`🗑️ [DUPLICATE FOUND] Deleting message ${id} (${prov}: "${rawTitle}"). Original was #${origId}`);
      const del = await tgCall('deleteMessage', { chat_id: CHANNEL_ID, message_id: id });
      if (del?.ok) deletedCount++;
    } else {
      seenMap.set(key, id);
    }

    // Gentle pacing to avoid flood limits
    if (scannedCount % 20 === 0) {
      console.log(`Progress: Checked ${scannedCount} cards, removed ${deletedCount} duplicates so far...`);
      await sleep(1000);
    } else {
      await sleep(350);
    }
  }

  console.log(`\n🎉 Duplicate cleanup complete! Scanned: ${scannedCount} cards. Deleted duplicates: ${deletedCount}`);
}

cleanDuplicates().catch(console.error);
