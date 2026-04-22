# 旦食 - 复旦大学美食点评网站

## 1. Concept & Vision

**旦食**是一个完全由复旦同学真实评价驱动的校内餐饮指南。它不仅是冰冷的点评工具，更是一个充满温度的社区——每一道菜都承载着回忆，每一条评价都是一次共鸣。设计风格追求「干净、明亮、有活力」，让同学们在排队等餐时也能轻松浏览，找到下一餐的灵感。

## 2. Design Language

### 美学方向
清新学院风 + 温暖食物感，灵感来源于日式简约设计与现代卡片式UI的结合。

### 色彩系统
- **主色调**: `#E85A4F` (温暖珊瑚红 - 代表美食的诱惑与活力)
- **次要色**: `#E98074` (柔珊瑚 - 用于hover状态)
- **强调色**: `#4CAF50` (推荐绿) / `#F44336` (避雷红)
- **背景色**: `#FAFAFA` (米白) / `#FFFFFF` (纯白卡片)
- **文字色**: `#2D3436` (深灰) / `#636E72` (次要灰)
- **边框/分割**: `#E0E0E0`

### 字体
- **标题**: `"Noto Sans SC", "PingFang SC", sans-serif` - 700/600 weight
- **正文**: `"Noto Sans SC", "PingFang SC", sans-serif` - 400 weight
- **数字/评分**: `"DIN Alternate", "Helvetica Neue", sans-serif`

### 间距系统
- 基础单位: 8px
- 卡片内边距: 16px
- 卡片间距: 16px
- 区块间距: 32px

### 动效哲学
- 卡片入场: `opacity 0→1, translateY(20px→0), 300ms ease-out, staggered 50ms`
- 按钮交互: `scale(1→1.02), 150ms ease`
- 页面切换: `fade 200ms`
- 表单反馈: `shake 300ms` (错误), `pulse 400ms` (成功)

### 视觉资源
- 图标: Lucide Icons (线条风格，stroke-width: 2)
- 装饰: CSS 渐变背景，圆角卡片 (border-radius: 12px)
- 空状态插图: 简约线条风格的餐具图标

## 3. Layout & Structure

### 页面架构
```
┌─────────────────────────────────────┐
│  Splash Screen (开机封面)            │
│  - Logo + 昵称输入 + 进入按钮        │
│  - 极光背景动画                      │
│  - 悬浮关键词气泡                     │
├─────────────────────────────────────┤
│  Header (固定)                       │
│  Logo + 用户昵称徽章                  │
├─────────────────────────────────────┤
│  Search Section (搜索栏)             │
│  搜索框 + 模块切换Tab                 │
├─────────────────────────────────────┤
│  [食堂点评] / [食客楼] 模块切换       │
│  ├─ 食堂点评: 筛选 + 评价列表         │
│  └─ 食客楼: 校外美食杂谈列表          │
├─────────────────────────────────────┤
│  Footer (页脚)                       │
│  关于我 · 关于旦食 + 管理入口         │
└─────────────────────────────────────┘
```

### 响应式策略
- **Desktop (>1024px)**: 完整侧边导航，4列瀑布流
- **Tablet (768-1024px)**: 折叠导航，3列瀑布流
- **Mobile (<768px)**: 单列流式布局，底部固定Tab，触摸优化

## 4. Features & Interactions

### 核心功能

#### 4.1 开机封面 (Splash Screen)
- 极光流体背景动画 (Canvas)
- 悬浮关键词气泡 (#北食鹅肝汉堡, #旦苑小炒 等)
- 昵称输入框 (支持回车键进入)
- 底部版权信息: © 2026 FDU Food
- **已移除**: 左下角管理入口按钮、版本号信息

#### 4.2 用户须知弹窗
- 首次进入时弹出
- 5秒后自动淡出关闭 (针对鸿蒙等系统无法关闭的问题)
- 内容整合: 版权声明 + 内测守则

#### 4.3 模块切换 (Tab)
- **食堂点评**: 原有功能，支持食堂筛选、价格区间、评分排序
- **食客楼**: 新增模块，展示校外美食、餐饮杂谈等非食堂内容
  - 仅保留昵称、评分、内容输入
  - 无食堂/档口选择

#### 4.4 评价列表展示
- 卡片展示:
  - 食堂标签 (小圆角背景)
  - 档口名称 (加粗)
  - 推荐菜品 (如果有)
  - 星级展示 (★/☆)
  - 评价内容 (最多3行，超出省略)
  - 时间戳 + 昵称
- 推荐/避雷标签:
  - 评分≥4: 绿色「推荐」标签
  - 评分≤2: 红色「避雷」标签
  - 评分=3: 无标签
  - 评分=6: 👑「复旦顶流」金色标签

#### 4.5 投票功能 (一人一票)
- 👍 推荐 / 👎 避雷
- 本地记录投票状态
- 支持取消投票
- 投票互斥 (选推荐则取消避雷，反之亦然)

#### 4.6 管理员功能
- **登录验证**: 密码保护
- **删除评论**: 管理员可删除任意评价
- **编辑评论**: 管理员可编辑任意评价的菜名、评价内容、评分、价格
  - 点击编辑按钮进入编辑模式
  - 修改后保存

#### 4.7 页脚信息区
- 底部固定白色背景条
- 关于我 · 关于旦食 (极简小字，无图标)
- 管理入口 (小型按钮，定位于左下角)
- 内测提示信息 (整合原用户须知内容)

### 边界情况处理
- 空评价列表: 显示餐具/房屋图标 + 空状态提示
- 网络错误: Toast提示 + 重试按钮
- 表单验证: 实时反馈，红色边框 + 错误文字

## 5. Component Inventory

### 5.1 SplashScreen (开机封面)
- **外观**: 全屏极光渐变背景 + 玻璃拟态卡片
- **元素**: Logo、标语、昵称输入框、进入按钮、版权信息
- **动画**: 极光背景动画、涟漪跟随鼠标/触摸、卡片浮动效果

### 5.2 Header
- **外观**: 天蓝色渐变背景，白色文字，固定顶部
- **内容**: Logo + 标语 + 用户昵称徽章

### 5.3 SearchSection
- **外观**: 玻璃拟态背景，粘性定位
- **内容**: 搜索输入框 + 搜索按钮 + 模块切换Tab

### 5.4 ModuleTabs (模块切换)
- **外观**: 两个并列按钮，当前模块高亮
- **选项**: 食堂点评、食客楼

### 5.5 FilterSection (食堂点评筛选)
- **内容**: 食堂多选、价格区间滑块、排序选择、重置按钮

### 5.6 ReviewCard (评价卡片)
- **外观**: 玻璃拟态白色卡片，圆角20px
- **布局**: 左侧主要信息 + 右上角价格/评分
- **States**:
  - Default: 正常显示
  - 推荐: 左侧绿色边框
  - 避雷: 左侧红色边框
  - 食客楼: 左侧紫色边框

### 5.7 OffcampusCard (食客楼卡片)
- **外观**: 继承ReviewCard样式，紫色左侧边框
- **内容**: 昵称 + 评分 + 内容 (无食堂/档口信息)

### 5.8 RatingStars (星级评分)
- **外观**: 6颗星星，支持六星顶流
- **类型**: 显示型 (卡片) + 选择型 (表单)

### 5.9 ReviewFormModal
- **外观**: 居中模态框，白色背景，圆角16px
- **食堂表单**: 食堂选择 → 档口选择 → 菜品 → 价格 → 评分 → 内容 → 昵称
- **食客楼表单**: 美食名称 → 评分 → 内容 → 昵称

### 5.10 AboutModal
- **类型**: 关于我弹窗、关于旦食弹窗
- **内容**: 开发者信息 + 项目介绍

### 5.11 FloatingButton (悬浮按钮)
- **外观**: 圆形，60px，天蓝色背景
- **位置**: 右下角固定
- **功能**: 打开写点评表单

### 5.12 Footer (页脚)
- **外观**: 白色背景，底部固定
- **内容**: 关于链接 + 管理入口 + 内测提示

### 5.13 AdminEntry (管理入口)
- **外观**: 小型文字按钮
- **位置**: 页脚左下角
- **功能**: 打开管理员登录弹窗

## 6. Technical Approach

### 架构
```
frontend/
├── index.html        # 单页应用入口
├── index_beian.html  # 备案版本
├── css/
│   └── style.css     # 所有样式 (v1.2.1)
└── js/
    └── app.js        # 前端逻辑 (v1.2.1)

backend/
├── server.js         # Express服务器
├── database.js       # SQLite连接与操作
└── data/
    └── danshi.db     # SQLite数据库文件

.env                   # 环境变量配置 (SMTP等敏感信息)
```

### API Design

#### GET /api/reviews
获取评价列表 (食堂点评，排除食客楼数据)
- Query: `?canteens=旦苑,北食&sort=latest&minPrice=10&maxPrice=50&search=红烧肉`
- Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "canteen": "旦苑",
      "stall": "一楼快餐",
      "dish": "红烧肉套餐",
      "price": "15",
      "rating": 5,
      "content": "强烈推荐！",
      "nickname": "吃货小王",
      "upvotes": 12,
      "downvotes": 0,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### GET /api/reviews/offcampus
获取食客楼评价列表 (仅返回 canteen='食客楼' 的数据)

#### POST /api/reviews
提交新评价
- Body: `{ canteen, stall, dish, price, rating, content, nickname, isOffcampus }`
- Response: `{ "success": true, "data": { "id": 2, ... } }`

#### PUT /api/reviews/:id
编辑评价 (管理员)
- Query: `?password=fudan2026`
- Body: `{ canteen, stall, dish, content, rating, price }`
- Response: `{ "success": true, "data": { ... } }`

#### DELETE /api/reviews/:id
删除评价 (管理员)
- Query: `?password=fudan2026`
- Response: `{ "success": true, "message": "评价已删除" }`

#### POST /api/reviews/:id/vote
投票
- Body: `{ voteType: 'up' | 'down' | 'cancel', previousVote: 'up' | 'down' }`

#### POST /api/admin/login
管理员登录
- Body: `{ password: string }`

### Data Model
```sql
CREATE TABLE reviews (
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

CREATE INDEX idx_canteen ON reviews(canteen);
CREATE INDEX idx_created ON reviews(created_at DESC);
CREATE INDEX idx_rating ON reviews(rating);
```

### 预置食堂数据
- 旦苑、北食、南区、南小食、枫林、张江、南苑、春晖
- 各食堂对应档口列表见 database.js

### 实时性方案
- 客户端每30秒轮询一次获取最新评价
- 新评价时自动添加到列表顶部，带入场动画

### 版本历史
- **v1.3.4** (当前):
  - SMTP模块增强：添加详细错误日志和错误码解析
  - 添加重试机制（3次重试，递增等待时间）
  - 常见SMTP错误码映射（554 DT:SPM, 535 AUTH, 450_RATE等）
  - 前端错误提示优化：根据错误类型显示友好消息
  - 频率限制提示："操作过快，请1分钟后再试"

- **v1.3.2**:
  - 价格筛选引擎重构：使用CASE WHEN处理非数字价格值
  - 删除CSS中未使用的price-slider样式
  - 更新空结果提示文案
  - 修复后端SQL价格转换逻辑

- **v1.3.0_beta**:
  - 管理后台视觉重构：纯白色背景、Flex布局优化、Tab下划线样式
  - 彻底移除"开发日志"弹窗组件，保持页面清爽
  - 版本号统一更新为 1.3.0_beta
  - 封面去除"哈哈哈V2"验证文字

- **v1.2.6**:
  - 修复 app.js 语法错误（handleAdminLogin 多余括号）
  - 添加封面验证文字"哈哈哈V2"
  - 移除手机端"开发日志"入口
  - 彻底解决生产环境同步失效问题

- **v1.2.2**:
  - SMTP 发信网关集成：支持复旦邮箱验证码发送
  - 登录注册页面重构：从弹窗改为独立页面
  - 环境变量配置化：SMTP 配置通过 .env 文件管理

- **v1.2.1**:
  - 封面简化：移除管理入口、版本号
  - 页脚整合：用户须知内容并入页脚
  - 弹窗优化：用户须知5秒自动关闭
  - 管理入口重定位到页脚左下角
  - 管理员编辑权限完善
  - 食客楼模块完善

### SMTP 邮件配置
环境变量文件 `.env` 中预留以下配置字段：
```env
SMTP_HOST=smtp.example.com      # SMTP 服务器地址
SMTP_PORT=465                   # 端口 (SSL: 465, TLS: 587)
SMTP_USER=your-email@example.com # 用户名/邮箱
SMTP_PASS=your-auth-code         # 授权码
SMTP_FROM_NAME=旦食 FDU Food     # 发信人显示名称
SMTP_SUBJECT_PREFIX=【旦食】      # 邮件主题前缀
```
