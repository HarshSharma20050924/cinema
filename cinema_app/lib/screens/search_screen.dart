import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../services/provider_service.dart';
import '../theme/app_theme.dart';
import 'detail_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _controller = TextEditingController();
  List<MediaItem> _results = [];
  Map<String, List<MediaItem>> _globalResults = {};
  bool _searching = false;
  bool _searchAllExtensions = false;

  final List<String> _popularSuggestions = [
    'Taxi Driver',
    'Deadpool',
    'Batman',
    'Oppenheimer',
    'Interstellar',
    'Dune',
    'Inception',
    'Anime',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _executeSearch('');
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _executeSearch(String query) async {
    setState(() => _searching = true);
    final providerService = context.read<ProviderService>();
    final q = query.trim();

    if (_searchAllExtensions) {
      final map = await providerService.globalSearch(q.isEmpty ? 'movie' : q);
      if (mounted) {
        setState(() {
          _globalResults = map;
          _searching = false;
        });
      }
    } else {
      final list = await providerService.searchContent(q);
      if (mounted) {
        setState(() {
          _results = list;
          _searching = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeProvider = context.watch<ProviderService>().activeProvider;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        elevation: 0,
        titleSpacing: 16,
        title: Container(
          decoration: BoxDecoration(
            color: AppTheme.surfaceLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.borderColor),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: TextField(
            controller: _controller,
            autofocus: false,
            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
            decoration: InputDecoration(
              hintText: _searchAllExtensions
                  ? 'Search all extensions...'
                  : 'Search ${activeProvider?.name ?? "Cinema"}...',
              hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
              border: InputBorder.none,
              prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.textMuted, size: 20),
              suffixIcon: _controller.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear_rounded, size: 18, color: AppTheme.textMuted),
                      onPressed: () {
                        _controller.clear();
                        _executeSearch('');
                      },
                    )
                  : null,
            ),
            onChanged: (val) {
              _executeSearch(val);
            },
            onSubmitted: (val) {
              _executeSearch(val);
            },
          ),
        ),
      ),
      body: SafeArea(
        bottom: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Mode toggle: Active Provider vs All Extensions (Vega App style)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  _buildScopePill(
                    label: activeProvider?.name ?? 'Active Provider',
                    icon: Icons.movie_outlined,
                    isSelected: !_searchAllExtensions,
                    onTap: () {
                      if (_searchAllExtensions) {
                        setState(() => _searchAllExtensions = false);
                        _executeSearch(_controller.text);
                      }
                    },
                  ),
                  const SizedBox(width: 8),
                  _buildScopePill(
                    label: 'All Extensions',
                    icon: Icons.public_rounded,
                    isSelected: _searchAllExtensions,
                    onTap: () {
                      if (!_searchAllExtensions) {
                        setState(() => _searchAllExtensions = true);
                        _executeSearch(_controller.text);
                      }
                    },
                  ),
                ],
              ),
            ),

            // Popular suggestions
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: _popularSuggestions.map((tag) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ActionChip(
                      backgroundColor: AppTheme.surfaceLight,
                      side: const BorderSide(color: AppTheme.borderColor),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      label: Text(
                        tag,
                        style: const TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      onPressed: () {
                        _controller.text = tag;
                        _executeSearch(tag);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
              child: Text(
                _searchAllExtensions
                    ? 'SEARCH ALL EXTENSIONS'
                    : (_controller.text.isEmpty ? 'DISCOVER & TRENDING' : 'RESULTS (${_results.length})'),
                style: const TextStyle(
                  color: AppTheme.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                ),
              ),
            ),

            Expanded(
              child: _searching
                  ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                  : _searchAllExtensions
                      ? _buildGlobalResultsView()
                      : _buildSingleProviderGrid(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScopePill({
    required String label,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary : AppTheme.surfaceLight,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? AppTheme.primary : AppTheme.borderColor,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 15,
              color: isSelected ? Colors.white : AppTheme.textMuted,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : AppTheme.textPrimary,
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Global search grouped by extension with horizontal sliders (Exact Vega SearchResults.tsx layout)
  Widget _buildGlobalResultsView() {
    if (_globalResults.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.travel_explore_rounded, size: 52, color: AppTheme.textMuted.withOpacity(0.5)),
            const SizedBox(height: 12),
            const Text(
              'No results across installed extensions',
              style: TextStyle(color: AppTheme.textMuted, fontSize: 14),
            ),
          ],
        ),
      );
    }

    final entries = _globalResults.entries.toList();

    return ListView.builder(
      padding: const EdgeInsets.only(bottom: 24),
      itemCount: entries.length,
      itemBuilder: (context, index) {
        final entry = entries[index];
        final providerName = entry.key;
        final items = entry.value;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: AppTheme.primary,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        providerName,
                        style: const TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    '${items.length} items',
                    style: const TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(
              height: 210,
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: items.length,
                itemBuilder: (context, itemIdx) {
                  final item = items[itemIdx];
                  return Container(
                    width: 130,
                    margin: const EdgeInsets.only(right: 12),
                    child: GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => DetailScreen(item: item)),
                        );
                      },
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(14),
                              child: CachedNetworkImage(
                                imageUrl: item.image,
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
                            item.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppTheme.textPrimary,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (item.year != null || item.rating != null)
                            Text(
                              '${item.rating ?? "8.0"} • ${item.year ?? "2025"}',
                              style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                            ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
          ],
        );
      },
    );
  }

  // Active Provider 3-column grid
  Widget _buildSingleProviderGrid() {
    if (_results.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.movie_filter_outlined, size: 52, color: AppTheme.textMuted.withOpacity(0.5)),
            const SizedBox(height: 12),
            const Text(
              'No movies found in this provider',
              style: TextStyle(color: AppTheme.textMuted, fontSize: 14),
            ),
          ],
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 0.64,
        crossAxisSpacing: 10,
        mainAxisSpacing: 12,
      ),
      itemCount: _results.length,
      itemBuilder: (context, index) {
        final item = _results[index];
        return GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => DetailScreen(item: item)),
            );
          },
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: CachedNetworkImage(
                    imageUrl: item.image,
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
              const SizedBox(height: 5),
              Text(
                item.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (item.year != null || item.rating != null)
                Text(
                  '${item.rating ?? "8.0"} • ${item.year ?? "2024"}',
                  style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                ),
            ],
          ),
        );
      },
    );
  }
}
