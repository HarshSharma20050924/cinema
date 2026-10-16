import 'package:flutter_test/flutter_test.dart';
import 'package:cinema_app/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({'is_configured': false});
    await tester.pumpWidget(const CinemaApp());
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.byType(CinemaApp), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 2000));
    await tester.pumpAndSettle();
  });
}
