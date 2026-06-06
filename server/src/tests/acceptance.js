const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3001;
const BASE_PATH = '/api';

let passed = 0;
let failed = 0;

const request = (method, path, data = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: `${BASE_PATH}${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-operator': 'acceptance-test',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, body: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

const test = async (name, fn) => {
  try {
    process.stdout.write(`  ${name}... `);
    await fn();
    console.log('\x1b[32m✓ 通过\x1b[0m');
    passed++;
  } catch (e) {
    console.log(`\x1b[31m✗ 失败\x1b[0m`);
    console.log(`    错误: ${e.message}`);
    failed++;
  }
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message || '断言失败');
  }
};

const runTests = async () => {
  console.log('========================================');
  console.log('  物业公共收益公示系统 - 验收测试');
  console.log('========================================\n');

  console.log('步骤1: 健康检查');
  await test('服务正常运行', async () => {
    const res = await request('GET', '/health');
    assert(res.status === 200, `期望状态码200，实际${res.status}`);
    assert(res.body.status === 'ok', '期望返回ok');
  });

  console.log('\n步骤2: 创建收益项目（缺少合同附件）');
  let projectId;
  await test('创建停车费收益项目', async () => {
    const res = await request('POST', '/projects', {
      name: '验收测试-地下停车场收益',
      type: 'parking',
      amount: 50000,
      description: '验收测试用项目',
      allocation_rules: '按面积分摊'
    });
    assert(res.status === 201, `期望状态码201，实际${res.status}`);
    assert(res.body.id, '期望返回项目ID');
    projectId = res.body.id;
    console.log(`\n    项目ID: ${projectId}`);
  });

  console.log('\n步骤3: 尝试发布公示（缺少附件，应该失败）');
  await test('缺少合同附件不能发布公示', async () => {
    const res = await request('POST', '/publications', {
      project_id: projectId,
      title: '验收测试-停车场收益公示'
    });
    assert(res.status === 400, `期望状态码400，实际${res.status}`);
    assert(res.body.errors, '期望返回错误信息');
    assert(Array.isArray(res.body.errors), '期望errors是数组');
    assert(res.body.errors.length > 0, '期望至少有一条错误');
    const hasMissingContract = res.body.errors.some(e => e.rule === 'MISSING_CONTRACT');
    assert(hasMissingContract, '期望包含MISSING_CONTRACT规则错误');
    console.log(`\n    验证成功: ${res.body.errors[0].message}`);
  });

  console.log('\n步骤4: 上传合同附件');
  let contractId;
  await test('上传合同附件', async () => {
    const boundary = '----TestBoundary123456';
    const fileContent = '这是一个模拟的PDF合同文件内容，用于验收测试。';
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from('Content-Disposition: form-data; name="file"; filename="test_contract.pdf"\r\n'),
      Buffer.from('Content-Type: application/pdf\r\n\r\n'),
      Buffer.from(fileContent),
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const res = await new Promise((resolve, reject) => {
      const options = {
        hostname: BASE_URL,
        port: PORT,
        path: `${BASE_PATH}/contracts/${projectId}`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'x-operator': 'acceptance-test'
        }
      };
      const req = http.request(options, (r) => {
        let data = '';
        r.on('data', c => data += c);
        r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(data) }));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    assert(res.status === 201, `期望状态码201，实际${res.status}`);
    assert(res.body.id, '期望返回附件ID');
    contractId = res.body.id;
    console.log(`\n    附件ID: ${contractId}`);
  });

  console.log('\n步骤5: 再次发布公示（有附件，应该成功）');
  let publicationId;
  await test('有附件可以正常发布公示', async () => {
    const res = await request('POST', '/publications', {
      project_id: projectId,
      title: '验收测试-停车场收益公示'
    });
    assert(res.status === 201, `期望状态码201，实际${res.status}`);
    assert(res.body.id, '期望返回公示ID');
    assert(res.body.status === 'published', '期望状态为published');
    publicationId = res.body.id;
    console.log(`\n    公示ID: ${publicationId}`);
    console.log(`    公示期: ${res.body.start_date} 至 ${res.body.end_date}`);
  });

  console.log('\n步骤6: 公示期内尝试结转（应该失败）');
  await test('公示期内不能结转', async () => {
    const res = await request('POST', '/settlements', {
      project_id: projectId
    });
    assert(res.status === 400, `期望状态码400，实际${res.status}`);
    assert(res.body.errors, '期望返回错误信息');
    const hasInPeriod = res.body.errors.some(e => e.rule === 'IN_PUBLICATION_PERIOD');
    assert(hasInPeriod, '期望包含IN_PUBLICATION_PERIOD规则错误');
    console.log(`\n    验证成功: ${res.body.errors[0].message}`);
  });

  console.log('\n步骤7: 提交业主异议');
  let objectionId;
  await test('业主提交异议', async () => {
    const res = await request('POST', '/objections', {
      project_id: projectId,
      publication_id: publicationId,
      owner_name: '验收业主',
      contact: '13900139000',
      content: '我对分摊比例有疑问，请核实。'
    });
    assert(res.status === 201, `期望状态码201，实际${res.status}`);
    assert(res.body.id, '期望返回异议ID');
    assert(res.body.status === 'pending', '期望状态为pending');
    objectionId = res.body.id;
    console.log(`\n    异议ID: ${objectionId}`);
  });

  console.log('\n步骤8: 管理员答复异议');
  await test('管理员答复异议', async () => {
    const res = await request('POST', `/objections/${objectionId}/reply`, {
      reply: '感谢您的反馈，我们已核实分摊比例，计算无误。如有疑问可到物业办公室查阅详细资料。'
    });
    assert(res.status === 200, `期望状态码200，实际${res.status}`);
    assert(res.body.status === 'replied', '期望状态为replied');
    assert(res.body.reply, '期望包含答复内容');
  });

  console.log('\n步骤9: 检查项目规则状态');
  await test('获取项目规则状态', async () => {
    const res = await request('GET', `/rules/status/${projectId}`);
    assert(res.status === 200, `期望状态码200，实际${res.status}`);
    assert(res.body.hasContract === true, '期望hasContract为true');
    assert(res.body.inPublicationPeriod === true, '期望inPublicationPeriod为true（仍在公示期）');
    assert(res.body.hasUnrepliedObjections === false, '期望hasUnrepliedObjections为false（已答复）');
    console.log(`\n    规则状态:`, JSON.stringify(res.body, null, 6));
  });

  console.log('\n步骤10: 查询操作日志');
  await test('查询项目操作日志', async () => {
    const res = await request('GET', `/logs?projectId=${projectId}`);
    assert(res.status === 200, `期望状态码200，实际${res.status}`);
    assert(Array.isArray(res.body), '期望返回数组');
    assert(res.body.length >= 5, `期望至少5条日志，实际${res.body.length}条`);
    console.log(`\n    日志数量: ${res.body.length}条`);
    res.body.slice(0, 3).forEach(log => {
      console.log(`      - ${log.action} by ${log.operator} at ${log.created_at}`);
    });
  });

  console.log('\n========================================');
  console.log('  测试结果汇总');
  console.log('========================================');
  console.log(`  通过: ${passed}`);
  console.log(`  失败: ${failed}`);
  console.log(`  总计: ${passed + failed}`);
  console.log('========================================\n');

  if (failed > 0) {
    console.log('\x1b[31m存在测试失败，请检查问题！\x1b[0m');
    process.exit(1);
  } else {
    console.log('\x1b[32m所有验收测试通过！\x1b[0m');
    process.exit(0);
  }
};

const waitForServer = async () => {
  console.log('等待服务启动...');
  for (let i = 0; i < 30; i++) {
    try {
      await request('GET', '/health');
      console.log('服务已就绪！\n');
      return;
    } catch (e) {
      process.stdout.write('.');
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  console.log('\n服务启动超时！');
  process.exit(1);
};

const main = async () => {
  console.log('服务已就绪，开始测试...\n');
  await runTests();
};

main().catch(console.error);
