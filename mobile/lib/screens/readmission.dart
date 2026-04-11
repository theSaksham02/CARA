import 'package:flutter/material.dart';
import 'package:cara_mobile/models/readmission_record.dart';
import 'package:cara_mobile/services/local_db.dart';
import 'package:cara_mobile/services/api_service.dart';
import 'package:cara_mobile/widgets/risk_bar.dart';

/// Screen 4: Readmission Risk Dashboard
/// Patient list filtered by condition (TB/HIV/Diabetes), risk score bars, follow-up scheduler.
class ReadmissionScreen extends StatefulWidget {
  final LocalDb localDb;
  final ApiService apiService;

  const ReadmissionScreen({
    super.key,
    required this.localDb,
    required this.apiService,
  });

  @override
  State<ReadmissionScreen> createState() => _ReadmissionScreenState();
}

class _ReadmissionScreenState extends State<ReadmissionScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<ReadmissionRecord> _records = [];
  bool _isLoading = true;
  String _selectedCondition = 'ALL';

  final List<String> _conditions = ['ALL', 'TB', 'HIV', 'DIABETES'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _conditions.length, vsync: this);
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) return;
      _selectedCondition = _conditions[_tabController.index];
      _loadRecords();
    });
    _loadRecords();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadRecords() async {
    setState(() => _isLoading = true);

    try {
      final condition = _selectedCondition == 'ALL' ? null : _selectedCondition;

      // Try API first
      final apiRecords = await widget.apiService.getReadmissionRecords(condition: condition);
      if (apiRecords != null) {
        _records = apiRecords.map((r) => ReadmissionRecord.fromJson(r)).toList();
      } else {
        // Offline fallback
        final localRecords = await widget.localDb.getReadmissionRecords(condition: condition);
        _records = localRecords.map((r) => ReadmissionRecord.fromDbMap(r)).toList();
      }
    } catch (_) {
      final localRecords = await widget.localDb.getReadmissionRecords();
      _records = localRecords.map((r) => ReadmissionRecord.fromDbMap(r)).toList();
    }

    if (mounted) setState(() => _isLoading = false);
  }

  Color _conditionColor(String condition) {
    switch (condition.toUpperCase()) {
      case 'TB':
        return const Color(0xFF0EA5E9);
      case 'HIV':
        return const Color(0xFF8B5CF6);
      case 'DIABETES':
        return const Color(0xFFF59E0B);
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final highRiskCount = _records.where((r) => r.isHighRisk).length;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Readmission Risk',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17),
        ),
        backgroundColor: const Color(0xFFF59E0B),
        foregroundColor: Colors.white,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          labelStyle: const TextStyle(fontWeight: FontWeight.w700),
          tabs: _conditions.map((c) => Tab(text: c)).toList(),
        ),
      ),
      body: Column(
        children: [
          // Summary bar
          if (highRiskCount > 0)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              color: const Color(0xFFFEE2E2),
              child: Row(
                children: [
                  const Icon(Icons.warning_rounded, color: Color(0xFFEF4444), size: 20),
                  const SizedBox(width: 8),
                  Text(
                    '$highRiskCount HIGH risk patient${highRiskCount == 1 ? '' : 's'} requiring urgent follow-up',
                    style: const TextStyle(
                      color: Color(0xFFEF4444),
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),

          // Records list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _records.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.timeline_rounded, size: 64, color: Colors.grey[300]),
                            const SizedBox(height: 12),
                            Text(
                              'No risk assessments yet',
                              style: TextStyle(fontSize: 16, color: Colors.grey[500]),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Run a prediction from a patient\'s dashboard.',
                              style: TextStyle(fontSize: 13, color: Colors.grey[400]),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadRecords,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _records.length,
                          itemBuilder: (context, index) {
                            final record = _records[index];
                            return _RiskCard(record: record, conditionColor: _conditionColor(record.condition));
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}

class _RiskCard extends StatelessWidget {
  final ReadmissionRecord record;
  final Color conditionColor;

  const _RiskCard({
    required this.record,
    required this.conditionColor,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      elevation: record.isHighRisk ? 3 : 1,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          border: record.isHighRisk
              ? Border.all(color: const Color(0xFFEF4444).withAlpha(77), width: 1.5)
              : null,
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Condition badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: conditionColor.withAlpha(26),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    record.condition,
                    style: TextStyle(
                      color: conditionColor,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                if (record.patientName != null)
                  Expanded(
                    child: Text(
                      record.patientName!,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                    ),
                  ),
                const Spacer(),
                if (record.isHighRisk)
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Icon(Icons.notification_important, color: Color(0xFFEF4444), size: 18),
                  ),
              ],
            ),

            const SizedBox(height: 12),

            // Risk bar
            RiskBar(riskScore: record.riskScore, riskLevel: record.riskLevel),

            const SizedBox(height: 12),

            // Reason
            Text(
              record.reason,
              style: TextStyle(fontSize: 13, color: Colors.grey[700], height: 1.3),
            ),

            const SizedBox(height: 10),

            // Follow-up date
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.calendar_today_rounded, size: 16, color: Color(0xFF64748B)),
                  const SizedBox(width: 8),
                  Text(
                    'Follow-up: ${record.followUpDate}',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${record.followUpDays} days',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
