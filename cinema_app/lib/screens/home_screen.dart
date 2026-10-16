import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/models.dart';
import '../services/download_service.dart';
import '../services/provider_service.dart';
import '../theme/app_theme.dart';
import 'detail_screen.dart';
import 'downloads_screen.dart';
import 'extensions_screen.dart';
import 'search_screen.dart';
import 'settings_screen.dart';
import 'watchlist_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentTab = 0;
  List<CatalogSection> _sections = [];
  bool _loadingCatalog = true;

  static const String githubSvg = '''
<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
</svg>
''';

  static const String instagramSvg = '''
<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
</svg>
''';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadCatalog();
    });
  }

  Future<void> _loadCatalog() async {
    setState(() => _loadingCatalog = true);
    final providerService = context.read<ProviderService>();
    final sections = await providerService.getHomeCatalog();
    if (mounted) {
      setState(() {
        _sections = sections;
        _loadingCatalog = false;
      });
    }
  }

  Future<void> _openSocialLink(String url) async {
    try {
      final uri = Uri.parse(url);
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {}
  }

  void _showProviderSelector(BuildContext context) {
    final providerService = context.read<ProviderService>();
    final installed = providerService.installedExtensions;

    showModalBottomSheet(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF111116),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return SafeArea(
          bottom: true,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.7,
            ),
            child: Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Drag indicator handle
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),

                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Select Active Provider',
                          style: TextStyle(
                            color: AppTheme.textPrimary,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        TextButton.icon(
                          style: TextButton.styleFrom(foregroundColor: AppTheme.primary),
                          onPressed: () {
                            Navigator.pop(ctx);
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const ExtensionsScreen()),
                            ).then((_) => _loadCatalog());
                          },
                          icon: const Icon(Icons.add_circle_outline_rounded, size: 18),
                          label: const Text('Add More'),
                        ),
                      ],
                    ),
                  ),
                  const Divider(color: Color(0xFF22222A)),

                  if (installed.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(32),
                      child: Center(
                        child: Text(
                          'No providers installed yet. Open Extensions to install providers.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AppTheme.textMuted),
                        ),
                      ),
                    )
                  else
                    // Smooth, unbounded scroll for all providers
                    Flexible(
                      child: ListView.builder(
                        shrinkWrap: true,
                        itemCount: installed.length,
                        itemBuilder: (context, index) {
                          final ext = installed[index];
                          final isCurrent = providerService.activeProvider?.value == ext.value;

                          return ListTile(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
                            leading: CircleAvatar(
                              backgroundColor: isCurrent ? AppTheme.primary : AppTheme.surfaceLight,
                              child: Text(
                                ext.name[0],
                                style: TextStyle(
                                  color: isCurrent ? Colors.white : AppTheme.textPrimary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            title: Text(
                              ext.name,
                              style: TextStyle(
                                color: isCurrent ? AppTheme.primary : AppTheme.textPrimary,
                                fontWeight: isCurrent ? FontWeight.bold : FontWeight.w500,
                              ),
                            ),
                            subtitle: Text(
                              ext.value,
                              style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                            ),
                            trailing: isCurrent
                                ? const Icon(Icons.check_circle_rounded, color: AppTheme.primary)
                                : null,
                            onTap: () async {
                              await providerService.setActiveProvider(ext);
                              if (ctx.mounted) {
                                Navigator.pop(ctx);
                              }
                              if (mounted) {
                                _loadCatalog();
                              }
                            },
                          );
                        },
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _showDownloadsModal(BuildContext context) {
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
              bottom: true,
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.7,
                ),
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
                                  'Downloads',
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
                            'No downloads yet',
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
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    // 5-Tab Navigation structure inspired by Vega App
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: IndexedStack(
        index: _currentTab,
        children: [
          _buildHomeFeed(),
          const SearchScreen(),
          const WatchListScreen(),
          const DownloadsScreen(),
          const SettingsScreen(),
        ],
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  // 5-Tab Vega App bottom navigation bar (Home, Search, Watch List, Downloads, Settings)
  Widget _buildBottomNav() {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF101115),
        border: Border(
          top: BorderSide(color: Color(0xFF1E2028), width: 1),
        ),
      ),
      child: SafeArea(
        top: false,
        bottom: true,
        child: Container(
          height: 64,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(
                index: 0,
                label: 'Home',
                icon: Icons.home_rounded,
                outlineIcon: Icons.home_outlined,
              ),
              _buildNavItem(
                index: 1,
                label: 'Search',
                icon: Icons.search_rounded,
                outlineIcon: Icons.search_rounded,
              ),
              _buildNavItem(
                index: 2,
                label: 'Watch List',
                icon: Icons.bookmark_rounded,
                outlineIcon: Icons.bookmark_outline_rounded,
              ),
              _buildNavItem(
                index: 3,
                label: 'Downloads',
                icon: Icons.download_rounded,
                outlineIcon: Icons.download_rounded,
              ),
              _buildNavItem(
                index: 4,
                label: 'Settings',
                icon: Icons.settings_rounded,
                outlineIcon: Icons.settings_outlined,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required String label,
    required IconData icon,
    required IconData outlineIcon,
  }) {
    final isSelected = _currentTab == index;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        setState(() => _currentTab = index);
      },
      child: SizedBox(
        width: 64,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Active pill shape matching Vega App (screenshot 2 & 3)
            Container(
              width: 58,
              height: 30,
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFF2C2F36) : Colors.transparent,
                borderRadius: BorderRadius.circular(15),
              ),
              child: Center(
                child: Icon(
                  isSelected ? icon : outlineIcon,
                  size: 21,
                  color: isSelected ? Colors.white : const Color(0xFF8E8E93),
                ),
              ),
            ),
            const SizedBox(height: 3),
            Text(
              label,
              maxLines: 1,
              style: TextStyle(
                color: isSelected ? Colors.white : const Color(0xFF8E8E93),
                fontSize: 10.5,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                letterSpacing: -0.2,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHomeFeed() {
    final providerService = context.watch<ProviderService>();
    final activeProvider = providerService.activeProvider;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        titleSpacing: 16,
        title: Row(
          children: [
            // App Branding
            RichText(
              text: const TextSpan(
                children: [
                  TextSpan(
                    text: 'Cinema',
                    style: TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.5,
                    ),
                  ),
                  TextSpan(
                    text: '●',
                    style: TextStyle(color: AppTheme.primary, fontSize: 18),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 14),

            // Provider Selector Chip
            GestureDetector(
              onTap: () => _showProviderSelector(context),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceLight,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.borderColor),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Colors.greenAccent,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      activeProvider?.name ?? 'Select Provider',
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.arrow_drop_down_rounded, color: AppTheme.textSecondary, size: 20),
                  ],
                ),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search_rounded, size: 24),
            onPressed: () {
              setState(() => _currentTab = 1);
            },
            tooltip: 'Search',
          ),
          IconButton(
            icon: const Icon(Icons.download_rounded, size: 22),
            onPressed: () => _showDownloadsModal(context),
            tooltip: 'Downloads',
          ),
          IconButton(
            icon: const Icon(Icons.extension_rounded, size: 22),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ExtensionsScreen()),
              ).then((_) => _loadCatalog());
            },
            tooltip: 'Extensions Manager',
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        backgroundColor: AppTheme.surface,
        onRefresh: _loadCatalog,
        child: _loadingCatalog
            ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
            : SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Hero Featured Poster
                    if (_sections.isNotEmpty && _sections.first.posts.isNotEmpty)
                      _buildHeroBanner(_sections.first.posts.first),

                    const SizedBox(height: 12),

                    // Sliders for each catalog section (Latest, Web Series, Hollywood, South Movies)
                    ..._sections.map((sec) => _buildCatalogSlider(sec)),

                    const SizedBox(height: 36),

                    // Footer with "written and directed by harsh" + minimal GitHub and Instagram icons
                    _buildFooter(),

                    const SizedBox(height: 28),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildHeroBanner(MediaItem heroItem) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => DetailScreen(item: heroItem)),
        );
      },
      child: Container(
        height: 380,
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Stack(
            fit: StackFit.expand,
            children: [
              CachedNetworkImage(
                imageUrl: heroItem.image,
                fit: BoxFit.cover,
                errorWidget: (_, __, ___) => Container(color: AppTheme.surface),
              ),
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.transparent,
                      Colors.black.withOpacity(0.5),
                      Colors.black.withOpacity(0.95),
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    stops: const [0.3, 0.65, 1.0],
                  ),
                ),
              ),
              Positioned(
                bottom: 20,
                left: 20,
                right: 20,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.primary,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'FEATURED TODAY',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      heroItem.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 44,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: Colors.black,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => DetailScreen(item: heroItem)),
                          );
                        },
                        icon: const Icon(Icons.play_arrow_rounded, color: Colors.black, size: 26),
                        label: const Text(
                          'Watch Now',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Horizontal catalog slider with "See all >" header (Exact Vega layout from screenshot 2 & 3)
  Widget _buildCatalogSlider(CatalogSection section) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                section.title,
                style: const TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.3,
                ),
              ),
              Row(
                children: const [
                  Text(
                    'See all',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(width: 4),
                  Icon(
                    Icons.chevron_right_rounded,
                    color: Colors.white,
                    size: 18,
                  ),
                ],
              ),
            ],
          ),
        ),
        SizedBox(
          height: 220,
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: section.posts.length,
            itemBuilder: (context, index) {
              final post = section.posts[index];
              return Container(
                width: 130,
                margin: const EdgeInsets.only(right: 12),
                child: GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => DetailScreen(item: post)),
                    );
                  },
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: CachedNetworkImage(
                            imageUrl: post.image,
                            fit: BoxFit.cover,
                            width: double.infinity,
                            errorWidget: (_, __, ___) => Container(
                              color: AppTheme.surfaceLight,
                              child: const Center(
                                child: Icon(Icons.movie_rounded, color: AppTheme.textMuted),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        post.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (post.rating != null || post.year != null)
                        Text(
                          '${post.rating ?? "8.0"} • ${post.year ?? "2024"}',
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // Footer: "written and directed by harsh" + minimal GitHub & Instagram clickable icons
  Widget _buildFooter() {
    return Column(
      children: [
        const Divider(color: Color(0xFF1E2028), indent: 40, endIndent: 40),
        const SizedBox(height: 18),
        const Text(
          'written and directed by harsh',
          style: TextStyle(
            color: Color(0xFF8E8E9A),
            fontSize: 13,
            fontStyle: FontStyle.italic,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            IconButton(
              icon: SvgPicture.string(
                githubSvg,
                width: 20,
                height: 20,
                colorFilter: const ColorFilter.mode(Color(0xFFB0B0C0), BlendMode.srcIn),
              ),
              onPressed: () => _openSocialLink('https://github.com/HarshSharma20050924'),
              tooltip: 'GitHub',
            ),
            const SizedBox(width: 14),
            IconButton(
              icon: SvgPicture.string(
                instagramSvg,
                width: 20,
                height: 20,
                colorFilter: const ColorFilter.mode(Color(0xFFB0B0C0), BlendMode.srcIn),
              ),
              onPressed: () => _openSocialLink('https://instagram.com'),
              tooltip: 'Instagram',
            ),
          ],
        ),
      ],
    );
  }
}
