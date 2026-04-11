import 'package:flutter/material.dart';

/// CHW confirmation dialog — mandatory before saving any AI-generated result.
/// Enforces the "AI suggests, CHW decides" ethics constraint.
class ConfirmationDialog extends StatelessWidget {
  final String title;
  final String classification;
  final String reason;
  final String action;
  final double? confidence;
  final bool isRed;
  final VoidCallback onConfirm;
  final VoidCallback onReject;

  const ConfirmationDialog({
    super.key,
    required this.title,
    required this.classification,
    required this.reason,
    required this.action,
    this.confidence,
    this.isRed = false,
    required this.onConfirm,
    required this.onReject,
  });

  Color get _classificationColor {
    switch (classification.toUpperCase()) {
      case 'RED':
        return const Color(0xFFEF4444);
      case 'YELLOW':
        return const Color(0xFFF59E0B);
      case 'GREEN':
        return const Color(0xFF10B981);
      case 'HIGH':
        return const Color(0xFFEF4444);
      case 'MEDIUM':
        return const Color(0xFFF59E0B);
      case 'LOW':
        return const Color(0xFF10B981);
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          Icon(
            isRed ? Icons.emergency_rounded : Icons.assignment_turned_in_rounded,
            color: _classificationColor,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Classification badge
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _classificationColor.withAlpha(26),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _classificationColor.withAlpha(77)),
              ),
              child: Column(
                children: [
                  Text(
                    classification.toUpperCase(),
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      color: _classificationColor,
                    ),
                  ),
                  if (confidence != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Confidence: ${(confidence! * 100).round()}%',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Reason
            const Text(
              'AI Reasoning:',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
            ),
            const SizedBox(height: 4),
            Text(
              reason,
              style: TextStyle(fontSize: 14, color: Colors.grey[700], height: 1.4),
            ),

            const SizedBox(height: 12),

            // Recommended action
            const Text(
              'Recommended Action:',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
            ),
            const SizedBox(height: 4),
            Text(
              action,
              style: TextStyle(fontSize: 14, color: Colors.grey[700], height: 1.4),
            ),

            // RED warning
            if (isRed) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEE2E2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.warning_amber_rounded, color: Color(0xFFDC2626), size: 20),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'RED classification: Refer to facility immediately. This alert cannot be dismissed without confirmation.',
                        style: TextStyle(
                          fontSize: 12,
                          color: Color(0xFFDC2626),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 8),
            Text(
              'Do you confirm this assessment?',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 15,
                color: Colors.grey[800],
              ),
            ),
          ],
        ),
      ),
      actions: [
        if (!isRed)
          TextButton(
            onPressed: onReject,
            child: const Text('Override', style: TextStyle(color: Colors.grey)),
          ),
        ElevatedButton(
          onPressed: onConfirm,
          style: ElevatedButton.styleFrom(
            backgroundColor: _classificationColor,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          child: Text(isRed ? 'Confirm & Refer' : 'Confirm & Save'),
        ),
      ],
    );
  }

  /// Show the confirmation dialog and return true if confirmed.
  static Future<bool> show(
    BuildContext context, {
    required String title,
    required String classification,
    required String reason,
    required String action,
    double? confidence,
    bool isRed = false,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: !isRed, // RED alerts cannot be dismissed
      builder: (ctx) => ConfirmationDialog(
        title: title,
        classification: classification,
        reason: reason,
        action: action,
        confidence: confidence,
        isRed: isRed,
        onConfirm: () => Navigator.of(ctx).pop(true),
        onReject: () => Navigator.of(ctx).pop(false),
      ),
    );
    return result ?? false;
  }
}
