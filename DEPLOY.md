# 部署与维护说明

## 目录结构

```
/
├── index.html      新版首页：页面结构、样式引用、所有文字内容
├── styles.css      新版视觉样式、明暗主题、响应式布局
├── app.js          新版终端、命令面板、文件切换、主题等交互
├── DEPLOY.md       本说明
└── old/            旧版主页及全部资源
```

新版位于站点根目录，访问 `https://joey-zyc.github.io/` 即可。
旧版完整搬到 `https://joey-zyc.github.io/old/`，其页面内的站内链接和资源路径
已统一加上 `/old/` 前缀。

整个站点是纯静态文件，没有构建步骤，也没有第三方依赖。

Markdown 文件默认以排版预览显示，右上角可以在「预览 / 源码」之间切换。

## 部署到 GitHub Pages

1. 把改动提交到 `joey-zyc/joey-zyc.github.io` 仓库的 `main` 分支。
2. GitHub Pages 已为该用户站点开启，推送到 `main` 后会自动发布。
3. 新版访问 `https://joey-zyc.github.io/`，旧版访问 `https://joey-zyc.github.io/old/`。

## 本地预览

在仓库根目录启动静态服务器：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000/`。必须使用服务器而不是直接双击 `index.html`，
否则 `/old/` 这样的绝对路径无法解析。

## 修改新版内容

所有可见文字都在 `index.html` 底部的 `<template>` 标签里：

| 文件 | 内容 |
| --- | --- |
| `about.md` | 首页自我介绍 |
| `projects.js` | 项目列表 |
| `uses.md` | 技术栈与页面效果 |
| `contact.md` | 联系方式 |
| `README.md` | 页面内使用说明 |

修改 template 内的文字即可，不需要改动 CSS 或 JavaScript。
如果需要增删文件，同时更新 `index.html` 左侧文件树和 `data-file` 名称。

## 常用配置

- 旧站地址：`app.js` 顶部的 `OLD_SITE`
- GitHub 地址：`app.js` 顶部的 `GITHUB`
- 默认主题：`app.js` 底部的 `applyTheme(...)` 调用处
- 引导动画：`app.js` 底部的 `BOOT_LINES`，每行间隔 170ms

主题偏好保存在浏览器的 `localStorage` 中。引导动画每次会话只播放一次，
保存在 `sessionStorage` 中。清除浏览器站点数据即可重新看到启动动画。

## 终端命令

`help`、`ls`、`open`、`cat`、`projects`、`theme`、`neofetch`、`github`、
`old`、`date`、`whoami`、`pwd`、`clear`、`exit`、`echo`、`cd`、`sudo`。

支持 `Tab` 补全、上下方向键翻历史。

## 修改旧版

旧版是原先的 Hexo 静态导出，放在 `old/` 目录。它使用站点绝对路径，
因此修改或新增文件时，页面里的站内地址需要写成 `/old/...`。
