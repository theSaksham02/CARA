import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

/// Local SQLite database — primary data store for offline-first operation.
/// Mirrors the backend schema with an additional `synced` column for sync tracking.
class LocalDb {
  static Database? _database;
  static const String _dbName = 'cara_local.db';
  static const int _dbVersion = 1;

  Future<Database> get database async {
    _database ??= await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final documentsDir = await getApplicationDocumentsDirectory();
    final path = join(documentsDir.path, _dbName);

    return openDatabase(
      path,
      version: _dbVersion,
      onCreate: _createTables,
    );
  }

  Future<void> _createTables(Database db, int version) async {
    await db.execute('''
      CREATE TABLE patients (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        age_months INTEGER NOT NULL,
        caregiver_name TEXT,
        sex TEXT,
        village TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE assessments (
        id TEXT PRIMARY KEY,
        patient_id TEXT,
        symptoms TEXT NOT NULL,
        age_months INTEGER NOT NULL,
        urgency TEXT NOT NULL,
        reason TEXT NOT NULL,
        recommended_action TEXT NOT NULL,
        matched_rule_id TEXT,
        chw_confirmed INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    ''');

    await db.execute('''
      CREATE TABLE soap_notes (
        id TEXT PRIMARY KEY,
        patient_id TEXT,
        transcript TEXT NOT NULL,
        soap_s TEXT NOT NULL,
        soap_o TEXT NOT NULL,
        soap_a TEXT NOT NULL,
        soap_p TEXT NOT NULL,
        generated_by TEXT,
        created_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    ''');

    await db.execute('''
      CREATE TABLE readmission_records (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        condition TEXT NOT NULL,
        risk_score REAL NOT NULL,
        risk_level TEXT NOT NULL,
        follow_up_date TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    ''');

    await db.execute('''
      CREATE TABLE sync_log (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        action TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        synced_at TEXT
      )
    ''');
  }

  // ─── Patients ─────────────────────────────────────────

  Future<List<Map<String, dynamic>>> getPatients({String? search}) async {
    final db = await database;
    if (search != null && search.isNotEmpty) {
      return db.query(
        'patients',
        where: 'full_name LIKE ?',
        whereArgs: ['%$search%'],
        orderBy: 'created_at DESC',
      );
    }
    return db.query('patients', orderBy: 'created_at DESC');
  }

  Future<Map<String, dynamic>?> getPatient(String id) async {
    final db = await database;
    final results = await db.query('patients', where: 'id = ?', whereArgs: [id], limit: 1);
    return results.isNotEmpty ? results.first : null;
  }

  Future<void> insertPatient(Map<String, dynamic> patient) async {
    final db = await database;
    await db.insert('patients', patient, conflictAlgorithm: ConflictAlgorithm.replace);
    await _logSync('patients', patient['id'], 'insert');
  }

  // ─── Assessments ──────────────────────────────────────

  Future<List<Map<String, dynamic>>> getAssessments({String? patientId}) async {
    final db = await database;
    if (patientId != null) {
      return db.query(
        'assessments',
        where: 'patient_id = ?',
        whereArgs: [patientId],
        orderBy: 'created_at DESC',
      );
    }
    return db.query('assessments', orderBy: 'created_at DESC');
  }

  Future<void> insertAssessment(Map<String, dynamic> assessment) async {
    final db = await database;
    await db.insert('assessments', assessment, conflictAlgorithm: ConflictAlgorithm.replace);
    await _logSync('assessments', assessment['id'], 'insert');
  }

  Future<String?> getLatestUrgency(String patientId) async {
    final db = await database;
    final results = await db.query(
      'assessments',
      columns: ['urgency'],
      where: 'patient_id = ?',
      whereArgs: [patientId],
      orderBy: 'created_at DESC',
      limit: 1,
    );
    return results.isNotEmpty ? results.first['urgency'] as String? : null;
  }

  // ─── SOAP Notes ───────────────────────────────────────

  Future<List<Map<String, dynamic>>> getSoapNotes({String? patientId}) async {
    final db = await database;
    if (patientId != null) {
      return db.query(
        'soap_notes',
        where: 'patient_id = ?',
        whereArgs: [patientId],
        orderBy: 'created_at DESC',
      );
    }
    return db.query('soap_notes', orderBy: 'created_at DESC');
  }

  Future<void> insertSoapNote(Map<String, dynamic> note) async {
    final db = await database;
    await db.insert('soap_notes', note, conflictAlgorithm: ConflictAlgorithm.replace);
    await _logSync('soap_notes', note['id'], 'insert');
  }

  // ─── Readmission Records ──────────────────────────────

  Future<List<Map<String, dynamic>>> getReadmissionRecords({String? condition}) async {
    final db = await database;
    if (condition != null) {
      return db.query(
        'readmission_records',
        where: 'condition = ?',
        whereArgs: [condition.toUpperCase()],
        orderBy: 'created_at DESC',
      );
    }
    return db.query('readmission_records', orderBy: 'created_at DESC');
  }

  Future<void> insertReadmissionRecord(Map<String, dynamic> record) async {
    final db = await database;
    await db.insert('readmission_records', record, conflictAlgorithm: ConflictAlgorithm.replace);
    await _logSync('readmission_records', record['id'], 'insert');
  }

  // ─── Sync ─────────────────────────────────────────────

  Future<void> _logSync(String tableName, String recordId, String action) async {
    final db = await database;
    await db.insert('sync_log', {
      'id': '${tableName}_${recordId}_$action',
      'table_name': tableName,
      'record_id': recordId,
      'action': action,
      'status': 'pending',
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<int> getPendingSyncCount() async {
    final db = await database;
    final result = await db.rawQuery("SELECT COUNT(*) as count FROM sync_log WHERE status = 'pending'");
    return result.first['count'] as int? ?? 0;
  }

  Future<List<Map<String, dynamic>>> getPendingSyncEntries() async {
    final db = await database;
    return db.query('sync_log', where: "status = 'pending'", limit: 50);
  }

  Future<void> markSynced(String syncId) async {
    final db = await database;
    await db.update(
      'sync_log',
      {'status': 'synced', 'synced_at': DateTime.now().toIso8601String()},
      where: 'id = ?',
      whereArgs: [syncId],
    );
  }

  Future<List<Map<String, dynamic>>> getUnsyncedRecords(String tableName) async {
    final db = await database;
    return db.query(tableName, where: 'synced = 0');
  }

  Future<void> markRecordSynced(String tableName, String recordId) async {
    final db = await database;
    await db.update(
      tableName,
      {'synced': 1},
      where: 'id = ?',
      whereArgs: [recordId],
    );
  }
}
