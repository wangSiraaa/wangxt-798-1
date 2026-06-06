const express = require('express');
const router = express.Router();
const { getLogsByProject, getAllLogs } = require('../services/logService');

router.get('/', (req, res) => {
  const { projectId, limit } = req.query;
  
  if (projectId) {
    const logs = getLogsByProject(projectId);
    return res.json(logs);
  }
  
  const logs = getAllLogs(parseInt(limit) || 100);
  res.json(logs);
});

module.exports = router;
