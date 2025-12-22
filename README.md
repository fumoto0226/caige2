# 猜歌名游戏

一个基于 React + Vite + Firebase 的在线猜歌名游戏。

## 功能特性

- 🎵 **本地同玩模式**：支持多人本地游戏
- 🌐 **线上联机模式**：通过房间号或链接加入，实时同步游戏状态
- 🎮 **实时同步**：
  - 聊天消息实时同步
  - 玩家列表实时同步
  - 播放状态同步（播放/暂停）
  - 播放进度同步（新玩家加入时从当前播放位置开始）
  - 房间规则同步（答题时间、播放时长、是否整首、播放位置）
- 🎯 **游戏规则**：
  - 支持设置播放时长（2-30秒或整首）
  - 支持设置答题限时（5s/10s/15s/30s/无限）
  - 支持随机片段或从头开始播放
  - 第一遍播放时禁用暂停和拖动进度条

## 技术栈

- **前端框架**：React 18
- **构建工具**：Vite 5
- **样式**：Tailwind CSS
- **数据库**：Firebase Firestore
- **图标**：Lucide React

## 项目结构

```
caige2/
├── src/
│   ├── components/          # React 组件
│   │   ├── SetupScreen.jsx      # 设置界面
│   │   ├── LocalGameScreen.jsx   # 本地游戏界面
│   │   ├── OnlineGameScreen.jsx  # 线上游戏界面
│   │   ├── ResultsScreen.jsx     # 结果界面
│   │   └── Visualizer.jsx        # 音频可视化组件
│   ├── App.jsx               # 主应用组件
│   ├── main.jsx              # 入口文件
│   ├── firebase.js           # Firebase 配置和工具函数
│   ├── constants.js          # 常量和工具函数
│   └── index.css             # 全局样式
├── public/                   # 静态资源（图片、音乐）
├── index.html                # HTML 入口
├── package.json              # 项目依赖
├── vite.config.js            # Vite 配置
└── tailwind.config.js        # Tailwind 配置
```

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式运行

```bash
npm run dev
```

### 3. 构建生产版本

```bash
npm run build
```

构建后的文件会在 `dist` 目录中。

### 4. 预览生产版本

```bash
npm run preview
```

## Firebase 配置

1. 在 Firebase 控制台创建项目
2. 启用 Firestore 数据库
3. 修改 `src/firebase.js` 中的 `firebaseConfig` 配置

## 部署到 GitHub Pages

1. 构建项目：`npm run build`
2. 将 `dist` 目录的内容推送到 GitHub Pages 分支
3. 确保 `vite.config.js` 中的 `base` 设置为 `'./'`（相对路径）

## 游戏规则说明

### 房主行为
- 创建房间时设置游戏规则（答题时间、播放时长、是否整首、播放位置）
- 规则会自动同步到所有加入的玩家
- 只有房主可以开始游戏和公布答案
- 房主控制播放/暂停，其他玩家自动跟随

### 玩家行为
- 通过房间号或链接加入房间
- 加入时自动同步房主的游戏规则
- 加入时如果房主正在播放，会自动从当前播放位置开始
- 第一遍播放时无法暂停或拖动进度条
- 可以随时发送聊天消息

## 同步机制

### 房间规则同步
- 房主创建房间时，将规则写入 Firestore：`timeLimit`, `durationSeconds`, `isFullSong`, `playbackPosition`
- 玩家加入时，从 Firestore 读取并同步规则

### 播放进度同步
- 房主开始播放时，写入 `isPlaying: true`, `segmentStart`, `startedAt: Date.now()`
- 非房主订阅房间状态，根据 `segmentStart + (now - startedAt)` 计算当前播放位置
- 新玩家加入时，自动从当前播放位置开始播放

### 第一遍播放限制
- 使用 `hasFinishedFirstPlay` 状态标记是否完成第一遍播放
- 第一遍播放时，暂停按钮和进度条被禁用
- 播放完成后，自动解锁控制功能

## 默认昵称
- 未填写昵称时，自动生成 `用户+随机编号`（如：用户1234）
- 房主显示为 `昵称（房主）`
- 其他玩家只显示昵称

## 许可证

MIT

