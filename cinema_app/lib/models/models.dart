class ProviderExtension {
  final String name;
  final String value;
  final String version;
  final String icon;
  final String type;
  bool isInstalled;
  bool isActive;

  ProviderExtension({
    required this.name,
    required this.value,
    required this.version,
    required this.icon,
    this.type = 'global',
    this.isInstalled = false,
    this.isActive = false,
  });

  factory ProviderExtension.fromJson(Map<String, dynamic> json) {
    final val = json['value']?.toString() ?? '';
    final isMovieBoxWeb = val == 'movieBoxWeb';
    return ProviderExtension(
      name: isMovieBoxWeb ? 'MovieBox' : (json['display_name'] ?? json['name'] ?? val).toString(),
      value: val,
      version: json['version']?.toString() ?? '1.0.0',
      icon: json['icon']?.toString() ?? '',
      type: json['type']?.toString() ?? 'global',
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'value': value,
    'version': version,
    'icon': icon,
    'type': type,
    'isInstalled': isInstalled,
    'isActive': isActive,
  };
}

class MediaItem {
  final String title;
  final String link;
  final String image;
  final String? rating;
  final String? year;
  final String? type;

  MediaItem({
    required this.title,
    required this.link,
    required this.image,
    this.rating,
    this.year,
    this.type,
  });

  factory MediaItem.fromJson(Map<String, dynamic> json) {
    return MediaItem(
      title: json['title']?.toString() ?? 'Untitled',
      link: json['link']?.toString() ?? '',
      image: json['image']?.toString() ?? '',
      rating: json['rating']?.toString(),
      year: json['year']?.toString(),
      type: json['type']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'title': title,
    'link': link,
    'image': image,
    'rating': rating,
    'year': year,
    'type': type,
  };
}

class CatalogSection {
  final String title;
  final String filter;
  final List<MediaItem> posts;

  CatalogSection({
    required this.title,
    required this.filter,
    required this.posts,
  });
}

class StreamServer {
  final String server;
  final String link;
  final String? type;
  final String? quality;
  final Map<String, String>? headers;

  StreamServer({
    required this.server,
    required this.link,
    this.type,
    this.quality,
    this.headers,
  });

  factory StreamServer.fromJson(Map<String, dynamic> json) {
    Map<String, String>? hMap;
    if (json['headers'] is Map) {
      hMap = (json['headers'] as Map).map((k, v) => MapEntry(k.toString(), v.toString()));
    }
    return StreamServer(
      server: json['server']?.toString() ?? 'Stream Link',
      link: json['link']?.toString() ?? '',
      type: json['type']?.toString() ?? 'm3u8',
      quality: json['quality']?.toString() ?? 'Auto',
      headers: hMap,
    );
  }
}

class Episode {
  final String title;
  final String link;
  final int episodeNumber;

  Episode({
    required this.title,
    required this.link,
    required this.episodeNumber,
  });
}

class Season {
  final String seasonName;
  final List<Episode> episodes;

  Season({
    required this.seasonName,
    required this.episodes,
  });
}

class MediaMeta {
  final String title;
  final String plot;
  final String backdrop;
  final String poster;
  final String? rating;
  final String? year;
  final List<String> genres;
  final List<Season> seasons;
  final List<StreamServer> directStreams;

  MediaMeta({
    required this.title,
    required this.plot,
    required this.backdrop,
    required this.poster,
    this.rating,
    this.year,
    this.genres = const [],
    this.seasons = const [],
    this.directStreams = const [],
  });
}
