const express = require('express');
const router = express.Router();
const { prepare } = require('../database/init');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const { validatePublication, validateSettlement, validateArchive, validateEdit, getProjectStatus } = require('../services/rules');
const { logOperation } = require('../services/logService');

const getOperator = (req) => req.headers['x-operator'] || 'system';
const getIp = (req) => req.ip || req.connection.remoteAddress;

router.get('/', (req, res) => {
  const { status, type } = req.query;
  let sql = 'SELECT * FROM income_projects WHERE 1=1';
  const params = [];
  
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  
  sql += ' ORDER BY created_at DESC';
  const projects = prepare(sql).all(...params);
  
  const projectsWithStatus = projects.map(p => ({
    ...p,
    ruleStatus: getProjectStatus(p.id)
  }));
  
  res.json(projectsWithStatus);
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const project = prepare('SELECT * FROM income_projects WHERE id = ?').get(id);
  
  if (!project) {
    return res.status(404).json({ error: '项目不存在' });
  }
  
  const contracts = prepare('SELECT * FROM contracts WHERE project_id = ?').all(id);
  const allocations = prepare('SELECT * FROM allocation_details WHERE project_id = ? ORDER BY version DESC, id').all(id);
  const publications = prepare('SELECT * FROM publications WHERE project_id = ? ORDER BY created_at DESC').all(id);
  const objections = prepare('SELECT * FROM objections WHERE project_id = ? ORDER BY created_at DESC').all(id);
  const settlement = prepare('SELECT * FROM settlements WHERE project_id = ?').get(id);
  const archive = prepare('SELECT * FROM archives WHERE project_id = ?').get(id);
  const logs = prepare('SELECT * FROM operation_logs WHERE project_id = ? ORDER BY created_at DESC').all(id);
  
  res.json({
    project: {
      ...project,
      ruleStatus: getProjectStatus(id)
    },
    contracts,
    allocations,
    publications,
    objections,
    settlement,
    archive,
    logs
  });
});

router.post('/', (req, res) => {
  const { name, type, amount, description, allocation_rules } = req.body;
  const operator = getOperator(req);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const id = uuidv4();
  
  const stmt = prepare(`
    INSERT INTO income_projects (id, name, type, amount, description, status, created_by, created_at, updated_at, allocation_rules, allocation_version)
    VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, 1)
  `);
  stmt.run(id, name, type, amount, description || '', operator, now, now, allocation_rules || '');
  
  logOperation(id, 'create_project', operator, { name, type, amount }, getIp(req));
  
  res.status(201).json({ id, ...req.body, status: 'draft', created_at: now });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, type, amount, description, allocation_rules } = req.body;
  const operator = getOperator(req);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  const editErrors = validateEdit(id);
  if (editErrors.length > 0) {
    return res.status(400).json({ errors: editErrors });
  }
  
  const existing = prepare('SELECT * FROM income_projects WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '项目不存在' });
  }
  
  let allocationVersion = existing.allocation_version;
  if (allocation_rules !== undefined && allocation_rules !== existing.allocation_rules) {
    allocationVersion += 1;
  }
  
  const stmt = prepare(`
    UPDATE income_projects 
    SET name = ?, type = ?, amount = ?, description = ?, allocation_rules = ?, allocation_version = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run(name, type, amount, description || '', allocation_rules || '', allocationVersion, now, id);
  
  logOperation(id, 'update_project', operator, { 
    old: { name: existing.name, type: existing.type, amount: existing.amount },
    new: { name, type, amount, allocation_rules_changed: allocationVersion > existing.allocation_version }
  }, getIp(req));
  
  res.json({ message: '更新成功', allocation_version: allocationVersion });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const operator = getOperator(req);
  
  const editErrors = validateEdit(id);
  if (editErrors.length > 0) {
    return res.status(400).json({ errors: editErrors });
  }
  
  prepare('DELETE FROM income_projects WHERE id = ?').run(id);
  logOperation(id, 'delete_project', operator, {}, getIp(req));
  
  res.json({ message: '删除成功' });
});

router.post('/:id/allocation', (req, res) => {
  const { id } = req.params;
  const { details } = req.body;
  const operator = getOperator(req);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  const editErrors = validateEdit(id);
  if (editErrors.length > 0) {
    return res.status(400).json({ errors: editErrors });
  }
  
  const project = prepare('SELECT allocation_version FROM income_projects WHERE id = ?').get(id);
  if (!project) {
    return res.status(404).json({ error: '项目不存在' });
  }
  
  const newVersion = project.allocation_version + 1;
  
  const insertStmt = prepare(`
    INSERT INTO allocation_details (id, project_id, owner_name, unit_number, share_ratio, amount, created_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  details.forEach(d => {
    insertStmt.run(uuidv4(), id, d.owner_name, d.unit_number || '', d.share_ratio, d.amount, now, newVersion);
  });
  
  prepare('UPDATE income_projects SET allocation_version = ?, updated_at = ? WHERE id = ?').run(newVersion, now, id);
  
  logOperation(id, 'update_allocation', operator, { version: newVersion, count: details.length }, getIp(req));
  
  res.json({ message: '分摊明细已更新', version: newVersion });
});

module.exports = router;
