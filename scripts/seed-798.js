#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const seedDataPath = path.join(__dirname, '../seed-798.json');

try {
  const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));
  
  console.log('========================================');
  console.log('  物业公共收益公示系统 - 办理时限样例数据');
  console.log('========================================');
  console.log(`生成日期: ${seedData.seed_date}`);
  console.log(`版本: ${seedData.version}`);
  console.log('');
  
  console.log('【业务编号列表】');
  console.log('----------------------------------------');
  seedData.projects.forEach((project, index) => {
    console.log(`\n项目 ${index + 1}:`);
    console.log(`  业务编号: ${project.id}`);
    console.log(`  项目名称: ${project.name}`);
    console.log(`  项目状态: ${project.status}`);
    console.log(`  收益金额: ¥${project.amount.toLocaleString()}`);
    
    if (project.contracts && project.contracts.length > 0) {
      console.log(`  合同附件: ${project.contracts.length} 个`);
      project.contracts.forEach((contract, cIndex) => {
        console.log(`    合同 ${cIndex + 1}:`);
        console.log(`      合同编号: ${contract.id}`);
        console.log(`      文件名称: ${contract.original_name}`);
        console.log(`      办理时限: ${contract.handle_deadline || '未设置'}`);
        console.log(`      时限状态: ${contract.deadline_status}`);
        if (contract.days_remaining) {
          console.log(`      剩余天数: ${contract.days_remaining} 天`);
        }
        if (contract.days_overdue) {
          console.log(`      逾期天数: ${contract.days_overdue} 天`);
        }
      });
    }
    
    if (project.rule_status) {
      console.log(`  规则状态:`);
      console.log(`    有合同附件: ${project.rule_status.hasContract ? '是' : '否'}`);
      console.log(`    已设置办理时限: ${project.rule_status.hasContractDeadline ? '是' : '否'}`);
      console.log(`    存在过期合同: ${project.rule_status.hasExpiredContract ? '是' : '否'}`);
      console.log(`    公示期内: ${project.rule_status.inPublicationPeriod ? '是' : '否'}`);
      console.log(`    可结转: ${project.rule_status.canSettle ? '是' : '否'}`);
      if (project.rule_status.settle_block_reason) {
        console.log(`    结转限制原因: ${project.rule_status.settle_block_reason}`);
      }
    }
    
    if (project.objections && project.objections.length > 0) {
      console.log(`  异议记录: ${project.objections.length} 条`);
    }
  });
  
  console.log('\n');
  console.log('【业务规则说明】');
  console.log('----------------------------------------');
  console.log('1. 办理时限规则:');
  seedData.business_rules.handle_deadline.check_points.forEach((point, i) => {
    console.log(`   ${i + 1}. ${point}`);
  });
  console.log('\n2. 公示期规则（保留原限制）:');
  seedData.business_rules.publication_period.check_points.forEach((point, i) => {
    console.log(`   ${i + 1}. ${point}`);
  });
  
  console.log('\n');
  console.log('【测试场景】');
  console.log('----------------------------------------');
  seedData.test_scenarios.forEach((scenario, index) => {
    console.log(`\n场景 ${index + 1}: ${scenario.scenario}`);
    console.log(`  业务编号: ${scenario.project_id}`);
    console.log(`  预期行为:`);
    scenario.expected_behavior.forEach((behavior, bIndex) => {
      console.log(`    ${bIndex + 1}. ${behavior}`);
    });
  });
  
  console.log('\n');
  console.log('========================================');
  console.log('  所有业务编号汇总');
  console.log('========================================');
  seedData.projects.forEach(project => {
    console.log(`  ${project.id} - ${project.name}`);
  });
  
  console.log('\n脚本执行完成！');
  process.exit(0);
  
} catch (error) {
  console.error('读取 seed-798.json 失败:', error.message);
  process.exit(1);
}
