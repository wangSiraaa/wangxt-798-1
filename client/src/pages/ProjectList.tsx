import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { STATUS_LABELS, PROJECT_TYPE_LABELS, type IncomeProject } from '../types';

export default function ProjectList() {
  const navigate = useNavigate();
  const { projects, fetchProjects, createProject, loading, error, setError } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'parking',
    amount: '',
    description: '',
    allocation_rules: ''
  });

  useEffect(() => {
    fetchProjects(statusFilter, typeFilter);
  }, [statusFilter, typeFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProject({
        ...formData,
        amount: parseFloat(formData.amount)
      });
      setShowModal(false);
      setFormData({ name: '', type: 'parking', amount: '', description: '', allocation_rules: '' });
    } catch (err: any) {
      // Error is already set in store
    }
  };

  const stats = {
    total: projects.length,
    draft: projects.filter(p => p.status === 'draft').length,
    published: projects.filter(p => p.status === 'published').length,
    settled: projects.filter(p => p.status === 'settled').length,
    totalAmount: projects.reduce((sum, p) => sum + p.amount, 0)
  };

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">收益项目总数</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">草稿中</div>
          <div className="stat-value" style={{ color: '#6b7280' }}>{stats.draft}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">公示中</div>
          <div className="stat-value" style={{ color: '#3b82f6' }}>{stats.published}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">已结转</div>
          <div className="stat-value" style={{ color: '#10b981' }}>{stats.settled}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">累计收益金额</div>
          <div className="stat-value amount amount-positive">¥{stats.totalAmount.toLocaleString()}</div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button 
            className="close-btn" 
            style={{ float: 'right' }} 
            onClick={() => setError(null)}
          >×</button>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>收益项目列表</h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + 新建项目
          </button>
        </div>

        <div className="filter-bar">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">全部状态</option>
            <option value="draft">草稿</option>
            <option value="published">公示中</option>
            <option value="settled">已结转</option>
            <option value="archived">已归档</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">全部类型</option>
            <option value="parking">停车费</option>
            <option value="advertisement">广告位</option>
            <option value="booth">摊位</option>
            <option value="other">其他</option>
          </select>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            加载中...
          </div>
        ) : projects.length === 0 ? (
          <div className="empty">
            暂无收益项目数据
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>项目名称</th>
                <th>类型</th>
                <th>收益金额</th>
                <th>状态</th>
                <th>创建人</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project: IncomeProject) => (
                <tr key={project.id} onClick={() => navigate(`/projects/${project.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 500 }}>{project.name}</td>
                  <td>{PROJECT_TYPE_LABELS[project.type as keyof typeof PROJECT_TYPE_LABELS] || project.type}</td>
                  <td className="amount amount-positive">¥{project.amount.toLocaleString()}</td>
                  <td>
                    <span className={`badge badge-${project.status}`}>
                      {STATUS_LABELS[project.status]}
                    </span>
                  </td>
                  <td>{project.created_by}</td>
                  <td>{project.created_at}</td>
                  <td>
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}
                    >
                      查看详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新建收益项目</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>项目名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：小区地面停车位收益"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>项目类型 *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="parking">停车费</option>
                    <option value="advertisement">广告位</option>
                    <option value="booth">摊位</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>收益金额（元） *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>分摊规则</label>
                <input
                  type="text"
                  value={formData.allocation_rules}
                  onChange={(e) => setFormData({ ...formData, allocation_rules: e.target.value })}
                  placeholder="例如：按业主产权面积分摊"
                />
              </div>
              <div className="form-group">
                <label>项目描述</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="简要描述该收益项目的来源和背景"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '创建中...' : '创建项目'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
