/**
 * Telegram Bot Event Handlers (Messages & Callback Queries)
 */

import {
  ADMIN_IDS,
  DEFAULT_WEB_URL,
  RUNNER_LINKS,
  TELEGRAM_APP_FILES,
  VLC_GUIDE_TEXT,
  VLC_GUIDE_KEYBOARD,
  HELP_TEXT,
  HELP_KEYBOARD,
  getBotProfile
} from "./_botConfig.js";
import {
  storeLink,
  getStoredLink,
  getEnabledProviders,
  saveEnabledProviders,
  getUserBotSettings,
  setUserBotSettings
} from "./_botDb.js";
import {
  escapeHtml,
  sanitizeCleanTitle,
  cleanMediaTitle,
  extractActualSeason,
  extractCleanResolution,
  formatCleanEpisodeTitle,
  formatPackButtonLabel,
  formatQualityButtonLabel,
  formatEpisodeButtonLabel,
  formatStreamMirrorLabel,
  rankSearchResults
} from "./_botHelpers.js";
import { tgCall, sendOrEdit, callCinemaApi } from "./_botApi.js";
import {
  formatSearchResults,
  showItemDetails,
  renderSettingsMenu,
  showProvidersMenu
} from "./_botViews.js";
import { generateStreamCacheKey, getCachedStreams, setCachedStreams, isValidStreamResult } from "./_streamCache.js";

// In-memory debounce set to block duplicate webhook retries
const processedCallbacks = new Map();

export async function handleMessage(msg, token, db, requestUrl) {
  const chatId = msg.chat?.id;
  const userId = msg.from?.id;
  const text = (msg.text || '').trim();
  if (!chatId || !text) return;

  const isAdmin = ADMIN_IDS.includes(userId);

  // /start command
  if (text.startsWith('/start')) {
    const parts = text.split(' ');
    const param = parts[1];

    if (param) {
      // Direct channel post click: p_<storeId>_<provKey>_<title> or base64url payload
      if (param.startsWith('p_')) {
        const payload = param.slice(2);

        // 1. Try decoding base64url payload (legacy or direct URL payload: provKey___link)
        let b64Prov = null;
        let b64Link = null;
        try {
          let b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
          while (b64.length % 4) b64 += '=';
          const decoded = atob(b64);
          if (decoded && decoded.includes('___')) {
            const splitIdx = decoded.indexOf('___');
            b64Prov = decoded.slice(0, splitIdx);
            b64Link = decoded.slice(splitIdx + 3);
          }
        } catch (_) {}

        if (b64Prov && b64Link) {
          await tgCall(token, 'sendChatAction', { chat_id: chatId, action: 'upload_photo' });
          const loadingMsgRes = await tgCall(token, 'sendMessage', {
            chat_id: chatId,
            text: `⏳ Loading media details from <b>${escapeHtml(b64Prov)}</b>...`,
            parse_mode: 'HTML'
          });
          const loadingMsgId = loadingMsgRes?.result?.message_id;
          try {
            return await showItemDetails(chatId, { provider: b64Prov, link: b64Link, title: '' }, token, db, requestUrl, null, 1, null, loadingMsgId);
          } catch (err) {
            if (loadingMsgId) {
              await tgCall(token, 'editMessageText', {
                chat_id: chatId,
                message_id: loadingMsgId,
                text: `❌ Could not load media details. Please try typing the title directly.`,
                parse_mode: 'HTML'
              });
            }
            return;
          }
        }

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

        if (provKey) {
          const profile = getBotProfile(token);
          const isAllowed = profile.extensions.some(e => e.value.toLowerCase() === provKey.toLowerCase());
          if (isAllowed) {
            await setUserBotSettings(db, userId, profile.key, { active_provider: provKey });
          }
        }

        // Provide instant interactive loading feedback to the user
        await tgCall(token, 'sendChatAction', { chat_id: chatId, action: 'upload_photo' });
        const loadingMsgRes = await tgCall(token, 'sendMessage', {
          chat_id: chatId,
          text: `⏳ Loading media details from <b>${escapeHtml(provKey || 'extension')}</b>...`,
          parse_mode: 'HTML'
        });
        const loadingMsgId = loadingMsgRes?.result?.message_id;

        const item = await getStoredLink(db, storeId);
        if (item) {
          try {
            return await showItemDetails(chatId, item, token, db, requestUrl, null, 1, storeId, loadingMsgId);
          } catch (err) {
            console.error('showItemDetails error:', err);
            if (loadingMsgId) {
              await tgCall(token, 'editMessageText', {
                chat_id: chatId,
                message_id: loadingMsgId,
                text: `❌ Could not load media details. Please try typing the movie name directly.`,
                parse_mode: 'HTML'
              });
            }
            return;
          }
        }

        // Fallback: search exclusively on the extension that was clicked
        if (provKey && rawTitle) {
          if (loadingMsgId) {
            await tgCall(token, 'editMessageText', {
              chat_id: chatId,
              message_id: loadingMsgId,
              text: `🔍 Fetching <b>"${escapeHtml(rawTitle)}"</b> on <b>${escapeHtml(provKey)}</b>...`,
              parse_mode: 'HTML'
            });
          }
          try {
            const dataRes = await callCinemaApi(requestUrl, '/search', { provider: provKey, q: rawTitle }, db);
            let results = Array.isArray(dataRes) ? dataRes : [];

            // If primary provider returned empty, fallback search across other extensions in bot profile
            if (results.length === 0) {
              const profile = getBotProfile(token);
              for (const ext of profile.extensions) {
                if (ext.value.toLowerCase() !== provKey.toLowerCase()) {
                  try {
                    const fallbackRes = await callCinemaApi(requestUrl, '/search', { provider: ext.value, q: rawTitle }, db);
                    if (Array.isArray(fallbackRes) && fallbackRes.length > 0) {
                      results = fallbackRes;
                      break;
                    }
                  } catch (_) {}
                }
              }
            }

            if (results.length > 0) {
              try {
                return await showItemDetails(chatId, results[0], token, db, requestUrl, null, 1, null, loadingMsgId);
              } catch (detailErr) {
                console.error('showItemDetails error:', detailErr);
                if (loadingMsgId) {
                  await tgCall(token, 'editMessageText', {
                    chat_id: chatId,
                    message_id: loadingMsgId,
                    text: `⚠️ Could not parse item details. Please try typing the title directly.`,
                    parse_mode: 'HTML'
                  });
                }
                return;
              }
            }
            const formatted = await formatSearchResults(results, rawTitle, 1, db, null, token);
            if (loadingMsgId) {
              return await tgCall(token, 'editMessageText', {
                chat_id: chatId,
                message_id: loadingMsgId,
                text: formatted.text,
                parse_mode: 'HTML',
                reply_markup: formatted.keyboard
              });
            }
            return await tgCall(token, 'sendMessage', {
              chat_id: chatId,
              text: formatted.text,
              parse_mode: 'HTML',
              reply_markup: formatted.keyboard
            });
          } catch (searchErr) {
            if (loadingMsgId) {
              await tgCall(token, 'editMessageText', {
                chat_id: chatId,
                message_id: loadingMsgId,
                text: `⚠️ Search failed for "${escapeHtml(rawTitle)}". Please type the title directly.`,
                parse_mode: 'HTML'
              });
            }
            return;
          }
        }

        if (loadingMsgId) {
          await tgCall(token, 'editMessageText', {
            chat_id: chatId,
            message_id: loadingMsgId,
            text: `⚠️ Link expired or not found. Please type the movie name to search.`,
            parse_mode: 'HTML'
          });
        }
      }
    }

    const profile = getBotProfile(token);
    const settings = await getUserBotSettings(db, userId, profile.key, profile.defaultProvider);
    const activeExt = profile.extensions.find(e => e.value.toLowerCase() === (settings.active_provider || '').toLowerCase()) || profile.extensions[0];
    const isSearchAll = settings.search_mode === 'all';

    const welcomeText = `🎬 <b>Welcome to ${escapeHtml(profile.name)}!</b>\n\n` +
      `Stream and download movies & shows directly via VLC with zero buffering.\n\n` +
      `🎯 <b>Active Extension:</b> <code>${escapeHtml(activeExt?.name || settings.active_provider.toUpperCase())}</code>\n` +
      `🔍 <b>Search Scope:</b> ${isSearchAll ? `🌐 <b>All Extensions in ${escapeHtml(profile.name)}</b>` : `🎯 <b>Single Extension (${escapeHtml(activeExt?.name)})</b>`}\n\n` +
      `<i>Type any title to search, or configure your search scope below:</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔍 Search Movie / Show', switch_inline_query_current_chat: '' },
          { text: '⚙️ Extension Settings', callback_data: 'bot_settings' }
        ],
        [
          { text: '📖 VLC & Download Guide', callback_data: 'vlc_guide' },
          { text: '❓ Help & Commands', callback_data: 'help_guide' }
        ]
      ]
    };

    return tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: welcomeText,
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  // /settings or /extension or /scope or /providers
  if (
    text.startsWith('/settings') ||
    text.startsWith('/extension') ||
    text.startsWith('/scope') ||
    text.startsWith('/providers')
  ) {
    return renderSettingsMenu(chatId, token, db, userId);
  }

  // /help command
  if (text.startsWith('/help') || text === 'help') {
    return tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: HELP_TEXT,
      parse_mode: 'HTML',
      reply_markup: HELP_KEYBOARD
    });
  }

  // /vlc or /guide
  if (text.startsWith('/vlc') || text.startsWith('/guide')) {
    return tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: VLC_GUIDE_TEXT,
      parse_mode: 'HTML',
      reply_markup: VLC_GUIDE_KEYBOARD
    });
  }

  // /web command
  if (text.startsWith('/web') || text === 'web') {
    return tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: `🌐 <b>Cinema Web App:</b> <a href="${DEFAULT_WEB_URL}">${DEFAULT_WEB_URL}</a>\n\nStream movies & series 100% ad-free directly in your browser!`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '⚡ Runner APK', callback_data: 'send_file:android_runner' },
            { text: '📱 Cinema App', callback_data: 'send_file:android_app' }
          ]
        ]
      }
    });
  }

  // /runner or /apk or /app
  if (text.startsWith('/runner') || text.startsWith('/apk') || text.startsWith('/app')) {
    await tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: VLC_GUIDE_TEXT,
      parse_mode: 'HTML',
      reply_markup: VLC_GUIDE_KEYBOARD
    });
    return tgCall(token, 'sendDocument', {
      chat_id: chatId,
      document: TELEGRAM_APP_FILES.android_runner || RUNNER_LINKS.android_runner,
      caption: '⚡ <b>Cinema Node Runner APK (v2.2.1)</b>\n\nRaw installer file. Tap to install directly on Android!',
      parse_mode: 'HTML'
    });
  }

  // /toggle <provider> (Admin Only)
  if (text.startsWith('/toggle')) {
    if (!isAdmin) {
      return tgCall(token, 'sendMessage', { chat_id: chatId, text: '⛔ Admin only command.' });
    }
    const provName = text.replace(/^\/toggle\s*/i, '').trim();
    if (!provName) {
      return tgCall(token, 'sendMessage', { chat_id: chatId, text: '⚠️ Example: <code>/toggle vega</code>', parse_mode: 'HTML' });
    }
    const enabled = await getEnabledProviders(db);
    const idx = enabled.indexOf(provName);
    if (idx >= 0) {
      enabled.splice(idx, 1);
      await saveEnabledProviders(db, enabled);
      return tgCall(token, 'sendMessage', { chat_id: chatId, text: `✖️ Disabled: <b>${escapeHtml(provName)}</b>`, parse_mode: 'HTML' });
    } else {
      enabled.push(provName);
      await saveEnabledProviders(db, enabled);
      return tgCall(token, 'sendMessage', { chat_id: chatId, text: `✅ Enabled: <b>${escapeHtml(provName)}</b>`, parse_mode: 'HTML' });
    }
  }

  // /post_daily or /sync (Admin Only)
  if (text.startsWith('/post_daily') || text.startsWith('/sync')) {
    if (!isAdmin) {
      return tgCall(token, 'sendMessage', { chat_id: chatId, text: '⛔ Admin only command.' });
    }
    await tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: '🚀 Checking active extensions and posting new releases to channel...',
      parse_mode: 'HTML'
    });
    try {
      const { runAutoPoster } = await import('./auto-poster.js');
      const posterRes = await runAutoPoster({ cinema_db: db, BOT_TOKEN: token, CHANNEL_ID: '-1004363607477' }, requestUrl, true);
      const count = posterRes?.posted?.length || 0;
      let reply = `✅ <b>Posted ${count} release(s) to channel!</b>\n`;
      if (posterRes?.posted?.length > 0) {
        reply += posterRes.posted.map(p => `• 🎬 <b>${escapeHtml(p.title)}</b> [${escapeHtml(p.provider)}]`).join('\n');
      }
      return tgCall(token, 'sendMessage', { chat_id: chatId, text: reply, parse_mode: 'HTML' });
    } catch (e) {
      return tgCall(token, 'sendMessage', { chat_id: chatId, text: `❌ Failed to post: ${escapeHtml(e.message)}` });
    }
  }

  // /search <query> or Plain Text query
  let query = text;
  if (text.startsWith('/search')) {
    query = text.replace(/^\/search\s*/i, '').trim();
  }
  if (!query) return;

  const profile = getBotProfile(token);
  const settings = await getUserBotSettings(db, userId, profile.key, profile.defaultProvider);
  const isSearchAll = settings.search_mode === 'all';
  const activeExt = profile.extensions.find(e => e.value.toLowerCase() === (settings.active_provider || '').toLowerCase()) || profile.extensions[0];

  const searchMsgText = isSearchAll
    ? `🔍 Searching <b>"${escapeHtml(query)}"</b> across all extensions in <b>${escapeHtml(profile.name)}</b>...`
    : `🔍 Searching <b>"${escapeHtml(query)}"</b> on <b>${escapeHtml(activeExt?.name || settings.active_provider.toUpperCase())}</b>...`;

  const searchingRes = await tgCall(token, 'sendMessage', {
    chat_id: chatId,
    text: searchMsgText,
    parse_mode: 'HTML'
  });
  const searchMsgId = searchingRes?.result?.message_id;

  let results = [];

  if (!isSearchAll) {
    const prov = activeExt?.value || profile.defaultProvider;
    try {
      const data = await callCinemaApi(requestUrl, '/search', { provider: prov, q: query }, db);
      if (Array.isArray(data)) results = data;
    } catch (_) {}

    // If active single extension returned 0 results, check other extensions in this bot profile!
    if (results.length === 0 && profile.extensions.length > 1) {
      for (const ext of profile.extensions) {
        if (ext.value.toLowerCase() !== (prov || '').toLowerCase()) {
          try {
            const fallbackData = await callCinemaApi(requestUrl, '/search', { provider: ext.value, q: query }, db);
            if (Array.isArray(fallbackData) && fallbackData.length > 0) {
              results = fallbackData;
              break;
            }
          } catch (_) {}
        }
      }
    }
  } else {
    const searches = profile.extensions.map(ext =>
      callCinemaApi(requestUrl, '/search', { provider: ext.value, q: query }, db)
        .then(res => (Array.isArray(res) ? res : []))
        .catch(() => [])
    );
    const allRes = await Promise.all(searches);
    const seen = new Set();
    for (const list of allRes) {
      for (const item of list) {
        if (item && item.link) {
          const key = `${item.provider || ''}::${item.link}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push(item);
          }
        }
      }
    }
  }

  const ranked = rankSearchResults(results, query);
  const formatted = await formatSearchResults(ranked, query, 1, db, null, token);
  if (searchMsgId) {
    return tgCall(token, 'editMessageText', {
      chat_id: chatId,
      message_id: searchMsgId,
      text: formatted.text,
      parse_mode: 'HTML',
      reply_markup: formatted.keyboard
    });
  } else {
    return tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: formatted.text,
      parse_mode: 'HTML',
      reply_markup: formatted.keyboard
    });
  }
}

export async function handleCallbackQuery(cq, token, db, requestUrl) {
  const cqId = cq.id;
  const data = cq.data || '';
  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;
  const userId = cq.from?.id;

  // Acknowledge button immediately
  tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId }).catch(() => {});

  if (data === 'noop') {
    return;
  }

  // Retry debouncing within 2s
  const dedupeKey = `${userId}:${data}:${messageId || ''}`;
  const now = Date.now();
  if (processedCallbacks.has(dedupeKey) && (now - processedCallbacks.get(dedupeKey) < 2000)) {
    return;
  }
  processedCallbacks.set(dedupeKey, now);

  if (processedCallbacks.size > 2000) {
    const cutoff = now - 90000;
    for (const [k, v] of processedCallbacks.entries()) {
      if (v < cutoff) processedCallbacks.delete(k);
    }
  }

  if (data === 'vlc_guide') {
    return tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: VLC_GUIDE_TEXT,
      parse_mode: 'HTML',
      reply_markup: VLC_GUIDE_KEYBOARD
    });
  }

  if (data === 'help_guide') {
    return tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: HELP_TEXT,
      parse_mode: 'HTML',
      reply_markup: HELP_KEYBOARD
    });
  }

  if (data === 'view_providers') {
    return showProvidersMenu(chatId, userId, token, db, messageId, ADMIN_IDS);
  }

  if (data === 'bot_settings') {
    return renderSettingsMenu(chatId, token, db, userId, messageId);
  }

  // Toggle search scope between 'single' and 'all'
  if (data === 'toggle_scope') {
    const profile = getBotProfile(token);
    const current = await getUserBotSettings(db, userId, profile.key, profile.defaultProvider);
    const nextMode = current.search_mode === 'all' ? 'single' : 'all';
    await setUserBotSettings(db, userId, profile.key, { search_mode: nextMode });
    return renderSettingsMenu(chatId, token, db, userId, messageId);
  }

  // Set active extension for this bot
  if (data.startsWith('set_ext:')) {
    const prov = data.replace('set_ext:', '').trim();
    const profile = getBotProfile(token);
    await setUserBotSettings(db, userId, profile.key, { active_provider: prov, search_mode: 'single' });
    return renderSettingsMenu(chatId, token, db, userId, messageId);
  }

  // Direct raw APK file push into chat
  if (data.startsWith('send_file:')) {
    const fileType = data.replace('send_file:', '');
    let fileDoc = TELEGRAM_APP_FILES[fileType] || RUNNER_LINKS[fileType];
    let caption = '⚡ <b>Cinema Node Runner APK (v2.2.1)</b>\n\nRaw installer file. Keeps background scrapers active 24/7 on Android!';
    if (fileType === 'android_app') {
      fileDoc = TELEGRAM_APP_FILES.android_app || RUNNER_LINKS.android_app;
      caption = '📱 <b>Cinema Mobile App APK</b>\n\nRaw installer file. Tap to install directly and stream ad-free!';
    } else if (fileType === 'web_app') {
      fileDoc = TELEGRAM_APP_FILES.web_app;
      caption = '🌐 <b>Cinema Web App APK</b>\n\nDirect progressive web container for Android!';
    }

    return tgCall(token, 'sendDocument', {
      chat_id: chatId,
      document: fileDoc,
      caption,
      parse_mode: 'HTML'
    });
  }

  // Admin toggle provider
  if (data.startsWith('prov_toggle:')) {
    if (!ADMIN_IDS.includes(userId)) {
      return tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId, text: '⛔ Admin only action.', show_alert: true });
    }
    const provKey = data.replace('prov_toggle:', '');
    const enabled = await getEnabledProviders(db);
    const idx = enabled.indexOf(provKey);
    if (idx >= 0) enabled.splice(idx, 1);
    else enabled.push(provKey);
    await saveEnabledProviders(db, enabled);
    return showProvidersMenu(chatId, userId, token, db, messageId, ADMIN_IDS);
  }

  // Movie item clicked from search results -> Open qualities as a NEW photo card below
  if (data.startsWith('item:')) {
    const storeId = data.replace('item:', '');
    const item = await getStoredLink(db, storeId);
    if (!item) {
      return tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId, text: 'Session expired. Search again.', show_alert: true });
    }
    await tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId, text: '⚡ Loading media details...' });
    await tgCall(token, 'sendChatAction', { chat_id: chatId, action: 'upload_photo' });

    try {
      return await showItemDetails(chatId, item, token, db, requestUrl, null, 1, storeId);
    } catch (err) {
      console.error('item click showItemDetails error:', err);
      const cleanTitle = cleanMediaTitle(item.title);
      return tgCall(token, 'sendMessage', {
        chat_id: chatId,
        text: `⚠️ Could not load media details for <b>${escapeHtml(cleanTitle)}</b>.\n\n` +
              `<i>Tap below to switch extension or retry:</i>`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Switch Extension', callback_data: `swprov:${cleanTitle.slice(0, 30)}` }],
            [{ text: '⚙️ Settings', callback_data: 'bot_settings' }]
          ]
        }
      });
    }
  }

  // Search Results Pagination: spage:<searchStoreId>:<page>
  if (data.startsWith('spage:')) {
    const parts = data.replace('spage:', '').split(':');
    const searchStoreId = parts[0];
    const page = parseInt(parts[1], 10) || 1;

    const storedSearch = await getStoredLink(db, searchStoreId);
    if (!storedSearch) {
      return tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId, text: 'Session expired. Please search again.', show_alert: true });
    }

    const results = Array.isArray(storedSearch.link) ? storedSearch.link : [];
    const formatted = await formatSearchResults(results, storedSearch.title, page, db, searchStoreId, token);
    return tgCall(token, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: formatted.text,
      parse_mode: 'HTML',
      reply_markup: formatted.keyboard
    });
  }

  // Switch Extension Menu (Category-scoped)
  if (data.startsWith('swprov:')) {
    const rawQuery = data.replace('swprov:', '').trim();
    const query = sanitizeCleanTitle(rawQuery, 'Content');
    const profile = getBotProfile(token);
    const settings = await getUserBotSettings(db, userId, profile.key, profile.defaultProvider);
    
    const keyboard = [];
    keyboard.push([{
      text: `🌐 Search All in ${profile.name}`,
      callback_data: `search_all:${query.slice(0, 30)}`
    }]);

    const extButtons = profile.extensions.map(ext => {
      const isSelected = ext.value.toLowerCase() === (settings.active_provider || '').toLowerCase();
      return {
        text: isSelected ? `✓ ${ext.name}` : ext.name,
        callback_data: `sprov:${query.slice(0, 25)}:${ext.value}`
      };
    });

    for (let i = 0; i < extButtons.length; i += 2) {
      keyboard.push(extButtons.slice(i, i + 2));
    }

    keyboard.push([{ text: '⚙️ Settings', callback_data: 'bot_settings' }]);

    return sendOrEdit(token, chatId, messageId, {
      text: `<b>Select Extension for "${escapeHtml(query)}"</b>\n\n` +
            `Category: <b>${escapeHtml(profile.name)}</b>\n` +
            `<i>Choose an extension to search and switch your active provider:</i>`,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Search single provider
  if (data.startsWith('sprov:')) {
    const parts = data.replace('sprov:', '').split(':');
    const rawQuery = parts[0];
    const query = sanitizeCleanTitle(rawQuery, 'Content');
    const prov = parts[1];
    
    const profile = getBotProfile(token);
    await setUserBotSettings(db, userId, profile.key, { active_provider: prov, search_mode: 'single' });
    const extObj = profile.extensions.find(e => e.value.toLowerCase() === (prov || '').toLowerCase());
    const extDisplayName = extObj?.name || (prov ? prov.toUpperCase() : 'Extension');

    await sendOrEdit(token, chatId, messageId, {
      text: `Searching <b>"${escapeHtml(query)}"</b> on <b>${escapeHtml(extDisplayName)}</b>...`,
      parse_mode: 'HTML'
    });

    let results = [];
    try {
      const dataRes = await callCinemaApi(requestUrl, '/search', { provider: prov, q: query }, db);
      if (Array.isArray(dataRes)) results = dataRes;
    } catch (_) {}

    const ranked = rankSearchResults(results, query);
    const formatted = await formatSearchResults(ranked, query, 1, db, null, token);
    return sendOrEdit(token, chatId, messageId, {
      text: formatted.text,
      parse_mode: 'HTML',
      reply_markup: formatted.keyboard
    });
  }

  // Search all providers in current bot category
  if (data.startsWith('search_all:')) {
    const rawQuery = data.replace('search_all:', '').trim();
    const query = sanitizeCleanTitle(rawQuery, 'Content');
    const profile = getBotProfile(token);
    await setUserBotSettings(db, userId, profile.key, { search_mode: 'all' });

    await sendOrEdit(token, chatId, messageId, {
      text: `Searching <b>"${escapeHtml(query)}"</b> across all in <b>${escapeHtml(profile.name)}</b>...`,
      parse_mode: 'HTML'
    });

    const searches = profile.extensions.map(ext =>
      callCinemaApi(requestUrl, '/search', { provider: ext.value, q: query }, db)
        .then(res => (Array.isArray(res) ? res : []))
        .catch(() => [])
    );
    const allRes = await Promise.all(searches);
    let results = [];
    const seen = new Set();
    for (const list of allRes) {
      for (const item of list) {
        if (item && item.link) {
          const key = `${item.provider || ''}::${item.link}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push(item);
          }
        }
      }
    }

    const ranked = rankSearchResults(results, query);
    const formatted = await formatSearchResults(ranked, query, 1, db, null, token);
    return sendOrEdit(token, chatId, messageId, {
      text: formatted.text,
      parse_mode: 'HTML',
      reply_markup: formatted.keyboard
    });
  }

  // Quality Pagination: qpage:<itemStoreId>:<page>
  if (data.startsWith('qpage:')) {
    const parts = data.replace('qpage:', '').split(':');
    const itemStoreId = parts[0];
    const page = parseInt(parts[1], 10) || 1;
    const item = await getStoredLink(db, itemStoreId);
    if (!item) {
      return tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId, text: 'Session expired. Search again.', show_alert: true });
    }
    return showItemDetails(chatId, item, token, db, requestUrl, messageId, page, itemStoreId);
  }

  // Season Quality / Options Picker: sq:<sqStoreId>
  if (data.startsWith('sq:')) {
    const sqStoreId = data.replace('sq:', '');
    const sqData = await getStoredLink(db, sqStoreId);
    if (!sqData) {
      return tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId, text: 'Session expired.', show_alert: true });
    }

    const info = sqData.link || {};
    const seasonNum = info.seasonNum || 1;
    let seasonGroups = [...(info.groups || [])];
    const seriesTitle = info.seriesTitle || sqData.title;
    const cleanSeries = sanitizeCleanTitle(seriesTitle);

    seasonGroups.sort((a, b) => {
      const getScore = (g) => {
        const t = `${g.title || ''} ${g.dub || ''} ${g.language || ''}`.toLowerCase();
        if (t.includes('hindi') || t.includes('dual')) return 1;
        if (t.includes('tamil') || t.includes('telugu') || t.includes('punjabi') || t.includes('malayalam')) return 2;
        if (t.includes('original') || t.includes('orig') || t.includes('english') || t.includes('eng')) return 3;
        return 10;
      };
      return getScore(a) - getScore(b);
    });

    let text = `🎬 <b>${escapeHtml(cleanSeries)} • Season ${seasonNum}</b>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `<i>Choose your preferred resolution/quality for Season ${seasonNum}:</i>`;

    const keyboard = [];
    const rowBatch = [];

    for (let i = 0; i < seasonGroups.length; i++) {
      const group = seasonGroups[i];
      const dLinks = group.directLinks || [];
      const isPackGroup = group.quality === 'Pack' || /(full\s*season\s*packs?|season\s*packs?|batch\s*packs?|all\s*episodes\s*zip)/i.test(group.title || '');

      if (isPackGroup && dLinks.length > 0) {
        for (const pack of dLinks) {
          const pTitle = `${cleanSeries} • S${seasonNum} Season Pack`;
          const pStoreId = await storeLink(db, sqData.provider, pack.link, pTitle);
          const pLabel = formatPackButtonLabel(`${group.title || ''} ${pack.title || ''}`);
          rowBatch.push({ text: `📦 ${pLabel}`, callback_data: `resopt:${pStoreId}` });
        }
      } else if (dLinks.length > 1) {
        const epGroupStoreId = await storeLink(db, sqData.provider, {
          episodes: dLinks,
          groupTitle: group.title,
          seriesTitle: seriesTitle,
          provider: sqData.provider
        }, `${cleanSeries} • Season ${seasonNum}`);
        const label = formatEpisodeButtonLabel(group.title, dLinks.length, group.quality, i, group.dub || group.language || '');
        rowBatch.push({ text: `📺 ${label}`, callback_data: `eps:${epGroupStoreId}` });
      } else if (group.episodesLink) {
        const epGroupStoreId = await storeLink(db, sqData.provider, {
          episodesLink: group.episodesLink,
          groupTitle: group.title,
          seriesTitle: seriesTitle,
          provider: sqData.provider
        }, `${cleanSeries} • Season ${seasonNum}`);
        const label = formatEpisodeButtonLabel(group.title, 0, group.quality, i, group.dub || group.language || '');
        rowBatch.push({ text: `📺 ${label}`, callback_data: `eps:${epGroupStoreId}` });
      } else {
        const targetLink = dLinks[0]?.link || group.link;
        const resLabel = extractCleanResolution(group.title || group.quality);
        const epTitle = `${cleanSeries} • S${seasonNum}${resLabel ? ` [${resLabel}]` : ''}`;
        const epStoreId = await storeLink(db, sqData.provider, targetLink, epTitle);
        const qLabel = formatQualityButtonLabel(group.title || group.quality, `Quality ${i + 1}`);
        rowBatch.push({ text: `⚡ ${qLabel}`, callback_data: `resopt:${epStoreId}` });
      }
    }

    for (let i = 0; i < rowBatch.length; i += 2) {
      keyboard.push(rowBatch.slice(i, i + 2));
    }

    const navRow = [];
    if (info.itemStoreId) {
      navRow.push({ text: '⬅️ All Seasons', callback_data: `item:${info.itemStoreId}` });
    }
    keyboard.push(navRow);

    return tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Episodes Pagination: eps:<storeId> or epage:<storeId>:<page>
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

    const groupData = await getStoredLink(db, epGroupStoreId);
    if (!groupData) {
      return tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId, text: 'Session expired.', show_alert: true });
    }

    const groupDataObj = typeof groupData.link === 'object' && !Array.isArray(groupData.link) ? groupData.link : null;
    let episodes = Array.isArray(groupData.link) ? groupData.link : (groupDataObj?.episodes || []);
    const seriesTitle = groupDataObj?.seriesTitle || groupData.title;
    const groupSubTitle = groupDataObj?.groupTitle || '';

    let loaderMsgId = null;
    if (data.startsWith('eps:')) {
      const epTitle = sanitizeCleanTitle(seriesTitle || 'Series');
      const loadRes = await tgCall(token, 'sendMessage', {
        chat_id: chatId,
        text: `<b>Loading Episodes...</b>\n` +
          `<b>${escapeHtml(epTitle)}</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `<code>[■■■■■□□□□□] 50%</code>\n\n` +
          `<i>Fetching episode list...</i>`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: 'Fetching Episodes • 50%', callback_data: 'noop' }]]
        }
      });
      loaderMsgId = loadRes?.result?.message_id;
    }

    if (episodes.length === 0 && groupDataObj?.episodesLink) {
      await tgCall(token, 'sendChatAction', { chat_id: chatId, action: 'typing' });
      const fetchedEps = await callCinemaApi(requestUrl, '/episodes', {
        provider: groupData.provider,
        url: groupDataObj.episodesLink
      }, db);
      if (Array.isArray(fetchedEps) && fetchedEps.length > 0) {
        episodes = fetchedEps;
        groupDataObj.episodes = fetchedEps;
        await storeLink(db, groupData.provider, groupDataObj, groupData.title);
      }
    }

    if (episodes.length === 0) {
      const noEpText = `<b>Could not load episode list.</b>\n\n<i>Please tap below to retry, or try another extension:</i>`;
      const noEpMarkup = {
        inline_keyboard: [
          [{ text: '🔄 Retry Loading Episodes', callback_data: `eps:${epGroupStoreId}` }],
          [{ text: '🔄 Switch Extension', callback_data: `swprov:${(seriesTitle || '').slice(0, 30)}` }]
        ]
      };
      return sendOrEdit(token, chatId, loaderMsgId, {
        text: noEpText,
        parse_mode: 'HTML',
        reply_markup: noEpMarkup
      });
    }

    const pageSize = 18;
    const totalPages = Math.ceil(episodes.length / pageSize) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));

    const cleanSeries = sanitizeCleanTitle(seriesTitle);
    const seasonNum = extractActualSeason(groupSubTitle) || extractActualSeason(groupData.title);
    const resLabel = extractCleanResolution(groupSubTitle);

    let epHeader = cleanSeries;
    if (seasonNum) epHeader += ` • Season ${seasonNum}`;
    if (resLabel) epHeader += ` [${resLabel}]`;

    let epText = `<b>${escapeHtml(epHeader)}</b>\n`;
    if (totalPages > 1) {
      epText += `<b>Page ${currentPage} of ${totalPages}</b> (${episodes.length} Episodes)\n`;
    }
    epText += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    epText += `<i>Select an Episode to play or download:</i>`;

    const keyboard = [];
    const startIndex = (currentPage - 1) * pageSize;
    const pageEpisodes = episodes.slice(startIndex, startIndex + pageSize);

    for (let i = 0; i < pageEpisodes.length; i += 3) {
      const chunk = pageEpisodes.slice(i, i + 3);
      const row = [];
      for (let j = 0; j < chunk.length; j++) {
        const ep = chunk[j];
        const epNum = startIndex + i + j + 1;
        const epTitle = ep.title || `Episode ${epNum}`;

        const cleanEpTitle = formatCleanEpisodeTitle(seriesTitle, groupSubTitle || groupData.title, epTitle, epNum);
        const epStoreId = await storeLink(db, groupData.provider, ep.link, cleanEpTitle);
        row.push({ text: `▶️ Ep ${epNum}`, callback_data: `resopt:${epStoreId}` });
      }
      keyboard.push(row);
    }

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

    if (loaderMsgId) {
      return tgCall(token, 'editMessageText', {
        chat_id: chatId,
        message_id: loaderMsgId,
        text: epText,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    }

    if (messageId && data.startsWith('epage:')) {
      return tgCall(token, 'editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: epText,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    }

    return tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: epText,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Quality or Episode Selected -> Extract Stream & Download Mirrors
  if (data.startsWith('resopt:')) {
    const qStoreId = data.replace('resopt:', '');
    const item = await getStoredLink(db, qStoreId);
    if (!item) {
      return tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId, text: 'Session expired.', show_alert: true });
    }

    await tgCall(token, 'sendChatAction', { chat_id: chatId, action: 'upload_document' });

    const cleanTitle = sanitizeCleanTitle(item.title);
    const mediaType = item.type || (/episode|season|\bs\d+/i.test(item.title) ? 'series' : 'movie');
    let targetLink = item.link;
    if (typeof targetLink === 'object' && targetLink !== null) {
      targetLink = JSON.stringify(targetLink);
    }

    // ⚡ 50ms Edge Stream Cache Lookup
    const directCacheKey = await generateStreamCacheKey(item.provider, targetLink, mediaType, false, cleanTitle);
    const cachedDirect = await getCachedStreams({ cinema_db: db }, directCacheKey);
    let mirrors = null;
    let waitMsgId = null;
    let isInstantCache = false;

    if (cachedDirect && isValidStreamResult(cachedDirect.streams)) {
      mirrors = cachedDirect.streams;
      isInstantCache = true;
    } else {
      const initialLoader = `<b>Resolving Stream Links...</b>\n` +
        `<b>${escapeHtml(cleanTitle)}</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>[■■■□□□□□□□] 30%</code>\n\n` +
        `<i>Contacting resolver nodes &amp; mirrors...</i>`;

      const waitMsg = await tgCall(token, 'sendMessage', {
        chat_id: chatId,
        text: initialLoader,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: 'Resolving Sources • 30%', callback_data: 'noop' }]]
        }
      });
      waitMsgId = waitMsg?.result?.message_id;

      // 🚀 Fire both stream modes in parallel — merge results, prefer streaming links
      const [streamRes, dlRes] = await Promise.all([
        callCinemaApi(requestUrl, '/streams', { provider: item.provider, link: targetLink, type: mediaType, download: false, title: cleanTitle }, db).catch(() => null),
        callCinemaApi(requestUrl, '/streams', { provider: item.provider, link: targetLink, type: mediaType, download: true, title: cleanTitle }, db).catch(() => null)
      ]);
      const seen = new Set();
      mirrors = [];
      for (const list of [streamRes, dlRes]) {
        for (const m of (list || [])) {
          const u = m?.link || m?.url;
          if (u && typeof u === 'string' && u.startsWith('http') && !seen.has(u)) {
            seen.add(u);
            mirrors.push(m);
          }
        }
      }
    }

    const uniqueMap = new Map();
    (mirrors || []).forEach(s => {
      const u = s.link || s.url;
      if (u && typeof u === 'string' && u.startsWith('http') && !uniqueMap.has(u)) {
        uniqueMap.set(u, s);
      }
    });

    const validMirrors = Array.from(uniqueMap.values());

    if (!isInstantCache && isValidStreamResult(validMirrors)) {
      setCachedStreams({ cinema_db: db }, directCacheKey, validMirrors, cleanTitle, item.provider).catch(() => {});
    }

    if (validMirrors.length === 0) {
      const botProfile = getBotProfile(token);
      const errText = `<b>Unable to open stream right now.</b>\n\n` +
            `<b>${escapeHtml(cleanTitle)}</b>\n` +
            `<i>The link did not respond in time or provider has no direct stream node.</i>\n\n` +
            `Please tap retry or switch extensions:`;
      const errMarkup = {
        inline_keyboard: [
          [
            { text: '🔄 Retry', callback_data: `resopt:${qStoreId}` },
            { text: '🔄 Switch Extension', callback_data: `swprov:${(cleanTitle || '').slice(0, 30)}` }
          ],
          [
            { text: `🌐 Search in ${botProfile.name}`, callback_data: `search_all:${(cleanTitle || '').slice(0, 30)}` }
          ]
        ]
      };

      return sendOrEdit(token, chatId, waitMsgId, {
        text: errText,
        parse_mode: 'HTML',
        reply_markup: errMarkup
      });
    }

    let resMsg = `🎬 <b>${escapeHtml(cleanTitle)}</b>\n`;
    resMsg += `🌐 Source: <b>${escapeHtml(item.provider ? item.provider.toUpperCase() : 'CINEMA')}</b>\n`;
    resMsg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    resMsg += isInstantCache ? `<code>[■■■■■■■■■■] 100% Ready (⚡ 50ms Edge Cache)</code>\n\n` : `<code>[■■■■■■■■■■] 100% Ready</code>\n\n`;

    const uniqueMirrors = [];
    const seenDedupe = new Set();
    const seenNames = new Set();

    validMirrors.forEach((m) => {
      const url = m.link || m.url;
      if (!url || typeof url !== 'string' || !url.startsWith('http')) return;

      let dedupeKey = url;
      if (url.includes('pixeldrain.com') || url.includes('pixeldrain.dev')) {
        const pdId = url.split('/file/')[1]?.split('?')[0] || url.split('/u/')[1]?.split('?')[0];
        if (pdId) dedupeKey = `pixeldrain:${pdId}`;
      } else if (url.includes('drive.google.com') || url.includes('googleusercontent')) {
        const gdId = url.match(/[-\w]{25,}/)?.[0];
        if (gdId) dedupeKey = `gdrive:${gdId}`;
      }

      if (seenDedupe.has(dedupeKey)) return;
      seenDedupe.add(dedupeKey);

      const baseLabel = formatStreamMirrorLabel(m, cleanTitle);
      let sName = baseLabel;
      if (seenNames.has(sName)) {
        let counter = 2;
        while (seenNames.has(`${baseLabel} (${counter})`)) {
          counter++;
        }
        sName = `${baseLabel} (${counter})`;
      }
      seenNames.add(sName);

      uniqueMirrors.push({
        sName,
        url,
        server: m.server
      });
    });

    if (uniqueMirrors.length > 0) {
      resMsg += `<b>Available Mirrors:</b>\n`;
      uniqueMirrors.slice(0, 4).forEach((m, idx) => {
        resMsg += `• <b>Option ${idx + 1}:</b> <code>${escapeHtml(m.sName)}</code>\n`;
      });
      resMsg += `\n<i>Choose your preferred option below to play in VLC or download:</i>\n`;
    }

    const keyboard = [];
    uniqueMirrors.slice(0, 4).forEach((m) => {
      const vlcRedirectUrl = `${DEFAULT_WEB_URL}/vlc/?url=${encodeURIComponent(m.url)}&title=${encodeURIComponent(cleanTitle)}`;
      let dlUrl = m.url;
      if (dlUrl.includes('pixeldrain.dev/api/file/') || dlUrl.includes('pixeldrain.com/api/file/')) {
        const t = dlUrl.split('/file/')[1]?.split('?')[0];
        if (t) dlUrl = `https://pixeldrain.com/u/${t}`;
      } else if (/(hakunaymatata\.com|moviebox|inmoviebox|aoneroom|sssrr\.org)/i.test(dlUrl)) {
        dlUrl = `${DEFAULT_WEB_URL}/api/download?url=${encodeURIComponent(dlUrl)}&filename=${encodeURIComponent(cleanTitle.replace(/[^\w\s.-]/g, '') + '.mp4')}`;
      }

      keyboard.push([
        { text: `🎬 VLC (${m.sName})`, url: vlcRedirectUrl },
        { text: `📥 Download`, url: dlUrl }
      ]);
    });

    keyboard.push([
      { text: '🔄 Switch Extension', callback_data: `swprov:${(cleanTitle || '').slice(0, 30)}` },
      { text: '⚙️ Settings', callback_data: 'bot_settings' }
    ]);

    return sendOrEdit(token, chatId, waitMsgId, {
      text: resMsg,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  return tgCall(token, 'answerCallbackQuery', { callback_query_id: cqId });
}
