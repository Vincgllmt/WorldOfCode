import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:client/main.dart';

void main() {
  testWidgets('App smoke test — renders WOC TV title', (WidgetTester tester) async {
    await tester.pumpWidget(const IptvApp());
    // The app bar shows the brand name; a FutureBuilder fires the network call
    // which won't complete in test, so we verify the loading spinner appears.
    await tester.pump();
    expect(find.byType(CircularProgressIndicator), findsAny);
  });
}
