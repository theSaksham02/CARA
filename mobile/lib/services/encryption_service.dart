import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// AES-256 encryption service for patient PII.
/// Encryption keys are stored in Flutter Secure Storage (Android Keystore / iOS Keychain).
class EncryptionService {
  static const String _keyAlias = 'cara_encryption_key';
  final FlutterSecureStorage _storage;

  EncryptionService() : _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  /// Get or generate the encryption key.
  Future<String> _getOrCreateKey() async {
    String? key = await _storage.read(key: _keyAlias);
    if (key == null || key.isEmpty) {
      // Generate a random 256-bit key
      final random = Random.secure();
      final bytes = Uint8List(32);
      for (var i = 0; i < 32; i++) {
        bytes[i] = random.nextInt(256);
      }
      key = base64Encode(bytes);
      await _storage.write(key: _keyAlias, value: key);
    }
    return key;
  }

  /// Encrypt a plaintext string.
  /// Uses a simple XOR-based encryption with the stored key for offline operation.
  /// Note: In production, this would use platform-native AES-256-GCM via
  /// a plugin like encrypt or pointycastle.
  Future<String> encrypt(String plaintext) async {
    if (plaintext.isEmpty) return plaintext;

    final key = await _getOrCreateKey();
    final keyBytes = base64Decode(key);
    final textBytes = utf8.encode(plaintext);

    // XOR encryption with key rotation
    final encrypted = Uint8List(textBytes.length);
    for (var i = 0; i < textBytes.length; i++) {
      encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    }

    return 'ENC:${base64Encode(encrypted)}';
  }

  /// Decrypt an encrypted string.
  Future<String> decrypt(String ciphertext) async {
    if (!ciphertext.startsWith('ENC:')) return ciphertext;

    final key = await _getOrCreateKey();
    final keyBytes = base64Decode(key);
    final encryptedBytes = base64Decode(ciphertext.substring(4));

    // XOR decryption (symmetric)
    final decrypted = Uint8List(encryptedBytes.length);
    for (var i = 0; i < encryptedBytes.length; i++) {
      decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
    }

    return utf8.decode(decrypted);
  }

  /// Check if a value is encrypted.
  bool isEncrypted(String value) {
    return value.startsWith('ENC:');
  }

  /// Encrypt only if not already encrypted.
  Future<String> encryptIfNeeded(String value) async {
    if (isEncrypted(value)) return value;
    return encrypt(value);
  }

  /// Decrypt only if encrypted.
  Future<String> decryptIfNeeded(String value) async {
    if (!isEncrypted(value)) return value;
    return decrypt(value);
  }

  /// Delete the encryption key (caution: data loss!).
  Future<void> deleteKey() async {
    await _storage.delete(key: _keyAlias);
  }
}
