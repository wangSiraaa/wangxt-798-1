const express = require('express');
const router = express.Router();
const { prepare } = require('../database/init');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const { validateArchive } = require('../services/rules');
const { logOperation } = require('../services/logService');

const getOperator = (req) => req.headers['x-operator'] || 'system';
const getIp = (req) => req.ip || req.connection.remoteAddress;

router.get('/', (req, res) => {
  const { projectId } = req.query;
  let sql = 'SELECT * FROM archives WHERE 1=1';
  const params = [];
  
  if (projectId) {
    sql += ' AND project_id = ?';
    params.push(projectId);
  }
  
  sql += ' ORDER BY created_at DESC';
  const archives = prepare(sql).all(...params);
  res.json(archives);
});

router.post('/', (req, res) => {
  const { project_id, archive_date } = req.body;
  const operator = getOperator(req);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  const errors = validateArchive(project_id);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  const project = prepare('SELECT * FROM income_projects WHERE id = ?').get(project_id);
  if (!project) {
    return res.status(404).json({ error: '项目不存在' });
  }
  
  const settlement = prepare('SELECT * FROM settlements WHERE project_id = ?').get(project_id);
  if (!settlement) {
    return res.status(400).json({ error: '项目尚未结转，不能归档' });
  }
  
  const existing = prepare('SELECT * FROM archives WHERE project_id = ?').get(project_id);
  if (existing) {
    return res.status(400).json({ error: '该项目已归档' });
  }
  
  const id = uuidv4();
  const stmt = prepare(`
    INSERT INTO archives (id, project_id, archive_date, archived_by, status, created_at)
    VALUES (?, ?, ?, ?, 'archived', ?)
  `);
  stmt.run(
    id,
    project_id,
    archive_date || dayjs().format('YYYY-MM-DD'),
    operator,
    now
  );
  
  prepare('UPDATE income_projects SET status = ? WHERE id = ?').run('archived', project_id);
  
  logOperation(project_id, 'archive', operator, { 
    archive_id: id,
    archive_date: archive_date || dayjs().format('YYYY-MM-DD')
  }, getIp(req));
  
  res.status(201).json({
    id,
    project_id,
    archive_date: archive_date || dayjs().format('YYYY-MM-DD'),
    status: 'archived',
    created_at: now
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const operator = getOperator(req);
  
  const archive = prepare('SELECT * FROM archives WHERE id = ?').get(id);
  if (!archive) {
    return res.status(404).json({ error: '归档不存在' });
  }
  
  prepare('DELETE FROM archives WHERE id = ?').run(id);
  prepare('UPDATE income_projects SET status = ? WHERE id = ?').run('settled', archive.project_id);
  logOperation(archive.project_id, 'cancel_archive', operator, { archive_id: id }, getIp(req));
  
  res.json({ message: '删除成功' });
});

module.exports = router;
