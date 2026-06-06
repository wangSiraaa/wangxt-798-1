const express = require('express');
const router = express.Router();
const { getProjectStatus, RULES, RULE_MESSAGES } = require('../services/rules');

router.get('/status/:projectId', (req, res) => {
  const { projectId } = req.params;
  const status = getProjectStatus(projectId);
  res.json(status);
});

router.get('/definitions', (req, res) => {
  res.json({
    rules: RULES,
    messages: RULE_MESSAGES
  });
});

module.exports = router;
