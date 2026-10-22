/**
 * Telegram Bot View Builders (Search Results, Item Details Card, Menus)
 * All "Open in Web" buttons permanently removed in favor of direct streaming and downloads.
 */

import { getBotProfile } from "./_botConfig.js";
import { storeLink, getUserBotSettings, getEnabledProviders } from "./_botDb.js";
import {
  escapeHtml,
  sanitizeCleanTitle,
  cleanMediaTitle,
  extractQualityBadges,
  extractCleanResolution,
  extractActualSeason,
  extractActualEpisode,
  formatCleanEpisodeTitle,
  formatPackButtonLabel,
  formatQualityButtonLabel,
  formatEpisodeButtonLabel,
  getProviderDisplayName,
  isSeriesItem
} from "./_botHelpers.js";
import { tgCall, sendOrEdit, callCinemaApi } from "./_botApi.js";

// Format Search Results with In-Place Pagination
export async function formatSearchResults(results, query, page = 1, db, existingStoreId = null, token = null) {
  if (!results || results.length === 0) {
    const profile = token ? getBotProfile(token) : null;
    const keyboard = [
      [{ text: '🔄 Switch Extension', callback_data: `swprov:${query.slice(0, 30)}` }]
    ];
    if (profile) {
      keyboard.push([{ text: `🌐 Search All in ${profile.name}`, callback_data: `search_all:${query.slice(0, 30)}` }]);
    }
    keyboard.push([{ text: '⚙️ Settings', callback_data: 'bot_settings' }]);

    return {
      text: `No results found for <b>"${escapeHtml(query)}"</b>.\n\n` +
        `<i>Try another keyword, switch extension, or search across all extensions in ${escapeHtml(profile?.name || 'this category')}:</i>`,
      keyboard: {
        inline_keyboard: keyboard
      }
    };
  }

  const pageSize = 8;
  const totalPages = Math.ceil(results.length / pageSize) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const searchStoreId = existingStoreId || (await storeLink(db, 'global', results, query));

  let text = `🔍 <b>Results for "${escapeHtml(query)}"</b>\n`;
  if (totalPages > 1) {
    text += `<b>Page ${currentPage} of ${totalPages}</b> (${results.length} total matches)\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `<i>Tap any title to view streaming qualities and episodes:</i>\n`;

  const keyboard = [];
  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = results.slice(startIndex, startIndex + pageSize);
  const seenLabels = new Map();

  for (let i = 0; i < pageItems.length; i++) {
    const item = pageItems[i];
    const prov = item.provider || 'default';
    const storeId = await storeLink(db, prov, item.link, item.title);
    const clean = sanitizeCleanTitle(item.title);
    const res = extractCleanResolution(item.title);
    const resTag = res ? ` • ${res}` : '';
    let baseLabel = `🎬 ${clean.slice(0, 24)}${clean.length > 24 ? '…' : ''}${resTag} [${prov}]`;
    
    let finalLabel = baseLabel;
    if (seenLabels.has(baseLabel)) {
      const count = seenLabels.get(baseLabel) + 1;
      seenLabels.set(baseLabel, count);
      finalLabel = `🎬 ${clean.slice(0, 20)}${clean.length > 20 ? '…' : ''}${resTag} (${count}) [${prov}]`;
    } else {
      seenLabels.set(baseLabel, 1);
    }
    keyboard.push([{ text: finalLabel, callback_data: `item:${storeId}` }]);
  }

  if (totalPages > 1) {
    const navRow = [];
    if (currentPage > 1) {
      navRow.push({ text: '⬅️ Prev', callback_data: `spage:${searchStoreId}:${currentPage - 1}` });
    }
    navRow.push({ text: `📄 Page ${currentPage}/${totalPages}`, callback_data: 'noop' });
    if (currentPage < totalPages) {
      navRow.push({ text: 'Next ➡️', callback_data: `spage:${searchStoreId}:${currentPage + 1}` });
    }
    keyboard.push(navRow);
  }

  keyboard.push([
    { text: '⚙️ Settings', callback_data: 'bot_settings' },
    { text: '🔄 Switch Extension', callback_data: `swprov:${query.slice(0, 30)}` }
  ]);

  return { text, keyboard: { inline_keyboard: keyboard } };
}

// Show Movie/Series Details Card with Quality Buttons
export async function showItemDetails(chatId, item, token, db, requestUrl, messageId = null, page = 1, itemStoreIdParam = null, loadMsgId = null) {
  let meta = null;
  const itemLinkObj = typeof item.link === 'object' && !Array.isArray(item.link) ? item.link : null;
  let actualLink = itemLinkObj?.url || (typeof item.link === 'string' ? item.link : null);

  if (itemLinkObj?.cachedMeta) {
    meta = itemLinkObj.cachedMeta;
  } else if (actualLink) {
    meta = await callCinemaApi(requestUrl, '/meta', { provider: item.provider, link: actualLink }, db);
  }

  let rawGroups = meta?.linkList || meta?.downloadLinks || meta?.episodes || [];

  // SMART FALLBACK: If rawGroups is empty, try quick search on category extensions
  if (!rawGroups || rawGroups.length === 0) {
    const rawSearchTitle = sanitizeCleanTitle(item.title || meta?.title || '');
    if (rawSearchTitle && rawSearchTitle.length > 2) {
      const profile = getBotProfile(token);
      for (const ext of profile.extensions) {
        if (ext.value.toLowerCase() !== (item.provider || '').toLowerCase()) {
          try {
            const sRes = await callCinemaApi(requestUrl, '/search', { provider: ext.value, q: rawSearchTitle }, db);
            if (Array.isArray(sRes) && sRes.length > 0) {
              const best = sRes[0];
              const bLink = typeof best.link === 'string' ? best.link : best.link?.url;
              if (bLink) {
                const mRes = await callCinemaApi(requestUrl, '/meta', { provider: ext.value, link: bLink }, db);
                const mGroups = mRes?.linkList || mRes?.downloadLinks || mRes?.episodes || [];
                if (Array.isArray(mGroups) && mGroups.length > 0) {
                  meta = mRes;
                  rawGroups = mGroups;
                  item.provider = ext.value;
                  actualLink = bLink;
                  break;
                }
              }
            }
          } catch (_) {}
        }
      }
    }
  }

  // Sort groups: prioritize Indian languages (Hindi, Dual, Tamil, Telugu), then Original, then English
  if (Array.isArray(rawGroups) && rawGroups.length > 1) {
    const getDubRank = (g) => {
      const text = `${g.title || ''} ${g.dub || ''} ${g.language || ''}`.toLowerCase();
      if (text.includes('hindi') || text.includes('dual')) return 1;
      if (text.includes('tamil') || text.includes('telugu') || text.includes('punjabi') || text.includes('malayalam')) return 2;
      if (text.includes('original') || text.includes('orig')) return 3;
      if (text.includes('english') || text.includes('eng')) return 4;
      return 10;
    };
    rawGroups.sort((a, b) => getDubRank(a) - getDubRank(b));
  }

  const { resolutions, audio } = extractQualityBadges(meta?.title || item.title, rawGroups);
  const cleanTitle = sanitizeCleanTitle(meta?.title || item.title);
  const yearStr = meta?.year ? ` (${meta.year})` : '';
  const ratingStr = meta?.rating ? `⭐ Rating: <b>${escapeHtml(meta.rating)}/10</b> • ` : '';
  const provDisplayName = getProviderDisplayName(item.provider);
  const posterUrl = meta?.poster || meta?.image || item.image || item.poster || null;

  let itemText = `🎬 <b>${escapeHtml(cleanTitle)}${yearStr}</b>\n`;
  itemText += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  itemText += `${ratingStr}🌐 Source: <b>${escapeHtml(provDisplayName)}</b>\n`;
  itemText += `🔊 Audio: ${escapeHtml(audio)}\n`;
  itemText += `💿 Releases: <code>${escapeHtml(resolutions)}</code>\n`;
  if (meta?.synopsis) {
    let syn = meta.synopsis.trim();
    if (syn.length > 180) syn = syn.slice(0, 177) + '…';
    itemText += `\n<i>${escapeHtml(syn)}</i>\n`;
  }
  itemText += `\n<i>Choose a quality or episode:</i>`;

  const keyboard = [];
  const isSeries = isSeriesItem(item, meta, rawGroups);

  if (rawGroups.length > 0) {
    const itemStoreId = itemStoreIdParam || (await storeLink(db, item.provider, {
      url: actualLink,
      cachedMeta: meta
    }, item.title));

    const seasonMap = new Map();
    let hasMultiSeason = false;

    if (isSeries) {
      for (const group of rawGroups) {
        const sNum = extractActualSeason(group.dub) || extractActualSeason(group.title);
        if (sNum !== null && sNum !== undefined) {
          if (!seasonMap.has(sNum)) seasonMap.set(sNum, []);
          seasonMap.get(sNum).push(group);
        }
      }
      if (seasonMap.size > 1) {
        hasMultiSeason = true;
      }
    }

    if (hasMultiSeason) {
      // Clustered Multi-Season Mode
      const sortedSeasonNums = Array.from(seasonMap.keys()).sort((a, b) => a - b);
      const pageSize = 12;
      const totalPages = Math.ceil(sortedSeasonNums.length / pageSize) || 1;
      const currentPage = Math.max(1, Math.min(page, totalPages));
      const startIndex = (currentPage - 1) * pageSize;
      const pageSeasons = sortedSeasonNums.slice(startIndex, startIndex + pageSize);

      const rowBatch = [];
      for (const sNum of pageSeasons) {
        const seasonGroups = seasonMap.get(sNum) || [];
        if (seasonGroups.length === 1 && (seasonGroups[0].directLinks?.length || 0) > 1) {
          const singleGroup = seasonGroups[0];
          const cleanBase = sanitizeCleanTitle(meta?.title || item.title);
          const groupStoredTitle = `${cleanBase} • Season ${sNum}`;
          const epGroupStoreId = await storeLink(db, item.provider, {
            episodes: singleGroup.directLinks,
            allGroups: rawGroups,
            groupTitle: singleGroup.title,
            seriesTitle: meta?.title || item.title,
            provider: item.provider
          }, groupStoredTitle);
          rowBatch.push({ text: `📺 Season ${sNum}`, callback_data: `eps:${epGroupStoreId}` });
        } else {
          const cleanBase = sanitizeCleanTitle(meta?.title || item.title);
          const sqStoreId = await storeLink(db, item.provider, {
            seasonNum: sNum,
            groups: seasonGroups,
            seriesTitle: meta?.title || item.title,
            itemStoreId: itemStoreId,
            provider: item.provider
          }, `${cleanBase} • Season ${sNum}`);
          rowBatch.push({ text: `📺 Season ${sNum}`, callback_data: `sq:${sqStoreId}` });
        }
      }

      for (let i = 0; i < rowBatch.length; i += 2) {
        keyboard.push(rowBatch.slice(i, i + 2));
      }

      if (totalPages > 1) {
        const navRow = [];
        if (currentPage > 1) navRow.push({ text: '⬅️ Prev', callback_data: `qpage:${itemStoreId}:${currentPage - 1}` });
        navRow.push({ text: `📄 Page ${currentPage}/${totalPages}`, callback_data: 'noop' });
        if (currentPage < totalPages) navRow.push({ text: 'Next ➡️', callback_data: `qpage:${itemStoreId}:${currentPage + 1}` });
        keyboard.push(navRow);
      }
    } else {
      // Standard Single-Season / Movie List
      const pageSize = 8;
      const totalPages = Math.ceil(rawGroups.length / pageSize) || 1;
      const currentPage = Math.max(1, Math.min(page, totalPages));
      const startIndex = (currentPage - 1) * pageSize;
      const pageItems = rawGroups.slice(startIndex, startIndex + pageSize);

      const rowBatch = [];
      for (let i = 0; i < pageItems.length; i++) {
        const group = pageItems[i];
        const dLinks = group.directLinks || [];
        const isPackGroup = group.quality === 'Pack' || /(full\s*season\s*packs?|season\s*packs?|batch\s*packs?|all\s*episodes\s*zip)/i.test(group.title || '');

        if (isPackGroup && dLinks.length > 0) {
          for (const pack of dLinks) {
            const cleanBase = sanitizeCleanTitle(meta?.title || item.title);
            const packSeason = extractActualSeason(group.dub) || extractActualSeason(group.title) || extractActualSeason(pack.title) || extractActualSeason(item.title);
            const sStr = packSeason ? `S${packSeason} ` : '';
            const pTitle = `${cleanBase} • ${sStr}Season Pack`;
            const pStoreId = await storeLink(db, item.provider, pack.link, pTitle);
            const pLabel = formatPackButtonLabel(`${group.title || ''} ${pack.title || ''}`);
            rowBatch.push({ text: `📦 ${pLabel}`, callback_data: `resopt:${pStoreId}` });
          }
        } else if (dLinks.length > 1) {
          const cleanBase = sanitizeCleanTitle(meta?.title || item.title);
          const seasonNum = extractActualSeason(group.dub) || extractActualSeason(group.title) || extractActualSeason(item.title);
          const sStr = seasonNum ? `Season ${seasonNum}` : (group.title || 'Episodes');
          const groupStoredTitle = `${cleanBase} • ${sStr}`;
          const epGroupStoreId = await storeLink(db, item.provider, {
            episodes: dLinks,
            allGroups: rawGroups,
            groupTitle: group.title,
            seriesTitle: meta?.title || item.title,
            provider: item.provider
          }, groupStoredTitle);
          const label = formatEpisodeButtonLabel(group.title, dLinks.length, group.quality, startIndex + i, group.dub || group.language || '');
          rowBatch.push({ text: `📺 ${label}`, callback_data: `eps:${epGroupStoreId}` });
        } else if (group.episodesLink) {
          const cleanBase = sanitizeCleanTitle(meta?.title || item.title);
          const seasonNum = extractActualSeason(group.dub) || extractActualSeason(group.title) || extractActualSeason(item.title);
          const sStr = seasonNum ? `Season ${seasonNum}` : (group.title || 'Episodes');
          const groupStoredTitle = `${cleanBase} • ${sStr}`;
          const epGroupStoreId = await storeLink(db, item.provider, {
            episodesLink: group.episodesLink,
            allGroups: rawGroups,
            groupTitle: group.title,
            seriesTitle: meta?.title || item.title,
            provider: item.provider
          }, groupStoredTitle);
          const label = formatEpisodeButtonLabel(group.title, 0, group.quality, startIndex + i, group.dub || group.language || '');
          rowBatch.push({ text: `📺 ${label}`, callback_data: `eps:${epGroupStoreId}` });
        } else if (isSeries) {
          const targetLink = dLinks[0]?.link || group.link || actualLink;
          const cleanBase = sanitizeCleanTitle(meta?.title || item.title);
          const epNum = extractActualEpisode(group.title) || extractActualEpisode(dLinks[0]?.title);
          const seasonNum = extractActualSeason(group.dub) || extractActualSeason(group.title) || extractActualSeason(item.title) || 1;
          const resLabel = extractCleanResolution(group.title || group.quality);
          if (epNum !== null && epNum !== undefined) {
            const epTitle = `${cleanBase} • S${seasonNum} Ep ${epNum}${resLabel ? ` [${resLabel}]` : ''}`;
            const epStoreId = await storeLink(db, item.provider, targetLink, epTitle);
            const epBtnLabel = resLabel ? `Ep ${epNum} [${resLabel}]` : `Ep ${epNum}`;
            rowBatch.push({ text: `▶️ ${epBtnLabel}`, callback_data: `resopt:${epStoreId}` });
          } else {
            const qLabel = formatQualityButtonLabel(group.title || group.quality, `Quality ${startIndex + i + 1}`);
            const qTitle = `${cleanBase} • S${seasonNum}${resLabel ? ` [${resLabel}]` : ''}`;
            const qStoreId = await storeLink(db, item.provider, targetLink, qTitle);
            rowBatch.push({ text: `⚡ ${qLabel}`, callback_data: `resopt:${qStoreId}` });
          }
        } else {
          const targetLink = dLinks[0]?.link || group.link || actualLink;
          const cleanBase = sanitizeCleanTitle(meta?.title || item.title);
          const resLabel = extractCleanResolution(group.title || group.quality);
          const qTitle = resLabel ? `${cleanBase} [${resLabel}]` : cleanBase;
          const qStoreId = await storeLink(db, item.provider, targetLink, qTitle);
          const label = formatQualityButtonLabel(group.title || group.quality, 'Play Movie');
          rowBatch.push({ text: `▶️ ${label}`, callback_data: `resopt:${qStoreId}` });
        }
      }

      for (let i = 0; i < rowBatch.length; i += 2) {
        keyboard.push(rowBatch.slice(i, i + 2));
      }

      if (totalPages > 1) {
        const navRow = [];
        if (currentPage > 1) navRow.push({ text: '⬅️ Prev', callback_data: `qpage:${itemStoreId}:${currentPage - 1}` });
        navRow.push({ text: `📄 Page ${currentPage}/${totalPages}`, callback_data: 'noop' });
        if (currentPage < totalPages) navRow.push({ text: 'Next ➡️', callback_data: `qpage:${itemStoreId}:${currentPage + 1}` });
        keyboard.push(navRow);
      }
    }
  } else {
    const cleanBase = sanitizeCleanTitle(meta?.title || item.title);
    if (isSeries) {
      itemText += `\n\n⚠️ <i>No streams or episodes currently found on <b>${escapeHtml(provDisplayName)}</b>. Tap below to switch extension:</i>`;
      keyboard.push([
        { text: '🔄 Switch Extension', callback_data: `swprov:${(cleanTitle || '').slice(0, 30)}` }
      ]);
    } else {
      const storeId = await storeLink(db, item.provider, actualLink, cleanBase);
      keyboard.push([{ text: `▶️ Play ${cleanBase.slice(0, 22)}`, callback_data: `resopt:${storeId}` }]);
    }
  }

  keyboard.push([
    { text: '⚙️ Settings', callback_data: 'bot_settings' },
    { text: '🔄 Switch Extension', callback_data: `swprov:${(cleanTitle || '').slice(0, 30)}` }
  ]);

  // If editing an existing message
  if (messageId) {
    const markupRes = await tgCall(token, 'editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: keyboard }
    });
    if (markupRes?.ok) return markupRes;

    const capRes = await tgCall(token, 'editMessageCaption', {
      chat_id: chatId,
      message_id: messageId,
      caption: itemText.slice(0, 1024),
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
    if (capRes?.ok) return capRes;

    return tgCall(token, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: itemText,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  let sendRes = null;
  // If item has a poster image, send photo card with poster
  if (posterUrl && (posterUrl.startsWith('http://') || posterUrl.startsWith('https://'))) {
    const photoRes = await tgCall(token, 'sendPhoto', {
      chat_id: chatId,
      photo: posterUrl,
      caption: itemText.slice(0, 1024),
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
    if (photoRes?.ok) {
      sendRes = photoRes;
      if (loadMsgId) {
        await tgCall(token, 'deleteMessage', { chat_id: chatId, message_id: loadMsgId }).catch(() => {});
      }
    }
  }

  // If photo card was not sent (or if no poster / photo failed), edit existing loadMsgId directly!
  if (!sendRes) {
    if (loadMsgId) {
      const editRes = await tgCall(token, 'editMessageText', {
        chat_id: chatId,
        message_id: loadMsgId,
        text: itemText,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
      if (editRes?.ok) {
        sendRes = editRes;
      }
    }

    if (!sendRes) {
      sendRes = await tgCall(token, 'sendMessage', {
        chat_id: chatId,
        text: itemText,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
      if (loadMsgId) {
        await tgCall(token, 'deleteMessage', { chat_id: chatId, message_id: loadMsgId }).catch(() => {});
      }
    }
  }

  return sendRes;
}

export async function renderSettingsMenu(chatId, token, db, userId, messageId = null) {
  const profile = getBotProfile(token);
  const settings = await getUserBotSettings(db, userId, profile.key, profile.defaultProvider);
  
  const activeExt = profile.extensions.find(e => e.value.toLowerCase() === (settings.active_provider || '').toLowerCase()) || profile.extensions[0];
  const isSearchAll = settings.search_mode === 'all';
  
  let text = `⚙️ <b>Extension & Search Settings</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🎬 Bot: <b>${escapeHtml(profile.name)}</b>\n`;
  text += `🧩 Active Extension: <code>${escapeHtml(activeExt?.name || settings.active_provider.toUpperCase())}</code>\n`;
  text += `🔍 Search Mode: ${isSearchAll ? `<b>🌐 All Extensions in ${escapeHtml(profile.name)}</b>` : `<b>🎯 Single (${escapeHtml(activeExt?.name)})</b>`}\n\n`;
  text += `<i>Tap below to switch extension or toggle search mode:</i>`;

  const keyboard = [];
  
  const toggleLabel = isSearchAll 
    ? '🎯 Switch to: Single Extension' 
    : `🌐 Search All in ${profile.name}`;
  keyboard.push([{ text: toggleLabel, callback_data: 'toggle_scope' }]);

  const extButtons = profile.extensions.map(ext => {
    const isSelected = ext.value.toLowerCase() === (settings.active_provider || '').toLowerCase();
    return {
      text: isSelected ? `✅ ${ext.name}` : `⚪ ${ext.name}`,
      callback_data: `set_ext:${ext.value}`
    };
  });

  for (let i = 0; i < extButtons.length; i += 2) {
    keyboard.push(extButtons.slice(i, i + 2));
  }

  keyboard.push([
    { text: '🔍 Search Movies / Series', switch_inline_query_current_chat: '' },
    { text: '🧩 Extensions Menu', callback_data: 'view_providers' }
  ]);

  return sendOrEdit(token, chatId, messageId, {
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: keyboard }
  });
}

export async function showProvidersMenu(chatId, userId, token, db, messageId = null, adminIds = []) {
  const isAdmin = adminIds.includes(userId);
  const enabled = await getEnabledProviders(db);
  const profile = getBotProfile(token);

  let text = `🧩 <b>Cinema Extensions & Scrapers (${profile.extensions.length} in ${profile.name})</b>\n\n`;
  text += `✅ = Enabled for searches | ⚪ = Disabled\n`;
  if (isAdmin) {
    text += `<i>👑 Admin: Tap any extension button below to toggle it on/off.</i>`;
  } else {
    text += `<i>Currently active extensions in this bot.</i>`;
  }

  const keyboard = [];
  for (let i = 0; i < profile.extensions.length; i += 2) {
    const row = [];
    const p1 = profile.extensions[i];
    const isEn1 = enabled.includes(p1.value);
    row.push({
      text: `${isEn1 ? '✅' : '⚪'} ${p1.name}`,
      callback_data: isAdmin ? `prov_toggle:${p1.value}` : 'noop'
    });

    if (i + 1 < profile.extensions.length) {
      const p2 = profile.extensions[i + 1];
      const isEn2 = enabled.includes(p2.value);
      row.push({
        text: `${isEn2 ? '✅' : '⚪'} ${p2.name}`,
        callback_data: isAdmin ? `prov_toggle:${p2.value}` : 'noop'
      });
    }
    keyboard.push(row);
  }

  keyboard.push([{ text: '⚙️ Settings', callback_data: 'bot_settings' }]);

  if (messageId) {
    return tgCall(token, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  return tgCall(token, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: keyboard }
  });
}
