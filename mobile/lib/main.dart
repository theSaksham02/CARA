import 'package:flutter/material.dart';
import 'package:cara_mobile/screens/dashboard.dart';
import 'package:cara_mobile/screens/triage.dart';
import 'package:cara_mobile/screens/voice_note.dart';
import 'package:cara_mobile/screens/readmission.dart';
import 'package:cara_mobile/services/api_service.dart';
import 'package:cara_mobile/services/local_db.dart';
import 'package:cara_mobile/services/sync_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CaraApp());
}

class CaraApp extends StatelessWidget {
  const CaraApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CARA',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0EA5E9),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        fontFamily: 'Roboto',
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          elevation: 0,
        ),
        cardTheme: CardThemeData(
          elevation: 1,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        ),
      ),
      home: const CaraHome(),
    );
  }
}

class CaraHome extends StatefulWidget {
  const CaraHome({super.key});

  @override
  State<CaraHome> createState() => _CaraHomeState();
}

class _CaraHomeState extends State<CaraHome> {
  final LocalDb _localDb = LocalDb();
  final ApiService _apiService = ApiService();
  late final SyncService _syncService;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _syncService = SyncService(localDb: _localDb, apiService: _apiService);
    _syncService.startListening();
  }

  @override
  void dispose() {
    _syncService.stopListening();
    _apiService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      DashboardScreen(localDb: _localDb, apiService: _apiService),
      TriageScreen(localDb: _localDb, apiService: _apiService),
      VoiceNoteScreen(localDb: _localDb, apiService: _apiService),
      ReadmissionScreen(localDb: _localDb, apiService: _apiService),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.assessment_outlined),
            selectedIcon: Icon(Icons.assessment),
            label: 'Triage',
          ),
          NavigationDestination(
            icon: Icon(Icons.mic_outlined),
            selectedIcon: Icon(Icons.mic),
            label: 'Voice',
          ),
          NavigationDestination(
            icon: Icon(Icons.timeline_outlined),
            selectedIcon: Icon(Icons.timeline),
            label: 'Risk',
          ),
        ],
      ),
    );
  }
}
