const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { prepare } = require('../database/init');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const { logOperation } = require('../services/logService');

const uploadDir = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ storage });

const getOperator = (req) => req.headers['x-operator'] || 'system';
const getIp = (req) => req.ip || req.connection.remoteAddress;

router.post('/:projectId', upload.single('file'), (req, res) => {
  const { projectId } = req.params;
  const operator = getOperator(req);
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  if (!req.file) {
    return res.status(400).json({ error: '未上传文件' });
  }
  
  const id = uuidv4();
  const stmt = prepare(`
    INSERT INTO contracts (id, project_id, filename, original_name, file_path, file_size, uploaded_by, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    projectId,
    req.file.filename,
    req.file.originalname,
    req.file.path,
    req.file.size,
    operator,
    now
  );
  
  logOperation(projectId, 'upload_contract', operator, { filename: req.file.originalname, size: req.file.size }, getIp(req));
  
  res.status(201).json({
    id,
    project_id: projectId,
    original_name: req.file.originalname,
    filename: req.file.filename,
    file_size: req.file.size,
    uploaded_at: now
  });
});

router.get('/:projectId', (req, res) => {
  const { projectId } = req.params;
  const contracts = prepare('SELECT * FROM contracts WHERE project_id = ? ORDER BY uploaded_at DESC').all(projectId);
  res.json(contracts);
});

router.delete('/:projectId/:contractId', (req, res) => {
  const { projectId, contractId } = req.params;
  const operator = getOperator(req);
  
  const contract = prepare('SELECT * FROM contracts WHERE id = ? AND project_id = ?').get(contractId, projectId);
  if (!contract) {
    return res.status(404).json({ error: '附件不存在' });
  }
  
  if (fs.existsSync(contract.file_path)) {
    fs.unlinkSync(contract.file_path);
  }
  
  prepare('DELETE FROM contracts WHERE id = ?').run(contractId);
  logOperation(projectId, 'delete_contract', operator, { filename: contract.original_name }, getIp(req));
  
  res.json({ message: '删除成功' });
});

module.exports = router;
