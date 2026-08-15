# Drinker 🍹

一款记录每日心情、按心情推荐酒品、并分享自制调酒配方的移动 App。简约风格，
心情用 emoji + 文字表达，心情自动同步到小日历，App 会根据你的心情为你推荐一杯酒，
附上它的历史渊源、做法和视频教程。

## ✨ 功能

- **每日心情打卡**：每天第一次打开会询问并记录心情，8 种 emoji 心情（开心/兴奋/平静/难过/焦虑/疲惫/孤独/生气），可写一句话备注，也可以跳过不填。
- **心情小日历**：每日心情同步到月历，一眼回看自己的情绪轨迹。
- **心情 → 酒品推荐**：根据当天心情，从内置酒库推荐一款酒，附历史渊源、配方、做法和视频链接，可「换一款」。
- **酒库与搜索**：内置多款经典鸡尾酒（带实物图），支持按酒名/原料/关键词搜索。
- **社区**：发布你自己的调酒配方，浏览/点赞/评论他人的配方，支持「最新 / 热门」排序。
- **账号体系**：注册/登录，心情数据与社区内容按用户隔离。

## 🛠 技术栈

| 部分 | 技术 |
|------|------|
| 移动端 | React Native + Expo（SDK 57）+ TypeScript + React Navigation |
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
        ├── screens/    # 今日/日历/酒库/社区/我的 + 详情/发布页
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

App 会自动把后端地址解析为 `http://<运行 Expo 的电脑 IP>:4000`（通过 Expo 开发服务器的 hostUri）。
如果你的后端部署在别处，可在 `mobile/app.json` 里加：

```json
"extra": { "apiUrl": "https://your-api.example.com" }
```

## 🔐 隐私与安全

- **不收集敏感个人信息**：注册仅需「用户名 + 密码」，不收集手机号、身份证等实名信息；密码 scrypt 加盐散列存储，登录 token 为随机值存库、可撤销。
- **消息传输加密**：社区帖子/评论内容在传输时做 AES 简单加密（客户端加密、服务端解密后存入 SQLite）。
- **数据存储**：心情、帖子、评论等全部数据只存于你自己的后端 SQLite，不经过第三方。
- **无多余组件**：不含内容审核、后台管理、广告/统计 SDK。
- **网络健壮性**：App 请求带 15 秒超时 + 自动重试（网络错误重试 2 次）。
- **生产建议**：部署到公网时启用 HTTPS（TLS），并把 `usesCleartextTraffic` 关闭；`.env` 与数据库已被 `.gitignore` 忽略。

## 📄 许可证

MIT
