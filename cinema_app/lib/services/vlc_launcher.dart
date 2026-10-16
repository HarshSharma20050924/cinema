import 'package:android_intent_plus/android_intent.dart';
import 'package:android_intent_plus/flag.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

class VlcLauncher {
  /// Opens streamUrl directly in VLC Player on Android without location errors.
  /// Uses the exact intent pipeline from the web app, ensures media extensions,
  /// auto-copies clean link to clipboard, and includes robust fallbacks.
  static Future<bool> launch({
    required String streamUrl,
    required String title,
    Map<String, String>? headers,
  }) async {
    if (streamUrl.trim().isEmpty) return false;

    String playableUrl = streamUrl.trim();

    // 1. Ensure the URL ends in a media extension (.mp4 / .mkv) so VLC's demuxer recognizes it
    // This is the EXACT fix that eliminates "The location cannot be played" error!
    if (!RegExp(r'\.(mkv|mp4|m3u8|webm|avi|mov|flv|ts)(\?|$)', caseSensitive: false).hasMatch(playableUrl)) {
      playableUrl += playableUrl.contains('?') ? '&file=video.mp4' : '?file=video.mp4';
    }

    final cleanTitle = title.replaceAll(RegExp(r'[^a-zA-Z0-9 _-]'), '').trim();

    // 2. Always auto-copy link to clipboard as seamless backup
    try {
      await Clipboard.setData(ClipboardData(text: playableUrl));
    } catch (_) {}

    final isMovieBox = playableUrl.toLowerCase().contains('hakunaymatata') ||
        playableUrl.toLowerCase().contains('moviebox') ||
        playableUrl.toLowerCase().contains('inmoviebox');

    final headerList = <String>[];
    if (headers != null) {
      headers.forEach((k, v) => headerList.add('$k: $v'));
    }
    if (isMovieBox) {
      if (!headerList.any((h) => h.toLowerCase().startsWith('referer:'))) {
        headerList.add('Referer: https://officialmoviebox.com/');
      }
      if (!headerList.any((h) => h.toLowerCase().startsWith('origin:'))) {
        headerList.add('Origin: https://officialmoviebox.com');
      }
      if (!headerList.any((h) => h.toLowerCase().startsWith('user-agent:'))) {
        headerList.add('User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
      }
    }

    // 3. Primary Intent: Explicitly launch org.videolan.vlc with video/* MIME and read permissions
    try {
      final arguments = <String, dynamic>{
        'title': cleanTitle,
        'android.intent.extra.TITLE': cleanTitle,
        'android.intent.extra.TEXT': playableUrl,
        'url': playableUrl,
      };
      if (headerList.isNotEmpty) {
        arguments['extra_headers'] = headerList;
        arguments['headers'] = headerList;
      }

      final intent = AndroidIntent(
        action: 'android.intent.action.VIEW',
        data: playableUrl,
        type: 'video/*',
        package: 'org.videolan.vlc',
        flags: [Flag.FLAG_GRANT_READ_URI_PERMISSION],
        arguments: arguments,
      );

      await intent.launch();
      return true;
    } catch (e) {
      // 4. Fallback 1: Web-style Chrome intent URI
      try {
        final scheme = playableUrl.startsWith('https') ? 'https' : 'http';
        final noScheme = playableUrl.replaceFirst(RegExp(r'^https?:\/\/'), '');
        final intentUri = Uri.parse(
          'intent://$noScheme#Intent;scheme=$scheme;type=video/*;action=android.intent.action.VIEW;package=org.videolan.vlc;S.title=${Uri.encodeComponent(cleanTitle)};end',
        );
        if (await canLaunchUrl(intentUri)) {
          await launchUrl(intentUri, mode: LaunchMode.externalApplication);
          return true;
        }
      } catch (_) {}

      // 5. Fallback 2: vlc:// custom scheme
      try {
        final vlcUri = Uri.parse('vlc://$playableUrl');
        if (await canLaunchUrl(vlcUri)) {
          await launchUrl(vlcUri, mode: LaunchMode.externalApplication);
          return true;
        }
      } catch (_) {}

      // 6. Fallback 3: Generic Android system video player chooser (allows user to pick VLC, MX Player, MPV)
      try {
        final chooserIntent = AndroidIntent(
          action: 'android.intent.action.VIEW',
          data: playableUrl,
          type: 'video/*',
          flags: [Flag.FLAG_GRANT_READ_URI_PERMISSION],
          arguments: {
            'title': cleanTitle,
          },
        );
        await chooserIntent.launch();
        return true;
      } catch (_) {
        // 7. Final browser fallback
        try {
          final webUri = Uri.parse(playableUrl);
          if (await canLaunchUrl(webUri)) {
            await launchUrl(webUri, mode: LaunchMode.externalApplication);
            return true;
          }
        } catch (_) {}
      }
    }

    return false;
  }
}
