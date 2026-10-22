/**
 * Telegram Bot String Formatting, Badges & Parser Helpers
 */

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function extractActualSeason(str) {
  if (!str) return null;
  const s = String(str);

  // 1. Direct prefix match (e.g. "Season 8 [ORG...]", "S07 1080p...") - not a range
  const startMatch = s.match(/^\s*(?:season\s*(\d{1,2})|s(\d{1,2}))\b(?!\s*[-+–—]\s*\d)/i);
  if (startMatch) return parseInt(startMatch[1] || startMatch[2], 10);

  // 2. Look for season marker after standard delimiters (e.g. " - Season 2", " | S3", " [Season 4]")
  const afterSepParts = s.split(/[-:|–—\[\]()]/).filter(Boolean);
  for (let i = afterSepParts.length - 1; i >= 0; i--) {
    const part = afterSepParts[i].trim();
    if (/1\s*[-+–—]\s*[2-9]/i.test(part) || /[1-9]\s*\+\s*[1-9]/i.test(part)) continue;
    const m = part.match(/\b(?:season\s*(\d{1,2})|s(\d{1,2}))\b/i);
    if (m) {
      return parseInt(m[1] || m[2], 10);
    }
  }

  // 3. Fallback: match all seasons, check if last one is not a range
  const allMatches = [...s.matchAll(/\b(?:season\s*(\d{1,2})|s(\d{1,2}))\b/gi)];
  if (allMatches.length === 1) {
    const m = allMatches[0];
    return parseInt(m[1] || m[2], 10);
  }
  if (allMatches.length > 1) {
    const last = allMatches[allMatches.length - 1];
    return parseInt(last[1] || last[2], 10);
  }
  return null;
}

export function cleanMediaTitle(rawTitle) {
  if (!rawTitle) return '';
  const rawStr = String(rawTitle);

  // Extract Season badge to restore after cleaning (e.g. S1, Season 2, S1-S8)
  let seasonBadge = '';
  const rangeMatch = rawStr.match(/\b(?:season\s*(\d{1,2})\s*[-+–—]\s*(\d{1,2})|s(\d{1,2})\s*[-+–—]\s*s?(\d{1,2}))\b/i);
  if (rangeMatch) {
    const from = rangeMatch[1] || rangeMatch[3];
    const to = rangeMatch[2] || rangeMatch[4];
    seasonBadge = `(S${from}-S${to})`;
  } else {
    const singleMatch = rawStr.match(/\b(?:season\s*(\d{1,2})|s(\d{1,2}))\b/i);
    if (singleMatch) {
      const sNum = parseInt(singleMatch[1] || singleMatch[2], 10);
      if (sNum > 0) seasonBadge = `(Season ${sNum})`;
    }
  }

  let str = rawStr;
  str = str.replace(/^[\s🎬📺📥⚡📦⬇️▶️]+/gu, '').trim();
  str = str.replace(/^(?:download|watch(?:\s+online)?|stream)\s+/i, '').trim();
  str = str.replace(/\[\s*18\+\s*\]|\(\s*18\+\s*\)|\[Adult\]/gi, '').trim();
  str = str.replace(/\{[^}]*\}/g, ' ');
  str = str.replace(/\[\s*(?:dual\s*audio|hindi|eng|org|bluray|hevc|x264|x265|720p|1080p|480p|2160p|4k)[^\]]*\]/gi, ' ');
  str = str.replace(/\((?:season\s*\d+\s*[-+–—]\s*\d+|seasons?\s*\d+[^)]*)\)/gi, ' ');
  str = str.replace(/\b(?:season\s*\d+\s*[-+–—]\s*\d+)\b/gi, ' ');
  str = str.split(/\b(?:480p|720p|1080p|2160p|4k)\s*[|•·–—-]/i)[0];
  str = str.split(/\b(?:dual\s*audio|multi\s*audio|hindi\s*dubbed|org\s*2\.0|org\s*5\.1|multi\s*sub)\b/i)[0];
  str = str.replace(/\b(?:480p|720p|1080p|2160p|4k|bluray|web-dl|webrip|hdrip)\b.*$/i, '');
  str = str.replace(/\b(?:complete|hindi|english|telugu|tamil|malayalam|kannada)\b.*$/i, '');
  str = str.replace(/\b(?:series|complete\s*series|all\s*episodes)\b/gi, ' ');
  str = str.replace(/[\s|·–—\-_:\]\[{}]+$/g, '').trim();
  str = str.replace(/\s{2,}/g, ' ').trim();

  if (seasonBadge && !new RegExp(`\\b(season|s0*\\d)\\b`, 'i').test(str)) {
    str = `${str} ${seasonBadge}`;
  }

  if (str.length < 2) {
    str = String(rawTitle).replace(/^[\s🎬📺📥⚡📦⬇️▶️]+/gu, '').trim();
    if (str.length > 50) str = str.slice(0, 47) + '…';
  }

  return str.trim();
}

export function sanitizeCleanTitle(rawTitle, fallback = 'Media Release') {
  if (!rawTitle) return fallback;
  let str = String(rawTitle).trim();
  if (/^https?:/i.test(str)) {
    try {
      const u = new URL(str);
      const parts = u.pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1] || parts[parts.length - 2] || '';
      str = decodeURIComponent(last).replace(/[-_]+/g, ' ').replace(/\.\w+$/, '');
    } catch (_) {
      str = '';
    }
  }
  if (!str || /^(?:https?|null|undefined|untitled)$/i.test(str) || str.length < 2) {
    return fallback;
  }
  const cleaned = cleanMediaTitle(str);
  if (!cleaned || /^(?:https?|null|undefined|untitled)$/i.test(cleaned) || cleaned.length < 2) {
    return fallback;
  }
  return cleaned;
}

export function isSeriesItem(item, meta, rawGroups) {
  if (meta?.type === 'series' || meta?.type === 'tv') return true;

  if (Array.isArray(rawGroups) && rawGroups.length > 0) {
    for (const g of rawGroups) {
      if (g?.episodesLink) return true;
      if (Array.isArray(g?.directLinks) && g.directLinks.length > 1) return true;
      const gTitle = `${g?.title || ''} ${g?.dub || ''} ${g?.quality || ''}`.toLowerCase();
      if (/\b(?:season\s*\d+|s\d{1,2}\b|all\s*episodes|batch\s*pack|episode\s*\d+|ep\s*\d+)/i.test(gTitle)) {
        return true;
      }
      if (Array.isArray(g?.directLinks)) {
        const hasEpInDl = g.directLinks.some(l => /\b(?:ep(?:isode)?\s*\d+|e\d{1,3}\b)/i.test(l?.title || ''));
        if (hasEpInDl) return true;
      }
    }
  }

  const titleText = `${item?.title || ''} ${meta?.title || ''}`.toLowerCase();
  if (/\b(?:season\s*\d+|s\d{1,2}\b|episodes?|ep\s*\d+|e\d{1,3}\b|series\b|k-drama|drama)/i.test(titleText)) {
    return true;
  }

  if (meta?.type === 'movie') return false;
  return false;
}

export function rankSearchResults(results, query) {
  if (!query || !Array.isArray(results) || results.length <= 1) return results;
  const cleanQ = query.toLowerCase().trim();
  const qWords = cleanQ.split(/\s+/).filter(Boolean);

  const getScore = (item) => {
    const rawTitle = (item.title || '').toLowerCase();
    const cleanT = cleanMediaTitle(rawTitle).toLowerCase();

    if (cleanT === cleanQ || rawTitle === cleanQ) return 1000;
    if (cleanT.startsWith(cleanQ) || rawTitle.startsWith(cleanQ)) return 850;
    if (cleanT.includes(cleanQ) || rawTitle.includes(cleanQ)) return 700;

    const allWords = qWords.every(w => cleanT.includes(w) || rawTitle.includes(w));
    if (allWords) {
      const lengthPenalty = Math.abs(cleanT.length - cleanQ.length);
      return 500 - Math.min(lengthPenalty, 200);
    }

    let matchedWords = 0;
    qWords.forEach(w => {
      if (cleanT.includes(w) || rawTitle.includes(w)) matchedWords++;
    });
    return matchedWords * 50;
  };

  return [...results].sort((a, b) => getScore(b) - getScore(a));
}

export function extractCleanResolution(str) {
  if (!str) return '';
  const s = String(str);
  let res = '';
  if (/\b(2160p|4k|uhd)\b/i.test(s)) res = '4K';
  else if (/\b1080p\b/i.test(s)) res = '1080p';
  else if (/\b720p\b/i.test(s)) res = '720p';
  else if (/\b480p\b/i.test(s)) res = '480p';
  else if (/\b360p\b/i.test(s)) res = '360p';

  let codec = '';
  if (/hevc|10bit|x265/i.test(s)) codec = 'HEVC';

  let size = '';
  const sizeMatch = s.match(/\[?\b(\d+(?:\.\d+)?\s*(?:gb|mb)(?:\/[a-z]+)?)\b\]?/i);
  if (sizeMatch) size = sizeMatch[1].toUpperCase().replace(/\s+/, '');

  if (res && codec && !res.includes('HEVC')) res += ` ${codec}`;
  if (size) res += ` [${size}]`;
  return res;
}

export function extractActualEpisode(str) {
  if (!str) return null;
  const s = String(str);
  const m = s.match(/(?:ep(?:isode)?\.?\s*|e)(\d{1,4})\b/i);
  if (m) return parseInt(m[1], 10);
  const numMatch = s.match(/^\s*(\d{1,4})\.?\s+/);
  if (numMatch) return parseInt(numMatch[1], 10);
  return null;
}

export function formatCleanEpisodeTitle(seriesTitle, groupTitle, epTitle, epNum) {
  const cleanSeries = cleanMediaTitle(seriesTitle) || 'Series';
  const seasonNum = extractActualSeason(groupTitle) || extractActualSeason(epTitle) || extractActualSeason(seriesTitle) || 1;
  
  let epNumber = epNum;
  if (!epNumber && epTitle) {
    const epMatch = String(epTitle).match(/(?:ep(?:isode)?\.?\s*|e)(\d{1,3})\b/i);
    if (epMatch) epNumber = parseInt(epMatch[1], 10);
  }
  const epStr = epNumber ? `Ep ${epNumber}` : (epTitle || 'Episode');

  let res = '';
  const rMatch = (String(groupTitle || '') + ' ' + String(epTitle || '')).match(/\b(4k|2160p|1080p|720p|480p)\b/i);
  if (rMatch) {
    res = rMatch[1].toUpperCase();
    if (res === '2160P') res = '4K';
  }

  let formatted = `${cleanSeries} • S${seasonNum} ${epStr}`;
  if (res) formatted += ` [${res}]`;
  return formatted;
}

export function formatPackButtonLabel(rawTitle, defaultLabel = 'Season Pack') {
  const str = String(rawTitle || defaultLabel);
  const seasonNum = extractActualSeason(str);
  const season = seasonNum !== null ? `S${seasonNum}` : '';

  let res = extractCleanResolution(str);
  let size = '';
  const sizeMatch = str.match(/\[?\b(\d+(?:\.\d+)?\s*(?:gb|mb))\b\]?/i);
  if (sizeMatch) size = sizeMatch[1].toUpperCase().replace(/\s+/, '');

  const parts = [];
  if (season) parts.push(season);
  if (res) parts.push(res);
  parts.push('Pack');

  let lbl = parts.join(' ');
  if (size) lbl += ` [${size}]`;
  if (lbl.length > 25) lbl = lbl.slice(0, 24) + '…';
  return lbl;
}

export function formatQualityButtonLabel(rawTitle, defaultLabel = 'Option') {
  if (!rawTitle) return defaultLabel;
  const str = String(rawTitle);

  if (/(pack|zip|batch|complete\s*pack|all\s*episodes\s*pack)/i.test(str)) {
    return formatPackButtonLabel(str, defaultLabel);
  }

  let res = '';
  if (/\b(2160p|4k|uhd)\b/i.test(str)) res = '4K';
  else if (/\b1080p\b/i.test(str)) res = '1080p';
  else if (/\b720p\b/i.test(str)) res = '720p';
  else if (/\b480p\b/i.test(str)) res = '480p';
  else if (/\b360p\b/i.test(str)) res = '360p';

  let tech = '';
  if (/hevc|x265|10bit/i.test(str)) tech = 'HEVC';
  else if (/hdr/i.test(str)) tech = 'HDR';

  let lang = '';
  if (/dual\s*audio/i.test(str) || (/\bhindi\b/i.test(str) && /\benglish\b/i.test(str))) lang = 'Dual';
  else if (/hindi/i.test(str)) lang = 'Hindi';
  else if (/punjabi/i.test(str)) lang = 'Punjabi';
  else if (/tamil/i.test(str)) lang = 'Tamil';
  else if (/telugu/i.test(str)) lang = 'Telugu';

  let size = '';
  const sizeMatch = str.match(/\[?\b(\d+(?:\.\d+)?\s*(?:gb|mb)(?:\/[a-z]+)?)\b\]?/i);
  if (sizeMatch) {
    size = sizeMatch[1].toUpperCase().replace(/\s+/, '');
  }

  const parts = [];
  if (lang) parts.push(lang);
  if (res) parts.push(res);
  if (tech) parts.push(tech);

  const main = parts.join(' • ');
  let lbl = main || defaultLabel;
  if (size) lbl += ` [${size}]`;

  if (!main && !size) {
    let clean = str.replace(/.*?\[/g, '[').trim();
    if (clean.length > 20) clean = clean.slice(-20).trim();
    lbl = clean || defaultLabel;
  }

  if (lbl.length > 26) lbl = lbl.slice(0, 25) + '…';
  return lbl;
}

export function formatEpisodeButtonLabel(rawTitle, epCount, rawQuality = '', groupIndex = 0, rawDub = '') {
  const str = String(rawTitle || 'Episodes');
  const qStr = String(rawQuality || '');
  const dubStr = String(rawDub || '');
  const combined = `${str} ${dubStr} ${qStr}`.trim();

  const isPack = /(pack|zip|batch|complete\s*pack|all\s*episodes\s*pack)/i.test(combined) || qStr.toLowerCase() === 'pack';
  if (isPack) {
    return formatPackButtonLabel(str, `Season Pack ${groupIndex + 1}`);
  }

  const seasonNum = extractActualSeason(dubStr) || extractActualSeason(str) || extractActualSeason(qStr);
  const season = seasonNum !== null ? `S${seasonNum}` : '';

  let res = '';
  const qResMatch = qStr.match(/\b(2160p|4k|1080p|720p|480p|360p)\b/i);
  if (qResMatch) {
    res = qResMatch[1].toUpperCase();
    if (res === '2160P') res = '4K';
  } else {
    const afterSep = str.split(/[-:|–—\[\]()]/).filter(Boolean).pop() || '';
    const sepResMatch = afterSep.match(/\b(2160p|4k|1080p|720p|480p|360p)\b/i) || str.match(/\b(2160p|4k|1080p|720p|480p|360p)\b/i);
    if (sepResMatch) {
      res = sepResMatch[1].toUpperCase();
      if (res === '2160P') res = '4K';
    }
  }

  let lang = '';
  if (/dual\s*audio/i.test(combined) || (/\bhindi\b/i.test(combined) && /\benglish\b/i.test(combined))) lang = 'Dual';
  else if (/hindi/i.test(combined)) lang = 'Hindi';
  else if (/punjabi/i.test(combined)) lang = 'Punjabi';
  else if (/tamil/i.test(combined)) lang = 'Tamil';
  else if (/telugu/i.test(combined)) lang = 'Telugu';
  else if (/kannada/i.test(combined)) lang = 'Kannada';
  else if (/malayalam/i.test(combined)) lang = 'Malayalam';
  else if (/original\s*audio|original|orig/i.test(combined)) lang = 'Original';
  else if (/english|\beng\b/i.test(combined)) lang = 'English';
  else if (dubStr) lang = dubStr.replace(/\s*dub/i, '').trim();

  let size = '';
  const sizeMatch = str.match(/\[?\b(\d+(?:\.\d+)?\s*(?:gb|mb)(?:\/[a-z]+)?)\b\]?/i);
  if (sizeMatch) size = sizeMatch[1].toUpperCase().replace(/\s+/, '');

  const parts = [];
  if (season) parts.push(season);
  if (lang) parts.push(lang);
  if (res) parts.push(res);

  let main = '';
  if (parts.length > 1) {
    main = parts.join(' • ');
  } else if (parts.length === 1 && lang) {
    main = season ? `${season} • ${lang}` : lang;
  } else if (res) {
    main = season ? `${season} • ${res}` : res;
  } else {
    const cleanRaw = str
      .replace(/season\s*\d+/gi, '')
      .replace(/s\d+/gi, '')
      .replace(/[-:·|–—\[\]()]/g, ' ')
      .trim();
    const fallbackDesc = cleanRaw || (rawQuality ? rawQuality : `Option ${groupIndex + 1}`);
    main = season ? `${season} • ${fallbackDesc}` : fallbackDesc;
  }

  if (size) main += ` [${size}]`;
  if (epCount > 0 && !main.includes('Eps') && !main.includes(season)) main += ` (${epCount} Eps)`;

  if (main.length > 26) main = main.slice(0, 25) + '…';
  return main;
}

export function formatStreamMirrorLabel(m, mediaTitle) {
  const rawServer = String(m?.server || 'Direct Link').trim();
  const rawQual = String(m?.quality || m?.resolution || '').trim();

  let qTag = '';
  if (/\b(2160p|4k|uhd)\b/i.test(rawQual)) qTag = '4K';
  else if (/\b1080p?\b/i.test(rawQual)) qTag = '1080p';
  else if (/\b720p?\b/i.test(rawQual)) qTag = '720p';
  else if (/\b480p?\b/i.test(rawQual)) qTag = '480p';
  else if (/\b360p?\b/i.test(rawQual)) qTag = '360p';
  else if (/^\d{3,4}$/.test(rawQual)) qTag = `${rawQual}p`;

  if (!qTag) {
    const sMatch = (rawServer + ' ' + (m?.link || '')).match(/\b(2160p|4k|uhd|1080p|720p|480p|360p)\b/i);
    if (sMatch) {
      qTag = sMatch[1].toUpperCase();
      if (qTag === '2160P' || qTag === 'UHD') qTag = '4K';
      else if (!qTag.endsWith('P') && qTag !== '4K') qTag += 'p';
    }
  }

  let cleanSrv = rawServer
    .replace(/\s*\(download\s*only\)/i, '')
    .replace(/^Server\s*/i, '')
    .trim();

  if (mediaTitle && mediaTitle.length > 2) {
    const escaped = mediaTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleanSrv = cleanSrv.replace(new RegExp(`^${escaped}[\\s-:|–—]*`, 'i'), '').trim();
    cleanSrv = cleanSrv.replace(/^(?:series|movie|season\s*\d+|s\d{1,2})[\s-:|–—]*/i, '').trim();
  }

  let lang = '';
  if (/dual\s*audio/i.test(cleanSrv) || (/\bhindi\b/i.test(cleanSrv) && /\benglish\b/i.test(cleanSrv))) lang = 'Dual';
  else if (/\bhindi\b/i.test(cleanSrv)) lang = 'Hindi';
  else if (/\btamil\b/i.test(cleanSrv)) lang = 'Tamil';
  else if (/\btelugu\b/i.test(cleanSrv)) lang = 'Telugu';
  else if (/\benglish\b/i.test(cleanSrv)) lang = 'Eng';
  else if (/\bpunjabi\b/i.test(cleanSrv)) lang = 'Punjabi';

  let host = '';
  if (/pixeldrain/i.test(cleanSrv) || /pixeldrain/i.test(m?.link || '')) host = 'Pixeldrain';
  else if (/\bgd\b|gdrive|google|g-direct|gdflix/i.test(cleanSrv) || /drive\.google/i.test(m?.link || '')) host = 'GDrive';
  else if (/hubcloud|hubdrive/i.test(cleanSrv)) host = 'HubCloud';
  else if (/vidbolt/i.test(cleanSrv) || /vidbolt/i.test(m?.link || '')) host = 'VidBolt';
  else if (/streamhg/i.test(cleanSrv) || /streamhg/i.test(m?.link || '')) host = 'StreamHG';
  else if (/filmu/i.test(cleanSrv)) host = 'Filmu';
  else if (/streamtape/i.test(cleanSrv)) host = 'StreamTape';
  else if (/dood/i.test(cleanSrv)) host = 'Dood';

  const parts = [];
  if (host) parts.push(host);
  if (lang && !host) parts.push(lang);
  if (qTag) parts.push(qTag);

  let label = parts.join(' ');
  if (!label) {
    label = cleanSrv.replace(/[\s-:|–—]+$/, '').trim() || 'Fast Server';
  }
  if (label.length > 12) label = label.slice(0, 11).trim();

  return label;
}

export function extractQualityBadges(title, linkList = []) {
  const allTexts = [title || ''];
  if (Array.isArray(linkList)) {
    for (const g of linkList) {
      if (g.title) allTexts.push(g.title);
      if (g.quality) allTexts.push(g.quality);
      if (Array.isArray(g.directLinks)) {
        for (const dl of g.directLinks.slice(0, 5)) {
          if (dl.title) allTexts.push(dl.title);
        }
      }
    }
  }
  const combined = allTexts.join(' ');

  const resolutions = [];
  if (/\b(480p)\b/i.test(combined)) resolutions.push('480p');
  if (/\b(720p)\b/i.test(combined)) {
    const isHevc = /hevc|10bit/i.test(combined);
    resolutions.push(isHevc ? '720p HEVC' : '720p');
  }
  if (/\b(1080p)\b/i.test(combined)) {
    const is10Bit = /10bit|fhd/i.test(combined);
    resolutions.push(is10Bit ? '1080p 10Bit' : '1080p');
  }
  if (/\b(2160p|4k|uhd)\b/i.test(combined)) resolutions.push('4K UHD');

  const sizes = [];
  const sizeMatches = combined.matchAll(/\b(\d+(?:\.\d+)?\s*(?:GB|MB))\b/gi);
  for (const m of sizeMatches) {
    const s = m[1].toUpperCase().replace(/\s+/, '');
    if (!sizes.includes(s) && sizes.length < 3) sizes.push(s);
  }

  let audio = 'Hindi + English';
  if (/dual\s*audio/i.test(combined)) audio = 'Dual Audio [Hin/Eng]';
  else if (/org\s*2\.0/i.test(combined) || /org\s*5\.1/i.test(combined)) audio = 'Hindi (ORG) + English';
  else if (/hindi\s*dub/i.test(combined)) audio = 'Hindi Dubbed';
  else if (/sub|english/i.test(combined) && !/hindi/i.test(combined)) audio = 'English Audio';

  let badgeStr = resolutions.join(' • ');
  if (!badgeStr) badgeStr = 'HD • 720p • 1080p';
  if (sizes.length > 0) {
    badgeStr += ` [${sizes.join(' | ')}]`;
  }

  return { resolutions: badgeStr, audio };
}

export function getProviderDisplayName(provKey) {
  if (!provKey) return 'CINEMA';
  const names = {
    hdhub4u: 'HDHub4u',
    vega: 'VegaMovies',
    drive: 'MoviesDrive',
    moviesmod: 'MoviesMod',
    movies4u: 'Movies4u',
    netflixmirror: 'Netflix',
    disneymirror: 'Disney+ Hotstar',
    primemirror: 'Prime Video',
    castle: 'Castle TV',
    mxplayer: 'MX Player',
    animeworld: 'AnimeWorld',
    animesalt: 'AnimeSalt',
    tpb: 'The Pirate Bay',
    multi: 'MultiMovies',
    '4khdhub': '4KHDHub',
    uhd: 'UHDMovies',
    movieboxweb: 'MovieBox'
  };
  return names[provKey.toLowerCase()] || provKey.toUpperCase();
}
