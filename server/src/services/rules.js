const { prepare } = require('../database/init');
const dayjs = require('dayjs');

const RULES = {
  MISSING_CONTRACT: 'MISSING_CONTRACT',
  IN_PUBLICATION_PERIOD: 'IN_PUBLICATION_PERIOD',
  UNREPLIED_OBJECTIONS: 'UNREPLIED_OBJECTIONS',
  ALLOCATION_CHANGED: 'ALLOCATION_CHANGED',
  ALREADY_SETTLED: 'ALREADY_SETTLED',
  CONTRACT_EXPIRED: 'CONTRACT_EXPIRED',
  MISSING_CONTRACT_DEADLINE: 'MISSING_CONTRACT_DEADLINE'
};

const RULE_MESSAGES = {
  [RULES.MISSING_CONTRACT]: '附件缺失，不能发布公示',
  [RULES.IN_PUBLICATION_PERIOD]: '公示期内不能结转',
  [RULES.UNREPLIED_OBJECTIONS]: '存在未答复的异议，不能归档',
  [RULES.ALLOCATION_CHANGED]: '分摊规则已变更，需要重新公示',
  [RULES.ALREADY_SETTLED]: '已结转收益只能查看不能编辑',
  [RULES.CONTRACT_EXPIRED]: '合同办理时限已过期，不能执行结转',
  [RULES.MISSING_CONTRACT_DEADLINE]: '存在未设置办理时限的合同附件'
};

const checkContractExists = (projectId) => {
  const count = prepare('SELECT COUNT(*) as cnt FROM contracts WHERE project_id = ?').get(projectId).cnt;
  return count > 0;
};

const isInPublicationPeriod = (projectId) => {
  const now = dayjs().format('YYYY-MM-DD');
  const publication = prepare(`
    SELECT * FROM publications 
    WHERE project_id = ? AND status = 'published'
    ORDER BY created_at DESC LIMIT 1
  `).get(projectId);
  
  if (!publication) return false;
  return now >= publication.start_date && now <= publication.end_date;
};

const hasUnrepliedObjections = (projectId) => {
  const count = prepare(`
    SELECT COUNT(*) as cnt FROM objections 
    WHERE project_id = ? AND status = 'pending'
  `).get(projectId).cnt;
  return count > 0;
};

const isAllocationChanged = (projectId) => {
  const project = prepare('SELECT allocation_version FROM income_projects WHERE id = ?').get(projectId);
  if (!project) return false;
  
  const latestPublication = prepare(`
    SELECT allocation_version FROM publications 
    WHERE project_id = ? AND status = 'published'
    ORDER BY created_at DESC LIMIT 1
  `).get(projectId);
  
  if (!latestPublication) return false;
  return project.allocation_version > latestPublication.allocation_version;
};

const isSettled = (projectId) => {
  const count = prepare('SELECT COUNT(*) as cnt FROM settlements WHERE project_id = ?').get(projectId).cnt;
  return count > 0;
};

const hasExpiredContract = (projectId) => {
  const now = dayjs().format('YYYY-MM-DD');
  const contracts = prepare('SELECT handle_deadline FROM contracts WHERE project_id = ? AND handle_deadline IS NOT NULL').all(projectId);
  return contracts.some(c => dayjs(c.handle_deadline).isBefore(now, 'day'));
};

const hasContractDeadline = (projectId) => {
  const contracts = prepare('SELECT handle_deadline FROM contracts WHERE project_id = ?').all(projectId);
  return contracts.length > 0 && contracts.every(c => c.handle_deadline !== null);
};

const validatePublication = (projectId) => {
  const errors = [];
  if (!checkContractExists(projectId)) {
    errors.push({ rule: RULES.MISSING_CONTRACT, message: RULE_MESSAGES[RULES.MISSING_CONTRACT] });
  }
  return errors;
};

const validateSettlement = (projectId) => {
  const errors = [];
  if (isInPublicationPeriod(projectId)) {
    errors.push({ rule: RULES.IN_PUBLICATION_PERIOD, message: RULE_MESSAGES[RULES.IN_PUBLICATION_PERIOD] });
  }
  if (isAllocationChanged(projectId)) {
    errors.push({ rule: RULES.ALLOCATION_CHANGED, message: RULE_MESSAGES[RULES.ALLOCATION_CHANGED] });
  }
  if (hasExpiredContract(projectId)) {
    errors.push({ rule: RULES.CONTRACT_EXPIRED, message: RULE_MESSAGES[RULES.CONTRACT_EXPIRED] });
  }
  return errors;
};

const validateArchive = (projectId) => {
  const errors = [];
  if (hasUnrepliedObjections(projectId)) {
    errors.push({ rule: RULES.UNREPLIED_OBJECTIONS, message: RULE_MESSAGES[RULES.UNREPLIED_OBJECTIONS] });
  }
  return errors;
};

const validateEdit = (projectId) => {
  const errors = [];
  if (isSettled(projectId)) {
    errors.push({ rule: RULES.ALREADY_SETTLED, message: RULE_MESSAGES[RULES.ALREADY_SETTLED] });
  }
  return errors;
};

const getProjectStatus = (projectId) => {
  return {
    hasContract: checkContractExists(projectId),
    inPublicationPeriod: isInPublicationPeriod(projectId),
    hasUnrepliedObjections: hasUnrepliedObjections(projectId),
    allocationChanged: isAllocationChanged(projectId),
    isSettled: isSettled(projectId),
    hasExpiredContract: hasExpiredContract(projectId),
    hasContractDeadline: hasContractDeadline(projectId)
  };
};

module.exports = {
  RULES,
  RULE_MESSAGES,
  checkContractExists,
  isInPublicationPeriod,
  hasUnrepliedObjections,
  isAllocationChanged,
  isSettled,
  hasExpiredContract,
  hasContractDeadline,
  validatePublication,
  validateSettlement,
  validateArchive,
  validateEdit,
  getProjectStatus
};
