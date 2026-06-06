const { prepare } = require('../database/init');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

const logOperation = (projectId, action, operator, details, ipAddress) => {
  const stmt = prepare(`
    INSERT INTO operation_logs (id, project_id, action, operator, details, created_at, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    uuidv4(),
    projectId || null,
    action,
    operator,
    details ? JSON.stringify(details) : null,
    dayjs().format('YYYY-MM-DD HH:mm:ss'),
    ipAddress || null
  );
};

const getLogsByProject = (projectId) => {
  return prepare(`
    SELECT * FROM operation_logs 
    WHERE project_id = ? 
    ORDER BY created_at DESC
  `).all(projectId);
};

const getAllLogs = (limit = 100) => {
  return prepare(`
    SELECT * FROM operation_logs 
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(limit);
};

module.exports = {
  logOperation,
  getLogsByProject,
  getAllLogs
};
