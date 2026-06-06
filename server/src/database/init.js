const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/property.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;
let SQL = null;

const initDatabase = async () => {
  SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  db.run('PRAGMA foreign_keys = ON');
  
  const initSchema = () => {
    db.run(`
      CREATE TABLE IF NOT EXISTS income_projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        allocation_rules TEXT,
        allocation_version INTEGER DEFAULT 1
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS contracts (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        uploaded_by TEXT NOT NULL,
        uploaded_at TEXT NOT NULL,
        handle_deadline TEXT
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS allocation_details (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        unit_number TEXT,
        share_ratio REAL NOT NULL,
        amount REAL NOT NULL,
        created_at TEXT NOT NULL,
        version INTEGER DEFAULT 1
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS publications (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'published',
        published_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        allocation_version INTEGER DEFAULT 1
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS objections (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        publication_id TEXT,
        owner_name TEXT NOT NULL,
        contact TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        reply TEXT,
        replied_at TEXT,
        replied_by TEXT,
        created_at TEXT NOT NULL
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS settlements (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL UNIQUE,
        settlement_date TEXT NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        remarks TEXT
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS archives (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL UNIQUE,
        archive_date TEXT NOT NULL,
        archived_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'archived',
        created_at TEXT NOT NULL
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS operation_logs (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        action TEXT NOT NULL,
        operator TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL,
        ip_address TEXT
      );
    `);

    db.run('CREATE INDEX IF NOT EXISTS idx_projects_status ON income_projects(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_contracts_project ON contracts(project_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_publications_project ON publications(project_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_objections_project ON objections(project_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_objections_status ON objections(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_logs_project ON operation_logs(project_id)');
  };

  initSchema();
  saveDatabase();
  console.log('数据库表结构初始化完成');
};

const saveDatabase = () => {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
};

const run = (sql, params = []) => {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
  saveDatabase();
  return { changes: db.getRowsModified() };
};

const get = (sql, params = []) => {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
};

const all = (sql, params = []) => {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
};

const prepare = (sql) => {
  return {
    run: (...params) => run(sql, params),
    get: (...params) => get(sql, params),
    all: (...params) => all(sql, params)
  };
};

const exec = (sql) => {
  db.run(sql);
  saveDatabase();
};

const pragma = (statement) => {
  if (statement.includes('journal_mode')) return;
  db.run(`PRAGMA ${statement}`);
  saveDatabase();
};

module.exports = {
  initDatabase,
  prepare,
  run,
  get,
  all,
  exec,
  pragma,
  saveDatabase,
  getDb: () => db
};
