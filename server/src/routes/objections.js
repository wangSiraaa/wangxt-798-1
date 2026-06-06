const express = require('express');
const router = express.Router();
const { prepare } = require('../database/init');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const { logOperation } = require('../services/logService');

const getOperator = (req) => req.headers['x-operator'] || 'system';
const getIp = (req) => req.ip || req.connection.remoteAddress;

router.get('/', (req, res) => {
  const { status, projectId } = req.query;
  let sql = 'SELECT * FROM objections WHERE 1=1';
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
  const objections = prepare(sql).all(...params);
  res.json(objections);
});

router.post('/', (req, res) => {
  const { project_id, publication_id, owner_name, contact, content } = req.body;
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const id = uuidv4();
  
  const stmt = prepare(`
    INSERT INTO objections (id, project_id, publication_id, owner_name, contact, content, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
  `);
  stmt.run(id, project_id, publication_id || null, owner_name, contact, content, now);
  
  logOperation(project_id, 'submit_objection', owner_name, { 
    objection_id: id, 
    content: content.substring(0, 100) 
  }, getIp(req));
  
  res.status(201).json({
    id,
    project_id,
    owner_name,
    contact,
    content,
    status: 'pending',
    created_at: now
  });
});

router.post('/:id/reply', (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;
  const operator = getOperator(req);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  const objection = prepare('SELECT * FROM objections WHERE id = ?').get(id);
  if (!objection) {
    return res.status(404).json({ error: '异议不存在' });
  }
  
  prepare(`
    UPDATE objections 
    SET reply = ?, replied_at = ?, replied_by = ?, status = 'replied'
    WHERE id = ?
  `).run(reply, now, operator, id);
  
  logOperation(objection.project_id, 'reply_objection', operator, { 
    objection_id: id, 
    reply: reply.substring(0, 100) 
  }, getIp(req));
  
  res.json({
    message: '答复成功',
    id,
    reply,
    replied_at: now,
    replied_by: operator,
    status: 'replied'
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const operator = getOperator(req);
  
  const objection = prepare('SELECT * FROM objections WHERE id = ?').get(id);
  if (!objection) {
    return res.status(404).json({ error: '异议不存在' });
  }
  
  prepare('DELETE FROM objections WHERE id = ?').run(id);
  logOperation(objection.project_id, 'delete_objection', operator, { objection_id: id }, getIp(req));
  
  res.json({ message: '删除成功' });
});

module.exports = router;
