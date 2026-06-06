const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.sqlite');
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDB() {
  // Applicants table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Applicants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      national_id TEXT NOT NULL UNIQUE,
      dob TEXT NOT NULL,
      sex TEXT,
      phone TEXT,
      address TEXT,
      school TEXT,
      photo_path TEXT,
      status TEXT DEFAULT 'REGISTERED',
      reg_date TEXT NOT NULL,
      test_center TEXT,
      examiner TEXT,
      test_datetime TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    );
  `);

  // LicenseCategories lookup table
  db.exec(`
    CREATE TABLE IF NOT EXISTS LicenseCategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      description TEXT
    );
  `);

  // ApplicantCategories join table (many-to-many)
  db.exec(`
    CREATE TABLE IF NOT EXISTS ApplicantCategories (
      applicant_id INTEGER NOT NULL REFERENCES Applicants(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES LicenseCategories(id) ON DELETE CASCADE,
      PRIMARY KEY (applicant_id, category_id)
    );
  `);

  // Tests table (theory/practical scores)
  db.exec(`
    CREATE TABLE IF NOT EXISTS Tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      applicant_id INTEGER NOT NULL REFERENCES Applicants(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      score INTEGER,
      pass BOOLEAN,
      recorded_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Certificates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      applicant_id INTEGER NOT NULL UNIQUE REFERENCES Applicants(id) ON DELETE CASCADE,
      cert_number TEXT NOT NULL UNIQUE,
      issued_at TEXT DEFAULT (datetime('now')),
      issued_by TEXT
    );
  `);

  // Create indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_applicant_status ON Applicants(status);
    CREATE INDEX IF NOT EXISTS idx_applicant_national_id ON Applicants(national_id);
    CREATE INDEX IF NOT EXISTS idx_tests_applicant ON Tests(applicant_id);
    CREATE INDEX IF NOT EXISTS idx_cert_applicant ON Certificates(applicant_id);
  `);
}

// Populate license categories if empty
function seedCategories() {
  const categories = [
    { code: 'A', description: 'A (Private Vehicle Only)' },
    { code: 'B', description: 'B (Motorcycle)' },
    { code: 'BP_T_03_10', description: 'BP/T 03 to 10 Pass' },
    { code: 'BT_T_03', description: 'BT/T 03 TONS' },
    { code: 'COMM_4', description: 'COMMERCIAL PASSENGERS (04 PASSENGERS)' },
    { code: 'COMM_7', description: 'COMMERCIAL PASSENGERS (07 PASSENGERS)' },
    { code: 'COMM_10', description: 'COMMERCIAL PASSENGERS (10 PASSENGERS)' },
    { code: 'COMM_14', description: 'COMMERCIAL PASSENGERS (14 PASSENGERS)' },
    { code: 'COMM_18', description: 'COMMERCIAL PASSENGERS (18 PASSENGERS)' },
    { code: 'COMM_22', description: 'COMMERCIAL PASSENGERS (22 PASSENGERS)' },
    { code: 'COMM_26PLUS', description: 'COMMERCIAL PASSENGERS (26 AND ABOVE PASSENGERS)' },
    { code: 'TONS_C_03', description: 'TONAGES (GROUP C 03 TONS)' },
    { code: 'TONS_C_07', description: 'TONAGES (GROUP C 07 TONS)' },
    { code: 'TONS_C_10', description: 'TONAGES (GROUP C 10 TONS)' },
    { code: 'TONS_C_15', description: 'TONAGES (GROUP C 15 TONS)' },
    { code: 'TONS_C_20', description: 'TONAGES (GROUP C 20 TONS)' },
    { code: 'TONS_C_30', description: 'TONAGES (GROUP C 30 TONS OR (C) OPEN)' },
    { code: 'TONS_D', description: 'TONAGES (GROUP D FOR TRACTOR/CRANE)' },
  ];

  const existingCount = db.prepare('SELECT COUNT(*) as cnt FROM LicenseCategories').get().cnt;
  if (existingCount === 0) {
    const stmt = db.prepare('INSERT INTO LicenseCategories (code, description) VALUES (?, ?)');
    categories.forEach(cat => {
      stmt.run(cat.code, cat.description);
    });
  }
}

// Get all applicants with their categories (as array of full objects)
function getAllApplicants() {
  const stmt = db.prepare(`
    SELECT a.* FROM Applicants a
    ORDER BY a.created_at DESC
  `);
  const applicants = stmt.all();
  
  // Enrich each applicant with categories and test scores
  applicants.forEach(app => {
    // Get categories
    const catStmt = db.prepare(`
      SELECT lc.description FROM ApplicantCategories ac
      JOIN LicenseCategories lc ON ac.category_id = lc.id
      WHERE ac.applicant_id = ?
    `);
    app.licenseCategory = catStmt.all(app.id).map(c => c.description);
    
    // Get theory and practical scores
    const theoryStmt = db.prepare('SELECT score FROM Tests WHERE applicant_id = ? AND type = ? LIMIT 1');
    const practicalStmt = db.prepare('SELECT score FROM Tests WHERE applicant_id = ? AND type = ? LIMIT 1');
    
    const theoryResult = theoryStmt.get(app.id, 'theory');
    const practicalResult = practicalStmt.get(app.id, 'practical');
    
    app.theoryScore = theoryResult ? theoryResult.score : null;
    app.practicalScore = practicalResult ? practicalResult.score : null;
    
    // Determine overall result
    if (app.theoryScore !== null && app.practicalScore !== null) {
      const theoryPass = app.theoryScore >= 35;
      const practicalPass = app.practicalScore >= 70;
      app.overallResult = (theoryPass && practicalPass) ? 'PASS' : 'FAIL';
    } else {
      app.overallResult = null;
    }
    
    // Check if certificate issued
    const certStmt = db.prepare('SELECT cert_number FROM Certificates WHERE applicant_id = ?');
    const cert = certStmt.get(app.id);
    app.certificateIssued = !!cert;
    app.certificateNumber = cert ? cert.cert_number : null;
  });

  return applicants;
}

// Add a new applicant with categories
function addApplicant(data) {
  const stmt = db.prepare(`
    INSERT INTO Applicants (
      full_name, national_id, dob, sex, phone, address, school, photo_path,
      status, reg_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    data.fullName,
    data.nationalId,
    data.dob,
    data.sex,
    data.phone,
    data.address,
    data.school,
    data.photoData,
    data.status || 'REGISTERED',
    data.regDate || new Date().toISOString()
  );

  const applicantId = info.lastInsertRowid;

  // Insert categories
  if (data.licenseCategory && data.licenseCategory.length > 0) {
    const catStmt = db.prepare('INSERT INTO ApplicantCategories (applicant_id, category_id) VALUES (?, ?)');
    data.licenseCategory.forEach(category => {
      // Find category by description
      const cat = db.prepare('SELECT id FROM LicenseCategories WHERE description = ?').get(category);
      if (cat) {
        catStmt.run(applicantId, cat.id);
      }
    });
  }

  return applicantId;
}

// Update an applicant's test/schedule data
function updateApplicant(id, data) {
  const updates = [];
  const values = [];

  if (data.hasOwnProperty('status')) {
    updates.push('status = ?');
    values.push(data.status);
  }
  if (data.hasOwnProperty('testCenter')) {
    updates.push('test_center = ?');
    values.push(data.testCenter);
  }
  if (data.hasOwnProperty('examiner')) {
    updates.push('examiner = ?');
    values.push(data.examiner);
  }
  if (data.hasOwnProperty('testDateTime')) {
    updates.push('test_datetime = ?');
    values.push(data.testDateTime);
  }

  updates.push('updated_at = datetime("now")');
  values.push(id);

  if (updates.length > 1) { // at least one actual update + the id param
    const query = `UPDATE Applicants SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);
  }
}

// Record theory score
function recordTheoryScore(applicantId, score) {
  // Check if already exists
  const existing = db.prepare('SELECT id FROM Tests WHERE applicant_id = ? AND type = ?').get(applicantId, 'theory');
  if (existing) {
    db.prepare('UPDATE Tests SET score = ?, pass = ? WHERE applicant_id = ? AND type = ?')
      .run(score, score >= 35 ? 1 : 0, applicantId, 'theory');
  } else {
    db.prepare('INSERT INTO Tests (applicant_id, type, score, pass) VALUES (?, ?, ?, ?)')
      .run(applicantId, 'theory', score, score >= 35 ? 1 : 0);
  }
}

// Record practical score
function recordPracticalScore(applicantId, score) {
  const existing = db.prepare('SELECT id FROM Tests WHERE applicant_id = ? AND type = ?').get(applicantId, 'practical');
  if (existing) {
    db.prepare('UPDATE Tests SET score = ?, pass = ? WHERE applicant_id = ? AND type = ?')
      .run(score, score >= 70 ? 1 : 0, applicantId, 'practical');
  } else {
    db.prepare('INSERT INTO Tests (applicant_id, type, score, pass) VALUES (?, ?, ?, ?)')
      .run(applicantId, 'practical', score, score >= 70 ? 1 : 0);
  }
}

// Issue certificate
function issueCertificate(applicantId, certNumber, issuedBy) {
  try {
    db.prepare('INSERT INTO Certificates (applicant_id, cert_number, issued_by) VALUES (?, ?, ?)')
      .run(applicantId, certNumber, issuedBy || 'System');
    return true;
  } catch (err) {
    // Likely duplicate cert
    return false;
  }
}

// Get applicant by ID (with enrichment)
function getApplicantById(id) {
  const app = db.prepare('SELECT * FROM Applicants WHERE id = ?').get(id);
  if (!app) return null;

  // Enrich
  const catStmt = db.prepare(`
    SELECT lc.description FROM ApplicantCategories ac
    JOIN LicenseCategories lc ON ac.category_id = lc.id
    WHERE ac.applicant_id = ?
  `);
  app.licenseCategory = catStmt.all(app.id).map(c => c.description);

  const theoryResult = db.prepare('SELECT score FROM Tests WHERE applicant_id = ? AND type = ? LIMIT 1').get(app.id, 'theory');
  const practicalResult = db.prepare('SELECT score FROM Tests WHERE applicant_id = ? AND type = ? LIMIT 1').get(app.id, 'practical');

  app.theoryScore = theoryResult ? theoryResult.score : null;
  app.practicalScore = practicalResult ? practicalResult.score : null;

  if (app.theoryScore !== null && app.practicalScore !== null) {
    const theoryPass = app.theoryScore >= 35;
    const practicalPass = app.practicalScore >= 70;
    app.overallResult = (theoryPass && practicalPass) ? 'PASS' : 'FAIL';
  } else {
    app.overallResult = null;
  }

  const cert = db.prepare('SELECT cert_number FROM Certificates WHERE applicant_id = ?').get(app.id);
  app.certificateIssued = !!cert;
  app.certificateNumber = cert ? cert.cert_number : null;

  return app;
}

// Reset scores for retest
function resetApplicantScores(applicantId) {
  db.prepare('DELETE FROM Tests WHERE applicant_id = ?').run(applicantId);
  db.prepare('DELETE FROM Certificates WHERE applicant_id = ?').run(applicantId);
  db.prepare('UPDATE Applicants SET status = ?, updated_at = datetime("now") WHERE id = ?')
    .run('REGISTERED', applicantId);
}

module.exports = {
  db,
  initializeDB,
  seedCategories,
  getAllApplicants,
  addApplicant,
  updateApplicant,
  recordTheoryScore,
  recordPracticalScore,
  issueCertificate,
  getApplicantById,
  resetApplicantScores,
};
