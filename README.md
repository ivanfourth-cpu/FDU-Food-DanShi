# 旦食 (FDU Food)

> 复旦学子的专属美食点评平台

## 项目简介

旦食是一个诞生于复旦校内的独立点评项目，旨在为复旦学子提供最真实的食堂与校外美食评价体验。

## 核心功能

- **复旦学号认证**：通过 SMTP 邮件服务验证复旦邮箱（学号@m.fudan.edu.cn 或 学号@mail.fudan.edu.cn）
- **校内食堂评价**：覆盖旦苑、春晖、南区、北区、枫林、张江等各大食堂
- **食客楼板块**：校外美食推荐与分享
- **独立管理后台**：管理员可监控全部帖子、用户数据，支持详情查看与内容管理

## 技术栈

| 类别 | 技术 |
|------|------|
| 后端 | Node.js + Express |
| 数据库 | SQLite (better-sqlite3) |
| 前端 | Vue 3 (CDN) + 原生 JavaScript |
| 邮件服务 | Nodemailer + 163 SMTP |
| 反向代理 | Nginx |
| 容器化 | Docker |

## 项目结构

```
旦食/
├── backend/
│   ├── server.js      # Express 服务器与路由
│   └── database.js     # SQLite 数据库操作
├── frontend/
│   ├── index.html      # 主页面
│   ├── css/style.css   # 样式文件
│   └── js/app.js       # Vue 应用逻辑
├── .env                # 环境变量（SMTP 配置）
├── Dockerfile          # Docker 镜像构建
├── package.json        # 依赖管理
└── SPEC.md             # 项目规格说明
```

## 部署信息

- **访问地址**：http://101.43.68.240
- **服务端口**：8080（Docker），80（Nginx 反向代理）
- **数据库路径**：`/var/lib/fdufood/data/danshi.db`

## 版本信息

- **当前版本**：V1.3.1
- **状态**：稳定内测中

## 注意事项

1. 本项目仅限复旦校内使用，请勿对外公开网址或传播截图
2. 项目知识产权归开发者本人所有，禁止克隆或商业使用
3. 数据库文件通过 Docker 卷挂载持久化，每次部署前请确保备份

## 开发说明

### 本地运行

```bash
# 安装依赖
npm install

# 启动服务（需要配置 .env 文件）
npm start
```

### Docker 部署

```bash
# 构建镜像
docker build -t danshi-app:v1.x.x .

# 运行容器（挂载数据卷）
docker run -d --name danshi-container \
  -p 8080:3000 \
  --mount type=bind,source=/var/lib/fdufood/data,target=/var/lib/fdufood/data \
  --env-file .env \
  danshi-app:v1.x.x
```

---

*旦愿每一位复旦人，都能在"旦食"找到属于自己的那一口惊喜。*
