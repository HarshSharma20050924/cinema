import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/provider_service.dart';
import '../theme/app_theme.dart';
import 'home_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  int _step = 1; // 1: Provider Name, 2: Extension Selection
  final TextEditingController _providerInputController = TextEditingController();
  final TextEditingController _searchExtensionController = TextEditingController();
  String? _errorMessage;
  String _extensionSearchQuery = '';

  @override
  void dispose() {
    _providerInputController.dispose();
    _searchExtensionController.dispose();
    super.dispose();
  }

  void _verifyProviderName() {
    final cleanInput = _providerInputController.text.trim().toLowerCase();
    if (cleanInput != 'harsh cinema') {
      setState(() {
        _errorMessage = 'Access denied. Please enter the exact provider source name.';
      });
      return;
    }

    setState(() {
      _errorMessage = null;
      _step = 2;
    });
  }

  Future<void> _completeSetup() async {
    final providerService = context.read<ProviderService>();
    final prefs = await SharedPreferences.getInstance();

    // Mark setup as configured
    await prefs.setBool('is_configured', true);
    await prefs.setString('provider_source', _providerInputController.text.trim());

    // Ensure at least one provider is installed and active
    if (providerService.installedExtensions.isEmpty && providerService.extensions.isNotEmpty) {
      await providerService.installAllExtensions();
    } else if (providerService.activeProvider == null && providerService.installedExtensions.isNotEmpty) {
      await providerService.setActiveProvider(providerService.installedExtensions.first);
    }

    if (!mounted) return;

    Navigator.pushReplacement(
      context,
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => const HomeScreen(),
        transitionsBuilder: (_, a, __, c) => FadeTransition(opacity: a, child: c),
        transitionDuration: const Duration(milliseconds: 350),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF09090C),
      body: SafeArea(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 300),
          child: _step == 1 ? _buildStep1() : _buildStep2(),
        ),
      ),
    );
  }

  Widget _buildStep1() {
    return Padding(
      key: const ValueKey('step1'),
      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 20),
          // App brand badge
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white12),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(9),
                  child: Image.asset('assets/icon.png', fit: BoxFit.cover),
                ),
              ),
              const SizedBox(width: 12),
              const Text(
                'CINEMA',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 2,
                ),
              ),
            ],
          ),
          const Spacer(),

          // Minimal Step Indicator
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.06),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: Colors.white10),
            ),
            child: const Text(
              'STEP 1 OF 2',
              style: TextStyle(
                color: Color(0xFF888894),
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.2,
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Title & Description
          const Text(
            'Provider Source',
            style: TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Enter your verified provider name to activate extensions and stream access.',
            style: TextStyle(
              color: Color(0xFF8E8E98),
              fontSize: 14,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 32),

          // Input field
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFF131318),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: _errorMessage != null ? AppTheme.primary : const Color(0xFF26262F),
                width: 1.2,
              ),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: TextField(
              controller: _providerInputController,
              autofocus: true,
              style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600),
              decoration: const InputDecoration(
                hintText: 'harsh cinema',
                hintStyle: TextStyle(color: Color(0xFF4C4C56), fontWeight: FontWeight.normal),
                border: InputBorder.none,
                prefixIcon: Icon(Icons.security_rounded, color: Color(0xFF6B6B78), size: 20),
              ),
              onSubmitted: (_) => _verifyProviderName(),
            ),
          ),

          if (_errorMessage != null) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.error_outline_rounded, color: AppTheme.primary, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: AppTheme.primary, fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
          ],

          const Spacer(),

          // Submit Button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              onPressed: _verifyProviderName,
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Verify & Continue',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                  ),
                  SizedBox(width: 8),
                  Icon(Icons.arrow_forward_rounded, size: 18),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildStep2() {
    final providerService = context.watch<ProviderService>();
    final allExtensions = providerService.extensions;
    final filtered = _extensionSearchQuery.isEmpty
        ? allExtensions
        : allExtensions
            .where((e) =>
                e.name.toLowerCase().contains(_extensionSearchQuery.toLowerCase()) ||
                e.value.toLowerCase().contains(_extensionSearchQuery.toLowerCase()))
            .toList();

    final installedCount = providerService.installedExtensions.length;

    return Padding(
      key: const ValueKey('step2'),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Step 2 Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: Colors.white10),
                ),
                child: const Text(
                  'STEP 2 OF 2',
                  style: TextStyle(
                    color: Color(0xFF888894),
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.2,
                  ),
                ),
              ),
              TextButton.icon(
                style: TextButton.styleFrom(foregroundColor: AppTheme.primary),
                onPressed: () => providerService.installAllExtensions(),
                icon: const Icon(Icons.flash_on_rounded, size: 16),
                label: const Text('Install All', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 10),

          const Text(
            'Select Extensions',
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Installed ($installedCount / ${allExtensions.length}) providers',
            style: const TextStyle(color: Color(0xFF8E8E98), fontSize: 13),
          ),
          const SizedBox(height: 16),

          // Search Box for extensions
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFF131318),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF26262F)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: TextField(
              controller: _searchExtensionController,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: const InputDecoration(
                hintText: 'Filter extensions (Vega, HDHub, Drive...)',
                hintStyle: TextStyle(color: Color(0xFF555562)),
                border: InputBorder.none,
                prefixIcon: Icon(Icons.search_rounded, color: Color(0xFF6B6B78), size: 18),
              ),
              onChanged: (val) {
                setState(() {
                  _extensionSearchQuery = val.trim();
                });
              },
            ),
          ),
          const SizedBox(height: 12),

          // Batch progress if installing all
          if (providerService.batchProgress != null) ...[
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  LinearProgressIndicator(
                    color: AppTheme.primary,
                    backgroundColor: Colors.white10,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    providerService.batchProgress!,
                    style: const TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ],

          // Extensions List
          Expanded(
            child: filtered.isEmpty
                ? const Center(
                    child: Text(
                      'No matching extensions found',
                      style: TextStyle(color: Color(0xFF6B6B78)),
                    ),
                  )
                : ListView.builder(
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final ext = filtered[index];
                      final isInstalled = ext.isInstalled;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF121216),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isInstalled ? AppTheme.primary.withOpacity(0.4) : const Color(0xFF202027),
                          ),
                        ),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                          leading: CircleAvatar(
                            radius: 18,
                            backgroundColor: isInstalled ? AppTheme.primary : const Color(0xFF1D1D24),
                            child: Text(
                              ext.name.isNotEmpty ? ext.name[0].toUpperCase() : 'P',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ),
                          title: Text(
                            ext.name,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                            ),
                          ),
                          subtitle: Text(
                            'v${ext.version} • ${ext.value}',
                            style: const TextStyle(color: Color(0xFF6B6B78), fontSize: 12),
                          ),
                          trailing: Switch(
                            value: isInstalled,
                            activeColor: AppTheme.primary,
                            onChanged: (_) => providerService.toggleExtension(ext),
                          ),
                        ),
                      );
                    },
                  ),
          ),

          const SizedBox(height: 12),

          // Finish / Enter Cinema button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              onPressed: _completeSetup,
              child: const Text(
                'Enter Cinema',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
