# 旦食 (FDU Food) - Version 1.3.1_stable

复旦大学校内美食点评与指南系统

🔗 实时预览: http://fdufood.site

---

## 🌟 项目简介 (Overview)

"旦食"是一个专为复旦大学师生打造的校园餐饮点评社区。针对校内食堂信息不对称、评价分散的问题，本项目提供了一个集成化、透明化的评价平台，帮助学友快速发现校内美食。

## 🚀 核心功能 (Key Features)

- **学号实名认证**：集成 SMTP 邮件服务，仅限 @fudan.edu.cn 邮箱注册，确保社区评价真实可靠。
- **全量数据覆盖**：打通"校内食堂指南"与"食客楼"双板块数据，支持多维度美食检索。
- **独立管理中台**：为管理员提供专属管理入口，支持全站帖子监控与用户权限审计。
- **价格筛选引擎**：重构了数值过滤逻辑，支持精准的消费区间筛选。
- **玻璃拟态 UI**：基于现代 Web 设计美学，打造轻量化、通透的视觉交互体验。

## 🛠️ 技术栈 (Tech Stack)

| 层级 | 技术选型 |
|------|----------|
| Frontend | 原生 JavaScript (ES6+), HTML5, CSS3 (Glassmorphism design) |
| Backend | Node.js, Express.js |
| Database | SQLite (轻量、高性能、易迁移) |
| Server | Nginx (反向代理与静态资源托管), PM2 (进程管理) |
| Authentication | Nodemailer (SMTP 通信协议) |

## 📂 项目结构 (Structure)

```
/
├── backend/
│   ├── server.js          # 后端逻辑与 API 接口
│   └── database.js        # 数据库初始化与数据聚合逻辑
├── frontend/              # 前端静态资源 (HTML, CSS, JS)
├── package.json           # 项目依赖配置
├── Dockerfile             # 容器化部署配置
├── .env.example           # 环境变量模板 (已屏蔽敏感信息)
├── .gitignore             # Git 忽略配置
├── README.md              # 项目说明文档
└── SPEC.md                # 技术规格文档
```

## ⚠️ 开发与部署说明 (Notes)

- **隐私安全**：生产环境的 `.env` 和 `.db` 文件已进行 Git 忽略处理，防止用户信息与发信授权码泄露。
- **自动化流**：项目已建立 Git 自动同步规范，确保 GitHub 仓库代码与生产服务器实时一致。
- **版本迭代**：当前版本 V1.3.1_stable，已实现稳定的管理端数据聚合逻辑。

---

📧 合作联系：ivanfourth@163.com

© 2026 FDU Food - 复旦人的美食指南
