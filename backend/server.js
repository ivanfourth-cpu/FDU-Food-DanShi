const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 加载环境变量配置
try {
  const dotenv = require('dotenv');
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('✓ 环境变量已加载');
  }
} catch (e) {
  console.log('dotenv not available, using process.env directly');
}

// SMTP 发信配置
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT) || 465,
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  fromName: process.env.SMTP_FROM_NAME || '旦食 FDU Food',
  subjectPrefix: process.env.SMTP_SUBJECT_PREFIX || '【旦食】'
};

const { db, initDatabase, getReviews, getCanteens, getStalls, addReview, voteReview, deleteReview, verifyAdmin, stallsData, getAllPosts, getOffcampusReviews, validateFudanEmail, generateCode, saveVerificationCode, verifyCode, isNicknameTaken, createUser, verifyUser, getUserByEmail, updateUserPassword, getAllUsers } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// 简化密码哈希（实际生产应使用bcrypt）
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'danshi_salt_2026').digest('hex');
}

// 初始化数据库
initDatabase();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ========== SMTP 邮件发送模块 ==========

/**
 * 解析SMTP错误并返回用户友好的错误信息
 * @param {Error} error - SMTP错误对象
 * @returns {Object} - { code: string, userMessage: string, isRetryable: boolean }
 */
function parseSMTPError(error) {
  const errorCode = error.code || '';
  const errorMessage = error.message || '';
  const responseCode = error.responseCode || 0;
  
  // 常见错误码映射
  const errorMappings = {
    'ECONNREFUSED': {
      userMessage: '无法连接到邮件服务器，请检查网络或服务器配置',
      isRetryable: false,
      detail: '连接被拒绝，可能端口未开放或服务器地址错误'
    },
    'ETIMEDOUT': {
      userMessage: '邮件服务器连接超时，请稍后重试',
      isRetryable: true,
      detail: '连接超时，可能网络不稳定或服务器繁忙'
    },
    'ESOCKET': {
      userMessage: '邮件服务器连接异常，请稍后重试',
      isRetryable: true,
      detail: 'Socket错误，连接意外断开'
    },
    'EAUTH': {
      userMessage: '邮件服务认证失败，请联系管理员检查配置',
      isRetryable: false,
      detail: '用户名或密码/授权码错误'
    },
    'EENVELOPE': {
      userMessage: '邮件地址格式错误，请检查邮箱地址',
      isRetryable: false,
      detail: '发件人或收件人地址无效'
    }
  };
  
  // 检查响应代码 (QQ/网易邮箱常见错误)
  if (responseCode === 554) {
    return {
      code: '554_SPAM',
      userMessage: '邮件被拦截（554 DT:SPM），可能是频率限制或内容触发风控',
      isRetryable: true,
      detail: '建议：1分钟后重试，或降低发信频率'
    };
  }
  if (responseCode === 552) {
    return {
      code: '552_QUOTA',
      userMessage: '邮件发送量超限，请稍后重试',
      isRetryable: true,
      detail: '发件邮箱当日发送量已达上限'
    };
  }
  if (responseCode === 421) {
    return {
      code: '421_TEMP',
      userMessage: '服务器繁忙，请稍后重试',
      isRetryable: true,
      detail: '临时性错误，多次尝试后通常可成功'
    };
  }
  if (responseCode === 450 || responseCode === 451) {
    return {
      code: '450_RATE',
      userMessage: '操作过快，请1分钟后再试',
      isRetryable: true,
      detail: '频率限制，邮箱服务商的风控机制'
    };
  }
  if (responseCode === 535) {
    return {
      code: '535_AUTH',
      userMessage: '邮件认证失败，请联系管理员',
      isRetryable: false,
      detail: 'SMTP用户名或授权码错误'
    };
  }
  
  // 根据错误码匹配
  for (const [code, info] of Object.entries(errorMappings)) {
    if (errorCode.includes(code) || errorMessage.includes(code)) {
      return {
        code,
        ...info,
        originalMessage: errorMessage
      };
    }
  }
  
  // 默认未知错误
  return {
    code: 'UNKNOWN',
    userMessage: '邮件发送失败，请稍后重试',
    isRetryable: true,
    detail: errorMessage,
    originalMessage: errorMessage
  };
}

/**
 * 发送验证邮件（带重试机制）
 * @param {string} to - 收件人邮箱
 * @param {string} code - 验证码
 * @param {number} maxRetries - 最大重试次数
 * @returns {Promise<boolean>} - 发送是否成功
 */
async function sendVerificationEmail(to, code, maxRetries = 3) {
  // 验证 SMTP 配置完整性
  if (!SMTP_CONFIG.host || !SMTP_CONFIG.user || !SMTP_CONFIG.pass) {
    const err = new Error('SMTP配置不完整，请检查环境变量');
    err.code = 'CONFIG_MISSING';
    console.error('[SMTP] 配置检查失败:', {
      hasHost: !!SMTP_CONFIG.host,
      hasUser: !!SMTP_CONFIG.user,
      hasPass: !!SMTP_CONFIG.pass
    });
    throw err;
  }

  const nodemailer = require('nodemailer');
  
  // 创建 SMTP 传输器
  const transporter = nodemailer.createTransport({
    host: SMTP_CONFIG.host,
    port: SMTP_CONFIG.port,
    secure: SMTP_CONFIG.port === 465, // 465 使用 SSL, 587 使用 TLS
    auth: {
      user: SMTP_CONFIG.user,
      pass: SMTP_CONFIG.pass
    },
    // 增加超时设置
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    // 调试模式（仅在配置开启时）
    debug: process.env.SMTP_DEBUG === 'true'
  });

  // 邮件内容
  const mailOptions = {
    from: `"${SMTP_CONFIG.fromName}" <${SMTP_CONFIG.user}>`,
    to: to,
    subject: `${SMTP_CONFIG.subjectPrefix} 您的注册验证码`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #78350f; font-size: 28px; margin: 0; font-weight: 600;">🍜 旦食</h1>
          <p style="color: #92400e; margin: 8px 0 0; font-size: 14px;">复旦人的美食指南</p>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 32px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          <p style="color: #1e293b; font-size: 16px; margin: 0 0 24px;">您的注册验证码是：</p>
          
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; font-size: 36px; font-weight: 700; 
                      padding: 20px 48px; border-radius: 12px; letter-spacing: 8px; display: inline-block; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);">
            ${code}
          </div>
          
          <p style="color: #64748b; font-size: 13px; margin: 24px 0 0;">验证码有效期为 <strong>10 分钟</strong>，请尽快完成验证。</p>
        </div>
        
        <p style="color: #92400e; font-size: 12px; text-align: center; margin-top: 24px;">
          如非本人操作，请忽略此邮件。<br>
          © 2026 旦食 FDU Food
        </p>
      </div>
    `,
    text: `旦食 - 您的注册验证码是：${code}，有效期10分钟。`
  };

  // 尝试发送，带重试逻辑
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[SMTP] 第 ${attempt}/${maxRetries} 次尝试发送至 ${to}...`);
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`[SMTP] ✅ 邮件发送成功! MessageId: ${info.messageId}, 尝试次数: ${attempt}`);
      return true;
      
    } catch (error) {
      lastError = error;
      const parsed = parseSMTPError(error);
      
      console.error(`[SMTP] ❌ 第 ${attempt} 次尝试失败:`, {
        attempt,
        errorCode: parsed.code,
        errorMessage: error.message,
        isRetryable: parsed.isRetryable,
        detail: parsed.detail,
        responseCode: error.responseCode
      });
      
      // 如果错误不可重试，直接退出
      if (!parsed.isRetryable) {
        console.log('[SMTP] 错误不可重试，终止重试');
        break;
      }
      
      // 如果还有重试次数，等待后重试
      if (attempt < maxRetries) {
        const waitTime = attempt * 2000; // 递增等待: 2s, 4s
        console.log(`[SMTP] 等待 ${waitTime/1000} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // 所有重试都失败了，抛出带详细信息的错误
  const parsedError = parseSMTPError(lastError);
  const finalError = new Error(parsedError.userMessage);
  finalError.code = parsedError.code;
  finalError.isRetryable = parsedError.isRetryable;
  finalError.detail = parsedError.detail;
  finalError.originalMessage = lastError?.message || 'Unknown error';
  
  console.error('[SMTP] 所有重试均失败:', {
    code: finalError.code,
    userMessage: finalError.message,
    originalError: finalError.originalMessage
  });
  
  throw finalError;
}

// API 路由

// 获取评价列表 - 支持搜索、价格区间、多食堂筛选
// 【重要】食堂点评默认排除食客楼数据，实现数据隔离
app.get('/api/reviews', (req, res) => {
  try {
    const { canteen, canteens, stall, minRating, sort, limit, search, minPrice, maxPrice, isOffcampus } = req.query;
    const filters = {};
    
    // 【数据隔离】排除食客楼数据 - 只展示食堂点评
    filters.excludeOffcampus = true;
    
    // 搜索功能
    if (search) filters.search = search;
    
    // 多食堂筛选
    if (canteens) {
      filters.canteens = canteens.split(',');
    } else if (canteen && canteen !== '全部') {
      filters.canteen = canteen;
    }
    
    if (stall) filters.stall = stall;
    if (minRating) filters.minRating = parseInt(minRating);
    if (sort) filters.sort = sort;
    if (limit) filters.limit = parseInt(limit);
    
    // 价格区间
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);

    const reviews = getReviews(filters);
    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('获取评价失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取食客楼评价列表 - 【数据隔离】仅返回食客楼数据
app.get('/api/reviews/offcampus', (req, res) => {
  try {
    const { sort } = req.query;
    // 【数据隔离】明确指定 canteen 为 '食客楼'
    const filters = { canteen: '食客楼', sort: sort || 'latest' };
    const reviews = getReviews(filters);
    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('获取食客楼评价失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 管理员获取全部帖子（食堂+食客楼合并）
app.get('/api/admin/all-posts', (req, res) => {
  try {
    const { password } = req.query;
    
    if (!verifyAdmin(password)) {
      return res.status(401).json({ success: false, message: '未授权，请先登录' });
    }

    const canteenPosts = db.prepare(`
      SELECT r.*, u.nickname, '校内食堂' as source
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.canteen != '食客楼'
    `).all();

    const offcampusPosts = db.prepare(`
      SELECT r.*, u.nickname, '食客楼' as source
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.canteen = '食客楼'
    `).all();

    const allPosts = [
      ...canteenPosts.map(p => ({ ...p, source: '校内食堂' })),
      ...offcampusPosts.map(p => ({ ...p, source: '食客楼' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ success: true, data: allPosts });
  } catch (error) {
    console.error('获取全部帖子失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取食堂列表（含统计）
app.get('/api/canteens', (req, res) => {
  try {
    const canteens = getCanteens();
    res.json({ success: true, data: canteens });
  } catch (error) {
    console.error('获取食堂列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取食堂对应的档口列表
app.get('/api/stalls', (req, res) => {
  try {
    const { canteen } = req.query;
    const stalls = getStalls(canteen);
    res.json({ success: true, data: stalls });
  } catch (error) {
    console.error('获取档口列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取所有食堂和档口数据（用于二级联动）
app.get('/api/stalls/all', (req, res) => {
  try {
    res.json({ success: true, data: stallsData });
  } catch (error) {
    console.error('获取档口数据失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 提交新评价
app.post('/api/reviews', (req, res) => {
  try {
    const { canteen, stall, dish, price, rating, content, nickname, isOffcampus } = req.body;

    // 食客楼模式不需要验证档口
    if (!isOffcampus) {
      // 验证必填字段
      if (!canteen || !stall || !rating || !content) {
        return res.status(400).json({ 
          success: false, 
          message: '请填写必填字段：食堂、档口、评分和评价内容' 
        });
      }

      // 验证档口是否在预设列表中
      const validStalls = getStalls(canteen);
      if (canteen && validStalls && !validStalls.includes(stall)) {
        return res.status(400).json({ 
          success: false, 
          message: '请选择预设的档口' 
        });
      }
    } else {
      // 食客楼只需要评分和内容
      if (!rating || !content) {
        return res.status(400).json({ 
          success: false, 
          message: '请填写评分和评价内容' 
        });
      }
    }

    // 验证评分范围（1-6星）
    if (rating < 1 || rating > 6) {
      return res.status(400).json({ 
        success: false, 
        message: '评分必须在1-6之间' 
      });
    }

    // 验证内容长度
    if (content.length > 500) {
      return res.status(400).json({ 
        success: false, 
        message: '评价内容不能超过500字' 
      });
    }

    const newReview = addReview({ canteen, stall, dish, price, rating, content, nickname });
    res.json({ success: true, data: newReview });
  } catch (error) {
    console.error('添加评价失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 点赞/点踩（支持取消和互斥）
app.post('/api/reviews/:id/vote', (req, res) => {
  try {
    const { id } = req.params;
    const { voteType, previousVote } = req.body;

    // 支持取消投票
    if (voteType === 'cancel' && previousVote) {
      const updated = voteReview(parseInt(id), 'cancel', previousVote);
      if (!updated) {
        return res.status(404).json({ success: false, message: '评价不存在' });
      }
      return res.json({ success: true, data: updated, action: 'cancelled' });
    }

    if (!['up', 'down'].includes(voteType)) {
      return res.status(400).json({ 
        success: false, 
        message: '无效的投票类型' 
      });
    }

    const updated = voteReview(parseInt(id), voteType, previousVote);
    if (!updated) {
      return res.status(404).json({ success: false, message: '评价不存在' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('投票失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 管理员登录验证
app.post('/api/admin/login', (req, res) => {
  try {
    const { password } = req.body;
    
    if (verifyAdmin(password)) {
      res.json({ success: true, isAdmin: true });
    } else {
      res.status(401).json({ success: false, message: '密码错误' });
    }
  } catch (error) {
    console.error('登录验证失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取用户列表（管理员）
app.get('/api/admin/users', (req, res) => {
  try {
    const { password } = req.query;
    
    if (!verifyAdmin(password)) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const users = getAllUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除评价（管理员）
app.delete('/api/reviews/:id', (req, res) => {
  try {
    const { password } = req.query;
    
    if (!verifyAdmin(password)) {
      return res.status(401).json({ success: false, message: '未授权，请先登录' });
    }

    const { id } = req.params;
    deleteReview(parseInt(id));
    res.json({ success: true, message: '评价已删除' });
  } catch (error) {
    console.error('删除评价失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 用户认证API ==========

// 发送验证码
app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    // 验证邮箱格式
    const validation = validateFudanEmail(email);
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: '请使用正确的复旦邮箱格式：11位学号@m.fudan.edu.cn 或 11位学号@fudan.edu.cn' 
      });
    }
    
    const code = generateCode();
    saveVerificationCode(email, code);
    
    // 发送邮件
    try {
      await sendVerificationEmail(email, code);
      console.log(`[验证码] ✅ 已发送至 ${email}`);
      res.json({ 
        success: true, 
        message: '验证码已发送至您的复旦邮箱，请注意查收（若未收到请检查垃圾箱）'
      });
    } catch (smtpError) {
      // 传递详细的SMTP错误信息给前端
      console.error(`[SMTP] ❌ 发送至 ${email} 失败:`, {
        code: smtpError.code,
        message: smtpError.message
      });
      
      // 根据错误类型返回不同的状态码和消息
      const isRateLimit = smtpError.code === '450_RATE' || smtpError.code === '421_TEMP' || smtpError.code === '554_SPAM';
      const statusCode = isRateLimit ? 429 : 500;
      
      res.status(statusCode).json({ 
        success: false, 
        code: smtpError.code || 'SMTP_ERROR',
        message: smtpError.message || '邮件发送失败，请稍后重试',
        detail: smtpError.detail || null,
        retryable: smtpError.isRetryable !== false
      });
    }
  } catch (error) {
    console.error('发送验证码失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 注册
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, code, password, confirmPassword, nickname } = req.body;
    
    // 验证邮箱格式
    const validation = validateFudanEmail(email);
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: '请使用正确的复旦邮箱格式' 
      });
    }
    
    // 验证验证码
    if (!verifyCode(email, code)) {
      return res.status(400).json({ 
        success: false, 
        message: '验证码错误或已过期' 
      });
    }
    
    // 验证密码
    if (!password || password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: '密码至少需要6位' 
      });
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: '两次密码输入不一致' 
      });
    }
    
    // 验证昵称
    if (!nickname || nickname.trim().length === 0 || nickname.length > 20) {
      return res.status(400).json({ 
        success: false, 
        message: '请输入1-20位的昵称' 
      });
    }
    
    // 昵称唯一性检查
    if (isNicknameTaken(nickname.trim())) {
      return res.status(400).json({
        success: false,
        message: '该昵称已被使用，请换一个试试'
      });
    }
    
    // 创建用户
    const passwordHash = hashPassword(password);
    const result = createUser(email, passwordHash, nickname.trim());
    
    if (!result.success) {
      if (result.error.includes('UNIQUE')) {
        return res.status(400).json({ 
          success: false, 
          message: '该邮箱已被注册' 
        });
      }
      return res.status(500).json({ 
        success: false, 
        message: '注册失败，请重试' 
      });
    }
    
    res.json({ 
      success: true, 
      message: '注册成功',
      user: { email, nickname: nickname.trim() }
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 登录
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '请输入邮箱和密码' 
      });
    }
    
    const passwordHash = hashPassword(password);
    const user = verifyUser(email, passwordHash);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: '邮箱或密码错误' 
      });
    }
    
    res.json({ 
      success: true, 
      message: '登录成功',
      user: { 
        id: user.id,
        email: user.email, 
        nickname: user.nickname,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取当前用户信息
app.get('/api/auth/me', (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: '缺少邮箱参数' });
    }
    
    const user = getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email, 
        nickname: user.nickname,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 所有其他路由返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🍜 旦食服务器已启动!`);
  console.log(`📍 访问地址: http://localhost:${PORT}`);
  console.log(`🌐 请通过公网IP访问本服务`);
  console.log(`🔐 管理员密码: ${process.env.ADMIN_PASSWORD || '未设置'}\n`);
});
