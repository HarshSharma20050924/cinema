const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { loadConfig, saveConfig } = require('./config.cjs');
const {
  getAllProviders,
  searchGlobal,
  searchSingleProvider,
  getMeta,
  getStreams
} = require('./cinemaApi.cjs');
const { checkEnabledExtensionsAndPost } = require('./autoPoster.cjs');

let botRunning = false;
let lastUpdateId = 0;

// Shared persistent cache for links across bot and autoPoster
const { storeLink, getStoredLink } = require('./linkStore.cjs');

// Telegram API Helper
async function tgCall(method, data) {
  const cfg = loadConfig();
  const url = `https://api.telegram.org/bot${cfg.BOT_TOKEN}/${method}`;
  try {
    const res = await axios.post(url, data, { timeout: 35000 });
    return res.data;
  } catch (err) {
    console.error(`Telegram API [${method}] error:`, err.response?.data?.description || err.message);
    return null;
  }
}

async function sendMessage(chatId, text, extra = {}) {
  return tgCall('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...extra
  });
}

async function answerCallbackQuery(callbackQueryId, text = '', showAlert = false) {
  return tgCall('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert
  });
}

function isAdmin(userId) {
  const cfg = loadConfig();
  return (cfg.ADMIN_IDS || []).includes(Number(userId));
}

// Check if a URL is a genuine direct download file (not a hotlink-protected streaming CDN returning 429)
function isRealDownloadLink(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return false;
  const lower = url.toLowerCase();
  
  // Anti-leech / hotlinked / streaming-only CDNs that cause 429 errors or cannot be downloaded directly via browser
  if (
    lower.includes('hakunaymatata') ||
    lower.includes('bcdnxw') ||
    lower.includes('officialmoviebox') ||
    lower.includes('.m3u8') ||
    lower.includes('/manifest') ||
    lower.includes('playlist')
  ) {
    return false;
  }
  return true;
}

const VLC_GUIDE_TEXT = `📢 <b>Smooth Streaming & Runner App Guide</b>

For the best experience without buffering or playback issues, we recommend using <b>VLC Media Player</b>.

📱 <b>On Mobile (Android / iPhone):</b>
1️⃣ Install the free <b>VLC app</b> from Google Play or App Store.
2️⃣ Tap <b>"Open in VLC"</b> on any movie or episode to watch instantly.

💻 <b>On PC (Windows / Mac / Linux):</b>
1️⃣ Install <b>VLC</b> from <a href="https://www.videolan.org">videolan.org</a>.
2️⃣ Click any stream link to play directly on your computer.

⚡ <b>Stream not loading or bot taking time?</b>
Keep Cinema active by opening our lightweight <b>Runner App</b> on your phone or PC:
👉 <b>Download Runner App:</b> <a href="https://cinema-dwh.pages.dev/?tab=downloads">cinema-dwh.pages.dev/?tab=downloads</a>

📥 <b>Looking to Download?</b>
Use <b>@cinemaisherebtw_bot</b> to get fast, working download links.

🎬 <i>Enjoy your movies & shows ad-free!</i>`;

const TELEGRAM_APP_FILES = {
  android_runner: "BQACAgUAAxkDAAIBaWrTipCb-_-q012OEDifzt5NG4DEAAKeIQACokyZVixMVT8C3CLYPQQ",
  android_app: "BQACAgUAAxkDAAIBamrTisA9owxvz_qltfrVc6cu9BbOAAKfIQACokyZVhNpasclQJk_PQQ",
  web_app: "BQACAgUAAxkDAAIBa2rTismbICbMl7YhtQS-U3MdNRsEAAKgIQACokyZVpMnnRAIz3UOPQQ"
};

const VLC_GUIDE_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '🌐 Cinema Web', url: 'https://cinema-dwh.pages.dev' },
      { text: '📱 Runner APK', callback_data: 'send_file:android_runner' }
    ],
    [
      { text: '📱 Cinema App', callback_data: 'send_file:android_app' },
      { text: '🌐 Web APK', callback_data: 'send_file:web_app' }
    ],
    [
      { text: '📥 VLC Player', url: 'https://www.videolan.org/vlc/' },
      { text: '🌐 All Downloads', url: 'https://cinema-dwh.pages.dev/?tab=downloads' }
    ]
  ]
};

async function pinMessage(chatId, messageId) {
  return tgCall('pinChatMessage', {
    chat_id: chatId,
    message_id: messageId,
    disable_notification: true
  });
}

// Directly show release qualities and episodes from a specific extension with pagination & poster
async function showItemDetails(chatId, item, page = 1, messageId = null) {
  let meta = item.meta;
  if (!meta) {
    if (!messageId) {
      await sendMessage(chatId, `⏳ Fetching sources for <b>"${escapeHtml(item.title)}"</b> on <b>${escapeHtml(item.provider)}</b>...`);
    }
    meta = await getMeta(item.link, item.provider);
    if (meta) item.meta = meta;
  }

  const linkList = meta?.linkList || [];
  const pageSize = 8;
  const totalPages = Math.ceil(linkList.length / pageSize) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const posterUrl = meta?.poster || meta?.image || item.image || item.poster || null;

  if (linkList.length > 0) {
    let itemText = `🎬 <b>${escapeHtml(meta.title || item.title)}</b>\n`;
    if (meta.synopsis) {
      itemText += `\n📝 <i>${escapeHtml(meta.synopsis.slice(0, 200))}...</i>\n`;
    }
    itemText += `\n🌐 <b>Source:</b> ${escapeHtml(item.provider)}`;
    if (totalPages > 1) {
      itemText += ` • <b>Page ${currentPage}/${totalPages}</b> (${linkList.length} releases)`;
    }
    itemText += `\n\n<b>Select Quality / Release to Stream & Download:</b>\n`;

    const keyboard = [];
    const startIndex = (currentPage - 1) * pageSize;
    const pageItems = linkList.slice(startIndex, startIndex + pageSize);

    // Save item with meta in linkStore for fast in-memory page flipping
    const itemStoreId = storeLink(item.provider, item.link, item.title, { meta });

    const rowBatch = [];
    pageItems.forEach((group, gIdx) => {
      const dLinks = group.directLinks || [];
      const isMultiEpisode = dLinks.length > 1;

      if (isMultiEpisode) {
        const epGroupStoreId = storeLink(item.provider, {
          episodes: dLinks,
          allGroups: linkList,
          groupTitle: group.title,
          seriesTitle: meta?.title || item.title
        }, `${item.title} - ${group.title || 'Episodes'}`);
        const label = `📺 ${group.title ? group.title.slice(0, 16) : 'Eps'} (${dLinks.length})`;
        rowBatch.push({ text: label, callback_data: `eps:${epGroupStoreId}` });
      } else {
        const targetLink = dLinks[0]?.link || item.link;
        const qTitle = `${item.title} [${group.title || group.quality || `Quality ${startIndex + gIdx + 1}`}]`;
        const qStoreId = storeLink(item.provider, targetLink, qTitle);
        const label = `⚡ ${(group.title || group.quality || `Q${startIndex + gIdx + 1}`).slice(0, 20)}`;
        rowBatch.push({ text: label, callback_data: `resopt:${qStoreId}` });
      }
    });

    for (let i = 0; i < rowBatch.length; i += 2) {
      keyboard.push(rowBatch.slice(i, i + 2));
    }

    // Pagination row
    if (totalPages > 1) {
      const navRow = [];
      if (currentPage > 1) {
        navRow.push({ text: '⬅️ Prev', callback_data: `qpage:${itemStoreId}:${currentPage - 1}` });
      }
      navRow.push({ text: `📄 Page ${currentPage}/${totalPages}`, callback_data: 'noop' });
      if (currentPage < totalPages) {
        navRow.push({ text: 'Next ➡️', callback_data: `qpage:${itemStoreId}:${currentPage + 1}` });
      }
      keyboard.push(navRow);
    }

    keyboard.push([
      { text: '🌐 Cinema Web', url: `${loadConfig().WEB_URL}` },
      { text: '🔄 Switch Extension', callback_data: `swprov:${item.title.slice(0, 30)}` }
    ]);

    if (messageId) {
      return tgCall('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: itemText,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    }

    if (posterUrl && (posterUrl.startsWith('http://') || posterUrl.startsWith('https://'))) {
      const photoRes = await tgCall('sendPhoto', {
        chat_id: chatId,
        photo: posterUrl,
        caption: itemText,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
      if (photoRes?.ok) return photoRes;
    }

    return sendMessage(chatId, itemText, { reply_markup: { inline_keyboard: keyboard } });
  }

  // Single stream/dl direct fallback
  const storeId = storeLink(item.provider, item.link, item.title);
  const itemText = 
`🎬 <b>${escapeHtml(item.title)}</b>

🌐 <b>Source:</b> ${escapeHtml(item.provider)}
🔗 <b>Status:</b> Ready for extraction

Choose an option below:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '▶️ Stream / VLC Player', callback_data: `stream:${storeId}` },
        { text: '⬇️ Direct Download', callback_data: `dl:${storeId}` }
      ],
      [
        { text: '🌐 Cinema Web', url: `${loadConfig().WEB_URL}` },
        { text: '🔄 Switch Extension', callback_data: `swprov:${item.title.slice(0, 30)}` }
      ]
    ]
  };

  if (posterUrl && (posterUrl.startsWith('http://') || posterUrl.startsWith('https://'))) {
    const photoRes = await tgCall('sendPhoto', {
      chat_id: chatId,
      photo: posterUrl,
      caption: itemText,
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
    if (photoRes?.ok) return photoRes;
  }

  return sendMessage(chatId, itemText, { reply_markup: keyboard });
}

// Format Search Results Message with pagination
function formatSearchResults(results, query, providerName = 'All Enabled', page = 1, existingStoreId = null) {
  if (!results || results.length === 0) {
    return {
      text: `❌ No results found for "<b>${escapeHtml(query)}</b>" on <b>${escapeHtml(providerName)}</b>.\n\nTry another keyword or switch extensions.`,
      keyboard: {
        inline_keyboard: [
          [{ text: '🔄 Switch Extension / Provider', callback_data: `swprov:${query.slice(0, 30)}` }]
        ]
      }
    };
  }

  const pageSize = 8;
  const totalPages = Math.ceil(results.length / pageSize) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const pageResults = results.slice(startIndex, startIndex + pageSize);

  // Persistent store for search results pagination
  const searchStoreId = existingStoreId || storeLink(providerName, results, query);

  let text = `🔎 <b>Search Results for:</b> "${escapeHtml(query)}"\n`;
  text += `⚙️ <b>Source:</b> ${escapeHtml(providerName)}`;
  if (totalPages > 1) {
    text += ` • <b>Page ${currentPage}/${totalPages}</b> (${results.length} total)`;
  }
  text += `\n\n<i>Tap any title below to get Stream & Download links:</i>\n`;

  const keyboard = [];
  pageResults.forEach((item, idx) => {
    const prov = item.provider || 'vega';
    const storeId = storeLink(prov, item.link, item.title);
    const label = `${startIndex + idx + 1}. ${item.title.slice(0, 38)} [${item.providerName || prov}]`;
    keyboard.push([{ text: label, callback_data: `item:${storeId}` }]);
  });

  // Pagination navigation row
  if (totalPages > 1) {
    const navRow = [];
    if (currentPage > 1) {
      navRow.push({ text: '⬅️ Prev', callback_data: `spage:${searchStoreId}:${currentPage - 1}` });
    }
    navRow.push({ text: `📄 ${currentPage}/${totalPages}`, callback_data: 'noop' });
    if (currentPage < totalPages) {
      navRow.push({ text: 'Next ➡️', callback_data: `spage:${searchStoreId}:${currentPage + 1}` });
    }
    keyboard.push(navRow);
  }

  keyboard.push([
    { text: '🔄 Search on Another Extension', callback_data: `swprov:${query.slice(0, 30)}` }
  ]);

  return { text, keyboard: { inline_keyboard: keyboard } };
}

// Handle Bot Commands & Messages
async function handleMessage(msg) {
  const chatId = msg.chat?.id;
  const userId = msg.from?.id;
  const text = (msg.text || '').trim();

  if (!chatId || !text) return;

  // 1. /start command
  if (text.startsWith('/start')) {
    const parts = text.split(' ');
    const param = parts[1];

    if (param) {
      // 1. Direct channel post click: p_<storeId>_<provKey>_<title>
      if (param.startsWith('p_')) {
        const payload = param.slice(2);
        const firstUnderscore = payload.indexOf('_');
        const secondUnderscore = payload.indexOf('_', firstUnderscore + 1);

        let storeId = payload;
        let provKey = null;
        let rawTitle = null;

        if (firstUnderscore > -1) {
          storeId = payload.slice(0, firstUnderscore);
          if (secondUnderscore > -1) {
            provKey = payload.slice(firstUnderscore + 1, secondUnderscore);
            rawTitle = decodeURIComponent(payload.slice(secondUnderscore + 1)).replace(/_/g, ' ');
          } else {
            provKey = payload.slice(firstUnderscore + 1);
          }
        }

        // Instant interactive loading feedback
        tgCall('sendChatAction', { chat_id: chatId, action: 'upload_photo' }).catch(() => {});
        const loadingMsg = await sendMessage(chatId, `⏳ Loading media details from <b>${escapeHtml(provKey || 'extension')}</b>...`);
        const loadingMsgId = loadingMsg?.result?.message_id;

        const item = getStoredLink(storeId);
        if (item) {
          if (loadingMsgId) {
            tgCall('deleteMessage', { chat_id: chatId, message_id: loadingMsgId }).catch(() => {});
          }
          // DIRECTLY SHOW MEDIA FROM THIS EXACT EXTENSION WITH POSTER
          return showItemDetails(chatId, item);
        }

        // Fallback: search exclusively on the extension that was clicked (never all extensions)
        if (provKey && rawTitle) {
          if (loadingMsgId) {
            tgCall('editMessageText', {
              chat_id: chatId,
              message_id: loadingMsgId,
              text: `🔍 Fetching <b>"${escapeHtml(rawTitle)}"</b> on <b>${escapeHtml(provKey)}</b>...`,
              parse_mode: 'HTML'
            }).catch(() => {});
          }
          const results = await searchSingleProvider(rawTitle, provKey);
          if (Array.isArray(results) && results.length > 0) {
            if (loadingMsgId) {
              tgCall('deleteMessage', { chat_id: chatId, message_id: loadingMsgId }).catch(() => {});
            }
            return showItemDetails(chatId, results[0]);
          }
          const formatted = formatSearchResults(results, rawTitle, provKey);
          if (loadingMsgId) {
            return tgCall('editMessageText', {
              chat_id: chatId,
              message_id: loadingMsgId,
              text: formatted.text,
              parse_mode: 'HTML',
              reply_markup: formatted.keyboard
            });
          }
          return sendMessage(chatId, formatted.text, { reply_markup: formatted.keyboard });
        }
      }

      // 2. Generic title searches
      if (param.startsWith('s_') || param.startsWith('d_') || param.startsWith('q_')) {
        const actionType = param[0]; // 's', 'd', 'q'
        const rawTitle = decodeURIComponent(param.slice(2)).replace(/_/g, ' ');

        await sendMessage(chatId, `🔍 Searching <b>"${escapeHtml(rawTitle)}"</b> across active Cinema scrapers...`);
        const results = await searchGlobal(rawTitle);
        const formatted = formatSearchResults(results, rawTitle);
        return sendMessage(chatId, formatted.text, { reply_markup: formatted.keyboard });
      }
    }

    const welcomeMsg = 
`👋 <b>Welcome to Cinema Bot!</b>

Access 35+ unified streaming & download scrapers directly inside Telegram. 100% ad-free.

⚡ <b>High-Performance Buffer-Free Streaming:</b>
We strongly recommend installing <b>VLC Player</b> for ultra-smooth 4K/1080p playback with zero lag & hardware acceleration.

<b>How to use:</b>
• Simply type any movie or show title (e.g. <code>Inception</code> or <code>Deadpool</code>)
• Or use <code>/search &lt;title&gt;</code>
• Tap <b>"🚀 Install VLC Guide"</b> for the step-by-step setup
• Use <code>/providers</code> to view active extensions and switch sources`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🚀 Install VLC Guide', callback_data: 'vlc_guide' },
          { text: '🧩 Extensions', callback_data: 'list_providers' }
        ],
        [
          { text: '🌐 Cinema Web', url: loadConfig().WEB_URL },
          { text: '📢 Updates Channel', url: 'https://t.me/+2QbDC2GcZFg0YjZl' }
        ]
      ]
    };
    const sent = await sendMessage(chatId, welcomeMsg, { reply_markup: keyboard });
    if (sent?.result?.message_id) {
      pinMessage(chatId, sent.result.message_id).catch(() => {});
    }
    return sent;
  }

  // 2. /vlc or /guide command
  if (text.startsWith('/vlc') || text.startsWith('/guide')) {
    const sent = await sendMessage(chatId, VLC_GUIDE_TEXT, { reply_markup: VLC_GUIDE_KEYBOARD });
    if (sent?.result?.message_id) {
      pinMessage(chatId, sent.result.message_id).catch(() => {});
    }
    return sent;
  }

  // Pin VLC Guide in chat or channel (Admin Only)
  if (text.startsWith('/pinvlc') || text.startsWith('/pin_channel')) {
    if (!isAdmin(userId)) {
      return sendMessage(chatId, '⛔ Admin only command.');
    }
    const targetChat = text.includes('channel') ? loadConfig().CHANNEL_ID : chatId;
    const sent = await sendMessage(targetChat, VLC_GUIDE_TEXT, { reply_markup: VLC_GUIDE_KEYBOARD });
    if (sent?.result?.message_id) {
      await pinMessage(targetChat, sent.result.message_id);
      return sendMessage(chatId, `📌 Pinned VLC Guide successfully in <code>${targetChat}</code>!`);
    }
  }

  // 3. /search command
  if (text.startsWith('/search')) {
    const query = text.replace(/^\/search\s*/i, '').trim();
    if (!query) {
      return sendMessage(chatId, '⚠️ Please provide a movie or show name:\nExample: <code>/search Interstellar</code>');
    }

    await sendMessage(chatId, `🔍 Searching <b>"${escapeHtml(query)}"</b> across active extensions...`);
    const results = await searchGlobal(query);
    const formatted = formatSearchResults(results, query);
    return sendMessage(chatId, formatted.text, { reply_markup: formatted.keyboard });
  }

  // 3. /providers command
  if (text.startsWith('/providers')) {
    return showProvidersMenu(chatId, userId);
  }

  // 4. /toggle <provider> (Admin Only)
  if (text.startsWith('/toggle')) {
    if (!isAdmin(userId)) {
      return sendMessage(chatId, '⛔ You do not have administrator permissions to configure providers.');
    }
    const provName = text.replace(/^\/toggle\s*/i, '').trim();
    if (!provName) {
      return sendMessage(chatId, '⚠️ Specify a provider value:\nExample: <code>/toggle vega</code>');
    }
    const cfg = loadConfig();
    const idx = cfg.enabledProviders.indexOf(provName);
    if (idx >= 0) {
      cfg.enabledProviders.splice(idx, 1);
      saveConfig(cfg);
      return sendMessage(chatId, `🔴 Disabled extension: <b>${escapeHtml(provName)}</b>`);
    } else {
      cfg.enabledProviders.push(provName);
      saveConfig(cfg);
      return sendMessage(chatId, `🟢 Enabled extension: <b>${escapeHtml(provName)}</b>`);
    }
  }

  // /web command
  if (text.startsWith('/web') || text === 'web') {
    const webUrl = loadConfig().WEB_URL;
    return sendMessage(chatId, `🌐 <b>Cinema Web App:</b> <a href="${webUrl}">${webUrl}</a>\n\nStream movies & series 100% ad-free directly in your browser!`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🌐 Open Cinema Web', url: webUrl },
            { text: '📱 Runner APK', callback_data: 'send_file:android_runner' }
          ]
        ]
      }
    });
  }

  // 5. /runner or /apk or /app command
  if (text.startsWith('/runner') || text.startsWith('/apk') || text.startsWith('/app')) {
    await sendMessage(chatId, VLC_GUIDE_TEXT, { reply_markup: VLC_GUIDE_KEYBOARD });
    return tgCall('sendDocument', {
      chat_id: chatId,
      document: 'BQACAgUAAxkDAAIBaWrTipCb-_-q012OEDifzt5NG4DEAAKeIQACokyZVixMVT8C3CLYPQQ',
      caption: '⚡ <b>Cinema Node Runner APK (v2.2.1)</b>\n\nRaw installer file. Tap to install directly on Android!',
      parse_mode: 'HTML'
    });
  }

  // 6. /post_daily or /sync (Admin Only: Force check enabled extensions & post new releases to channel)
  if (text.startsWith('/post_daily') || text.startsWith('/sync')) {
    if (!isAdmin(userId)) {
      return sendMessage(chatId, '⛔ Admin only command.');
    }
    await sendMessage(chatId, '🚀 Checking all enabled extensions for new releases to post rapidly to channel...');
    try {
      await checkEnabledExtensionsAndPost(true);
      return sendMessage(chatId, '✅ Checked enabled extensions and posted new releases to channel!');
    } catch (e) {
      return sendMessage(chatId, `❌ Failed to post: ${e.message}`);
    }
  }

  // 7. /help command
  if (text.startsWith('/help') || text === 'help') {
    const helpText = 
`🤖 <b>Cinema Streaming Bot - Command Directory</b>

Here are all valid commands available on this bot:

• 🔍 <b>Search Content:</b> Just type any movie or show title (or <code>/search &lt;name&gt;</code>)
• ⚡ <b>/runner</b> or <b>/apk</b> or <b>/app</b>: Get Cinema Runner APK directly in chat & background runner links
• 📖 <b>/vlc</b> or <b>/guide</b>: Setup VLC player handoff & buffer-free streaming guide
• 🧩 <b>/providers</b>: View all 30+ extensions and check enabled scrapers
• 🏠 <b>/start</b>: Launch main interactive menu and quick shortcuts
• ❓ <b>/help</b>: Show this complete command list

${isAdmin(userId) ? '<b>Admin Controls:</b>\n• 🚀 <code>/post_daily</code> or <code>/sync</code> - Rapidly check extensions and post releases to channel\n• 🔀 <code>/toggle &lt;name&gt;</code> - Enable or disable an extension\n• 📌 <code>/pinvlc</code> - Pin VLC guide to channel' : ''}`;

    const helpKeyboard = {
      inline_keyboard: [
        [
          { text: '🔍 Search Movie / Show', switch_inline_query_current_chat: '' },
          { text: '⚡ Download Runner', url: 'https://cinema-dwh.pages.dev/?tab=downloads' }
        ],
        [
          { text: '🧩 Enabled Providers', callback_data: 'view_providers' },
          { text: '📖 VLC Guide', callback_data: 'vlc_guide' }
        ],
        [
          { text: '🌐 Open Cinema Web', url: loadConfig().WEB_URL }
        ]
      ]
    };

    return sendMessage(chatId, helpText, { reply_markup: helpKeyboard });
  }

  // 7. Any other text message -> Treat directly as search query!
  await sendMessage(chatId, `🔍 Searching <b>"${escapeHtml(text)}"</b> across active extensions...`);
  const results = await searchGlobal(text);
  const formatted = formatSearchResults(results, text);
  return sendMessage(chatId, formatted.text, { reply_markup: formatted.keyboard });
}

// Show Providers Menu
async function showProvidersMenu(chatId, userId, messageId = null) {
  const cfg = loadConfig();
  const allProvs = await getAllProviders();
  const enabledSet = new Set(cfg.enabledProviders);

  let text = `🧩 <b>Cinema Extensions & Scrapers:</b>\n\n`;
  if (isAdmin(userId)) {
    text += `👑 <i>Admin Mode: Tap any button below to TOGGLE it ON or OFF for the bot.</i>\n\n`;
  } else {
    text += `Active extensions currently searched by the bot:\n\n`;
  }

  const keyboard = [];
  const chunkSize = 2;
  const listToRender = allProvs;

  for (let i = 0; i < listToRender.length; i += chunkSize) {
    const chunk = listToRender.slice(i, i + chunkSize);
    const row = chunk.map((p) => {
      const isEnabled = enabledSet.has(p.value);
      const icon = isEnabled ? '🟢' : '⚪';
      if (isAdmin(userId)) {
        return {
          text: `${icon} ${p.name || p.value}`,
          callback_data: `adm_tog:${p.value}`
        };
      } else {
        return {
          text: `${icon} ${p.name || p.value}`,
          callback_data: `noop`
        };
      }
    });
    keyboard.push(row);
  }

  if (messageId) {
    return tgCall('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  } else {
    return sendMessage(chatId, text, { reply_markup: { inline_keyboard: keyboard } });
  }
}

// Handle Callback Queries (Button Clicks)
async function handleCallbackQuery(cq) {
  const cqId = cq.id;
  const data = cq.data || '';
  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;
  const userId = cq.from?.id;

  if (data === 'noop') {
    return answerCallbackQuery(cqId);
  }

  if (data === 'list_providers') {
    await answerCallbackQuery(cqId);
    return showProvidersMenu(chatId, userId);
  }

  if (data === 'vlc_guide') {
    await answerCallbackQuery(cqId);
    return sendMessage(chatId, VLC_GUIDE_TEXT, { reply_markup: VLC_GUIDE_KEYBOARD });
  }

  // Direct raw APK file push into chat
  if (data.startsWith('send_file:')) {
    const fileType = data.replace('send_file:', '');
    await answerCallbackQuery(cqId, 'Sending file directly into chat...');
    let fileDoc = TELEGRAM_APP_FILES[fileType] || 'https://github.com/HarshSharma20050924/cinema/releases/latest/download/Cinema-Runner.apk';
    let caption = '⚡ <b>Cinema Node Runner APK (v2.2.1)</b>\n\nRaw installer file. Keeps background scrapers active 24/7 on Android!';

    if (fileType === 'android_app') {
      fileDoc = TELEGRAM_APP_FILES.android_app || 'https://github.com/HarshSharma20050924/cinema/releases/latest/download/Cinema.apk';
      caption = '📱 <b>Cinema Mobile App APK</b>\n\nRaw installer file. Tap to install directly and stream ad-free!';
    } else if (fileType === 'web_app') {
      fileDoc = TELEGRAM_APP_FILES.web_app;
      caption = '🌐 <b>Cinema Web App APK</b>\n\nDirect progressive web container for Android!';
    }

    return tgCall('sendDocument', {
      chat_id: chatId,
      document: fileDoc,
      caption,
      parse_mode: 'HTML'
    });
  }

  // Admin toggle provider via button
  if (data.startsWith('adm_tog:')) {
    if (!isAdmin(userId)) {
      return answerCallbackQuery(cqId, 'Admin only!', true);
    }
    const prov = data.replace('adm_tog:', '');
    const cfg = loadConfig();
    const idx = cfg.enabledProviders.indexOf(prov);
    if (idx >= 0) {
      cfg.enabledProviders.splice(idx, 1);
    } else {
      cfg.enabledProviders.push(prov);
    }
    saveConfig(cfg);
    await answerCallbackQuery(cqId, `${prov} toggled!`);
    return showProvidersMenu(chatId, userId, messageId);
  }

  // Item selected -> Fetch metadata & show Quality/Resolution options
  if (data.startsWith('item:')) {
    const storeId = data.replace('item:', '');
    const item = getStoredLink(storeId);
    if (!item) {
      return answerCallbackQuery(cqId, 'Link expired. Please search again.', true);
    }

    await answerCallbackQuery(cqId, 'Loading qualities...');
    return showItemDetails(chatId, item);
  }

  // Quality / Releases pagination
  if (data.startsWith('qpage:')) {
    const parts = data.replace('qpage:', '').split(':');
    const itemStoreId = parts[0];
    const targetPage = parseInt(parts[1], 10) || 1;

    const item = getStoredLink(itemStoreId);
    if (!item) return answerCallbackQuery(cqId, 'Session expired. Please search again.', true);

    await answerCallbackQuery(cqId);
    return showItemDetails(chatId, item, targetPage, messageId);
  }

  // Search Results pagination
  if (data.startsWith('spage:')) {
    const parts = data.replace('spage:', '').split(':');
    const searchStoreId = parts[0];
    const targetPage = parseInt(parts[1], 10) || 1;

    const searchData = getStoredLink(searchStoreId);
    if (!searchData) return answerCallbackQuery(cqId, 'Session expired. Please search again.', true);

    await answerCallbackQuery(cqId);
    const results = Array.isArray(searchData.link) ? searchData.link : [];
    const formatted = formatSearchResults(results, searchData.title, searchData.provider, targetPage, searchStoreId);

    return tgCall('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: formatted.text,
      parse_mode: 'HTML',
      reply_markup: formatted.keyboard
    });
  }

  // Episodes List for Series with pagination
  if (data.startsWith('eps:') || data.startsWith('epage:')) {
    let epGroupStoreId;
    let page = 1;

    if (data.startsWith('epage:')) {
      const parts = data.replace('epage:', '').split(':');
      epGroupStoreId = parts[0];
      page = parseInt(parts[1], 10) || 1;
    } else {
      epGroupStoreId = data.replace('eps:', '');
    }

    const groupData = getStoredLink(epGroupStoreId);
    if (!groupData) return answerCallbackQuery(cqId, 'Session expired. Please search again.', true);

    await answerCallbackQuery(cqId);

    const groupDataObj = typeof groupData.link === 'object' && !Array.isArray(groupData.link) ? groupData.link : null;
    const episodes = Array.isArray(groupData.link) ? groupData.link : (groupDataObj?.episodes || []);
    const allGroups = groupDataObj?.allGroups || [];
    const seriesTitle = groupDataObj?.seriesTitle || groupData.title;

    const pageSize = 18;
    const totalPages = Math.ceil(episodes.length / pageSize) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));

    let epText = `📺 <b>${escapeHtml(groupData.title)}</b>\n`;
    if (totalPages > 1) {
      epText += `📄 <b>Page ${currentPage} of ${totalPages}</b> (${episodes.length} Total Episodes)\n`;
    }
    epText += `\n<i>Select an Episode to choose Quality / Stream:</i>`;

    const keyboard = [];
    const startIndex = (currentPage - 1) * pageSize;
    const pageEpisodes = episodes.slice(startIndex, startIndex + pageSize);

    const chunkSize = 3;
    for (let i = 0; i < pageEpisodes.length; i += chunkSize) {
      const chunk = pageEpisodes.slice(i, i + chunkSize);
      const row = chunk.map((ep, idx) => {
        const epIndex = startIndex + i + idx;
        const epNum = epIndex + 1;
        const epTitle = ep.title || `Episode ${epNum}`;

        const altQualities = [];
        if (allGroups.length > 1) {
          for (const g of allGroups) {
            const dList = g.directLinks || [];
            if (dList.length > 0) {
              const matchedEp = dList[epIndex] || dList.find(d => {
                const num = (d.title || '').match(/\b(?:e|ep|episode)\s*(\d+)\b/i);
                return num && parseInt(num[1], 10) === epNum;
              });
              if (matchedEp && matchedEp.link) {
                altQualities.push({
                  quality: g.title || g.quality || 'Option',
                  link: matchedEp.link,
                  title: `${seriesTitle} - Ep ${epNum} [${g.title || g.quality || 'Option'}]`
                });
              }
            }
          }
        }

        if (altQualities.length > 1) {
          const epqStoreId = storeLink(groupData.provider, {
            epNum,
            seriesTitle,
            qualities: altQualities
          }, `${seriesTitle} - Ep ${epNum} Qualities`);
          return {
            text: `▶️ Ep ${epNum}`,
            callback_data: `epq:${epqStoreId}`
          };
        } else {
          const epStoreId = storeLink(groupData.provider, ep.link, `${groupData.title} - ${epTitle}`);
          return {
            text: `▶️ Ep ${epNum}`,
            callback_data: `resopt:${epStoreId}`
          };
        }
      });
      keyboard.push(row);
    }

    // Pagination navigation row for episodes
    if (totalPages > 1) {
      const navRow = [];
      if (currentPage > 1) {
        navRow.push({ text: '⬅️ Prev', callback_data: `epage:${epGroupStoreId}:${currentPage - 1}` });
      }
      navRow.push({ text: `Ep ${startIndex + 1}–${Math.min(startIndex + pageSize, episodes.length)}`, callback_data: 'noop' });
      if (currentPage < totalPages) {
        navRow.push({ text: 'Next ➡️', callback_data: `epage:${epGroupStoreId}:${currentPage + 1}` });
      }
      keyboard.push(navRow);
    }

    keyboard.push([
      { text: '🌐 Cinema Web', url: `${loadConfig().WEB_URL}` }
    ]);

    if (messageId && data.startsWith('epage:')) {
      return tgCall('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: epText,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    }

    return sendMessage(chatId, epText, { reply_markup: { inline_keyboard: keyboard } });
  }

  // Episode Quality Picker (epq:<epqStoreId>)
  if (data.startsWith('epq:')) {
    const epqStoreId = data.replace('epq:', '');
    const epqData = getStoredLink(epqStoreId);
    if (!epqData) return answerCallbackQuery(cqId, 'Session expired. Please search again.', true);
    await answerCallbackQuery(cqId);

    const info = epqData.link || {};
    const qualities = info.qualities || [];
    const epNum = info.epNum || 1;
    const seriesTitle = info.seriesTitle || epqData.title;

    let qText = `📺 <b>${escapeHtml(seriesTitle)} - Episode ${epNum}</b>\n\n`;
    qText += `<i>Select your preferred resolution/quality for this episode:</i>\n`;

    const keyboard = [];
    const qButtons = [];
    for (const q of qualities) {
      const qStoreId = storeLink(epqData.provider, q.link, q.title);
      const label = `⚡ ${(q.quality || 'Option').slice(0, 20)}`;
      qButtons.push({ text: label, callback_data: `resopt:${qStoreId}` });
    }

    for (let i = 0; i < qButtons.length; i += 2) {
      keyboard.push(qButtons.slice(i, i + 2));
    }

    keyboard.push([{ text: '🌐 Open in Cinema Web', url: `${loadConfig().WEB_URL}` }]);

    return sendMessage(chatId, qText, { reply_markup: { inline_keyboard: keyboard } });
  }

  // Quality or Episode selected -> Resolve all Stream & Download mirrors
  if (data.startsWith('resopt:')) {
    const qStoreId = data.replace('resopt:', '');
    const item = getStoredLink(qStoreId);
    if (!item) return answerCallbackQuery(cqId, 'Session expired. Please search again.', true);

    await answerCallbackQuery(cqId, 'Extracting mirrors...');
    await sendMessage(chatId, `⏳ Resolving high-speed mirrors for <b>"${escapeHtml(item.title)}"</b>...`);

    // Fetch mirrors using single fast request with download=true (returns all mirrors)
    let mirrors = await getStreams(item.link, item.provider, true);
    if (!mirrors || mirrors.length === 0) {
      mirrors = await getStreams(item.link, item.provider, false);
    }

    const uniqueMap = new Map();
    (mirrors || []).forEach((s) => {
      const url = s.link || s.url;
      if (url && typeof url === 'string' && url.startsWith('http') && !uniqueMap.has(url)) {
        uniqueMap.set(url, s);
      }
    });

    const validMirrors = Array.from(uniqueMap.values());

    if (validMirrors.length === 0) {
      return sendMessage(chatId, `⚠️ Could not extract mirrors on this specific server.\nTry choosing another quality option or switching providers.`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Switch Provider', callback_data: `swprov:${item.title.slice(0, 30)}` }]
          ]
        }
      });
    }

    let resMsg = `🎬 <b>${escapeHtml(item.title)}</b>\n`;
    resMsg += `🌐 <b>Provider:</b> ${escapeHtml(item.provider)}\n\n`;
    resMsg += `<i>Tap below to stream directly in VLC or download verified files:</i>\n`;

    const keyboard = [];
    validMirrors.slice(0, 5).forEach((m, idx) => {
      const sName = m.server || `Mirror ${idx + 1}`;
      const url = m.link || m.url;
      const vlcRedirectUrl = `${loadConfig().WEB_URL}/vlc/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(item.title)}`;

      keyboard.push([
        { text: `🎬 Open in VLC Player (${sName})`, url: vlcRedirectUrl }
      ]);
      if (isRealDownloadLink(url)) {
        keyboard.push([
          { text: `⬇️ Direct Download (${sName})`, url: url }
        ]);
      }
    });

    keyboard.push([
      { text: '🔄 Switch Provider', callback_data: `swprov:${item.title.slice(0, 30)}` },
      { text: '🌐 View on Web', url: `${loadConfig().WEB_URL}` }
    ]);

    return sendMessage(chatId, resMsg, { reply_markup: { inline_keyboard: keyboard } });
  }

  // Stream extraction with smart meta fallback
  if (data.startsWith('stream:')) {
    const storeId = data.replace('stream:', '');
    const item = getStoredLink(storeId);
    if (!item) return answerCallbackQuery(cqId, 'Expired session.', true);

    await answerCallbackQuery(cqId, 'Extracting streaming mirrors...');
    await sendMessage(chatId, `⏳ Extracting live stream for <b>"${escapeHtml(item.title)}"</b>...`);

    let targetLink = item.link;
    let streams = await getStreams(targetLink, item.provider, false);

    // If stream failed, try getting meta first
    if (!streams || streams.length === 0) {
      const meta = await getMeta(item.link, item.provider);
      const firstDirect = meta?.linkList?.[0]?.directLinks?.[0]?.link;
      if (firstDirect) {
        targetLink = firstDirect;
        streams = await getStreams(targetLink, item.provider, false);
      }
    }

    if (!streams || streams.length === 0) {
      return sendMessage(chatId, `⚠️ No direct stream found on <b>${escapeHtml(item.provider)}</b>.\nTry clicking <b>"Switch Provider"</b> to extract from another source.`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Switch Provider', callback_data: `swprov:${item.title.slice(0, 30)}` }]
          ]
        }
      });
    }

    let streamMsg = `▶️ <b>Playable Streams for:</b>\n<i>${escapeHtml(item.title)}</i>\n\n<i>Tap below to stream directly in VLC:</i>\n`;

    const keyboard = [];

    streams.slice(0, 5).forEach((s, i) => {
      const serverName = s.server || `Server ${i + 1}`;
      const streamUrl = s.link || s.url;
      if (streamUrl && streamUrl.startsWith('http')) {
        const vlcRedirectUrl = `${loadConfig().WEB_URL}/vlc/?url=${encodeURIComponent(streamUrl)}&title=${encodeURIComponent(item.title)}`;
        keyboard.push([
          { text: `🎬 Open in VLC Player (${serverName})`, url: vlcRedirectUrl }
        ]);
        if (isRealDownloadLink(streamUrl)) {
          keyboard.push([
            { text: `⬇️ Direct Download (${serverName})`, url: streamUrl }
          ]);
        }
      }
    });

    return sendMessage(chatId, streamMsg, { reply_markup: { inline_keyboard: keyboard } });
  }

  // Direct Download extraction with smart meta fallback
  if (data.startsWith('dl:')) {
    const storeId = data.replace('dl:', '');
    const item = getStoredLink(storeId);
    if (!item) return answerCallbackQuery(cqId, 'Expired session.', true);

    await answerCallbackQuery(cqId, 'Extracting download mirrors...');
    await sendMessage(chatId, `⏳ Extracting direct download mirrors for <b>"${escapeHtml(item.title)}"</b>...`);

    let targetLink = item.link;
    let dlStreams = await getStreams(targetLink, item.provider, true);

    // If download failed, try getting meta first
    if (!dlStreams || dlStreams.length === 0) {
      const meta = await getMeta(item.link, item.provider);
      const firstDirect = meta?.linkList?.[0]?.directLinks?.[0]?.link;
      if (firstDirect) {
        targetLink = firstDirect;
        dlStreams = await getStreams(targetLink, item.provider, true);
      }
    }

    const realDlStreams = (dlStreams || []).filter(s => isRealDownloadLink(s.link || s.url));

    if (realDlStreams.length === 0) {
      return sendMessage(chatId, `⚠️ <b>Direct browser download is restricted on this server</b> (anti-leech protection).\n\n💡 <b>What to do:</b>\n• Tap <b>"▶️ Stream / VLC Player"</b> to watch smoothly with zero buffering.\n• Or tap <b>"Switch Provider"</b> to pick <b>OlaMovies</b>, <b>HDHub4u</b>, or <b>Vega</b> for direct download files.`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '▶️ Stream / VLC Player', callback_data: `stream:${storeId}` }],
            [{ text: '🔄 Switch Extension', callback_data: `swprov:${item.title.slice(0, 30)}` }]
          ]
        }
      });
    }

    let dlMsg = `⬇️ <b>Verified Direct Download Mirrors for:</b>\n<i>${escapeHtml(item.title)}</i>\n\n`;
    const keyboard = [];

    realDlStreams.slice(0, 6).forEach((s, i) => {
      const serverName = s.server || `Mirror ${i + 1}`;
      const dlUrl = s.link || s.url;
      keyboard.push([
        { text: `💾 Download via ${serverName} (${s.quality || s.type || 'Direct'})`, url: dlUrl }
      ]);
    });

    return sendMessage(chatId, dlMsg, { reply_markup: { inline_keyboard: keyboard } });
  }

  // Switch Provider menu for a search
  if (data.startsWith('swprov:')) {
    const query = data.replace('swprov:', '').trim();
    await answerCallbackQuery(cqId);

    const cfg = loadConfig();
    const keyboard = [];
    const enabled = cfg.enabledProviders.slice(0, 16);

    for (let i = 0; i < enabled.length; i += 2) {
      const p1 = enabled[i];
      const p2 = enabled[i + 1];
      const row = [{ text: `🔍 ${p1}`, callback_data: `selprov:${p1}::${query}` }];
      if (p2) row.push({ text: `🔍 ${p2}`, callback_data: `selprov:${p2}::${query}` });
      keyboard.push(row);
    }

    return sendMessage(chatId, `🔄 <b>Select an Extension to search "${escapeHtml(query)}":</b>`, {
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Run search with selected provider
  if (data.startsWith('selprov:')) {
    const content = data.replace('selprov:', '');
    const [prov, query] = content.split('::');
    await answerCallbackQuery(cqId, `Searching on ${prov}...`);

    await sendMessage(chatId, `🔍 Searching <b>"${escapeHtml(query)}"</b> exclusively on <b>${escapeHtml(prov)}</b>...`);
    const results = await searchSingleProvider(query, prov);
    const formatted = formatSearchResults(results, query, prov);
    return sendMessage(chatId, formatted.text, { reply_markup: formatted.keyboard });
  }

  return answerCallbackQuery(cqId);
}

// Long-polling loop
async function startBotPolling() {
  if (botRunning) return;
  botRunning = true;
  console.log('🤖 Cinema Telegram Bot Polling started...');

  while (botRunning) {
    try {
      const cfg = loadConfig();
      const res = await axios.get(`https://api.telegram.org/bot${cfg.BOT_TOKEN}/getUpdates`, {
        params: {
          offset: lastUpdateId + 1,
          timeout: 25
        },
        timeout: 32000
      });

      const updates = res.data?.result || [];
      for (const update of updates) {
        lastUpdateId = Math.max(lastUpdateId, update.update_id);

        if (update.message) {
          handleMessage(update.message).catch((err) => console.error('Error handling message:', err.message));
        } else if (update.callback_query) {
          handleCallbackQuery(update.callback_query).catch((err) => console.error('Error handling callback_query:', err.message));
        }
      }
    } catch (err) {
      // Sleep a bit on network error before retrying
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = {
  startBotPolling,
  sendMessage,
  storeLink
};
