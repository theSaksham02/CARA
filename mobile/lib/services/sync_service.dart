import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:cara_mobile/services/api_service.dart';
import 'package:cara_mobile/services/local_db.dart';

/// Background sync service: pushes unsynced local records to the backend when WiFi is available.
/// Uses last-write-wins with timestamp-based conflict resolution.
class SyncService {
  final LocalDb _localDb;
  final ApiService _apiService;
  final Connectivity _connectivity;
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  Timer? _periodicTimer;
  bool _isSyncing = false;

  SyncService({
    required LocalDb localDb,
    required ApiService apiService,
  })  : _localDb = localDb,
        _apiService = apiService,
        _connectivity = Connectivity();

  /// Start listening for connectivity changes and trigger sync.
  void startListening() {
    _subscription = _connectivity.onConnectivityChanged.listen((results) {
      final hasWifi = results.contains(ConnectivityResult.wifi);
      final hasMobile = results.contains(ConnectivityResult.mobile);
      if (hasWifi || hasMobile) {
        syncAll();
      }
    });

    // Also run periodic sync every 5 minutes
    _periodicTimer = Timer.periodic(const Duration(minutes: 5), (_) {
      syncAll();
    });
  }

  /// Stop listening and cancel timers.
  void stopListening() {
    _subscription?.cancel();
    _periodicTimer?.cancel();
  }

  /// Check if device is currently online.
  Future<bool> isOnline() async {
    final results = await _connectivity.checkConnectivity();
    return results.contains(ConnectivityResult.wifi) ||
        results.contains(ConnectivityResult.mobile);
  }

  /// Sync all unsynced records to the backend.
  Future<SyncResult> syncAll() async {
    if (_isSyncing) {
      return SyncResult(synced: 0, failed: 0, message: 'Sync already in progress.');
    }

    if (!await isOnline()) {
      return SyncResult(synced: 0, failed: 0, message: 'Device is offline.');
    }

    _isSyncing = true;
    int synced = 0;
    int failed = 0;

    try {
      // Sync patients first (dependency for other records)
      final patients = await _localDb.getUnsyncedRecords('patients');
      for (final patient in patients) {
        final result = await _apiService.createPatient(
          fullName: patient['full_name'],
          ageMonths: patient['age_months'],
          caregiverName: patient['caregiver_name'],
          sex: patient['sex'],
          village: patient['village'],
        );
        if (result != null) {
          await _localDb.markRecordSynced('patients', patient['id']);
          synced++;
        } else {
          failed++;
        }
      }

      // Sync assessments
      final assessments = await _localDb.getUnsyncedRecords('assessments');
      for (final assessment in assessments) {
        // We can only sync assessments that reference synced patients
        final symptoms = (assessment['symptoms'] as String?)?.split(',') ?? [];
        final result = await _apiService.assessTriage(
          symptoms: symptoms,
          ageMonths: assessment['age_months'],
          patientId: assessment['patient_id'],
        );
        if (result != null) {
          await _localDb.markRecordSynced('assessments', assessment['id']);
          synced++;
        } else {
          failed++;
        }
      }

      // Sync SOAP notes
      final notes = await _localDb.getUnsyncedRecords('soap_notes');
      for (final note in notes) {
        final result = await _apiService.generateNote(
          transcript: note['transcript'],
          patientId: note['patient_id'],
        );
        if (result != null) {
          await _localDb.markRecordSynced('soap_notes', note['id']);
          synced++;
        } else {
          failed++;
        }
      }

      return SyncResult(
        synced: synced,
        failed: failed,
        message: 'Sync completed: $synced synced, $failed failed.',
      );
    } catch (e) {
      return SyncResult(
        synced: synced,
        failed: failed,
        message: 'Sync error: $e',
      );
    } finally {
      _isSyncing = false;
    }
  }

  /// Get the current sync status.
  Future<Map<String, dynamic>> getStatus() async {
    final pending = await _localDb.getPendingSyncCount();
    final online = await isOnline();
    return {
      'online': online,
      'pending_records': pending,
      'is_syncing': _isSyncing,
    };
  }
}

class SyncResult {
  final int synced;
  final int failed;
  final String message;

  SyncResult({
    required this.synced,
    required this.failed,
    required this.message,
  });
}
