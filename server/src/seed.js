const { initDatabase, prepare } = require('./database/init');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

const seedData = () => {
  console.log('开始插入种子数据...');

  const project1Id = uuidv4();
  const project2Id = uuidv4();
  const project3Id = uuidv4();
  
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

  const insertProject = prepare(`
    INSERT INTO income_projects (id, name, type, amount, description, status, created_by, created_at, updated_at, allocation_rules, allocation_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProject.run(
    project1Id,
    '小区地面停车位收益',
    'parking',
    125000.00,
    '2024年上半年小区地面公共停车位出租收益',
    'draft',
    '财务_张三',
    now,
    now,
    '按业主产权面积分摊',
    1
  );

  insertProject.run(
    project2Id,
    '电梯广告位收益',
    'advertisement',
    86000.00,
    '小区电梯轿厢广告位出租收益',
    'draft',
    '财务_张三',
    now,
    now,
    '按户数平均分摊',
    1
  );

  insertProject.run(
    project3Id,
    '小区公共区域摊位收益',
    'booth',
    32000.00,
    '小区公共区域临时摊位出租收益',
    'published',
    '财务_李四',
    now,
    now,
    '按业主产权面积分摊',
    1
  );

  const contract1Id = uuidv4();
  const contract2Id = uuidv4();
  const contract3Id = uuidv4();

  const insertContract = prepare(`
    INSERT INTO contracts (id, project_id, filename, original_name, file_path, file_size, uploaded_by, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertContract.run(
    contract1Id,
    project1Id,
    `${uuidv4()}.pdf`,
    '停车位出租合同.pdf',
    '/tmp/contract1.pdf',
    1024000,
    '财务_张三',
    now
  );

  insertContract.run(
    contract3Id,
    project3Id,
    `${uuidv4()}.pdf`,
    '摊位出租合同.pdf',
    '/tmp/contract3.pdf',
    512000,
    '财务_李四',
    now
  );

  const insertAllocation = prepare(`
    INSERT INTO allocation_details (id, project_id, owner_name, unit_number, share_ratio, amount, created_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const allocations1 = [
    { owner_name: '业主A', unit_number: '1-101', share_ratio: 0.15, amount: 18750 },
    { owner_name: '业主B', unit_number: '1-102', share_ratio: 0.12, amount: 15000 },
    { owner_name: '业主C', unit_number: '2-201', share_ratio: 0.18, amount: 22500 },
    { owner_name: '业主D', unit_number: '2-202', share_ratio: 0.15, amount: 18750 },
    { owner_name: '业主E', unit_number: '3-301', share_ratio: 0.20, amount: 25000 },
    { owner_name: '业主F', unit_number: '3-302', share_ratio: 0.20, amount: 25000 },
  ];

  allocations1.forEach(a => {
    insertAllocation.run(uuidv4(), project1Id, a.owner_name, a.unit_number, a.share_ratio, a.amount, now, 1);
  });

  const allocations3 = [
    { owner_name: '业主A', unit_number: '1-101', share_ratio: 0.15, amount: 4800 },
    { owner_name: '业主B', unit_number: '1-102', share_ratio: 0.12, amount: 3840 },
    { owner_name: '业主C', unit_number: '2-201', share_ratio: 0.18, amount: 5760 },
    { owner_name: '业主D', unit_number: '2-202', share_ratio: 0.15, amount: 4800 },
    { owner_name: '业主E', unit_number: '3-301', share_ratio: 0.20, amount: 6400 },
    { owner_name: '业主F', unit_number: '3-302', share_ratio: 0.20, amount: 6400 },
  ];

  allocations3.forEach(a => {
    insertAllocation.run(uuidv4(), project3Id, a.owner_name, a.unit_number, a.share_ratio, a.amount, now, 1);
  });

  const publication3Id = uuidv4();
  const insertPublication = prepare(`
    INSERT INTO publications (id, project_id, title, start_date, end_date, status, published_by, created_at, allocation_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPublication.run(
    publication3Id,
    project3Id,
    '小区公共区域摊位收益公示',
    dayjs().format('YYYY-MM-DD'),
    dayjs().add(7, 'day').format('YYYY-MM-DD'),
    'published',
    '管理员_王五',
    now,
    1
  );

  const objection1Id = uuidv4();
  const insertObjection = prepare(`
    INSERT INTO objections (id, project_id, publication_id, owner_name, contact, content, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertObjection.run(
    objection1Id,
    project3Id,
    publication3Id,
    '业主G',
    '13800138000',
    '分摊比例有疑问，我们单元的面积好像算少了',
    'pending',
    now
  );

  console.log('种子数据插入完成！');
  console.log(`- 收益项目: 3个`);
  console.log(`- 合同附件: 2个（项目2缺失附件）`);
  console.log(`- 分摊明细: 12条`);
  console.log(`- 公示记录: 1个（项目3，公示期内）`);
  console.log(`- 异议记录: 1个（待答复）`);
  console.log('');
  console.log('项目ID参考:');
  console.log(`  项目1(有附件-草稿): ${project1Id}`);
  console.log(`  项目2(无附件-草稿): ${project2Id}`);
  console.log(`  项目3(公示期内-有异议): ${project3Id}`);
};

const runSeed = async () => {
  try {
    await initDatabase();
    seedData();
    process.exit(0);
  } catch (error) {
    console.error('种子数据插入失败:', error);
    process.exit(1);
  }
};

runSeed();
