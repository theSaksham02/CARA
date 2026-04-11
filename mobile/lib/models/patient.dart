/// Patient data model.
class Patient {
  final String id;
  final String fullName;
  final int ageMonths;
  final String? caregiverName;
  final String? sex;
  final String? village;
  final String? createdBy;
  final DateTime createdAt;
  final String? latestUrgency;
  final DateTime? lastSeenDate;

  Patient({
    required this.id,
    required this.fullName,
    required this.ageMonths,
    this.caregiverName,
    this.sex,
    this.village,
    this.createdBy,
    required this.createdAt,
    this.latestUrgency,
    this.lastSeenDate,
  });

  String get ageDisplay {
    if (ageMonths >= 24) {
      return '${(ageMonths / 12).floor()}y';
    }
    return '${ageMonths}m';
  }

  factory Patient.fromJson(Map<String, dynamic> json) {
    return Patient(
      id: json['id'] ?? '',
      fullName: json['full_name'] ?? json['fullName'] ?? '',
      ageMonths: json['age_months'] ?? json['ageMonths'] ?? 0,
      caregiverName: json['caregiver_name'] ?? json['caregiverName'],
      sex: json['sex'],
      village: json['village'],
      createdBy: json['created_by'] ?? json['createdBy'],
      createdAt: DateTime.tryParse(json['created_at'] ?? json['createdAt'] ?? '') ?? DateTime.now(),
      latestUrgency: json['latest_urgency'] ?? json['latestUrgency'],
      lastSeenDate: json['last_seen_date'] != null
          ? DateTime.tryParse(json['last_seen_date'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'full_name': fullName,
      'age_months': ageMonths,
      'caregiver_name': caregiverName,
      'sex': sex,
      'village': village,
      'created_by': createdBy,
      'created_at': createdAt.toIso8601String(),
    };
  }

  Map<String, dynamic> toDbMap() {
    return {
      'id': id,
      'full_name': fullName,
      'age_months': ageMonths,
      'caregiver_name': caregiverName,
      'sex': sex,
      'village': village,
      'created_by': createdBy,
      'created_at': createdAt.toIso8601String(),
      'synced': 0,
    };
  }

  factory Patient.fromDbMap(Map<String, dynamic> map) {
    return Patient(
      id: map['id'],
      fullName: map['full_name'],
      ageMonths: map['age_months'],
      caregiverName: map['caregiver_name'],
      sex: map['sex'],
      village: map['village'],
      createdBy: map['created_by'],
      createdAt: DateTime.tryParse(map['created_at'] ?? '') ?? DateTime.now(),
    );
  }
}
