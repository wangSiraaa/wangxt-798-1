const express = require('express');
const router = express.Router();
const { prepare } = require('../database/init');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const { validateSettlement } = require('../services/rules');
const { logOperation } = require('../services/logService');

const getOperator = (req) => req.headers['x-operator'] || 'system';
const getIp = (req) => req.ip || req.connection.remoteAddress;

router.get('/', (req, res) => {
  const { projectId } = req.query;
  let sql = 'SELECT * FROM settlements WHERE 1=1';
  const params = [];
  
  if (projectId) {
    sql += ' AND project_id = ?';
    params.push(projectId);
  }
  
  sql += ' ORDER BY created_at DESC';
  const settlements = prepare(sql).all(...params);
  res.json(settlements);
});

router.post('/', (req, res) => {
  const { project_id, settlement_date, remarks } = req.body;
  const operator = getOperator(req);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  const errors = validateSettlement(project_id);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  const project = prepare('SELECT * FROM income_projects WHERE id = ?').get(project_id);
  if (!project) {
    return res.status(404).json({ error: '项目不存在' });
  }
  
  const existing = prepare('SELECT * FROM settlements WHERE project_id = ?').get(project_id);
  if (existing) {
    return res.status(400).json({ error: '该项目已结转' });
  }
  
  const id = uuidv4();
  const stmt = prepare(`
    INSERT INTO settlements (id, project_id, settlement_date, total_amount, status, created_by, created_at, remarks)
    VALUES (?, ?, ?, ?, 'completed', ?, ?, ?)
  `);
  stmt.run(
    id,
    project_id,
    settlement_date || dayjs().format('YYYY-MM-DD'),
    project.amount,
    operator,
    now,
    remarks || ''
  );
  
  prepare('UPDATE income_projects SET status = ? WHERE id = ?').run('settled', project_id);
  
  logOperation(project_id, 'settle', operator, { 
    settlement_id: id, 
    total_amount: project.amount,
    settlement_date: settlement_date || dayjs().format('YYYY-MM-DD')
  }, getIp(req));
  
  res.status(201).json({
    id,
    project_id,
    settlement_date: settlement_date || dayjs().format('YYYY-MM-DD'),
    total_amount: project.amount,
    status: 'completed',
    created_at: now
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const operator = getOperator(req);
  
  const settlement = prepare('SELECT * FROM settlements WHERE id = ?').get(id);
  if (!settlement) {
    return res.status(404).json({ error: '结转单不存在' });
  }
  
  prepare('DELETE FROM settlements WHERE id = ?').run(id);
  prepare('UPDATE income_projects SET status = ? WHERE id = ?').run('published', settlement.project_id);
  logOperation(settlement.project_id, 'cancel_settle', operator, { settlement_id: id }, getIp(req));
  
  res.json({ message: '删除成功' });
});

module.exports = router;
