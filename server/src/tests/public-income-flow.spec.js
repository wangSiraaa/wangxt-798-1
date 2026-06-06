const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = process.env.TEST_HOST || '127.0.0.1';
const PORT = Number(process.env.TEST_PORT || process.env.PORT || 3001);
const BASE_PATH = '/api';

function request(method, urlPath, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const req = http.request({
      hostname: HOST,
      port: PORT,
      path: `${BASE_PATH}${urlPath}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-operator': 'public-income-flow-test',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        ...headers
      }
    }, (res) => {
      let response = '';
      res.on('data', (chunk) => response += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: response ? JSON.parse(response) : {} });
        } catch (error) {
          resolve({ status: res.statusCode, data: response });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function uploadContract(projectId) {
  return new Promise((resolve, reject) => {
    const boundary = '----PublicIncomeFlowBoundary';
    const fileContent = Buffer.from('public income contract fixture');
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from('Content-Disposition: form-data; name="file"; filename="flow-contract.pdf"\r\n'),
      Buffer.from('Content-Type: application/pdf\r\n\r\n'),
      fileContent,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const req = http.request({
      hostname: HOST,
      port: PORT,
      path: `${BASE_PATH}/contracts/${projectId}`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        'x-operator': 'public-income-flow-test'
      }
    }, (res) => {
      let response = '';
      res.on('data', (chunk) => response += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(response) }));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const health = await request('GET', '/health');
  assert(health.status === 200 && health.data.status === 'ok', '服务健康检查失败');

  const project = await request('POST', '/projects', {
    name: '公共收益公示回归项目',
    type: 'parking',
    amount: 36000,
    description: '覆盖创建、公示、异议、结转、归档流程',
    allocation_rules: '按建筑面积分摊'
  });
  assert(project.status === 201 && project.data.id, '创建项目失败');
  const projectId = project.data.id;

  const allocation = await request('POST', `/projects/${projectId}/allocation`, {
    details: [
      { owner_name: '张三', unit_number: '1-101', share_ratio: 0.5, amount: 18000 },
      { owner_name: '李四', unit_number: '1-102', share_ratio: 0.5, amount: 18000 }
    ]
  });
  assert(allocation.status === 200, '配置分摊明细失败');

  const blockedPublication = await request('POST', '/publications', {
    project_id: projectId,
    title: '缺附件公示校验'
  });
  assert(blockedPublication.status === 400, '缺少合同附件时不应允许发布公示');
  assert(blockedPublication.data.errors.some((error) => error.rule === 'MISSING_CONTRACT'), '缺附件发布未返回MISSING_CONTRACT');

  const contract = await uploadContract(projectId);
  assert(contract.status === 201 && contract.data.id, '上传合同附件失败');

  const publication = await request('POST', '/publications', {
    project_id: projectId,
    title: '公共收益公示回归',
    start_date: '2026-05-01',
    end_date: '2026-05-08'
  });
  assert(publication.status === 201 && publication.data.status === 'published', '发布公示失败');

  const objection = await request('POST', '/objections', {
    project_id: projectId,
    publication_id: publication.data.id,
    owner_name: '王五',
    contact: '13800138000',
    content: '请说明分摊依据'
  });
  assert(objection.status === 201 && objection.data.status === 'pending', '提交异议失败');

  const blockedArchive = await request('POST', '/archives', {
    project_id: projectId,
    archive_date: '2026-06-06'
  });
  assert(blockedArchive.status === 400, '未答复异议时不应允许归档');
  assert(blockedArchive.data.errors.some((error) => error.rule === 'UNREPLIED_OBJECTIONS'), '未答复异议归档未返回UNREPLIED_OBJECTIONS');

  const reply = await request('POST', `/objections/${objection.data.id}/reply`, {
    reply: '已核实，分摊依据为建筑面积'
  });
  assert(reply.status === 200 && reply.data.status === 'replied', '答复异议失败');

  const settlement = await request('POST', '/settlements', {
    project_id: projectId,
    settlement_date: '2026-06-06',
    remarks: '公示期结束后结转'
  });
  assert(settlement.status === 201 && settlement.data.total_amount === 36000, '结转失败');

  const archive = await request('POST', '/archives', {
    project_id: projectId,
    archive_date: '2026-06-06'
  });
  assert(archive.status === 201 && archive.data.status === 'archived', '归档失败');

  const detail = await request('GET', `/projects/${projectId}`);
  assert(detail.status === 200, '项目详情回读失败');
  assert(detail.data.project.status === 'archived', '归档后项目状态未更新');
  assert(detail.data.contracts.length === 1, '详情未回读合同附件');
  assert(detail.data.publications.length === 1, '详情未回读公示记录');
  assert(detail.data.objections.length === 1 && detail.data.objections[0].status === 'replied', '详情未回读已答复异议');
  assert(detail.data.settlement && detail.data.settlement.total_amount === 36000, '详情未回读结转单');
  assert(detail.data.archive && detail.data.archive.status === 'archived', '详情未回读归档单');

  const marker = path.basename(process.env.DB_PATH || '');
  console.log(JSON.stringify({
    ok: true,
    repo: '798',
    host: HOST,
    port: PORT,
    db: marker,
    projectId,
    publicationId: publication.data.id,
    objectionId: objection.data.id,
    settlementId: settlement.data.id,
    archiveId: archive.data.id
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
