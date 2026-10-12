import * as IntentLauncher from 'expo-intent-launcher';
import { ToastAndroid, Platform, Clipboard, NativeModules } from 'react-native';

const StreamProxy = NativeModules.StreamProxyModule;

export interface VlcLaunchOptions {
  streamUrl: string;
  headers?: Record<string, string>;
  title?: string;
}

/**
 * High-reliability VLC & External Player Launcher
 * Automatically proxies protected/header-dependent streams through local 127.0.0.1 proxy,
 * eliminating "The location cannot be played" / location errors and instant autobacks.
 * Explicitly sets package 'org.videolan.vlc' so Android never opens browser instead of VLC.
 */
export async function launchVlcPlayer({
  streamUrl,
  headers,
  title,
}: VlcLaunchOptions): Promise<boolean> {
  if (!streamUrl) {
    if (Platform.OS === 'android') {
      ToastAndroid.show('No stream URL provided', ToastAndroid.SHORT);
    }
    return false;
  }

  try {
    const playableUrl = streamUrl.trim();

    // 1. Always copy stream URL to clipboard for user convenience
    try {
      Clipboard.setString(playableUrl);
    } catch (_) {}

    if (Platform.OS !== 'android') {
      console.warn('VLC Intent is only supported directly on Android');
      return false;
    }

    const cleanTitle = (title || 'Cinema Stream').replace(/[^a-zA-Z0-9 _-]/g, '');

    // 2. Primary launcher: Native StreamProxyModule with explicit intent targeting
    // This directly calls intent.setPackage("org.videolan.vlc"), preventing any browser redirect,
    // and transparently handles MovieBox / CDN header authentication through 127.0.0.1.
    if (StreamProxy?.launchPlayer) {
      try {
        await StreamProxy.launchPlayer(playableUrl, cleanTitle, headers || {});
        ToastAndroid.show('Opening in VLC Player...', ToastAndroid.SHORT);
        return true;
      } catch (nativeErr) {
        console.warn('Native launchPlayer failed, attempting fallback intent:', nativeErr);
      }
    }

    // 3. Fallback: IntentLauncher with explicit VLC ComponentName
    const isLocal =
      playableUrl.startsWith('file:') || playableUrl.startsWith('content:');

    const extraHeaders: string[] = [];
    if (headers) {
      Object.entries(headers).forEach(([k, v]) => extraHeaders.push(`${k}: ${v}`));
    }
    const lower = playableUrl.toLowerCase();
    if (lower.includes('hakunaymatata') || lower.includes('moviebox') || lower.includes('inmoviebox')) {
      if (!extraHeaders.some(h => h.toLowerCase().startsWith('referer:'))) {
        extraHeaders.push('Referer: https://officialmoviebox.com/');
      }
      if (!extraHeaders.some(h => h.toLowerCase().startsWith('origin:'))) {
        extraHeaders.push('Origin: https://officialmoviebox.com');
      }
      if (!extraHeaders.some(h => h.toLowerCase().startsWith('user-agent:'))) {
        extraHeaders.push('User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
      }
    }

    const vlcIntent: Record<string, any> = {
      data: playableUrl,
      packageName: 'org.videolan.vlc',
      className: 'org.videolan.vlc.gui.video.VideoPlayerActivity',
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      extra: {
        title: cleanTitle,
        'android.intent.extra.TITLE': cleanTitle,
        'android.intent.extra.TEXT': playableUrl,
        ...(extraHeaders.length > 0 ? { extra_headers: extraHeaders, headers: extraHeaders } : {}),
      },
    };
    if (isLocal) {
      vlcIntent.type = 'video/*';
    }

    try {
      await IntentLauncher.startActivityAsync(
        'android.intent.action.VIEW',
        vlcIntent,
      );
      ToastAndroid.show('Opening in VLC Player...', ToastAndroid.SHORT);
      return true;
    } catch (vlcErr) {
      console.log('Direct VLC launch fallback failed:', vlcErr);
      const chooserIntent: Record<string, any> = {
        data: playableUrl,
        flags: 1,
        type: 'video/*',
      };
      await IntentLauncher.startActivityAsync(
        'android.intent.action.VIEW',
        chooserIntent,
      );
      ToastAndroid.show('Opening Video Player...', ToastAndroid.SHORT);
      return true;
    }
  } catch (err: any) {
    console.error('Failed to launch external player:', err);
    if (Platform.OS === 'android') {
      ToastAndroid.show(
        'Could not open player: ' + (err?.message || 'App not found'),
        ToastAndroid.LONG,
      );
    }
    return false;
  }
}
