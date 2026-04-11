import 'package:flutter_test/flutter_test.dart';
import 'package:cara_mobile/main.dart';

void main() {
  testWidgets('App renders without error', (WidgetTester tester) async {
    await tester.pumpWidget(const CaraApp());
    expect(find.text('CARA'), findsOneWidget);
  });
}
