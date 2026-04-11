import 'package:flutter/material.dart';
import 'package:cara_mobile/models/patient.dart';
import 'package:cara_mobile/models/soap_note.dart';
import 'package:cara_mobile/services/local_db.dart';
import 'package:cara_mobile/services/api_service.dart';
import 'package:uuid/uuid.dart';

/// Screen 3: Voice-to-Clinical Note
/// Record audio, transcribe, generate SOAP note, review & edit before saving.
class VoiceNoteScreen extends StatefulWidget {
  final LocalDb localDb;
  final ApiService apiService;
  final Patient? patient;

  const VoiceNoteScreen({
    super.key,
    required this.localDb,
    required this.apiService,
    this.patient,
  });

  @override
  State<VoiceNoteScreen> createState() => _VoiceNoteScreenState();
}

class _VoiceNoteScreenState extends State<VoiceNoteScreen> {
  bool _isRecording = false;
  bool _isProcessing = false;
  String _transcript = '';
  SoapNote? _soapNote;
  String _selectedLanguage = 'en';
  bool _isEditing = false;

  // Editable SOAP controllers
  final _sController = TextEditingController();
  final _oController = TextEditingController();
  final _aController = TextEditingController();
  final _pController = TextEditingController();
  final _transcriptController = TextEditingController();

  final List<Map<String, String>> _languages = [
    {'code': 'en', 'name': 'English'},
    {'code': 'sw', 'name': 'Swahili'},
    {'code': 'hi', 'name': 'Hindi'},
    {'code': 'fr', 'name': 'French'},
    {'code': 'ar', 'name': 'Arabic'},
    {'code': 'ha', 'name': 'Hausa'},
    {'code': 'yo', 'name': 'Yoruba'},
    {'code': 'am', 'name': 'Amharic'},
    {'code': 'pt', 'name': 'Portuguese'},
    {'code': 'es', 'name': 'Spanish'},
  ];

  void _toggleRecording() {
    setState(() {
      _isRecording = !_isRecording;
      if (!_isRecording) {
        // Simulate stopping recording and transcribing
        _simulateTranscription();
      }
    });
  }

  Future<void> _simulateTranscription() async {
    setState(() => _isProcessing = true);

    // In a real implementation, this would:
    // 1. Stop the audio recorder
    // 2. Get the audio file
    // 3. Convert to base64
    // 4. Send to /api/voice/transcribe
    // For now, show a text input for manual transcript entry

    await Future.delayed(const Duration(milliseconds: 500));

    if (mounted) {
      setState(() {
        _isProcessing = false;
        if (_transcript.isEmpty) {
          // Show transcript input
          _showTranscriptInput();
        }
      });
    }
  }

  Future<void> _showTranscriptInput() async {
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) {
        final controller = TextEditingController();
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Enter Transcript', style: TextStyle(fontWeight: FontWeight.w700)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Whisper transcription service is not available. Enter the clinical encounter text manually:',
                style: TextStyle(fontSize: 13, color: Colors.grey),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                maxLines: 5,
                decoration: const InputDecoration(
                  hintText: 'Mother reports child has had fever for 2 days. Temperature measured at 38.5°C...',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, controller.text),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF8B5CF6)),
              child: const Text('Generate SOAP Note', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );

    if (result != null && result.isNotEmpty) {
      setState(() => _transcript = result);
      _transcriptController.text = result;
      await _generateSoapNote(result);
    }
  }

  Future<void> _generateSoapNote(String transcript) async {
    setState(() => _isProcessing = true);

    try {
      // Try API first
      final response = await widget.apiService.generateNote(
        transcript: transcript,
        patientId: widget.patient?.id,
      );

      if (response != null && response['note'] != null) {
        final note = response['note'];
        _soapNote = SoapNote(
          id: note['id'] ?? const Uuid().v4(),
          patientId: widget.patient?.id,
          transcript: transcript,
          subjective: _extractSection(note['subjective']),
          objective: _extractSection(note['objective']),
          assessment: _extractSection(note['assessment']),
          plan: _extractSection(note['plan']),
          createdAt: DateTime.now(),
        );
      } else {
        // Offline fallback — basic SOAP classification
        _soapNote = SoapNote(
          id: const Uuid().v4(),
          patientId: widget.patient?.id,
          transcript: transcript,
          subjective: 'Patient/caregiver report: $transcript',
          objective: 'No objective findings entered.',
          assessment: 'Assessment pending clinical review.',
          plan: 'Follow up as indicated.',
          createdAt: DateTime.now(),
        );
      }

      if (_soapNote != null) {
        _sController.text = _soapNote!.subjective;
        _oController.text = _soapNote!.objective;
        _aController.text = _soapNote!.assessment;
        _pController.text = _soapNote!.plan;
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error generating note: $e')),
        );
      }
    }

    if (mounted) setState(() => _isProcessing = false);
  }

  String _extractSection(dynamic value) {
    if (value is String) return value;
    if (value is List) return value.join(' ');
    return value?.toString() ?? '';
  }

  Future<void> _saveNote() async {
    if (_soapNote == null) return;

    final note = SoapNote(
      id: _soapNote!.id,
      patientId: widget.patient?.id,
      transcript: _transcriptController.text,
      subjective: _sController.text,
      objective: _oController.text,
      assessment: _aController.text,
      plan: _pController.text,
      createdAt: DateTime.now(),
    );

    await widget.localDb.insertSoapNote(note.toDbMap());

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✅ SOAP note saved.')),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          widget.patient != null
              ? 'Voice Note — ${widget.patient!.fullName}'
              : 'Voice-to-Clinical Note',
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17),
        ),
        backgroundColor: const Color(0xFF8B5CF6),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Language selector
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const Icon(Icons.language, color: Color(0xFF8B5CF6)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _selectedLanguage,
                        decoration: const InputDecoration(
                          labelText: 'Language',
                          border: OutlineInputBorder(),
                        ),
                        items: _languages.map((l) => DropdownMenuItem(
                          value: l['code'],
                          child: Text(l['name']!),
                        )).toList(),
                        onChanged: (v) => setState(() => _selectedLanguage = v ?? 'en'),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Record button
            Center(
              child: Column(
                children: [
                  GestureDetector(
                    onTap: _isProcessing ? null : _toggleRecording,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: _isRecording ? 100 : 80,
                      height: _isRecording ? 100 : 80,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _isRecording
                            ? const Color(0xFFEF4444)
                            : const Color(0xFF8B5CF6),
                        boxShadow: [
                          BoxShadow(
                            color: (_isRecording
                                    ? const Color(0xFFEF4444)
                                    : const Color(0xFF8B5CF6))
                                .withAlpha(77),
                            blurRadius: _isRecording ? 24 : 12,
                            spreadRadius: _isRecording ? 4 : 0,
                          ),
                        ],
                      ),
                      child: Icon(
                        _isRecording ? Icons.stop_rounded : Icons.mic_rounded,
                        color: Colors.white,
                        size: _isRecording ? 40 : 36,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _isRecording ? 'Recording... Tap to stop' : 'Tap to record',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: _isProcessing ? null : _showTranscriptInput,
                    icon: const Icon(Icons.keyboard, size: 18),
                    label: const Text('Or enter text manually'),
                  ),
                ],
              ),
            ),

            if (_isProcessing) ...[
              const SizedBox(height: 24),
              const Center(child: CircularProgressIndicator()),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  'Processing transcript...',
                  style: TextStyle(color: Colors.grey[600]),
                ),
              ),
            ],

            // Transcript display
            if (_transcript.isNotEmpty) ...[
              const SizedBox(height: 16),
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.text_snippet, color: Color(0xFF8B5CF6), size: 20),
                          const SizedBox(width: 8),
                          const Text('Transcript',
                              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                          const Spacer(),
                          TextButton(
                            onPressed: () => setState(() => _isEditing = !_isEditing),
                            child: Text(_isEditing ? 'Done' : 'Edit'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (_isEditing)
                        TextField(
                          controller: _transcriptController,
                          maxLines: 4,
                          decoration: const InputDecoration(border: OutlineInputBorder()),
                        )
                      else
                        Text(_transcript, style: TextStyle(color: Colors.grey[700], height: 1.4)),
                    ],
                  ),
                ),
              ),
            ],

            // SOAP Note display
            if (_soapNote != null) ...[
              const SizedBox(height: 16),
              _SoapSection(label: 'S — Subjective', controller: _sController, color: const Color(0xFF0EA5E9)),
              const SizedBox(height: 8),
              _SoapSection(label: 'O — Objective', controller: _oController, color: const Color(0xFF10B981)),
              const SizedBox(height: 8),
              _SoapSection(label: 'A — Assessment', controller: _aController, color: const Color(0xFFF59E0B)),
              const SizedBox(height: 8),
              _SoapSection(label: 'P — Plan', controller: _pController, color: const Color(0xFF8B5CF6)),

              const SizedBox(height: 20),

              // Save button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _saveNote,
                  icon: const Icon(Icons.save_rounded),
                  label: const Text(
                    'Save SOAP Note',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8B5CF6),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _SoapSection extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final Color color;

  const _SoapSection({
    required this.label,
    required this.controller,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 4,
                  height: 20,
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 8),
                Text(label, style: TextStyle(fontWeight: FontWeight.w700, color: color, fontSize: 14)),
              ],
            ),
            const SizedBox(height: 8),
            TextField(
              controller: controller,
              maxLines: 3,
              decoration: InputDecoration(
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: color.withAlpha(77)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: color),
                ),
              ),
              style: const TextStyle(fontSize: 14, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}
