/// Readmission risk prediction result model.
class ReadmissionRecord {
  final String id;
  final String patientId;
  final String condition;
  final double riskScore;
  final String riskLevel;
  final int followUpDays;
  final String followUpDate;
  final String reason;
  final String? patientName;
  final DateTime createdAt;

  ReadmissionRecord({
    required this.id,
    required this.patientId,
    required this.condition,
    required this.riskScore,
    required this.riskLevel,
    required this.followUpDays,
    required this.followUpDate,
    required this.reason,
    this.patientName,
    required this.createdAt,
  });

  bool get isHighRisk => riskLevel == 'HIGH';
  bool get isMediumRisk => riskLevel == 'MEDIUM';
  bool get isLowRisk => riskLevel == 'LOW';

  int get riskPercentage => (riskScore * 100).round();

  factory ReadmissionRecord.fromJson(Map<String, dynamic> json) {
    return ReadmissionRecord(
      id: json['record_id'] ?? json['id'] ?? '',
      patientId: json['patient_id'] ?? '',
      condition: json['condition'] ?? '',
      riskScore: (json['risk_score'] as num?)?.toDouble() ?? 0.0,
      riskLevel: json['risk_level'] ?? 'LOW',
      followUpDays: json['follow_up_days'] ?? 14,
      followUpDate: json['follow_up_date'] ?? '',
      reason: json['reason'] ?? '',
      patientName: json['patient_name'],
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toDbMap() {
    return {
      'id': id,
      'patient_id': patientId,
      'condition': condition,
      'risk_score': riskScore,
      'risk_level': riskLevel,
      'follow_up_date': followUpDate,
      'reason': reason,
      'created_at': createdAt.toIso8601String(),
      'synced': 0,
    };
  }

  factory ReadmissionRecord.fromDbMap(Map<String, dynamic> map) {
    return ReadmissionRecord(
      id: map['id'],
      patientId: map['patient_id'] ?? '',
      condition: map['condition'] ?? '',
      riskScore: (map['risk_score'] as num?)?.toDouble() ?? 0.0,
      riskLevel: map['risk_level'] ?? 'LOW',
      followUpDays: 14,
      followUpDate: map['follow_up_date'] ?? '',
      reason: map['reason'] ?? '',
      createdAt: DateTime.tryParse(map['created_at'] ?? '') ?? DateTime.now(),
    );
  }
}
