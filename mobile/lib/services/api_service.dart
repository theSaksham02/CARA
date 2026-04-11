import 'dart:convert';
import 'package:http/http.dart' as http;

/// HTTP client for the CARA backend API.
/// Falls back gracefully when offline — all calls return null on network failure.
class ApiService {
  final String baseUrl;
  final http.Client _client;

  ApiService({this.baseUrl = 'http://10.0.2.2:4000'})
      : _client = http.Client();

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

  // ─── Triage ───────────────────────────────────────────

  Future<Map<String, dynamic>?> assessTriage({
    required List<String> symptoms,
    required int ageMonths,
    String? patientId,
    Map<String, dynamic>? vitals,
  }) async {
    try {
      final body = {
        'symptoms': symptoms,
        'age_months': ageMonths,
        if (patientId != null) 'patient_id': patientId,
        if (vitals != null) 'metadata': {'vitals': vitals},
      };

      final response = await _client.post(
        Uri.parse('$baseUrl/api/triage/assess'),
        headers: _headers,
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<List<dynamic>?> getTriageQueue({String? urgency}) async {
    try {
      final uri = Uri.parse('$baseUrl/api/triage/queue').replace(
        queryParameters: {
          if (urgency != null) 'urgency': urgency,
        },
      );
      final response = await _client.get(uri, headers: _headers);
      if (response.statusCode == 200) {
        return jsonDecode(response.body)['queue'];
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  // ─── Patients ─────────────────────────────────────────

  Future<List<dynamic>?> getPatients() async {
    try {
      final response = await _client.get(
        Uri.parse('$baseUrl/api/patients'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body)['patients'];
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, dynamic>?> createPatient({
    required String fullName,
    required int ageMonths,
    String? caregiverName,
    String? sex,
    String? village,
  }) async {
    try {
      final body = {
        'full_name': fullName,
        'age_months': ageMonths,
        if (caregiverName != null) 'caregiver_name': caregiverName,
        if (sex != null) 'sex': sex,
        if (village != null) 'village': village,
      };

      final response = await _client.post(
        Uri.parse('$baseUrl/api/patients'),
        headers: _headers,
        body: jsonEncode(body),
      );

      if (response.statusCode == 201) {
        return jsonDecode(response.body)['patient'];
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  // ─── Voice-to-Note ────────────────────────────────────

  Future<Map<String, dynamic>?> transcribeAudio({
    required String audioBase64,
    String language = 'en',
    String? patientId,
  }) async {
    try {
      final body = {
        'audio_base64': audioBase64,
        'language': language,
        if (patientId != null) 'patient_id': patientId,
      };

      final response = await _client.post(
        Uri.parse('$baseUrl/api/voice/transcribe'),
        headers: _headers,
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, dynamic>?> generateNote({
    required String transcript,
    String? patientId,
  }) async {
    try {
      final body = {
        'transcript': transcript,
        if (patientId != null) 'patient_id': patientId,
      };

      final response = await _client.post(
        Uri.parse('$baseUrl/api/notes/generate'),
        headers: _headers,
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  // ─── Readmission Prediction ───────────────────────────

  Future<Map<String, dynamic>?> predictReadmission({
    required String patientId,
    required String condition,
    required List<Map<String, dynamic>> history,
    int? ageYears,
  }) async {
    try {
      final body = {
        'patient_id': patientId,
        'condition': condition,
        'history': history,
        if (ageYears != null) 'age_years': ageYears,
      };

      final response = await _client.post(
        Uri.parse('$baseUrl/api/readmission/predict'),
        headers: _headers,
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<List<dynamic>?> getReadmissionRecords({String? condition}) async {
    try {
      final uri = Uri.parse('$baseUrl/api/readmission').replace(
        queryParameters: {
          if (condition != null) 'condition': condition,
        },
      );
      final response = await _client.get(uri, headers: _headers);
      if (response.statusCode == 200) {
        return jsonDecode(response.body)['records'];
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  // ─── Sync ─────────────────────────────────────────────

  Future<Map<String, dynamic>?> getSyncStatus() async {
    try {
      final response = await _client.get(
        Uri.parse('$baseUrl/api/sync-status'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  // ─── Dashboard ────────────────────────────────────────

  Future<Map<String, dynamic>?> getDashboardOverview() async {
    try {
      final response = await _client.get(
        Uri.parse('$baseUrl/api/dashboard/overview'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body)['overview'];
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  void dispose() {
    _client.close();
  }
}
