import 'package:flutter/material.dart';
import 'package:cara_mobile/models/patient.dart';
import 'package:cara_mobile/models/assessment.dart';
import 'package:cara_mobile/services/local_db.dart';
import 'package:cara_mobile/services/api_service.dart';
import 'package:cara_mobile/widgets/triage_badge.dart';
import 'package:cara_mobile/widgets/confirmation_dialog.dart';
import 'package:uuid/uuid.dart';

/// Screen 2: Triage Assessment
/// Symptom checklist, vital signs entry, classification display, and CHW confirmation.
class TriageScreen extends StatefulWidget {
  final LocalDb localDb;
  final ApiService apiService;
  final Patient? patient;

  const TriageScreen({
    super.key,
    required this.localDb,
    required this.apiService,
    this.patient,
  });

  @override
  State<TriageScreen> createState() => _TriageScreenState();
}

class _TriageScreenState extends State<TriageScreen> {
  // Input fields
  int _ageMonths = 0;
  String _gender = 'male';
  final Set<String> _selectedSymptoms = {};
  final _tempController = TextEditingController();
  final _rrController = TextEditingController();
  final _muacController = TextEditingController();

  // Result
  Assessment? _result;
  bool _isSubmitting = false;

  // IMCI Danger Signs & Symptom Checklist
  static const Map<String, List<String>> _symptomCategories = {
    'Danger Signs': [
      'convulsions',
      'lethargic',
      'unconscious',
      'unable to drink',
      'vomiting everything',
      'difficulty breathing',
      'chest indrawing',
      'stridor',
    ],
    'Respiratory': [
      'cough',
      'fast breathing',
      'wheezing',
    ],
    'Gastrointestinal': [
      'diarrhoea',
      'blood in stool',
      'sunken eyes',
      'drinks eagerly',
      'dry mouth',
    ],
    'Fever & Infection': [
      'fever',
      'high fever',
      'stiff neck',
      'malaria test positive',
      'chills',
      'body aches',
    ],
    'Ear & Throat': [
      'ear pain',
      'pus draining from ear',
    ],
    'Nutrition': [
      'severe acute malnutrition',
      'moderate acute malnutrition',
      'oedema of both feet',
      'severe palmar pallor',
      'some palmar pallor',
      'not eating',
    ],
  };

  @override
  void initState() {
    super.initState();
    if (widget.patient != null) {
      _ageMonths = widget.patient!.ageMonths;
      _gender = widget.patient!.sex ?? 'male';
    }
  }

  Future<void> _submitTriage() async {
    if (_selectedSymptoms.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one symptom.')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      // Build vitals
      Map<String, dynamic>? vitals;
      if (_tempController.text.isNotEmpty || _rrController.text.isNotEmpty || _muacController.text.isNotEmpty) {
        vitals = {};
        if (_tempController.text.isNotEmpty) vitals['temperature'] = double.tryParse(_tempController.text);
        if (_rrController.text.isNotEmpty) vitals['respiratory_rate'] = int.tryParse(_rrController.text);
        if (_muacController.text.isNotEmpty) vitals['muac'] = int.tryParse(_muacController.text);
      }

      // Call API
      final response = await widget.apiService.assessTriage(
        symptoms: _selectedSymptoms.toList(),
        ageMonths: _ageMonths,
        patientId: widget.patient?.id,
        vitals: vitals,
      );

      if (response != null) {
        final assessmentData = response['assessment'];
        _result = Assessment.fromJson(assessmentData);
      } else {
        // Offline fallback — create a basic assessment
        _result = Assessment(
          id: const Uuid().v4(),
          patientId: widget.patient?.id,
          symptoms: _selectedSymptoms.toList(),
          ageMonths: _ageMonths,
          urgency: _selectedSymptoms.any((s) =>
            ['convulsions', 'unconscious', 'lethargic', 'unable to drink',
             'vomiting everything', 'chest indrawing', 'stridor',
             'difficulty breathing'].contains(s)
          ) ? 'RED' : _selectedSymptoms.length > 2 ? 'YELLOW' : 'GREEN',
          reason: 'Assessed offline — rule-based classification.',
          recommendedAction: 'Review when connectivity is restored.',
          createdAt: DateTime.now(),
        );
      }

      if (_result != null && mounted) {
        _showConfirmation();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _showConfirmation() async {
    if (_result == null) return;

    final confirmed = await ConfirmationDialog.show(
      context,
      title: 'Triage Result',
      classification: _result!.urgency,
      reason: _result!.reason,
      action: _result!.recommendedAction,
      isRed: _result!.isRed,
    );

    if (confirmed && mounted) {
      // Save to local DB
      await widget.localDb.insertAssessment(_result!.toDbMap());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Assessment saved.')),
        );
        Navigator.pop(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          widget.patient != null
              ? 'Triage — ${widget.patient!.fullName}'
              : 'Triage Assessment',
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17),
        ),
        backgroundColor: const Color(0xFF0EA5E9),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Age & Gender
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Patient Info',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: TextEditingController(text: '$_ageMonths'),
                            keyboardType: TextInputType.number,
                            onChanged: (v) => _ageMonths = int.tryParse(v) ?? 0,
                            decoration: const InputDecoration(
                              labelText: 'Age (months)',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(Icons.cake),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _gender,
                            decoration: const InputDecoration(
                              labelText: 'Gender',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(Icons.wc),
                            ),
                            items: const [
                              DropdownMenuItem(value: 'male', child: Text('Male')),
                              DropdownMenuItem(value: 'female', child: Text('Female')),
                            ],
                            onChanged: (v) => setState(() => _gender = v ?? 'male'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Vital Signs
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Vital Signs',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _tempController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Temp (°C)',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(Icons.thermostat),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _rrController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Resp Rate',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(Icons.air),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _muacController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'MUAC (mm)',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(Icons.straighten),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Symptom Checklist
            ..._symptomCategories.entries.map((entry) {
              final isDanger = entry.key == 'Danger Signs';
              return Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                color: isDanger ? const Color(0xFFFEF2F2) : null,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          if (isDanger)
                            const Icon(Icons.warning_rounded, color: Color(0xFFEF4444), size: 18),
                          if (isDanger) const SizedBox(width: 6),
                          Text(
                            entry.key,
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                              color: isDanger ? const Color(0xFFEF4444) : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: entry.value.map((symptom) {
                          final selected = _selectedSymptoms.contains(symptom);
                          return FilterChip(
                            label: Text(
                              symptom,
                              style: TextStyle(
                                fontSize: 13,
                                color: selected
                                    ? Colors.white
                                    : isDanger
                                        ? const Color(0xFFEF4444)
                                        : null,
                              ),
                            ),
                            selected: selected,
                            onSelected: (v) {
                              setState(() {
                                if (v) {
                                  _selectedSymptoms.add(symptom);
                                } else {
                                  _selectedSymptoms.remove(symptom);
                                }
                              });
                            },
                            selectedColor: isDanger
                                ? const Color(0xFFEF4444)
                                : const Color(0xFF0EA5E9),
                            checkmarkColor: Colors.white,
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),
              );
            }),

            const SizedBox(height: 16),

            // Result display
            if (_result != null) ...[
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                color: _result!.isRed
                    ? const Color(0xFFFEF2F2)
                    : _result!.isYellow
                        ? const Color(0xFFFFFBEB)
                        : const Color(0xFFF0FDF4),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text('Classification:',
                              style: TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(width: 8),
                          TriageBadge(urgency: _result!.urgency, size: 14),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(_result!.reason),
                      const SizedBox(height: 8),
                      Text(
                        _result!.recommendedAction,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Submit button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: _isSubmitting ? null : _submitTriage,
                icon: _isSubmitting
                    ? const SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.assessment_rounded),
                label: Text(
                  _isSubmitting ? 'Analyzing...' : 'Run Triage Assessment',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0EA5E9),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
