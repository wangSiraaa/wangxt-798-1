const express = require('express');
const router = express.Router();
const { prepare } = require('../database/init');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const { validatePublication } = require('../services/rules');
const { logOperation } = require('../services/logService');

const getOperator = (req) => req.headers['x-operator'] || 'system';
const getIp = (req) => req.ip || req.connection.remoteAddress;
const PUBLICATION_DAYS = parseInt(process.env.PUBLICATION_DAYS || '7', 10);

router.get('/', (req, res) => {
  const { status, projectId } = req.query;
  let sql = 'SELECT * FROM publications WHERE 1=1';
  const params = [];
  
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (projectId) {
    sql += ' AND project_id = ?';
    params.push(projectId);
  }
  
  sql += ' ORDER BY created_at DESC';
  const publications = prepare(sql).all(...params);
  res.json(publications);
});

router.post('/', (req, res) => {
  const { project_id, title, start_date, end_date } = req.body;
  const operator = getOperator(req);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  const errors = validatePublication(project_id);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  const project = prepare('SELECT * FROM income_projects WHERE id = ?').get(project_id);
  if (!project) {
    return res.status(404).json({ error: '项目不存在' });
  }
  
  const startDate = start_date || dayjs().format('YYYY-MM-DD');
  const endDate = end_date || dayjs().add(PUBLICATION_DAYS, 'day').format('YYYY-MM-DD');
  
  const id = uuidv4();
  const stmt = prepare(`
    INSERT INTO publications (id, project_id, title, start_date, end_date, status, published_by, created_at, allocation_version)
    VALUES (?, ?, ?, ?, ?, 'published', ?, ?, ?)
  `);
  stmt.run(id, project_id, title || `${project.name} - 收益公示`, startDate, endDate, operator, now, project.allocation_version);
  
  prepare('UPDATE income_projects SET status = ? WHERE id = ?').run('published', project_id);
  
  logOperation(project_id, 'publish', operator, { 
    publication_id: id, 
    title, 
    start_date: startDate, 
    end_date: endDate 
  }, getIp(req));
  
  res.status(201).json({
    id,
    project_id,
    title: title || `${project.name} - 收益公示`,
    start_date: startDate,
    end_date: endDate,
    status: 'published',
    created_at: now
  });
});

router.post('/:id/republish', (req, res) => {
  const { id } = req.params;
  const operator = getOperator(req);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  const publication = prepare('SELECT * FROM publications WHERE id = ?').get(id);
  if (!publication) {
    return res.status(404).json({ error: '公示不存在' });
  }
  
  const errors = validatePublication(publication.project_id);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  const project = prepare('SELECT * FROM income_projects WHERE id = ?').get(publication.project_id);
  
  const newStartDate = dayjs().format('YYYY-MM-DD');
  const newEndDate = dayjs().add(PUBLICATION_DAYS, 'day').format('YYYY-MM-DD');
  
  const newId = uuidv4();
  const stmt = prepare(`
    INSERT INTO publications (id, project_id, title, start_date, end_date, status, published_by, created_at, allocation_version)
    VALUES (?, ?, ?, ?, ?, 'published', ?, ?, ?)
  `);
  stmt.run(newId, publication.project_id, `${publication.title} (重新公示)`, newStartDate, newEndDate, operator, now, project.allocation_version);
  
  prepare('UPDATE income_projects SET status = ? WHERE id = ?').run('published', publication.project_id);
  
  logOperation(publication.project_id, 'republish', operator, { 
    old_publication_id: id,
    new_publication_id: newId,
    allocation_version: project.allocation_version
  }, getIp(req));
  
  res.status(201).json({
    id: newId,
    project_id: publication.project_id,
    title: `${publication.title} (重新公示)`,
    start_date: newStartDate,
    end_date: newEndDate,
    status: 'published',
    created_at: now
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const operator = getOperator(req);
  
  const publication = prepare('SELECT * FROM publications WHERE id = ?').get(id);
  if (!publication) {
    return res.status(404).json({ error: '公示不存在' });
  }
  
  prepare('DELETE FROM publications WHERE id = ?').run(id);
  logOperation(publication.project_id, 'delete_publication', operator, { publication_id: id }, getIp(req));
  
  res.json({ message: '删除成功' });
});

module.exports = router;
