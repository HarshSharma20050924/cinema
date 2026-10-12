/**
 * KatMovies - Stream & Download Resolver Module
 * Resolves links.kmhd.me, GDFlix, and protector pages to direct stream & download links
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { execFile } = require('child_process');
const { resolveHubCloudDirect } = require('../../controllers/streamController.cjs');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Cookie': 'unlocked=true',
  'Referer': 'https://links.kmhd.me/',
};

function parseSvelteData(html) {
  if (!html || typeof html !== 'string') return null;
  const match = html.match(/resolve\(\{\s*id:\s*\d+,\s*data:/);
  if (!match || match.index === undefined) return null;
  const start = match.index + match[0].length;
  const errorIdx = html.indexOf(',error:', start);
  if (errorIdx === -1) return null;
  const dataStr = html.substring(start, errorIdx);
  try {
    return Function(`"use strict"; return (${dataStr});`)();
  } catch (_) {
    return null;
  }
}

function curlFetchHtml(url) {
  return new Promise((resolve) => {
    execFile(
      'curl',
      [
        '-s',
        '-L',
        '--max-time',
        '10',
        '-H',
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        url,
      ],
      (err, stdout) => {
        if (err || !stdout) resolve('');
        else resolve(stdout);
      }
    );
  });
}

async function getStream({ link }) {
  if (!link) return [];
  const streams = [];

  try {
    // 1. If it's a KMHD protector link, parse the upload links
    if (/links\.(kmhd|kmphotos)\.[a-z]+/i.test(link)) {
      const res = await axios.get(link, {
        headers: HEADERS,
        timeout: 10000,
        validateStatus: () => true,
      });

      const parsed = parseSvelteData(res.data);
      const val = parsed?.data?.val || parsed?.val || {};
      const uploadLinks = val.upload_links || {};

      // A. GDFlix resolution
      if (uploadLinks.gdflix_res && uploadLinks.gdflix_res !== 'None') {
        const gdflixId = uploadLinks.gdflix_res;
        const gdflixPageHtml = await curlFetchHtml(`https://gd.kmhd.me/file/${gdflixId}`);
        if (gdflixPageHtml) {
          const $ = cheerio.load(gdflixPageHtml);
          const instantLink = $('.btn-danger').attr('href') || '';
          if (instantLink && instantLink.startsWith('http')) {
            streams.push({
              server: 'Instant G-Drive [Fast]',
              link: instantLink,
              type: 'mkv',
              quality: '1080p',
            });
          }
          const gofile = $('a[href*="goflix"]').attr('href') || '';
          if (gofile && gofile.startsWith('http')) {
            streams.push({
              server: 'GoFile Mirror',
              link: gofile,
              type: 'mkv',
            });
          }
        }
      }

      // B. HubCloud / HubDrive resolution
      if (uploadLinks.hubdrive_res && uploadLinks.hubdrive_res !== 'None') {
        const hubUrl = `https://hubcloud.ist/drive/${uploadLinks.hubdrive_res}`;
        try {
          const direct = await resolveHubCloudDirect(hubUrl);
          if (direct) {
            streams.push({
              server: 'HubCloud Direct',
              link: direct,
              type: 'mkv',
            });
          } else {
            streams.push({
              server: 'HubCloud Mirror',
              link: hubUrl,
              type: 'mkv',
            });
          }
        } catch (_) {
          streams.push({
            server: 'HubCloud Mirror',
            link: hubUrl,
            type: 'mkv',
          });
        }
      }

      // C. KatDrive resolution
      if (uploadLinks.katdrive_res && uploadLinks.katdrive_res !== 'None') {
        streams.push({
          server: 'KatDrive',
          link: `https://katdrive.click/file/${uploadLinks.katdrive_res}`,
          type: 'mkv',
        });
      }

      // D. FFast direct
      if (uploadLinks.ffast_res && uploadLinks.ffast_res !== 'None') {
        streams.push({
          server: 'FFast Direct',
          link: `https://fuckingfast.net/${uploadLinks.ffast_res}`,
          type: 'mkv',
        });
      }

      // E. SendCM direct
      if (uploadLinks.sendcm_res && uploadLinks.sendcm_res !== 'None') {
        streams.push({
          server: 'SendCM Mirror',
          link: `https://send.cm/${uploadLinks.sendcm_res}`,
          type: 'mkv',
        });
      }

      // F. StreamWish / StreamTape (for web player streaming)
      if (uploadLinks.streamwish_res && uploadLinks.streamwish_res !== 'None') {
        streams.push({
          server: 'StreamWish Player',
          link: `https://hglink.to/e/${uploadLinks.streamwish_res}`,
          type: 'mkv',
        });
      }
    }

    // 2. If it's already a HubCloud link
    if (/(hubcdn|hubcloud|hubdrive)/i.test(link)) {
      const direct = await resolveHubCloudDirect(link);
      if (direct) {
        streams.push({
          server: 'HubCloud Direct',
          link: direct,
          type: 'mkv',
        });
      }
    }

    // 2b. If it's a direct GDFlix link
    if (link.includes('gdflix') || link.includes('gd.kmhd')) {
      const gdflixPageHtml = await curlFetchHtml(link);
      if (gdflixPageHtml) {
        const $ = cheerio.load(gdflixPageHtml);
        const instantLink = $('.btn-danger').attr('href') || '';
        if (instantLink && instantLink.startsWith('http')) {
          streams.push({
            server: 'Instant G-Drive [Fast]',
            link: instantLink,
            type: 'mkv',
          });
        }
        const gofile = $('a[href*="goflix"]').attr('href') || '';
        if (gofile && gofile.startsWith('http')) {
          streams.push({
            server: 'GoFile Mirror',
            link: gofile,
            type: 'mkv',
          });
        }
      }
    }

    // 3. Fallback: if no streams could be resolved, provide the link as unlocked
    if (streams.length === 0) {
      streams.push({
        server: 'Direct Link',
        link,
        type: 'mkv',
      });
    }

    return streams;
  } catch (err) {
    console.warn('[KatMovies] getStream error:', err.message);
    return [{ server: 'Direct Link', link, type: 'mkv' }];
  }
}

module.exports = {
  getStream,
};
