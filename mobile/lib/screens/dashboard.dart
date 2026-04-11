import 'package:flutter/material.dart';
import 'package:cara_mobile/models/patient.dart';
import 'package:cara_mobile/services/local_db.dart';
import 'package:cara_mobile/services/api_service.dart';
import 'package:cara_mobile/widgets/triage_badge.dart';
import 'package:cara_mobile/screens/triage.dart';
import 'package:cara_mobile/screens/voice_note.dart';
import 'package:cara_mobile/screens/readmission.dart';
import 'package:uuid/uuid.dart';

/// Screen 1: Patient Dashboard
/// Lists patients with search, triage badges, last seen date, and quick actions.
class DashboardScreen extends StatefulWidget {
  final LocalDb localDb;
  final ApiService apiService;

  const DashboardScreen({
    super.key,
    required this.localDb,
    required this.apiService,
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  List<Patient> _patients = [];
  Map<String, String> _urgencyMap = {};
  bool _isLoading = true;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadPatients();
  }

  Future<void> _loadPatients() async {
    setState(() => _isLoading = true);

    try {
      // Try online first, fallback to local
      final apiPatients = await widget.apiService.getPatients();
      if (apiPatients != null) {
        _patients = apiPatients.map((p) => Patient.fromJson(p)).toList();
        // Save to local DB
        for (final p in _patients) {
          await widget.localDb.insertPatient({...p.toDbMap(), 'synced': 1});
        }
      } else {
        // Offline — load from SQLite
        final localPatients = await widget.localDb.getPatients(search: _searchQuery.isNotEmpty ? _searchQuery : null);
        _patients = localPatients.map((p) => Patient.fromDbMap(p)).toList();
      }

      // Load urgency for each patient
      final map = <String, String>{};
      for (final p in _patients) {
        final urgency = await widget.localDb.getLatestUrgency(p.id);
        if (urgency != null) map[p.id] = urgency;
      }
      _urgencyMap = map;
    } catch (_) {
      // Load from local as ultimate fallback
      final localPatients = await widget.localDb.getPatients();
      _patients = localPatients.map((p) => Patient.fromDbMap(p)).toList();
    }

    if (mounted) setState(() => _isLoading = false);
  }

  void _onSearch(String query) {
    _searchQuery = query;
    _loadPatients();
  }

  Future<void> _addPatient() async {
    final result = await _showAddPatientDialog();
    if (result != null) {
      await widget.localDb.insertPatient(result.toDbMap());
      await widget.apiService.createPatient(
        fullName: result.fullName,
        ageMonths: result.ageMonths,
        sex: result.sex,
        village: result.village,
      );
      _loadPatients();
    }
  }

  Future<Patient?> _showAddPatientDialog() async {
    final nameController = TextEditingController();
    final ageController = TextEditingController();
    String? sex;
    final villageController = TextEditingController();

    return showDialog<Patient>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Add Patient', style: TextStyle(fontWeight: FontWeight.w700)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Full Name *',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.person),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: ageController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Age (months) *',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.cake),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: sex,
                  decoration: const InputDecoration(
                    labelText: 'Sex',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.wc),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'male', child: Text('Male')),
                    DropdownMenuItem(value: 'female', child: Text('Female')),
                  ],
                  onChanged: (v) => setDialogState(() => sex = v),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: villageController,
                  decoration: const InputDecoration(
                    labelText: 'Village',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.location_on),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                if (nameController.text.isEmpty || ageController.text.isEmpty) return;
                Navigator.pop(ctx, Patient(
                  id: const Uuid().v4(),
                  fullName: nameController.text,
                  ageMonths: int.tryParse(ageController.text) ?? 0,
                  sex: sex,
                  village: villageController.text.isNotEmpty ? villageController.text : null,
                  createdAt: DateTime.now(),
                ));
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0EA5E9),
              ),
              child: const Text('Add', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'CARA',
          style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1),
        ),
        backgroundColor: const Color(0xFF0EA5E9),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.sync_rounded),
            onPressed: _loadPatients,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Color(0xFF0EA5E9),
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(24),
                bottomRight: Radius.circular(24),
              ),
            ),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearch,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Search patients...',
                hintStyle: TextStyle(color: Colors.white.withAlpha(179)),
                prefixIcon: Icon(Icons.search, color: Colors.white.withAlpha(179)),
                filled: true,
                fillColor: Colors.white.withAlpha(51),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),

          // Patient list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _patients.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.people_outline, size: 64, color: Colors.grey[300]),
                            const SizedBox(height: 12),
                            Text(
                              'No patients yet',
                              style: TextStyle(fontSize: 16, color: Colors.grey[500]),
                            ),
                            const SizedBox(height: 8),
                            ElevatedButton.icon(
                              onPressed: _addPatient,
                              icon: const Icon(Icons.add),
                              label: const Text('Add First Patient'),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadPatients,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _patients.length,
                          itemBuilder: (context, index) {
                            final patient = _patients[index];
                            final urgency = _urgencyMap[patient.id];

                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                              elevation: 1,
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Column(
                                  children: [
                                    Row(
                                      children: [
                                        CircleAvatar(
                                          backgroundColor: const Color(0xFF0EA5E9).withAlpha(26),
                                          child: Text(
                                            patient.fullName.isNotEmpty
                                                ? patient.fullName[0].toUpperCase()
                                                : '?',
                                            style: const TextStyle(
                                              color: Color(0xFF0EA5E9),
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                patient.fullName,
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.w600,
                                                  fontSize: 15,
                                                ),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                '${patient.ageDisplay} • ${patient.sex ?? "—"} • ${patient.village ?? "—"}',
                                                style: TextStyle(
                                                  fontSize: 13,
                                                  color: Colors.grey[600],
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        if (urgency != null) TriageBadge(urgency: urgency),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    Row(
                                      children: [
                                        _QuickAction(
                                          icon: Icons.assessment_rounded,
                                          label: 'Triage',
                                          color: const Color(0xFF0EA5E9),
                                          onTap: () => Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => TriageScreen(
                                                localDb: widget.localDb,
                                                apiService: widget.apiService,
                                                patient: patient,
                                              ),
                                            ),
                                          ).then((_) => _loadPatients()),
                                        ),
                                        const SizedBox(width: 8),
                                        _QuickAction(
                                          icon: Icons.mic_rounded,
                                          label: 'Voice Note',
                                          color: const Color(0xFF8B5CF6),
                                          onTap: () => Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => VoiceNoteScreen(
                                                localDb: widget.localDb,
                                                apiService: widget.apiService,
                                                patient: patient,
                                              ),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        _QuickAction(
                                          icon: Icons.timeline_rounded,
                                          label: 'Risk',
                                          color: const Color(0xFFF59E0B),
                                          onTap: () => Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => ReadmissionScreen(
                                                localDb: widget.localDb,
                                                apiService: widget.apiService,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addPatient,
        backgroundColor: const Color(0xFF0EA5E9),
        child: const Icon(Icons.person_add, color: Colors.white),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: color.withAlpha(20),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
