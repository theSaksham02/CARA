/// SOAP clinical note data model.
class SoapNote {
  final String id;
  final String? patientId;
  final String transcript;
  final String subjective;
  final String objective;
  final String assessment;
  final String plan;
  final List<String> extractedFlags;
  final String? generatedBy;
  final DateTime createdAt;

  SoapNote({
    required this.id,
    this.patientId,
    required this.transcript,
    required this.subjective,
    required this.objective,
    required this.assessment,
    required this.plan,
    this.extractedFlags = const [],
    this.generatedBy,
    required this.createdAt,
  });

  factory SoapNote.fromJson(Map<String, dynamic> json) {
    final soapNote = json['soap_note'] ?? json;
    return SoapNote(
      id: json['note_id'] ?? json['id'] ?? '',
      patientId: json['patient_id'],
      transcript: json['transcript'] ?? '',
      subjective: soapNote['S'] ?? soapNote['subjective'] ?? '',
      objective: soapNote['O'] ?? soapNote['objective'] ?? '',
      assessment: soapNote['A'] ?? soapNote['assessment'] ?? '',
      plan: soapNote['P'] ?? soapNote['plan'] ?? '',
      extractedFlags: List<String>.from(json['extracted_flags'] ?? []),
      generatedBy: json['generated_by'],
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'patient_id': patientId,
      'transcript': transcript,
      'soap_s': subjective,
      'soap_o': objective,
      'soap_a': assessment,
      'soap_p': plan,
      'generated_by': generatedBy,
      'created_at': createdAt.toIso8601String(),
    };
  }

  Map<String, dynamic> toDbMap() {
    return {
      'id': id,
      'patient_id': patientId,
      'transcript': transcript,
      'soap_s': subjective,
      'soap_o': objective,
      'soap_a': assessment,
      'soap_p': plan,
      'generated_by': generatedBy,
      'created_at': createdAt.toIso8601String(),
      'synced': 0,
    };
  }

  factory SoapNote.fromDbMap(Map<String, dynamic> map) {
    return SoapNote(
      id: map['id'],
      patientId: map['patient_id'],
      transcript: map['transcript'] ?? '',
      subjective: map['soap_s'] ?? '',
      objective: map['soap_o'] ?? '',
      assessment: map['soap_a'] ?? '',
      plan: map['soap_p'] ?? '',
      generatedBy: map['generated_by'],
      createdAt: DateTime.tryParse(map['created_at'] ?? '') ?? DateTime.now(),
    );
  }
}
