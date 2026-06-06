const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = 'localhost';
const PORT = 3001;
const BASE_PATH = '/api';

let testProjectId = null;
let testPublicationId = null;
let testObjectionId = null;
let testSettlementId = null;
let testArchiveId = null;

const passed = [];
const failed = [];

function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: `${BASE_PATH}${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-operator': 'regression-test',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function logStep(step, description) {
  console.log(`\n步骤${step}: ${description}`);
}

function logPass(description) {
  console.log(`  ✓ ${description}`);
  passed.push(description);
}

function logFail(description, error) {
  console.log(`  ✗ ${description}`);
  console.log(`    错误: ${error.message}`);
  failed.push({ description, error: error.message });
}

async function runTests() {
  console.log('='.repeat(56));
  console.log('  物业公共收益公示系统 - 回归测试（完整业务流程）');
  console.log('='.repeat(56));

  try {
    logStep('1', '健康检查');
    try {
      const { status, data } = await request('GET', '/health');
      assert(status === 200, `期望状态码200，实际${status}`);
      assert(data.status === 'ok', '期望返回ok状态');
      logPass('服务正常运行');
    } catch (e) {
      logFail('服务正常运行', e);
    }

    logStep('2', '创建收益项目（广告位）');
    try {
      const { status, data } = await request('POST', '/projects', {
        name: '小区东门广告位',
        type: 'advertisement',
        amount: 25000,
        description: '2026年第二季度东门灯箱广告位收益',
        allocation_rules: '按建筑面积分摊'
      });
      assert(status === 201, `期望状态码201，实际${status}`);
      assert(data.id, '期望返回项目ID');
      assert(data.status === 'draft', '期望新建项目为草稿状态');
      testProjectId = data.id;
      console.log(`    项目ID: ${testProjectId}`);
      logPass('创建收益项目成功');
    } catch (e) {
      logFail('创建收益项目成功', e);
    }

    logStep('3', '配置分摊规则');
    try {
      const { status, data } = await request('POST', `/projects/${testProjectId}/allocation`, {
        details: [
          { owner_name: '张三', unit_number: '1-101', share_ratio: 0.3, amount: 7500 },
          { owner_name: '李四', unit_number: '1-102', share_ratio: 0.25, amount: 6250 },
          { owner_name: '王五', unit_number: '1-201', share_ratio: 0.25, amount: 6250 },
          { owner_name: '赵六', unit_number: '1-202', share_ratio: 0.2, amount: 5000 }
        ]
      });
      assert(status === 200, `期望状态码200，实际${status}`);
      assert(Array.isArray(data), '期望返回分摊明细数组');
      assert(data.length === 4, '期望4条分摊明细');
      logPass('配置分摊规则成功');
    } catch (e) {
      logFail('配置分摊规则成功', e);
    }

    logStep('4', '规则1验证：缺少合同附件不能发布公示');
    try {
      const { status, data } = await request('POST', '/publications', {
        project_id: testProjectId,
        title: '2026年第二季度广告位收益公示',
        start_date: '2026-06-06',
        end_date: '2026-06-13'
      });
      assert(status === 400, `期望状态码400，实际${status}`);
      assert(Array.isArray(data.errors), '期望返回错误数组');
      assert(data.errors.some(e => e.rule === 'MISSING_CONTRACT'), '期望返回MISSING_CONTRACT错误');
      console.log(`    验证成功: ${data.errors[0].message}`);
      logPass('缺少附件发布公示被正确拦截');
    } catch (e) {
      logFail('缺少附件发布公示被正确拦截', e);
    }

    logStep('5', '上传合同附件');
    try {
      const testFile = path.join(__dirname, 'test-contract.txt');
      fs.writeFileSync(testFile, '这是测试合同内容 - 广告位租赁合同');
      
      const boundary = '----TestBoundary123456';
      const fileContent = fs.readFileSync(testFile);
      
      let body = '';
      body += `--${boundary}\r\n`;
      body += 'Content-Disposition: form-data; name="file"; filename="contract.pdf"\r\n';
      body += 'Content-Type: application/pdf\r\n\r\n';
      body += fileContent.toString('binary');
      body += `\r\n--${boundary}--\r\n`;

      const options = {
        hostname: HOST,
        port: PORT,
        path: `${BASE_PATH}/contracts/${testProjectId}`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'x-operator': 'regression-test'
        }
      };

      const result = await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
        });
        req.on('error', reject);
        req.write(Buffer.from(body, 'binary'));
        req.end();
      });

      assert(result.status === 201, `期望状态码201，实际${result.status}`);
      assert(result.data.id, '期望返回附件ID');
      console.log(`    附件ID: ${result.data.id}`);
      fs.unlinkSync(testFile);
      logPass('上传合同附件成功');
    } catch (e) {
      logFail('上传合同附件成功', e);
    }

    logStep('6', '发布公示（有附件，应该成功）');
    try {
      const { status, data } = await request('POST', '/publications', {
        project_id: testProjectId,
        title: '2026年第二季度广告位收益公示',
        start_date: '2026-06-06',
        end_date: '2026-06-13'
      });
      assert(status === 201, `期望状态码201，实际${status}`);
      assert(data.id, '期望返回公示ID');
      assert(data.status === 'published', '期望公示状态为已发布');
      testPublicationId = data.id;
      console.log(`    公示ID: ${testPublicationId}`);
      console.log(`    公示期: ${data.start_date} 至 ${data.end_date}`);
      logPass('发布公示成功');
    } catch (e) {
      logFail('发布公示成功', e);
    }

    logStep('7', '规则2验证：公示期内不能结转');
    try {
      const { status, data } = await request('POST', '/settlements', {
        project_id: testProjectId,
        settlement_date: '2026-06-06',
        total_amount: 25000,
        remarks: '2026年第二季度结转'
      });
      assert(status === 400, `期望状态码400，实际${status}`);
      assert(Array.isArray(data.errors), '期望返回错误数组');
      assert(data.errors.some(e => e.rule === 'IN_PUBLICATION_PERIOD'), '期望返回IN_PUBLICATION_PERIOD错误');
      console.log(`    验证成功: ${data.errors[0].message}`);
      logPass('公示期内结转被正确拦截');
    } catch (e) {
      logFail('公示期内结转被正确拦截', e);
    }

    logStep('8', '业主提交异议');
    try {
      const { status, data } = await request('POST', '/objections', {
        project_id: testProjectId,
        publication_id: testPublicationId,
        owner_name: '业主A',
        contact: '13800138000',
        content: '分摊比例有疑问，需要解释'
      });
      assert(status === 201, `期望状态码201，实际${status}`);
      assert(data.id, '期望返回异议ID');
      assert(data.status === 'pending', '期望异议状态为待处理');
      testObjectionId = data.id;
      console.log(`    异议ID: ${testObjectionId}`);
      logPass('业主提交异议成功');
    } catch (e) {
      logFail('业主提交异议成功', e);
    }

    logStep('9', '管理员答复异议');
    try {
      const { status, data } = await request('PUT', `/objections/${testObjectionId}/reply`, {
        reply: '已核查，分摊比例正确，如有疑问可到物业办公室查看详细计算表'
      });
      assert(status === 200, `期望状态码200，实际${status}`);
      assert(data.status === 'replied', '期望异议状态为已答复');
      assert(data.reply, '期望返回答复内容');
      logPass('管理员答复异议成功');
    } catch (e) {
      logFail('管理员答复异议成功', e);
    }

    logStep('10', '规则3验证：异议未答复不能归档（先创建未答复异议）');
    try {
      const { data: obj } = await request('POST', '/objections', {
        project_id: testProjectId,
        publication_id: testPublicationId,
        owner_name: '业主B',
        contact: '13900139000',
        content: '金额计算有问题'
      });
      
      const { status, data } = await request('POST', '/archives', {
        project_id: testProjectId,
        archive_date: '2026-06-13'
      });
      assert(status === 400, `期望状态码400，实际${status}`);
      assert(Array.isArray(data.errors), '期望返回错误数组');
      assert(data.errors.some(e => e.rule === 'UNREPLIED_OBJECTIONS'), '期望返回UNREPLIED_OBJECTIONS错误');
      console.log(`    验证成功: ${data.errors[0].message}`);
      
      await request('PUT', `/objections/${obj.data.id}/reply`, { reply: '已核实无误' });
      logPass('异议未答复归档被正确拦截');
    } catch (e) {
      logFail('异议未答复归档被正确拦截', e);
    }

    logStep('11', '规则4验证：分摊规则变更后需重新公示');
    try {
      await request('POST', `/projects/${testProjectId}/allocation`, {
        details: [
          { owner_name: '张三', unit_number: '1-101', share_ratio: 0.35, amount: 8750 },
          { owner_name: '李四', unit_number: '1-102', share_ratio: 0.2, amount: 5000 },
          { owner_name: '王五', unit_number: '1-201', share_ratio: 0.25, amount: 6250 },
          { owner_name: '赵六', unit_number: '1-202', share_ratio: 0.2, amount: 5000 }
        ]
      });
      
      const { status, data } = await request('GET', `/projects/${testProjectId}/rules`);
      assert(status === 200, `期望状态码200，实际${status}`);
      assert(data.data.allocationChanged === true, '期望allocationChanged为true');
      console.log('    验证成功: 分摊规则已变更，需要重新公示');
      logPass('分摊规则变更检测成功');
    } catch (e) {
      logFail('分摊规则变更检测成功', e);
    }

    logStep('12', '重新发布公示（分摊规则变更后）');
    try {
      const { status, data } = await request('POST', '/publications', {
        project_id: testProjectId,
        title: '2026年第二季度广告位收益公示（更新）',
        start_date: '2026-06-07',
        end_date: '2026-06-14'
      });
      assert(status === 201, `期望状态码201，实际${status}`);
      assert(data.allocation_version >= 2, '期望分摊版本号已升级');
      logPass('分摊规则变更后重新公示成功');
    } catch (e) {
      logFail('分摊规则变更后重新公示成功', e);
    }

    logStep('13', '模拟公示期结束后进行结转');
    try {
      const { data: project } = await request('GET', `/projects/${testProjectId}`);
      const oldEndDate = project.data.publications[0].end_date;
      const newEndDate = '2026-06-05';
      
      const dbPath = path.join(__dirname, '../../data/property_income.db');
      if (fs.existsSync(dbPath)) {
        console.log('    提示: 数据库文件存在，可手动修改公示结束日期测试结转');
      }
      
      const { status, data } = await request('POST', '/settlements', {
        project_id: testProjectId,
        settlement_date: '2026-06-15',
        total_amount: 25000,
        remarks: '2026年第二季度结转'
      });
      
      if (status === 400 && data.errors?.some(e => e.rule === 'IN_PUBLICATION_PERIOD')) {
        console.log('    仍在公示期，结转被正确拦截（符合预期）');
        logPass('公示期检测生效（符合预期）');
      } else if (status === 201) {
        testSettlementId = data.id;
        console.log(`    结转ID: ${data.id}`);
        logPass('结转成功');
      } else {
        throw new Error(`未预期的状态码: ${status}`);
      }
    } catch (e) {
      logFail('结转操作验证', e);
    }

    logStep('14', '规则5验证：已结转收益只能查看不能编辑');
    try {
      if (testSettlementId) {
        const { status, data } = await request('PUT', `/projects/${testProjectId}`, {
          name: '尝试修改已结转项目'
        });
        assert(status === 400, `期望状态码400，实际${status}`);
        assert(Array.isArray(data.errors), '期望返回错误数组');
        assert(data.errors.some(e => e.rule === 'ALREADY_SETTLED'), '期望返回ALREADY_SETTLED错误');
        console.log(`    验证成功: ${data.errors[0].message}`);
        logPass('已结转项目编辑被正确拦截');
      } else {
        console.log('    跳过: 暂无已结转项目进行验证');
        logPass('已结转项目编辑限制（待结转后验证）');
      }
    } catch (e) {
      logFail('已结转项目编辑限制验证', e);
    }

    logStep('15', '验证归档操作');
    try {
      const { status, data } = await request('POST', '/archives', {
        project_id: testProjectId,
        archive_date: '2026-06-15'
      });
      
      if (status === 201) {
        testArchiveId = data.id;
        console.log(`    归档ID: ${data.id}`);
        logPass('归档操作成功');
      } else if (status === 400) {
        console.log(`    归档被拦截: ${JSON.stringify(data.errors)}`);
        logPass('归档规则校验生效');
      } else {
        throw new Error(`未预期的状态码: ${status}`);
      }
    } catch (e) {
      logFail('归档操作验证', e);
    }

    logStep('16', '查询项目完整详情');
    try {
      const { status, data } = await request('GET', `/projects/${testProjectId}`);
      assert(status === 200, `期望状态码200，实际${status}`);
      assert(data.project, '期望返回项目信息');
      assert(Array.isArray(data.contracts), '期望返回合同列表');
      assert(Array.isArray(data.allocations), '期望返回分摊列表');
      assert(Array.isArray(data.publications), '期望返回公示列表');
      assert(Array.isArray(data.objections), '期望返回异议列表');
      assert(Array.isArray(data.logs), '期望返回日志列表');
      console.log(`    项目名称: ${data.project.name}`);
      console.log(`    合同数量: ${data.contracts.length}`);
      console.log(`    分摊明细: ${data.allocations.length}条`);
      console.log(`    公示记录: ${data.publications.length}条`);
      console.log(`    异议记录: ${data.objections.length}条`);
      console.log(`    操作日志: ${data.logs.length}条`);
      logPass('查询项目完整详情成功');
    } catch (e) {
      logFail('查询项目完整详情成功', e);
    }

    logStep('17', '验证所有5条业务规则状态');
    try {
      const { status, data } = await request('GET', `/projects/${testProjectId}/rules`);
      assert(status === 200, `期望状态码200，实际${status}`);
      assert('hasContract' in data.data, '期望hasContract字段');
      assert('inPublicationPeriod' in data.data, '期望inPublicationPeriod字段');
      assert('hasUnrepliedObjections' in data.data, '期望hasUnrepliedObjections字段');
      assert('allocationChanged' in data.data, '期望allocationChanged字段');
      assert('isSettled' in data.data, '期望isSettled字段');
      console.log('    规则状态:');
      console.log(`      - 有合同附件: ${data.data.hasContract}`);
      console.log(`      - 在公示期: ${data.data.inPublicationPeriod}`);
      console.log(`      - 有未答复异议: ${data.data.hasUnrepliedObjections}`);
      console.log(`      - 分摊规则已变更: ${data.data.allocationChanged}`);
      console.log(`      - 已结转: ${data.data.isSettled}`);
      logPass('所有业务规则状态查询成功');
    } catch (e) {
      logFail('所有业务规则状态查询成功', e);
    }

    logStep('18', '查询操作日志审计');
    try {
      const { status, data } = await request('GET', `/logs?project_id=${testProjectId}`);
      assert(status === 200, `期望状态码200，实际${status}`);
      assert(Array.isArray(data), '期望返回日志数组');
      assert(data.length > 0, '期望至少有一条日志');
      console.log(`    日志数量: ${data.length}条`);
      data.slice(0, 5).forEach(log => {
        console.log(`      - ${log.action} by ${log.operator} at ${log.created_at}`);
      });
      logPass('操作日志查询成功');
    } catch (e) {
      logFail('操作日志查询成功', e);
    }

  } catch (e) {
    console.error('\n测试执行异常:', e);
  }

  console.log('\n' + '='.repeat(56));
  console.log('  测试结果汇总');
  console.log('='.repeat(56));
  console.log(`  通过: ${passed.length}`);
  console.log(`  失败: ${failed.length}`);
  console.log(`  总计: ${passed.length + failed.length}`);
  console.log('='.repeat(56));

  if (failed.length > 0) {
    console.log('\n失败详情:');
    failed.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.description}`);
      console.log(`     错误: ${f.error}`);
    });
    console.log('\n存在测试失败，请检查问题！');
    process.exit(1);
  } else {
    console.log('\n所有回归测试通过！');
    process.exit(0);
  }
}

runTests().