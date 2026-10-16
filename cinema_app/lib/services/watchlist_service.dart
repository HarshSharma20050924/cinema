import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';

class WatchlistService extends ChangeNotifier {
  List<MediaItem> _items = [];
  bool _loaded = false;

  List<MediaItem> get items => _items;
  bool get isLoaded => _loaded;

  WatchlistService() {
    loadWatchlist();
  }

  Future<void> loadWatchlist() async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList('user_watchlist') ?? [];
    _items = list.map((str) {
      try {
        return MediaItem.fromJson(jsonDecode(str) as Map<String, dynamic>);
      } catch (_) {
        return null;
      }
    }).whereType<MediaItem>().toList();
    _loaded = true;
    notifyListeners();
  }

  bool isBookmarked(MediaItem item) {
    return _items.any((i) => i.title.toLowerCase() == item.title.toLowerCase() || (i.link.isNotEmpty && i.link == item.link));
  }

  Future<void> toggleBookmark(MediaItem item) async {
    final index = _items.indexWhere((i) => i.title.toLowerCase() == item.title.toLowerCase() || (i.link.isNotEmpty && i.link == item.link));
    if (index >= 0) {
      _items.removeAt(index);
    } else {
      _items.insert(0, item);
    }
    await _save();
    notifyListeners();
  }

  Future<void> removeItem(MediaItem item) async {
    _items.removeWhere((i) => i.title.toLowerCase() == item.title.toLowerCase() || (i.link.isNotEmpty && i.link == item.link));
    await _save();
    notifyListeners();
  }

  Future<void> _save() async {
    final prefs = await SharedPreferences.getInstance();
    final list = _items.map((i) => jsonEncode(i.toJson())).toList();
    await prefs.setStringList('user_watchlist', list);
  }
}
