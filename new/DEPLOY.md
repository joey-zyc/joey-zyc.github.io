# 部署与维护说明

## 目录结构

```
new/
├── index.html   页面结构、样式引用、所有文字内容
├── styles.css   视觉样式、明暗主题、响应式布局
├── app.js       终端、命令面板、文件切换、主题等交互
└── DEPLOY.md    本说明
```

整个新页面只有这三个运行文件，没有构建步骤，也没有第三方依赖。

Markdown 文件默认以排版预览显示，右上角可以在「预览 / 源码」之间切换。

## 部署到 GitHub Pages

新页面放在仓库的 `new/` 目录中，旧版主页的文件位于仓库根目录，两者互不覆盖。

1. 把 `new/` 整个目录提交到 `joey-zyc/joey-zyc.github.io` 仓库的 `main` 分支。
2. GitHub Pages 已经为该用户站点开启，推送到 `main` 后会自动发布。
3. 访问 `https://joey-zyc.github.io/new/` 查看新版。
4. 旧版仍可通过 `https://joey-zyc.github.io/` 访问。

如果以后想让新版接管根地址，需要先把旧站文件移动到别的目录（例如 `old/`），
再把 `new/` 的内容移动到仓库根目录，并同步修改 `app.js` 顶部的 `OLD_SITE` 常量。

## 本地预览

直接双击 `index.html` 即可打开。若希望使用本地服务器：

```bash
cd new
python -m http.server 8000
```

然后访问 `http://localhost:8000/`。

## 修改内容

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
