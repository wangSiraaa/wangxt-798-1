import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { STATUS_LABELS, PROJECT_TYPE_LABELS } from '../types';

type TabType = 'info' | 'contracts' | 'allocation' | 'publications' | 'objections' | 'settlement' | 'logs';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    selectedProject, 
    projectDetail, 
    fetchProjectDetail, 
    loading, 
    error,
    createPublication,
    createSettlement,
    createArchive,
    createObjection,
    replyObjection,
    setError
  } = useStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [showPubModal, setShowPubModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showObjectionModal, setShowObjectionModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  
  const [objectionForm, setObjectionForm] = useState({
    owner_name: '',
    contact: '',
    content: ''
  });

  useEffect(() => {
    if (id) {
      fetchProjectDetail(id);
    }
  }, [id]);

  const handlePublish = async () => {
    try {
      await createPublication({
        project_id: id,
        title: `${selectedProject?.name} - 收益公示`
      });
      setShowPubModal(false);
    } catch (err) {
      // Error handled in store
    }
  };

  const handleSettle = async () => {
    try {
      await createSettlement({ project_id: id });
      setShowSettleModal(false);
    } catch (err) {
      // Error handled in store
    }
  };

  const handleArchive = async () => {
    try {
      await createArchive({ project_id: id });
      setShowArchiveModal(false);
    } catch (err) {
      // Error handled in store
    }
  };

  const handleSubmitObjection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createObjection({
        project_id: id,
        ...objectionForm
      });
      setShowObjectionModal(false);
      setObjectionForm({ owner_name: '', contact: '', content: '' });
    } catch (err) {
      // Error handled in store
    }
  };

  const handleReply = async (objectionId: string) => {
    try {
      await replyObjection(objectionId, replyText);
      setShowReplyModal(null);
      setReplyText('');
    } catch (err) {
      // Error handled in store
    }
  };

  if (loading && !selectedProject) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        加载项目详情...
      </div>
    );
  }

  if (!selectedProject) {
    return <div className="empty">项目不存在</div>;
  }

  const ruleStatus = selectedProject.ruleStatus;
  const canPublish = ruleStatus?.hasContract && selectedProject.status !== 'archived';
  const canSettle = !ruleStatus?.inPublicationPeriod && !ruleStatus?.allocationChanged && !ruleStatus?.hasExpiredContract && selectedProject.status === 'published';
  const canArchive = !ruleStatus?.hasUnrepliedObjections && selectedProject.status === 'settled';

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/">首页</Link>
        <span>/</span>
        <span>{selectedProject.name}</span>
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
          <div>
            <h2 style={{ marginBottom: '0.5rem' }}>{selectedProject.name}</h2>
            <span className={`badge badge-${selectedProject.status}`}>
              {STATUS_LABELS[selectedProject.status]}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {selectedProject.status === 'draft' && (
              <button 
                className="btn btn-primary" 
                onClick={() => setShowPubModal(true)}
                disabled={!canPublish}
              >
                📢 发布公示
              </button>
            )}
            {selectedProject.status === 'published' && (
              <button 
                className="btn btn-success" 
                onClick={() => setShowSettleModal(true)}
                disabled={!canSettle}
              >
                💰 结转
              </button>
            )}
            {selectedProject.status === 'settled' && (
              <button 
                className="btn btn-warning" 
                onClick={() => setShowArchiveModal(true)}
                disabled={!canArchive}
              >
                📦 归档
              </button>
            )}
            <button 
              className="btn btn-outline" 
              onClick={() => setShowObjectionModal(true)}
            >
              💬 提交异议
            </button>
          </div>
        </div>

        <div className="rule-checks">
          <div className={`rule-check ${ruleStatus?.hasContract ? 'pass' : 'fail'}`}>
            <span>{ruleStatus?.hasContract ? '✓' : '✗'}</span>
            合同附件已上传
          </div>
          <div className={`rule-check ${ruleStatus?.hasContractDeadline ? 'pass' : 'warning'}`}>
            <span>{ruleStatus?.hasContractDeadline ? '✓' : '⚠'}</span>
            {ruleStatus?.hasContractDeadline ? '办理时限已设置' : '存在未设置办理时限的合同'}
          </div>
          <div className={`rule-check ${ruleStatus?.hasExpiredContract ? 'fail' : 'pass'}`}>
            <span>{ruleStatus?.hasExpiredContract ? '✗' : '✓'}</span>
            {ruleStatus?.hasExpiredContract ? '存在已过期合同' : '合同未过期'}
          </div>
          <div className={`rule-check ${ruleStatus?.inPublicationPeriod ? 'warning' : 'pass'}`}>
            <span>{ruleStatus?.inPublicationPeriod ? '⏳' : '✓'}</span>
            {ruleStatus?.inPublicationPeriod ? '公示期内' : '不在公示期'}
          </div>
          <div className={`rule-check ${ruleStatus?.hasUnrepliedObjections ? 'fail' : 'pass'}`}>
            <span>{ruleStatus?.hasUnrepliedObjections ? '✗' : '✓'}</span>
            {ruleStatus?.hasUnrepliedObjections ? '存在待答复异议' : '异议已全部答复'}
          </div>
          <div className={`rule-check ${ruleStatus?.allocationChanged ? 'warning' : 'pass'}`}>
            <span>{ruleStatus?.allocationChanged ? '⚠' : '✓'}</span>
            {ruleStatus?.allocationChanged ? '分摊规则已变更需重公示' : '分摊规则未变更'}
          </div>
          <div className={`rule-check ${ruleStatus?.isSettled ? 'info' : 'pass'}`}>
            <span>{ruleStatus?.isSettled ? '🔒' : '✓'}</span>
            {ruleStatus?.isSettled ? '已结转（只读）' : '可编辑'}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>项目类型</label>
            <div style={{ padding: '0.625rem 0.875rem', background: '#f9fafb', borderRadius: '8px' }}>
              {PROJECT_TYPE_LABELS[selectedProject.type as keyof typeof PROJECT_TYPE_LABELS] || selectedProject.type}
            </div>
          </div>
          <div className="form-group">
            <label>收益金额</label>
            <div style={{ padding: '0.625rem 0.875rem', background: '#f9fafb', borderRadius: '8px' }}>
              <span className="amount amount-positive">¥{selectedProject.amount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="tabs">
          {[
            { key: 'info', label: '基本信息' },
            { key: 'contracts', label: `合同附件 (${projectDetail?.contracts.length || 0})` },
            { key: 'allocation', label: '分摊规则' },
            { key: 'publications', label: `公示记录 (${projectDetail?.publications.length || 0})` },
            { key: 'objections', label: `异议处理 (${projectDetail?.objections.length || 0})` },
            { key: 'settlement', label: '结转归档' },
            { key: 'logs', label: '操作日志' }
          ].map(tab => (
            <div
              key={tab.key}
              className={`tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key as TabType)}
            >
              {tab.label}
            </div>
          ))}
        </div>

        {activeTab === 'info' && (
          <div>
            <div className="form-group">
              <label>项目描述</label>
              <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', minHeight: '80px' }}>
                {selectedProject.description || '暂无描述'}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>分摊规则说明</label>
                <div style={{ padding: '0.625rem 0.875rem', background: '#f9fafb', borderRadius: '8px' }}>
                  {selectedProject.allocation_rules || '未设置'}
                </div>
              </div>
              <div className="form-group">
                <label>分摊规则版本</label>
                <div style={{ padding: '0.625rem 0.875rem', background: '#f9fafb', borderRadius: '8px' }}>
                  v{selectedProject.allocation_version}
                </div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>创建人</label>
                <div style={{ padding: '0.625rem 0.875rem', background: '#f9fafb', borderRadius: '8px' }}>
                  {selectedProject.created_by}
                </div>
              </div>
              <div className="form-group">
                <label>创建时间</label>
                <div style={{ padding: '0.625rem 0.875rem', background: '#f9fafb', borderRadius: '8px' }}>
                  {selectedProject.created_at}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contracts' && (
          <div>
            {projectDetail?.contracts.length === 0 ? (
              <div className="empty">
                暂无合同附件
                <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#ef4444' }}>
                  ⚠️ 缺少合同附件，无法发布公示
                </div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>文件名</th>
                    <th>大小</th>
                    <th>上传人</th>
                    <th>上传时间</th>
                    <th>办理时限</th>
                  </tr>
                </thead>
                <tbody>
                  {projectDetail?.contracts.map(c => {
                    const isExpired = c.handle_deadline && new Date(c.handle_deadline) < new Date(new Date().toDateString());
                    return (
                      <tr key={c.id}>
                        <td>📄 {c.original_name}</td>
                        <td>{(c.file_size / 1024).toFixed(1)} KB</td>
                        <td>{c.uploaded_by}</td>
                        <td>{c.uploaded_at}</td>
                        <td>
                          {c.handle_deadline ? (
                            <span style={{ color: isExpired ? '#ef4444' : '#374151', fontWeight: isExpired ? 500 : 400 }}>
                              {isExpired && '⚠️ '}{c.handle_deadline}
                              {isExpired && <span style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}>(已过期)</span>}
                            </span>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>未设置</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'allocation' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <strong>分摊规则：</strong>{selectedProject.allocation_rules || '未设置'}
            </div>
            {projectDetail?.allocations.length === 0 ? (
              <div className="empty">暂无分摊明细</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>业主姓名</th>
                    <th>房号</th>
                    <th>分摊比例</th>
                    <th>分摊金额</th>
                    <th>版本</th>
                  </tr>
                </thead>
                <tbody>
                  {projectDetail?.allocations.map(a => (
                    <tr key={a.id}>
                      <td>{a.owner_name}</td>
                      <td>{a.unit_number}</td>
                      <td>{(a.share_ratio * 100).toFixed(1)}%</td>
                      <td className="amount">¥{a.amount.toLocaleString()}</td>
                      <td>v{a.version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'publications' && (
          <div>
            {projectDetail?.publications.length === 0 ? (
              <div className="empty">暂无公示记录</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>公示标题</th>
                    <th>公示期</th>
                    <th>状态</th>
                    <th>发布人</th>
                    <th>分摊版本</th>
                  </tr>
                </thead>
                <tbody>
                  {projectDetail?.publications.map(p => (
                    <tr key={p.id}>
                      <td>{p.title}</td>
                      <td>{p.start_date} ~ {p.end_date}</td>
                      <td>
                        <span className="badge badge-published">{p.status === 'published' ? '已发布' : p.status}</span>
                      </td>
                      <td>{p.published_by}</td>
                      <td>v{p.allocation_version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'objections' && (
          <div>
            {projectDetail?.objections.length === 0 ? (
              <div className="empty">暂无异议记录</div>
            ) : (
              <div>
                {projectDetail?.objections.map(o => (
                  <div key={o.id} className="card" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 500, marginBottom: '0.5rem' }}>
                          {o.owner_name} 
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            ({o.contact})
                          </span>
                        </div>
                        <div style={{ color: '#374151', marginBottom: '0.75rem' }}>{o.content}</div>
                        {o.reply && (
                          <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                            <div style={{ fontSize: '0.875rem', color: '#065f46', fontWeight: 500, marginBottom: '0.25rem' }}>
                              💬 {o.replied_by} 于 {o.replied_at} 答复：
                            </div>
                            <div>{o.reply}</div>
                          </div>
                        )}
                      </div>
                      <div>
                        <span className={`badge badge-${o.status}`}>
                          {o.status === 'pending' ? '待答复' : '已答复'}
                        </span>
                        {o.status === 'pending' && (
                          <button 
                            className="btn btn-outline" 
                            style={{ marginLeft: '0.5rem' }}
                            onClick={() => setShowReplyModal(o.id)}
                          >
                            答复
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                      提交时间：{o.created_at}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settlement' && (
          <div>
            {projectDetail?.settlement ? (
              <div className="card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <h3 style={{ marginBottom: '1rem', color: '#065f46' }}>✅ 结转信息</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>结转日期</label>
                    <div style={{ padding: '0.625rem 0.875rem', background: 'white', borderRadius: '8px' }}>
                      {projectDetail.settlement.settlement_date}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>结转金额</label>
                    <div style={{ padding: '0.625rem 0.875rem', background: 'white', borderRadius: '8px' }}>
                      <span className="amount amount-positive">¥{projectDetail.settlement.total_amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label>经办人</label>
                  <div style={{ padding: '0.625rem 0.875rem', background: 'white', borderRadius: '8px' }}>
                    {projectDetail.settlement.created_by}
                  </div>
                </div>
                {projectDetail.settlement.remarks && (
                  <div className="form-group">
                    <label>备注</label>
                    <div style={{ padding: '0.625rem 0.875rem', background: 'white', borderRadius: '8px' }}>
                      {projectDetail.settlement.remarks}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty">
                尚未结转
                {selectedProject.status === 'published' && !ruleStatus?.inPublicationPeriod && (
                  <div style={{ marginTop: '1rem' }}>
                    <button className="btn btn-success" onClick={() => setShowSettleModal(true)}>
                      💰 执行结转
                    </button>
                  </div>
                )}
              </div>
            )}

            {projectDetail?.archive ? (
              <div className="card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', marginTop: '1rem' }}>
                <h3 style={{ marginBottom: '1rem', color: '#1e40af' }}>📦 归档信息</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>归档日期</label>
                    <div style={{ padding: '0.625rem 0.875rem', background: 'white', borderRadius: '8px' }}>
                      {projectDetail.archive.archive_date}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>归档人</label>
                    <div style={{ padding: '0.625rem 0.875rem', background: 'white', borderRadius: '8px' }}>
                      {projectDetail.archive.archived_by}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              projectDetail?.settlement && (
                <div className="empty" style={{ marginTop: '1rem' }}>
                  尚未归档
                  {!ruleStatus?.hasUnrepliedObjections && (
                    <div style={{ marginTop: '1rem' }}>
                      <button className="btn btn-warning" onClick={() => setShowArchiveModal(true)}>
                        📦 执行归档
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div>
            {projectDetail?.logs.length === 0 ? (
              <div className="empty">暂无操作日志</div>
            ) : (
              <div>
                {projectDetail?.logs.map(log => (
                  <div key={log.id} className="log-entry">
                    <div className="log-action">{log.action}</div>
                    <div className="log-meta">
                      操作人：{log.operator} | 时间：{log.created_at}
                      {log.ip_address && ` | IP：${log.ip_address}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showPubModal && (
        <div className="modal-overlay" onClick={() => setShowPubModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>确认发布公示</h3>
              <button className="close-btn" onClick={() => setShowPubModal(false)}>×</button>
            </div>
            <p>确定要发布该项目的收益公示吗？公示期默认为7天。</p>
            {!canPublish && (
              <div className="alert alert-error" style={{ marginTop: '1rem' }}>
                ⚠️ 缺少合同附件，无法发布公示！请先上传合同附件。
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowPubModal(false)}>取消</button>
              <button 
                className="btn btn-primary" 
                onClick={handlePublish}
                disabled={!canPublish || loading}
              >
                {loading ? '发布中...' : '确认发布'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettleModal && (
        <div className="modal-overlay" onClick={() => setShowSettleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>确认结转</h3>
              <button className="close-btn" onClick={() => setShowSettleModal(false)}>×</button>
            </div>
            <p>确定要执行结转操作吗？结转后项目将进入已结转状态，只能查看不能编辑。</p>
            {!canSettle && (
              <div className="alert alert-error" style={{ marginTop: '1rem' }}>
                ⚠️ {ruleStatus?.inPublicationPeriod ? '公示期内不能结转！' : 
                    ruleStatus?.allocationChanged ? '分摊规则已变更，需要重新公示！' :
                    ruleStatus?.hasExpiredContract ? '合同办理时限已过期，不能执行结转！' : '无法结转！'}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowSettleModal(false)}>取消</button>
              <button 
                className="btn btn-success" 
                onClick={handleSettle}
                disabled={!canSettle || loading}
              >
                {loading ? '结转中...' : '确认结转'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showArchiveModal && (
        <div className="modal-overlay" onClick={() => setShowArchiveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>确认归档</h3>
              <button className="close-btn" onClick={() => setShowArchiveModal(false)}>×</button>
            </div>
            <p>确定要执行归档操作吗？归档后项目将正式结案。</p>
            {!canArchive && (
              <div className="alert alert-error" style={{ marginTop: '1rem' }}>
                ⚠️ 存在未答复的异议，无法归档！
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowArchiveModal(false)}>取消</button>
              <button 
                className="btn btn-warning" 
                onClick={handleArchive}
                disabled={!canArchive || loading}
              >
                {loading ? '归档中...' : '确认归档'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showObjectionModal && (
        <div className="modal-overlay" onClick={() => setShowObjectionModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>提交异议</h3>
              <button className="close-btn" onClick={() => setShowObjectionModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmitObjection}>
              <div className="form-group">
                <label>您的姓名 *</label>
                <input
                  type="text"
                  value={objectionForm.owner_name}
                  onChange={(e) => setObjectionForm({ ...objectionForm, owner_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>联系方式 *</label>
                <input
                  type="text"
                  value={objectionForm.contact}
                  onChange={(e) => setObjectionForm({ ...objectionForm, contact: e.target.value })}
                  placeholder="手机号或房号"
                  required
                />
              </div>
              <div className="form-group">
                <label>异议内容 *</label>
                <textarea
                  rows={4}
                  value={objectionForm.content}
                  onChange={(e) => setObjectionForm({ ...objectionForm, content: e.target.value })}
                  placeholder="请详细描述您的疑问或意见"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowObjectionModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '提交中...' : '提交异议'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReplyModal && (
        <div className="modal-overlay" onClick={() => setShowReplyModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>答复异议</h3>
              <button className="close-btn" onClick={() => setShowReplyModal(null)}>×</button>
            </div>
            <div className="form-group">
              <label>答复内容 *</label>
              <textarea
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="请输入答复内容"
                required
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowReplyModal(null)}>取消</button>
              <button 
                className="btn btn-primary" 
                onClick={() => handleReply(showReplyModal)}
                disabled={!replyText.trim() || loading}
              >
                {loading ? '提交中...' : '提交答复'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
