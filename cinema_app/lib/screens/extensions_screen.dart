import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/provider_service.dart';
import '../theme/app_theme.dart';

class ExtensionsScreen extends StatefulWidget {
  const ExtensionsScreen({super.key});

  @override
  State<ExtensionsScreen> createState() => _ExtensionsScreenState();
}

class _ExtensionsScreenState extends State<ExtensionsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _filterQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final providerService = context.watch<ProviderService>();
    final allExtensions = providerService.extensions;
    final batchProgress = providerService.batchProgress;

    final filtered = _filterQuery.isEmpty
        ? allExtensions
        : allExtensions
            .where((e) =>
                e.name.toLowerCase().contains(_filterQuery.toLowerCase()) ||
                e.value.toLowerCase().contains(_filterQuery.toLowerCase()))
            .toList();

    return Scaffold(
      backgroundColor: const Color(0xFF09090C),
      appBar: AppBar(
        backgroundColor: const Color(0xFF09090C),
        elevation: 0,
        title: const Text(
          'Extensions',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => providerService.fetchManifest(),
            tooltip: 'Refresh Manifest',
          ),
        ],
      ),
      body: SafeArea(
        bottom: true,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          slivers: [
          // 1-Tap Bulk Setup Banner
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: const Color(0xFF131318),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF22222A)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppTheme.primary.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.flash_on_rounded, color: AppTheme.primary, size: 22),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '1-Tap Bulk Setup',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Install all scrapers & streaming providers automatically',
                                style: TextStyle(color: Color(0xFF888894), fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    if (batchProgress != null) ...[
                      LinearProgressIndicator(
                        color: AppTheme.primary,
                        backgroundColor: Colors.white10,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        batchProgress,
                        style: const TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ] else
                      SizedBox(
                        width: double.infinity,
                        height: 44,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            elevation: 0,
                          ),
                          onPressed: () => providerService.installAllExtensions(),
                          icon: const Icon(Icons.download_done_rounded, size: 18),
                          label: const Text(
                            'Install All Extensions',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),

          // Search Filter Field
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF131318),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF22222A)),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: TextField(
                  controller: _searchController,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Search extensions...',
                    hintStyle: const TextStyle(color: Color(0xFF555562)),
                    border: InputBorder.none,
                    prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF6B6B78), size: 18),
                    suffixIcon: _filterQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded, size: 16, color: Color(0xFF888894)),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _filterQuery = '');
                            },
                          )
                        : null,
                  ),
                  onChanged: (val) {
                    setState(() => _filterQuery = val.trim());
                  },
                ),
              ),
            ),
          ),

          // Header Counter
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'AVAILABLE PROVIDERS (${filtered.length})',
                    style: const TextStyle(
                      color: Color(0xFF757582),
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1,
                    ),
                  ),
                  Text(
                    'Active: ${providerService.activeProvider?.name ?? "None"}',
                    style: const TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ),

          // Extensions List Items
          if (filtered.isEmpty)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Center(
                  child: Text(
                    'No extensions found',
                    style: TextStyle(color: Color(0xFF6B6B78), fontSize: 14),
                  ),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final ext = filtered[index];
                    final isActive = providerService.activeProvider?.value == ext.value;
                    final isInstalled = ext.isInstalled;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF121216),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isActive
                              ? AppTheme.primary.withOpacity(0.6)
                              : (isInstalled ? const Color(0xFF282832) : const Color(0xFF1E1E26)),
                          width: isActive ? 1.4 : 1,
                        ),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                        leading: CircleAvatar(
                          radius: 18,
                          backgroundColor: isActive ? AppTheme.primary : const Color(0xFF1D1D24),
                          child: Text(
                            ext.name.isNotEmpty ? ext.name[0].toUpperCase() : 'P',
                            style: TextStyle(
                              color: isActive ? Colors.white : const Color(0xFFC0C0D0),
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        title: Row(
                          children: [
                            Flexible(
                              child: Text(
                                ext.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.06),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'v${ext.version}',
                                style: const TextStyle(color: Color(0xFF888894), fontSize: 10),
                              ),
                            ),
                          ],
                        ),
                        subtitle: Text(
                          ext.value,
                          style: const TextStyle(color: Color(0xFF6B6B78), fontSize: 11),
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (isInstalled)
                              TextButton(
                                style: TextButton.styleFrom(
                                  foregroundColor: isActive ? AppTheme.primary : const Color(0xFF888894),
                                  backgroundColor: isActive ? AppTheme.primary.withOpacity(0.12) : Colors.transparent,
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                onPressed: () => providerService.setActiveProvider(ext),
                                child: Text(
                                  isActive ? 'ACTIVE' : 'SELECT',
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
                                ),
                              ),
                            const SizedBox(width: 4),
                            Switch(
                              value: isInstalled,
                              activeColor: AppTheme.primary,
                              onChanged: (val) => providerService.toggleExtension(ext),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                  childCount: filtered.length,
                ),
              ),
            ),

          const SliverToBoxAdapter(
            child: SizedBox(height: 60),
          ),
        ],
      ),
    ),
  );
}
}
