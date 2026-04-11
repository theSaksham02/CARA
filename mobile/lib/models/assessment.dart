/// Triage assessment data model.
class Assessment {
  final String id;
  final String? patientId;
  final List<String> symptoms;
  final int ageMonths;
  final String urgency;
  final String reason;
  final String recommendedAction;
  final List<String> suggestedTests;
  final String? protocolVersion;
  final String? matchedRuleId;
  final String? transcript;
  final double? confidence;
  final bool chwConfirmed;
  final String? createdBy;
  final DateTime createdAt;

  Assessment({
    required this.id,
    this.patientId,
    required this.symptoms,
    required this.ageMonths,
    required this.urgency,
    required this.reason,
    required this.recommendedAction,
    this.suggestedTests = const [],
    this.protocolVersion,
    this.matchedRuleId,
    this.transcript,
    this.confidence,
    this.chwConfirmed = false,
    this.createdBy,
    required this.createdAt,
  });

  bool get isRed => urgency == 'RED';
  bool get isYellow => urgency == 'YELLOW';
  bool get isGreen => urgency == 'GREEN';

  factory Assessment.fromJson(Map<String, dynamic> json) {
    return Assessment(
      id: json['id'] ?? '',
      patientId: json['patient_id'],
      symptoms: List<String>.from(json['symptoms'] ?? []),
      ageMonths: json['age_months'] ?? 0,
      urgency: json['urgency'] ?? 'GREEN',
      reason: json['reason'] ?? '',
      recommendedAction: json['recommended_action'] ?? '',
      suggestedTests: List<String>.from(json['suggested_tests'] ?? []),
      protocolVersion: json['protocol_version'],
      matchedRuleId: json['matched_rule_id'],
      transcript: json['transcript'],
      confidence: (json['confidence'] as num?)?.toDouble(),
      chwConfirmed: json['chw_confirmed'] ?? false,
      createdBy: json['created_by'],
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'patient_id': patientId,
      'symptoms': symptoms,
      'age_months': ageMonths,
      'urgency': urgency,
      'reason': reason,
      'recommended_action': recommendedAction,
      'suggested_tests': suggestedTests,
      'protocol_version': protocolVersion,
      'matched_rule_id': matchedRuleId,
      'transcript': transcript,
      'confidence': confidence,
      'chw_confirmed': chwConfirmed,
      'created_by': createdBy,
      'created_at': createdAt.toIso8601String(),
    };
  }

  Map<String, dynamic> toDbMap() {
    return {
      'id': id,
      'patient_id': patientId,
      'symptoms': symptoms.join(','),
      'age_months': ageMonths,
      'urgency': urgency,
      'reason': reason,
      'recommended_action': recommendedAction,
      'matched_rule_id': matchedRuleId,
      'chw_confirmed': chwConfirmed ? 1 : 0,
      'created_by': createdBy,
      'created_at': createdAt.toIso8601String(),
      'synced': 0,
    };
  }

  factory Assessment.fromDbMap(Map<String, dynamic> map) {
    return Assessment(
      id: map['id'],
      patientId: map['patient_id'],
      symptoms: (map['symptoms'] as String?)?.split(',') ?? [],
      ageMonths: map['age_months'] ?? 0,
      urgency: map['urgency'] ?? 'GREEN',
      reason: map['reason'] ?? '',
      recommendedAction: map['recommended_action'] ?? '',
      matchedRuleId: map['matched_rule_id'],
      chwConfirmed: map['chw_confirmed'] == 1,
      createdBy: map['created_by'],
      createdAt: DateTime.tryParse(map['created_at'] ?? '') ?? DateTime.now(),
    );
  }
}
