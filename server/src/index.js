const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database/init');

const projectRoutes = require('./routes/projects');
const contractRoutes = require('./routes/contracts');
const publicationRoutes = require('./routes/publications');
const objectionRoutes = require('./routes/objections');
const settlementRoutes = require('./routes/settlements');
const archiveRoutes = require('./routes/archives');
const logRoutes = require('./routes/logs');
const ruleRoutes = require('./routes/rules');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/projects', projectRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/publications', publicationRoutes);
app.use('/api/objections', objectionRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/archives', archiveRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/rules', ruleRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`物业公共收益公示系统后端服务已启动，端口: ${PORT}`);
      console.log(`健康检查: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
