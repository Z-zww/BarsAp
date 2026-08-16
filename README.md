# Drinker 🍹

一款记录每日心情、按心情推荐酒品、并分享自制调酒配方的移动 App，同时支持 Android 与 Web。
心情用 emoji + 文字表达并同步到日历，每天根据你的心情，精选一款适合当下的酒，酒品详情包含中文历史渊源、
配方、做法和视频教程。

## ✨ 功能

- **每日心情打卡**：每天第一次打开会询问并记录心情，支持 8 种 emoji 心情（开心/兴奋/平静/难过/焦虑/疲惫/孤独/生气），也可以跳过不填。
- **心情日历**：每日心情同步到月历；点击任意日期可选择心情，或进入独立便签页面补记内容。
- **便签自动保存**：输入停止约 600ms 后自动保存，离开编辑页时也会提交最新草稿；返回首页或日历即可看到更新，无需重启 App。
- **今日便签**：首页直接展示当天便签，并提供新建或继续编辑入口；所有文本输入框支持 Unicode 与 emoji。
- **每日酒品推荐**：每天根据你的心情，精选一款适合当下的酒，附历史渊源、配方、做法和视频链接，也可手动「换一款」。
- **中英文酒库搜索**：支持按酒名、原料和关键词搜索内置酒库及 TheCocktailDB 网络酒库（600+ 款）。网络酒品显示中文名称、分类、酒精属性，并在详情页提供中文历史、配料和步骤。
- **个人调酒配方**：个人酒库集中展示收藏酒品与自己发布的调酒配方，个人页可直接进入。
- **社区**：发布调酒配方，浏览、点赞和评论他人的配方，支持「最新 / 热门」排序；成品图可从相册选择或使用相机拍摄。
- **头像设置**：用户可从相册选择头像或使用相机拍摄并上传。
- **账号体系**：支持注册、登录和退出，心情、便签、收藏与社区内容按用户隔离。

## 🛠 技术栈

| 部分 | 技术 |
|------|------|
| 移动端与 Web | React Native + Expo（SDK 57）+ TypeScript + React Navigation |
| 后端 | Node.js + Express + SQLite（内置 `node:sqlite`，无原生依赖）|
| 认证 | 密码 scrypt 散列 + 随机 token（存库，可撤销）|
| 数据 | SQLite 单文件数据库，酒品数据从 `server/data/drinks.json` 自动入库 |

## 📁 目录结构

```
drinker/
├── server/          # 后端 API
│   ├── src/
│   │   ├── index.js     # 全部路由（认证/心情/酒品/社区）
│   │   ├── db.js        # SQLite 建表 + 酒品 seed
│   │   ├── auth.js      # 密码散列 + token 中间件
│   │   └── moods-meta.js
│   ├── data/
│   │   └── drinks.json  # 酒品数据库（源数据）
│   └── package.json
└── mobile/          # Expo React Native App
    ├── App.tsx         # 导航 + 认证 Provider
    └── src/
        ├── screens/    # 今日/日历/便签/酒库/社区/我的 + 详情/发布页
        ├── components/ # MoodPicker / DrinkCard / PostCard
        ├── api.ts      # 后端客户端（自动探测后端地址）
        ├── AuthContext.tsx
        └── ...
```

## 🚀 快速开始

### 1. 启动后端

```bash
cd server
npm install
npm start        # 默认 http://localhost:4000
```

首次启动会自动创建 SQLite 数据库并把 `server/data/drinks.json` 入库。
验证：浏览器打开 <http://localhost:4000> 应返回 `{"ok":true,...}`。

### 2. 启动移动端

```bash
cd mobile
npm install
npx expo start
```

- **手机真机**：手机装 [Expo Go](https://expo.dev/go)，和电脑连**同一个 WiFi**，扫终端里的二维码即可。
- **浏览器预览**：按 `w`（或 `npm run web`）在浏览器里打开。

也可以直接启动 Web 预览：

```bash
cd mobile
npm run web
```

App 会自动把后端地址解析为 `http://<运行 Expo 的电脑 IP>:4000`（通过 Expo 开发服务器的 hostUri）。
如果你的后端部署在别处，可在 `mobile/app.json` 里加：

```json
"extra": { "apiUrl": "https://your-api.example.com" }
```

网络酒品详情的中文整理使用可选的通义千问兼容接口。未配置时仍会显示中文名称和基础中文说明；需要完整中文历史、配料和步骤时，在 `server/.env` 中配置：

```env
DASHSCOPE_API_KEY=your_api_key
TRANSLATE_MODEL=qwen-plus
```

## 📱 Android 权限

- `INTERNET` / `ACCESS_NETWORK_STATE`：连接后端、搜索网络酒库和加载图片。
- `CAMERA`：拍摄社区配方成品图或头像，仅在用户主动选择拍摄时申请。
- `READ_MEDIA_IMAGES` / `READ_EXTERNAL_STORAGE`：从相册选择配方图片或头像，兼容不同 Android 版本。
- 本地开发后端默认使用 HTTP，Android 构建已启用 `usesCleartextTraffic`；正式公网部署建议改用 HTTPS。

## 🔐 隐私与安全

- **不收集敏感个人信息**：注册仅需「用户名 + 密码」，不收集手机号、身份证等实名信息；密码 scrypt 加盐散列存储，登录 token 为随机值存库、可撤销。
- **消息传输加密**：社区帖子/评论内容在传输时做 AES 简单加密（客户端加密、服务端解密后存入 SQLite）。
- **数据存储**：心情、帖子、评论等全部数据只存于你自己的后端 SQLite，不经过第三方。
- **无多余组件**：不含内容审核、后台管理、广告/统计 SDK。
- **网络健壮性**：App 请求带 15 秒超时 + 自动重试（网络错误重试 2 次）。
- **生产建议**：部署到公网时启用 HTTPS（TLS），并把 `usesCleartextTraffic` 关闭；`.env` 与数据库已被 `.gitignore` 忽略。

## 📄 许可证

MIT
