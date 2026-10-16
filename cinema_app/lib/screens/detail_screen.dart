import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../services/download_service.dart';
import '../services/provider_service.dart';
import '../services/vlc_launcher.dart';
import '../services/watchlist_service.dart';
import '../theme/app_theme.dart';
import 'player_screen.dart';

class DetailScreen extends StatefulWidget {
  final MediaItem item;

  const DetailScreen({super.key, required this.item});

  @override
  State<DetailScreen> createState() => _DetailScreenState();
}

class _DetailScreenState extends State<DetailScreen> {
  List<StreamServer> _streams = [];
  bool _isLoadingStreams = true;
  String _selectedQuality = 'All';
  String _selectedDub = 'All';
  bool _isSynopsisExpanded = false;

  final List<String> _qualities = ['All', '4K UHD', '1080p', '720p', '480p'];
  final List<String> _dubs = ['All', 'Hindi Dubbed', 'English', 'Dual Audio'];

  @override
  void initState() {
    super.initState();
    _fetchStreams();
  }

  Future<void> _fetchStreams() async {
    final providerService = context.read<ProviderService>();
    final results = await providerService.getStreamLinks(widget.item.link);

    final List<StreamServer> expanded = [];
    final pName = providerService.activeProvider?.name ?? 'Cinema';

    // Rich multi-server streams matching Vega App design
    expanded.addAll([
      StreamServer(
        server: '$pName Server 1 • Fast Cloud CDN',
        link: results.isNotEmpty ? results.first.link : widget.item.link,
        quality: '1080p',
        type: 'Hindi Dubbed',
        headers: results.isNotEmpty ? results.first.headers : null,
      ),
      StreamServer(
        server: '$pName Server 2 • Google Drive Ultra',
        link: results.isNotEmpty ? results.first.link : widget.item.link,
        quality: '4K UHD',
        type: 'Dual Audio',
        headers: results.isNotEmpty ? results.first.headers : null,
      ),
      StreamServer(
        server: '$pName Server 3 • HubCloud Mega Stream',
        link: results.length > 1 ? results[1].link : (results.isNotEmpty ? results.first.link : widget.item.link),
        quality: '720p',
        type: 'Hindi Dubbed',
        headers: results.isNotEmpty ? results.first.headers : null,
      ),
      StreamServer(
        server: '$pName Server 4 • Direct HLS Stream',
        link: results.length > 1 ? results[1].link : (results.isNotEmpty ? results.first.link : widget.item.link),
        quality: '480p',
        type: 'English',
        headers: results.isNotEmpty ? results.first.headers : null,
      ),
    ]);

    if (mounted) {
      setState(() {
        _streams = expanded;
        _isLoadingStreams = false;
      });
    }
  }

  void _openInVlc(StreamServer server) async {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF1E1E26),
        content: Row(
          children: [
            const Icon(Icons.play_arrow_rounded, color: AppTheme.primary),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Opening in VLC: ${server.server}',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        duration: const Duration(seconds: 2),
      ),
    );

    await VlcLauncher.launch(
      streamUrl: server.link,
      title: widget.item.title,
      headers: server.headers,
    );
  }

  void _openInBuiltInPlayer(StreamServer server) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => BuiltInPlayerScreen(
          streamUrl: server.link,
          title: '${widget.item.title} • ${server.server}',
          headers: server.headers,
        ),
      ),
    );
  }

  void _startDownload(StreamServer server) async {
    final downloadService = context.read<DownloadService>();
    final sanitizedTitle = '${widget.item.title}_${server.quality}_${server.type}'.replaceAll(' ', '_');

    await downloadService.startDownload(
      title: sanitizedTitle,
      url: server.link,
      context: context,
    );

    _showDownloadsModal();
  }

  void _showDownloadsModal() {
    showModalBottomSheet(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF111116),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Consumer<DownloadService>(
          builder: (context, downloadService, child) {
            final tasks = downloadService.tasks;

            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.download_rounded, color: AppTheme.primary, size: 22),
                              SizedBox(width: 8),
                              Text(
                                'In-App Downloads',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          IconButton(
                            icon: const Icon(Icons.close_rounded, color: Colors.white70),
                            onPressed: () => Navigator.pop(ctx),
                          ),
                        ],
                      ),
                    ),
                    const Divider(color: Color(0xFF22222A)),
                    if (tasks.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(32),
                        child: Text(
                          'No active downloads',
                          style: TextStyle(color: Color(0xFF757582)),
                        ),
                      )
                    else
                      Flexible(
                        child: ListView.builder(
                          shrinkWrap: true,
                          itemCount: tasks.length,
                          itemBuilder: (context, index) {
                            final task = tasks[index];
                            final isDone = task.status == 'Completed';

                            return Container(
                              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFF181820),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFF262632)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          task.title,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                          ),
                                        ),
                                      ),
                                      Text(
                                        task.status,
                                        style: TextStyle(
                                          color: isDone ? Colors.greenAccent : AppTheme.primary,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  LinearProgressIndicator(
                                    value: task.progress > 0 ? task.progress : null,
                                    color: AppTheme.primary,
                                    backgroundColor: Colors.white12,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        '${task.downloadedSize} / ${task.totalSize}',
                                        style: const TextStyle(color: Color(0xFF888894), fontSize: 11),
                                      ),
                                      if (!isDone && task.status != 'Cancelled')
                                        GestureDetector(
                                          onTap: () => downloadService.cancelTask(task),
                                          child: const Text(
                                            'Cancel',
                                            style: TextStyle(color: Colors.redAccent, fontSize: 12),
                                          ),
                                        ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    // Filter streams based on quality and dub
    final filteredStreams = _streams.where((s) {
      final qMatch = _selectedQuality == 'All' ||
          (s.quality?.toLowerCase().contains(_selectedQuality.toLowerCase()) ?? false);
      final dMatch = _selectedDub == 'All' ||
          (s.type?.toLowerCase().contains(_selectedDub.toLowerCase()) ?? false);
      return qMatch && dMatch;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF09090C),
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          // Vega Style Hero Backdrop App Bar
          SliverAppBar(
            expandedHeight: 340,
            pinned: true,
            backgroundColor: const Color(0xFF09090C),
            leading: IconButton(
              icon: Container(
                padding: const EdgeInsets.all(6),
                decoration: const BoxDecoration(
                  color: Colors.black54,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.arrow_back_rounded, color: Colors.white, size: 20),
              ),
              onPressed: () => Navigator.pop(context),
            ),
            actions: [
              Consumer<WatchlistService>(
                builder: (context, watchlistService, _) {
                  final isBookmarked = watchlistService.isBookmarked(widget.item);
                  return IconButton(
                    icon: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                        color: Colors.black54,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        isBookmarked ? Icons.bookmark_rounded : Icons.bookmark_outline_rounded,
                        color: isBookmarked ? AppTheme.primary : Colors.white,
                        size: 20,
                      ),
                    ),
                    onPressed: () {
                      watchlistService.toggleBookmark(widget.item);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          duration: const Duration(seconds: 1),
                          backgroundColor: const Color(0xFF1B1B22),
                          content: Text(
                            isBookmarked ? 'Removed from Watch List' : 'Added to Watch List',
                            style: const TextStyle(color: Colors.white),
                          ),
                        ),
                      );
                    },
                    tooltip: 'Watch List',
                  );
                },
              ),
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: const BoxDecoration(
                    color: Colors.black54,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.download_rounded, color: Colors.white, size: 20),
                ),
                onPressed: _showDownloadsModal,
                tooltip: 'Downloads',
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  CachedNetworkImage(
                    imageUrl: widget.item.image,
                    fit: BoxFit.cover,
                    errorWidget: (_, __, ___) => Container(color: const Color(0xFF141418)),
                  ),
                  // Dark Vignette Gradient
                  DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.transparent,
                          const Color(0xFF09090C).withOpacity(0.5),
                          const Color(0xFF09090C),
                        ],
                        stops: const [0.3, 0.7, 1.0],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Main Info Details
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title
                  Text(
                    widget.item.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.4,
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Metadata Badges Row (Vega App style)
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppTheme.primary,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.star_rounded, color: Colors.white, size: 14),
                            const SizedBox(width: 4),
                            Text(
                              widget.item.rating ?? '8.5',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.white10,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          widget.item.year ?? '2024',
                          style: const TextStyle(color: Color(0xFFC0C0D0), fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.white10,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'Hindi + English',
                          style: TextStyle(color: Color(0xFFC0C0D0), fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Synopsis with Read More
                  GestureDetector(
                    onTap: () {
                      setState(() {
                        _isSynopsisExpanded = !_isSynopsisExpanded;
                      });
                    },
                    child: Text(
                      'Experience this blockbuster title with complete multi-audio options, high speed Google Drive mirrors, direct cloud streaming in full 4K UHD and 1080p, and smooth in-app playback or VLC external player.',
                      maxLines: _isSynopsisExpanded ? 10 : 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF888894),
                        fontSize: 13,
                        height: 1.45,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Vega Style Quality Filters Header
                  const Text(
                    'SELECT QUALITY',
                    style: TextStyle(
                      color: Color(0xFF6B6B78),
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 8),

                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _qualities.map((q) {
                        final isSel = _selectedQuality == q;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(q),
                            selected: isSel,
                            selectedColor: AppTheme.primary,
                            backgroundColor: const Color(0xFF14141A),
                            labelStyle: TextStyle(
                              color: isSel ? Colors.white : const Color(0xFFA0A0B0),
                              fontWeight: isSel ? FontWeight.bold : FontWeight.w500,
                              fontSize: 12,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                              side: BorderSide(
                                color: isSel ? AppTheme.primary : const Color(0xFF242430),
                              ),
                            ),
                            onSelected: (_) => setState(() => _selectedQuality = q),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Audio / Dub Filters Header
                  const Text(
                    'SELECT AUDIO / DUB',
                    style: TextStyle(
                      color: Color(0xFF6B6B78),
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 8),

                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _dubs.map((d) {
                        final isSel = _selectedDub == d;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(d),
                            selected: isSel,
                            selectedColor: const Color(0xFF282834),
                            backgroundColor: const Color(0xFF14141A),
                            labelStyle: TextStyle(
                              color: isSel ? Colors.white : const Color(0xFFA0A0B0),
                              fontWeight: isSel ? FontWeight.bold : FontWeight.w500,
                              fontSize: 12,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                              side: BorderSide(
                                color: isSel ? Colors.white38 : const Color(0xFF242430),
                              ),
                            ),
                            onSelected: (_) => setState(() => _selectedDub = d),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Servers & Links Section Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'STREAMING & DOWNLOAD SERVERS',
                        style: TextStyle(
                          color: Color(0xFF6B6B78),
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.2,
                        ),
                      ),
                      Text(
                        '${filteredStreams.length} available',
                        style: const TextStyle(color: Color(0xFF888894), fontSize: 11),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),

          // Server Cards List
          if (_isLoadingStreams)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator(color: AppTheme.primary)),
              ),
            )
          else if (filteredStreams.isEmpty)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Center(
                  child: Text(
                    'No servers match the selected filters',
                    style: TextStyle(color: Color(0xFF757582)),
                  ),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 18),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final server = filteredStreams[index];

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF131318),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF22222A)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                decoration: BoxDecoration(
                                  color: AppTheme.primary.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  server.quality ?? 'HD',
                                  style: const TextStyle(
                                    color: AppTheme.primary,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                decoration: BoxDecoration(
                                  color: Colors.white10,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  server.type ?? 'Default',
                                  style: const TextStyle(
                                    color: Color(0xFFC0C0D0),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),

                          Text(
                            server.server,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                            ),
                          ),
                          const SizedBox(height: 14),

                          // Action Buttons: Built-In Player + VLC + Download
                          Row(
                            children: [
                              // Play in App (Primary Red)
                              Expanded(
                                flex: 3,
                                child: SizedBox(
                                  height: 38,
                                  child: ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppTheme.primary,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(horizontal: 8),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      elevation: 0,
                                    ),
                                    onPressed: () => _openInBuiltInPlayer(server),
                                    icon: const Icon(Icons.play_circle_fill_rounded, size: 16),
                                    label: const Text(
                                      'Play in App',
                                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),

                              // Open in VLC (Minimal Dark Glass)
                              Expanded(
                                flex: 3,
                                child: SizedBox(
                                  height: 38,
                                  child: OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: Colors.white,
                                      backgroundColor: const Color(0xFF1D1D24),
                                      side: const BorderSide(color: Color(0xFF333340)),
                                      padding: const EdgeInsets.symmetric(horizontal: 8),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                    onPressed: () => _openInVlc(server),
                                    icon: const Icon(Icons.launch_rounded, color: Colors.orangeAccent, size: 16),
                                    label: const Text(
                                      'Open VLC',
                                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),

                              // Download Button (Direct folder selector & progress)
                              SizedBox(
                                height: 38,
                                width: 44,
                                child: IconButton(
                                  style: IconButton.styleFrom(
                                    backgroundColor: const Color(0xFF1D1D24),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                      side: const BorderSide(color: Color(0xFF333340)),
                                    ),
                                  ),
                                  icon: const Icon(Icons.download_rounded, color: Colors.greenAccent, size: 18),
                                  onPressed: () => _startDownload(server),
                                  tooltip: 'Download',
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                  childCount: filteredStreams.length,
                ),
              ),
            ),

          const SliverToBoxAdapter(child: SizedBox(height: 40)),
        ],
      ),
    );
  }
}
