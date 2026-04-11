import 'package:flutter/material.dart';

/// Colour-coded triage urgency badge (RED / YELLOW / GREEN).
class TriageBadge extends StatelessWidget {
  final String urgency;
  final double size;

  const TriageBadge({
    super.key,
    required this.urgency,
    this.size = 12,
  });

  Color get _color {
    switch (urgency.toUpperCase()) {
      case 'RED':
        return const Color(0xFFEF4444);
      case 'YELLOW':
        return const Color(0xFFF59E0B);
      case 'GREEN':
        return const Color(0xFF10B981);
      default:
        return Colors.grey;
    }
  }

  Color get _backgroundColor {
    switch (urgency.toUpperCase()) {
      case 'RED':
        return const Color(0x20EF4444);
      case 'YELLOW':
        return const Color(0x20F59E0B);
      case 'GREEN':
        return const Color(0x2010B981);
      default:
        return Colors.grey.withAlpha(32);
    }
  }

  IconData get _icon {
    switch (urgency.toUpperCase()) {
      case 'RED':
        return Icons.warning_rounded;
      case 'YELLOW':
        return Icons.schedule_rounded;
      case 'GREEN':
        return Icons.check_circle_rounded;
      default:
        return Icons.help_outline_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _backgroundColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _color.withAlpha(77), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_icon, color: _color, size: size + 2),
          const SizedBox(width: 4),
          Text(
            urgency.toUpperCase(),
            style: TextStyle(
              color: _color,
              fontSize: size,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}
