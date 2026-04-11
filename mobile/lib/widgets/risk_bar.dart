import 'package:flutter/material.dart';

/// Colour-coded risk score progress bar for readmission prediction.
class RiskBar extends StatelessWidget {
  final double riskScore;
  final String riskLevel;

  const RiskBar({
    super.key,
    required this.riskScore,
    required this.riskLevel,
  });

  Color get _color {
    switch (riskLevel.toUpperCase()) {
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
    final percentage = (riskScore * 100).round();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              riskLevel.toUpperCase(),
              style: TextStyle(
                color: _color,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
            Text(
              '$percentage%',
              style: TextStyle(
                color: _color,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(
            value: riskScore.clamp(0.0, 1.0),
            minHeight: 8,
            backgroundColor: _color.withAlpha(38),
            valueColor: AlwaysStoppedAnimation<Color>(_color),
          ),
        ),
      ],
    );
  }
}
