const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 持久化数据目录 - 与容器挂载点对应
const DATA_DIR = process.env.DATA_DIR || '/var/lib/fdufood/data';
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'danshi.db');
const db = new Database(dbPath);

// 初始化数据库表
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      canteen TEXT NOT NULL,
      stall TEXT NOT NULL,
      dish TEXT,
      price TEXT,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 6),
      content TEXT NOT NULL,
      nickname TEXT DEFAULT '复旦路人',
      upvotes INTEGER DEFAULT 0,
      downvotes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_canteen ON reviews(canteen);
    CREATE INDEX IF NOT EXISTS idx_created ON reviews(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_rating ON reviews(rating);
    CREATE INDEX IF NOT EXISTS idx_user_email ON users(email);
  `);

  // 检查并添加新字段
  try { db.exec(`ALTER TABLE reviews ADD COLUMN upvotes INTEGER DEFAULT 0`); } catch (e) {}
  try { db.exec(`ALTER TABLE reviews ADD COLUMN downvotes INTEGER DEFAULT 0`); } catch (e) {}
  try { db.exec(`ALTER TABLE reviews ADD COLUMN price TEXT`); } catch (e) {}
  try { db.exec(`ALTER TABLE reviews ADD COLUMN user_id INTEGER`); } catch (e) {}

  // 插入示例数据（如果表为空）
  const count = db.prepare('SELECT COUNT(*) as count FROM reviews').get();
  if (count.count === 0) {
    const sampleReviews = [
      { canteen: '旦苑', stall: '一楼-大众餐', dish: '红烧肉套餐', price: '15', rating: 5, content: '强烈推荐！红烧肉肥而不腻，入口即化，配菜新鲜，饭量适中。', nickname: '吃货小王', upvotes: 12, downvotes: 0 },
      { canteen: '北食', stall: '二楼麻辣烫', dish: '全家福套餐', price: '25', rating: 4, content: '味道正宗，食材新鲜，辣度可选。唯一缺点是饭点要等很久。', nickname: '川菜爱好者', upvotes: 8, downvotes: 1 },
      { canteen: '南区', stall: '港式烧腊', dish: '叉烧饭', price: '18', rating: 5, content: '叉烧肥瘦相间，酱汁浓郁，简直是校外茶餐厅的水平！', nickname: '港剧迷', upvotes: 15, downvotes: 0 },
      { canteen: '南小食', stall: '奶茶铺', dish: '珍珠奶茶', price: '12', rating: 3, content: '中规中矩，价格比外面便宜一些，但珍珠有点硬。', nickname: '奶茶续命', upvotes: 3, downvotes: 2 },
      { canteen: '旦苑', stall: '三楼-称重', dish: '大盘鸡', price: '28', rating: 6, content: '复旦顶流！超级正宗！鸡肉块大，土豆软糯，皮带面蘸汤绝了！来复旦必吃！', nickname: '新疆小哥', upvotes: 28, downvotes: 0 },
      { canteen: '枫林', stall: '一楼自选', dish: '糖醋排骨', price: '16', rating: 4, content: '排骨炸得酥脆，糖醋汁调得不错。就是人太多，抢不到。', nickname: '无肉不欢', upvotes: 6, downvotes: 0 },
      { canteen: '北区', stall: '饺子馆', dish: '猪肉白菜水饺', price: '12', rating: 5, content: '皮薄馅大，蘸料也是秘制的！冬天来一碗太暖了。', nickname: '北方汉子', upvotes: 10, downvotes: 0 },
      { canteen: '南区', stall: '二楼石锅拌饭', dish: '牛肉石锅拌饭', price: '22', rating: 2, content: '等了一个小时才吃到，味道一般，牛肉有点老，米饭还糊了。避雷！', nickname: '失望透顶', upvotes: 1, downvotes: 8 },
      { canteen: '张江', stall: '日料档', dish: '照烧鸡腿饭', price: '20', rating: 4, content: '性价比高，照烧汁甜咸适中。米饭有点硬，但总体满意。', nickname: '日料控', upvotes: 7, downvotes: 1 },
      { canteen: '旦苑', stall: '一楼-早餐', dish: '油条豆浆', price: '5', rating: 5, content: '油条酥脆，豆浆香浓。每天早上必吃，开启元气满满的一天！', nickname: '早起的鸟', upvotes: 18, downvotes: 0 },
      // 南苑餐厅示例
      { canteen: '南苑', stall: '一楼快餐', dish: '东坡肉套餐', price: '16', rating: 5, content: '南苑隐藏宝藏！东坡肉软糯入味，配上米饭绝配！', nickname: '苏菜爱好者', upvotes: 9, downvotes: 0 },
      { canteen: '南苑', stall: '西餐厅', dish: '意面套餐', price: '28', rating: 4, content: '环境安静适合学习，意面做得挺正宗，价格也OK。', nickname: '学习达人', upvotes: 5, downvotes: 1 },
      // 春晖餐厅示例
      { canteen: '春晖', stall: '二楼小炒', dish: '宫保鸡丁', price: '18', rating: 5, content: '宫保鸡丁超级下饭！花生米脆，鸡肉嫩，辣度刚好！', nickname: '川菜忠实粉', upvotes: 11, downvotes: 0 },
      { canteen: '春晖', stall: '一楼自选', dish: '剁椒鱼头', price: '32', rating: 6, content: '👑复旦顶流！剁椒够劲，鱼头新鲜，汤汁拌面一绝！每周必吃！', nickname: '湘菜王', upvotes: 35, downvotes: 0 },
    ];

    const stmt = db.prepare(`
      INSERT INTO reviews (canteen, stall, dish, price, rating, content, nickname, upvotes, downvotes)
      VALUES (@canteen, @stall, @dish, @price, @rating, @content, @nickname, @upvotes, @downvotes)
    `);

    sampleReviews.forEach(review => stmt.run(review));
    console.log('示例数据已插入');
  }
}

// 预设食堂和档口数据 - 官方确认版本
const stallsData = {
  '旦苑': ['一楼-面包房', '一楼-早餐', '一楼-大众餐', '一楼-本帮菜', '一楼-卤肉饭', '一楼-铁板饭', '一楼-粉面', '一楼-水饺', '一楼-川渝小吃', '一楼-盖码饭', '一楼-米线', '一楼-西餐厅', '二楼-烧腊', '二楼-自选', '二楼-盖浇饭', '二楼-风味盖饭', '二楼-鸡汤煨饭', '二楼-甜品', '二楼-小炒', '二楼-铁板烧', '二楼-麻辣香锅', '二楼-民族餐厅', '三楼-称重'],
  '北食': ['一楼-自选', '一楼-早餐', '一楼-汉堡', '一楼-鱼粉', '一楼-烤鸭', '一楼-日式/铁板', '一楼-西餐厅', '一楼-早餐面条(最左侧)', '一楼-小笼包(左二)', '一楼-煎饼/烤冷面', '一楼-麻辣香锅/烫', '一楼-粤式蒸点', '一楼-陕西面', '二楼-饮料吧', '二楼-早餐', '二楼-米线', '二楼-白切鸡', '二楼-自选', '二楼-民族餐厅'],
  '南区': ['一楼-煎饼', '一楼-面条', '一楼-点心', '一楼-烧腊卤味', '一楼-大众餐', '二楼-民族餐厅', '二楼-麻辣烫捞', '二楼-拌饭', '二楼-铁板', '二楼-小炒', '二楼-热卤', '二楼-水饺'],
  '南小食': ['奶茶铺', '自选餐', '烧腊', '杨国福麻辣烫', '铁板', '水饺馄饨', '面条类'],
  '枫林': ['一楼自选', '二楼小炒', '清真餐厅', '面食档', '早餐档'],
  '张江': ['一楼快餐', '日料档', '二楼面馆', '麻辣香锅', '西餐档'],
  '南苑': ['一楼快餐', '二楼小炒', '西餐厅', '面食档', '麻辣香锅'],
  '春晖': ['鸡公煲石锅拌饭', '小炒', '盖浇饭', '粉面', '夜宵烧烤', '枣糕点', '油泼鸡']
};

// 获取所有评价 - 三维一体联合过滤
// 【核心逻辑】食堂 AND 价格下限 AND 价格上限，三个条件同时满足
function getReviews(filters = {}) {
  let sql = 'SELECT * FROM reviews WHERE 1=1';
  const params = [];

  // 【第一步：数据隔离】食堂点评排除食客楼数据
  if (filters.excludeOffcampus) {
    sql += ` AND canteen != '食客楼'`;
  }

  // 【第二步：搜索功能】模糊匹配菜名、评价内容、档口名称
  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    sql += ` AND (dish LIKE ? OR content LIKE ? OR stall LIKE ? OR canteen LIKE ?)`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  // 【第三步：三维一体联合过滤 - 严格AND关系】
  
  // 维度1：食堂筛选
  if (filters.canteen && String(filters.canteen).trim() !== '') {
    // 强制转为字符串，确保精确匹配
    sql += ' AND canteen = ?';
    params.push(String(filters.canteen));
  }

  // 维度2+3：价格区间筛选
  // 【强制数值化】无论输入是什么格式，都转为数值
  const minPrice = Number(filters.minPrice);
  const maxPrice = Number(filters.maxPrice);
  
  // 【自动补全】空值/NaN转为默认值（0表示无下限，9999表示无上限）
  const safeMinPrice = isNaN(minPrice) ? 0 : minPrice;
  const safeMaxPrice = isNaN(maxPrice) ? 9999 : maxPrice;
  
  // 价格下限条件：Post.price >= safeMinPrice
  // 使用 CASE WHEN 处理非数字价格值
  if (safeMinPrice > 0) {
    sql += ` AND (CASE 
      WHEN price IS NULL OR price = '' OR price = '无' OR price = '免费' THEN 0
      WHEN price LIKE '%元' THEN CAST(REPLACE(price, '元', '') AS REAL)
      ELSE CAST(price AS REAL)
    END) >= ?`;
    params.push(safeMinPrice);
  }
  
  // 价格上限条件：Post.price <= safeMaxPrice
  if (safeMaxPrice < 9999) {
    sql += ` AND (CASE 
      WHEN price IS NULL OR price = '' OR price = '无' OR price = '免费' THEN 0
      WHEN price LIKE '%元' THEN CAST(REPLACE(price, '元', '') AS REAL)
      ELSE CAST(price AS REAL)
    END) <= ?`;
    params.push(safeMaxPrice);
  }

  // 【第四步：排序】
  switch (filters.sort) {
    case 'popular':
      sql += ' ORDER BY (upvotes - downvotes) DESC, created_at DESC';
      break;
    case 'rating':
      sql += ' ORDER BY rating DESC, created_at DESC';
      break;
    case 'latest':
    default:
      sql += ' ORDER BY created_at DESC';
  }

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(filters.limit));
  }

  // 调试日志（仅在开启DEBUG时输出）
  if (process.env.DEBUG === 'true') {
    console.log('[三维一体筛选] SQL:', sql);
    console.log('[三维一体筛选] 参数:', params);
  }

  return db.prepare(sql).all(...params);
}

// 获取食堂统计
function getCanteens() {
  const stats = db.prepare(`
    SELECT canteen, COUNT(*) as count, 
           SUM(upvotes) as total_upvotes,
           SUM(downvotes) as total_downvotes
    FROM reviews 
    GROUP BY canteen 
    ORDER BY count DESC
  `).all();

  const allCanteens = Object.keys(stallsData);
  return allCanteens.map(name => {
    const found = stats.find(s => s.canteen === name);
    return { 
      name, 
      count: found ? found.count : 0,
      total_upvotes: found ? found.total_upvotes : 0,
      total_downvotes: found ? found.total_downvotes : 0
    };
  });
}

// 获取档口列表
function getStalls(canteen) {
  if (canteen && stallsData[canteen]) {
    return stallsData[canteen];
  }
  return stallsData;
}

// 添加评价
function addReview(review) {
  const stmt = db.prepare(`
    INSERT INTO reviews (canteen, stall, dish, price, rating, content, nickname, upvotes, downvotes)
    VALUES (@canteen, @stall, @dish, @price, @rating, @content, @nickname, 0, 0)
  `);

  const result = stmt.run({
    canteen: review.canteen,
    stall: review.stall,
    dish: review.dish || '',
    price: review.price || '',
    rating: review.rating,
    content: review.content,
    nickname: review.nickname || '复旦路人'
  });

  return db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid);
}

// 投票处理（支持取消和互斥）
function voteReview(id, voteType, previousVote) {
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
  if (!review) return null;

  let upvoteDelta = 0;
  let downvoteDelta = 0;

  // 取消投票
  if (voteType === 'cancel' && previousVote) {
    if (previousVote === 'up') upvoteDelta = -1;
    else downvoteDelta = -1;
  } 
  // 取消之前的投票（同一按钮再次点击）
  else if (previousVote === voteType) {
    if (voteType === 'up') upvoteDelta = -1;
    else downvoteDelta = -1;
  } 
  // 切换投票
  else {
    if (voteType === 'up') {
      upvoteDelta = 1;
      if (previousVote === 'down') downvoteDelta = -1;
    } else {
      downvoteDelta = 1;
      if (previousVote === 'up') upvoteDelta = -1;
    }
  }

  if (upvoteDelta !== 0 || downvoteDelta !== 0) {
    db.prepare('UPDATE reviews SET upvotes = upvotes + ?, downvotes = downvotes + ? WHERE id = ?')
      .run(upvoteDelta, downvoteDelta, id);
  }

  return db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
}

// 删除评价（管理员）
function deleteReview(id) {
  db.prepare('DELETE FROM reviews WHERE id = ?').run(id);
  return { success: true };
}

// 编辑评价（管理员）- 支持 canteen, stall, dish, content, rating, price
function updateReview(id, updates) {
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
  if (!review) return null;

  const fields = [];
  const values = [];

  if (updates.canteen !== undefined) {
    fields.push('canteen = ?');
    values.push(updates.canteen);
  }
  if (updates.stall !== undefined) {
    fields.push('stall = ?');
    values.push(updates.stall);
  }
  if (updates.dish !== undefined) {
    fields.push('dish = ?');
    values.push(updates.dish);
  }
  if (updates.content !== undefined) {
    fields.push('content = ?');
    values.push(updates.content);
  }
  if (updates.rating !== undefined) {
    fields.push('rating = ?');
    values.push(updates.rating);
  }
  if (updates.price !== undefined) {
    fields.push('price = ?');
    values.push(updates.price);
  }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE reviews SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  return db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
}

// 管理员密码（从环境变量读取）
function verifyAdmin(password) {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '251254Gyf';
  return password === ADMIN_PASSWORD;
}

// ========== 用户认证模块 ==========

// 验证复旦邮箱格式 (11位数字@m.fudan.edu.cn 或 11位数字@fudan.edu.cn)
function validateFudanEmail(email) {
  const pattern = /^(\d{11})@(m\.)?fudan\.edu\.cn$/;
  const match = email.match(pattern);
  if (!match) return { valid: false, studentId: null };
  return { valid: true, studentId: match[1] };
}

// 生成6位验证码
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 存储验证码
function saveVerificationCode(email, code) {
  // 先标记该邮箱旧验证码为已使用
  db.prepare('UPDATE verification_codes SET used = 1 WHERE email = ?').run(email);
  // 插入新验证码，5分钟有效期
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)').run(email, code, expiresAt);
}

// 验证验证码
function verifyCode(email, code) {
  const record = db.prepare(`
    SELECT * FROM verification_codes 
    WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime('now')
    ORDER BY created_at DESC LIMIT 1
  `).get(email, code);
  
  if (record) {
    db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(record.id);
    return true;
  }
  return false;
}

// 检查昵称是否已被占用
function isNicknameTaken(nickname) {
  const existing = db.prepare('SELECT id FROM users WHERE nickname = ? COLLATE NOCASE').get(nickname);
  return !!existing;
}

// 创建用户
function createUser(email, passwordHash, nickname) {
  try {
    const result = db.prepare('INSERT INTO users (email, password_hash, nickname) VALUES (?, ?, ?)').run(email, passwordHash, nickname);
    return { success: true, userId: result.lastInsertRowid };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// 验证用户登录
function verifyUser(email, passwordHash) {
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND password_hash = ?').get(email, passwordHash);
  return user || null;
}

// 获取用户信息
function getUserByEmail(email) {
  const user = db.prepare('SELECT id, email, nickname, created_at FROM users WHERE email = ?').get(email);
  return user || null;
}

// 更新用户密码
function updateUserPassword(email, passwordHash) {
  db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(passwordHash, email);
}

// 获取所有用户列表（管理员用）
function getAllUsers() {
  const users = db.prepare('SELECT id, email, nickname, password_hash, created_at FROM users ORDER BY created_at DESC').all();
  return users;
}

// 获取所有评价（不区分板块 - 管理员用）
function getAllPosts() {
  return db.prepare(`
    SELECT r.*, u.nickname
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.canteen != '食客楼'
    UNION ALL
    SELECT r.*, u.nickname
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.canteen = '食客楼'
    ORDER BY created_at DESC
  `).all();
}

// 获取食客楼评价
function getOffcampusReviews() {
  return db.prepare(`
    SELECT r.*, u.nickname
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.canteen = '食客楼'
    ORDER BY created_at DESC
  `).all();
}

module.exports = { 
  initDatabase, 
  db,
  getReviews, 
  getCanteens, 
  getStalls,
  addReview, 
  voteReview,
  deleteReview,
  verifyAdmin,
  stallsData,
  getAllPosts,
  getOffcampusReviews,
  // 用户认证
  validateFudanEmail,
  generateCode,
  saveVerificationCode,
  verifyCode,
  isNicknameTaken,
  createUser,
  verifyUser,
  getUserByEmail,
  updateUserPassword,
  getAllUsers
};
