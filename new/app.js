/* ============================================================
   joey-zyc · terminal portfolio
   Vanilla JS. No build step.
   ============================================================ */

(() => {
  "use strict";

  // ----------------------------------------------------------
  // Config
  // ----------------------------------------------------------

  // 新版放在 /new/，旧版仍从站点根目录提供。
  // 如果以后把新版挪到根目录，记得同步修改这里。
  const OLD_SITE = "https://joey-zyc.github.io/";
  const GITHUB = "https://github.com/joey-zyc";
  const THEME_KEY = "joey-theme";
  const BOOT_KEY = "joey-booted";

  // ----------------------------------------------------------
  // File content (read from <template> tags in index.html)
  // ----------------------------------------------------------

  const files = {};
  document.querySelectorAll("template[data-file]").forEach((tpl) => {
    const name = tpl.dataset.file;
    files[name] = {
      name,
      lang: tpl.dataset.lang || "md",
      text: tpl.content.textContent.replace(/^\s*\n/, "").replace(/\s+$/, ""),
    };
  });

  const fileNames = Object.keys(files);
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ----------------------------------------------------------
  // DOM
  // ----------------------------------------------------------

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const win = $("#window");
  const tabsEl = $("#tabs");
  const crumbPath = $("#crumbPath");
  const viewSwitch = $("#viewSwitch");
  const codeEl = $("#code");
  const mdPreview = $("#mdPreview");
  const editorScroll = $("#editorScroll");
  const treeEl = $("#tree");
  const sidebar = $("#sidebar");
  const explorerBtn = $("#explorerBtn");
  const sidebarClose = $("#sidebarClose");
  const themeBtn = $("#themeBtn");
  const searchBtn = $("#searchBtn");
  const readmeBtn = $("#readmeBtn");
  const clearBtn = $("#clearBtn");
  const terminalView = $("#terminalView");
  const outputView = $("#outputView");
  const termOut = $("#termOut");
  const termForm = $("#termForm");
  const termInput = $("#termInput");
  const buildOut = $("#buildOut");
  const posEl = $("#pos");
  const clockEl = $("#clock");
  const oldSiteLink = $("#oldSiteLink");
  const bootEl = $("#boot");
  const bootLinesEl = $("#bootLines");
  const bootEnter = $("#bootEnter");
  const paletteEl = $("#palette");
  const paletteInput = $("#paletteInput");
  const paletteList = $("#paletteList");

  // ----------------------------------------------------------
  // State
  // ----------------------------------------------------------

  const state = {
    file: "about.md",
    tabs: ["about.md"],
    history: [],
    historyIndex: -1,
    paletteItems: [],
    paletteIndex: 0,
    started: false,
    mdMode: "preview",
  };

  // ----------------------------------------------------------
  // Escaping + syntax highlighting
  // ----------------------------------------------------------

  const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ESCAPES[c]);

  const JS_TOKEN =
    /(\/\/.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:const|let|var|function|return|if|else|for|of|in|class|new|async|await|import|export|from|default|true|false|null|undefined|typeof|this)\b)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(?=\()|([{}()[\];,.=+\-*/<>!&|?:]+)/g;

  function jsLine(line) {
    let out = "";
    let last = 0;
    let m;
    JS_TOKEN.lastIndex = 0;
    while ((m = JS_TOKEN.exec(line))) {
      out += esc(line.slice(last, m.index));
      if (m[1]) out += `<span class="tok-com">${esc(m[1])}</span>`;
      else if (m[2]) out += `<span class="tok-str">${esc(m[2])}</span>`;
      else if (m[3]) out += `<span class="tok-kw">${esc(m[3])}</span>`;
      else if (m[4]) out += `<span class="tok-num">${esc(m[4])}</span>`;
      else if (m[5]) out += `<span class="tok-fn">${esc(m[5])}</span>`;
      else if (m[6]) out += `<span class="tok-punct">${esc(m[6])}</span>`;
      last = m.index + m[0].length;
    }
    out += esc(line.slice(last));
    return out;
  }

  function mdLine(line) {
    let out = esc(line);

    out = out.replace(/^(#{1,6})(\s+)(.*)$/, (_, h, sp, t) => `<span class="tok-head">${h}${sp}${t}</span>`);
    out = out.replace(/^(\s*)(&gt;)(\s?)(.*)$/, (_, sp, b, s2, t) => `${sp}<span class="tok-quote">${b}${s2}${t}</span>`);
    out = out.replace(/^(\s*)([-*])(\s+)/, (_, sp, b, s2) => `${sp}<span class="tok-bullet">${b}</span>${s2}`);
    out = out.replace(/`([^`]+)`/g, '<span class="tok-code">`$1`</span>');
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    out = out.replace(/(^|[\s(：、，。])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');

    return out;
  }

  function highlight(line, lang) {
    if (lang === "js") return jsLine(line);
    return mdLine(line);
  }

  // ----------------------------------------------------------
  // Markdown rendering (small, dependency-free subset)
  // ----------------------------------------------------------

  function inlineMd(text) {
    let s = esc(text);
    const stash = [];

    s = s.replace(/`([^`]+)`/g, (_, code) => {
      stash.push(`<code>${code}</code>`);
      return `\u0001${stash.length - 1}\u0001`;
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/(^|[\s(：、，。])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    s = s.replace(/\u0001(\d+)\u0001/g, (_, i) => stash[Number(i)]);

    return s;
  }

  // Join wrapped source lines. No space between CJK text, one space for Latin.
  function joinProse(lines) {
    return lines.reduce((acc, raw) => {
      const next = raw.trim();
      if (!acc) return next;
      const prev = acc[acc.length - 1];
      const needsSpace = /[A-Za-z0-9`*_~)\]>]/.test(prev) || /[A-Za-z0-9`*_~([]/.test(next[0]);
      return acc + (needsSpace ? " " : "") + next;
    }, "");
  }

  function renderMarkdown(src) {
    const lines = src.split("\n");
    const out = [];
    let para = [];
    let i = 0;

    const flushParagraph = () => {
      if (!para.length) return;
      out.push(`<p>${inlineMd(joinProse(para))}</p>`);
      para = [];
    };

    while (i < lines.length) {
      const line = lines[i];

      if (/^\s*```/.test(line)) {
        flushParagraph();
        const lang = line.trim().slice(3).trim();
        const buf = [];
        i += 1;
        while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]);
        if (i < lines.length) i += 1;
        out.push(
          `<pre><code${lang ? ` class="language-${esc(lang)}"` : ""}>${esc(buf.join("\n"))}</code></pre>`
        );
        continue;
      }

      if (!line.trim()) {
        flushParagraph();
        i += 1;
        continue;
      }

      const heading = /^(#{1,6})\s+(.*)$/.exec(line);
      if (heading) {
        flushParagraph();
        const level = heading[1].length;
        out.push(`<h${level}>${inlineMd(heading[2].trim())}</h${level}>`);
        i += 1;
        continue;
      }

      if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        flushParagraph();
        out.push("<hr>");
        i += 1;
        continue;
      }

      if (/^\s*>/.test(line)) {
        flushParagraph();
        const quote = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ""));
          i += 1;
        }
        const body = quote
          .filter((q) => q.trim())
          .map((q) => `<p>${inlineMd(joinProse([q]))}</p>`)
          .join("");
        out.push(`<blockquote>${body}</blockquote>`);
        continue;
      }

      if (/^\s*[-*+]\s+/.test(line)) {
        flushParagraph();
        const items = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          items.push(`<li>${inlineMd(lines[i].replace(/^\s*[-*+]\s+/, "").trim())}</li>`);
          i += 1;
        }
        out.push(`<ul>${items.join("")}</ul>`);
        continue;
      }

      if (/^\s*\d+[.)]\s+/.test(line)) {
        flushParagraph();
        const items = [];
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
          items.push(`<li>${inlineMd(lines[i].replace(/^\s*\d+[.)]\s+/, "").trim())}</li>`);
          i += 1;
        }
        out.push(`<ol>${items.join("")}</ol>`);
        continue;
      }

      para.push(line);
      i += 1;
    }

    flushParagraph();
    return out.join("\n");
  }

  // ----------------------------------------------------------
  // Editor
  // ----------------------------------------------------------

  function renderTabs() {
    tabsEl.innerHTML = state.tabs
      .map((name) => {
        const f = files[name];
        const active = name === state.file;
        return `
          <div class="tab${active ? " is-active" : ""}" data-file="${esc(name)}" data-lang="${f ? f.lang : "md"}"
               role="tab" tabindex="${active ? "0" : "-1"}" aria-selected="${active}">
            <span class="tab-dot"></span>
            <span class="tab-name">${esc(name)}</span>
            <button class="tab-close" type="button" data-close="${esc(name)}" title="关闭 ${esc(name)}" aria-label="关闭 ${esc(name)}">×</button>
          </div>`;
      })
      .join("");

    const activeTab = $(".tab.is-active", tabsEl);
    if (activeTab) activeTab.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function renderEditor() {
    const f = files[state.file];
    if (!f) return;

    const isMd = f.lang === "md";
    const showPreview = isMd && state.mdMode === "preview";

    codeEl.dataset.lang = f.lang;
    const lines = f.text.split("\n");
    codeEl.innerHTML = lines
      .map((line, i) => {
        const content = highlight(line, f.lang) || "&nbsp;";
        return `<div class="line" data-line="${i + 1}"><span class="ln">${i + 1}</span><span class="lc">${content}</span></div>`;
      })
      .join("");

    if (isMd) {
      mdPreview.innerHTML = renderMarkdown(f.text);
    } else {
      mdPreview.innerHTML = "";
    }

    codeEl.hidden = showPreview;
    mdPreview.hidden = !showPreview;
    viewSwitch.hidden = !isMd;

    $$(".view-switch-btn", viewSwitch).forEach((btn) => {
      const active = btn.dataset.mode === state.mdMode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    editorScroll.scrollTop = 0;
    editorScroll.scrollLeft = 0;

    const animated = showPreview ? mdPreview : codeEl;
    if (!prefersReducedMotion.matches) {
      animated.animate(
        [
          { opacity: 0, transform: "translateY(3px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 190, easing: "ease-out" }
      );
    }

    crumbPath.innerHTML = `~/portfolio <span class="crumb-sep">›</span> <span class="crumb-file">${esc(state.file)}</span>`;
    posEl.textContent = showPreview ? "Markdown 预览" : "Ln 1, Col 1";

    $$(".tree-item[data-file]", treeEl).forEach((el) => {
      el.classList.toggle("is-active", el.dataset.file === state.file);
      el.setAttribute("aria-selected", el.dataset.file === state.file ? "true" : "false");
    });
  }

  function openFile(name, { quiet = false } = {}) {
    if (!files[name]) {
      if (!quiet) print(`<span class="err">没有这个文件：</span>${esc(name)}`, "err");
      return false;
    }

    if (!state.tabs.includes(name)) state.tabs.push(name);
    state.file = name;

    renderTabs();
    renderEditor();
    closeSidebarOnMobile();
    return true;
  }

  function closeTab(name) {
    const idx = state.tabs.indexOf(name);
    if (idx === -1 || state.tabs.length <= 1) return;

    state.tabs.splice(idx, 1);
    if (state.file === name) {
      state.file = state.tabs[Math.min(idx, state.tabs.length - 1)];
    }
    renderTabs();
    renderEditor();
  }

  // ----------------------------------------------------------
  // Sidebar
  // ----------------------------------------------------------

  const mobileQuery = window.matchMedia("(max-width: 900px)");

  function setSidebar(visible) {
    win.classList.toggle("sidebar-hidden", !visible);
    explorerBtn.classList.toggle("is-active", visible);
    explorerBtn.setAttribute("aria-expanded", String(visible));
  }

  function closeSidebarOnMobile() {
    if (mobileQuery.matches) setSidebar(false);
  }

  explorerBtn.addEventListener("click", () => {
    setSidebar(win.classList.contains("sidebar-hidden"));
  });

  sidebarClose.addEventListener("click", () => setSidebar(false));

  treeEl.addEventListener("click", (e) => {
    const item = e.target.closest(".tree-item[data-file]");
    if (item) openFile(item.dataset.file);
  });

  document.querySelectorAll(".tree-item[data-file]").forEach((item) => {
    item.setAttribute("role", "treeitem");
    item.setAttribute("aria-selected", "false");
  });

  if (mobileQuery.matches) setSidebar(false);
  else setSidebar(true);

  mobileQuery.addEventListener?.("change", (e) => {
    setSidebar(!e.matches);
  });

  // ----------------------------------------------------------
  // Tabs
  // ----------------------------------------------------------

  tabsEl.addEventListener("click", (e) => {
    const close = e.target.closest(".tab-close");
    if (close) {
      e.stopPropagation();
      closeTab(close.dataset.close);
      return;
    }
    const tab = e.target.closest(".tab");
    if (tab) openFile(tab.dataset.file);
  });

  tabsEl.addEventListener("keydown", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openFile(tab.dataset.file);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      closeTab(tab.dataset.file);
    }
  });

  // ----------------------------------------------------------
  // Line position indicator
  // ----------------------------------------------------------

  codeEl.addEventListener("mouseover", (e) => {
    const line = e.target.closest(".line");
    if (!line) return;
    $$(".line.is-current", codeEl).forEach((el) => el.classList.remove("is-current"));
    line.classList.add("is-current");
    posEl.textContent = `Ln ${line.dataset.line}, Col 1`;
  });

  editorScroll.addEventListener("mouseleave", () => {
    $$(".line.is-current", codeEl).forEach((el) => el.classList.remove("is-current"));
  });

  function toggleMdMode() {
    if (files[state.file].lang !== "md") return;
    state.mdMode = state.mdMode === "preview" ? "source" : "preview";
    renderEditor();
  }

  viewSwitch.addEventListener("click", (e) => {
    const btn = e.target.closest(".view-switch-btn");
    if (!btn) return;
    state.mdMode = btn.dataset.mode;
    renderEditor();
  });

  // ----------------------------------------------------------
  // Theme
  // ----------------------------------------------------------

  const themeMeta = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme, persist = true) {
    const next = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    if (themeMeta) themeMeta.content = next === "light" ? "#ece9df" : "#070b0a";
    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (_) {
        /* storage can be unavailable */
      }
    }
    themeBtn.setAttribute("aria-label", next === "light" ? "切换到深色主题" : "切换到浅色主题");
  }

  function currentTheme() {
    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
  }

  function toggleTheme() {
    applyTheme(currentTheme() === "light" ? "dark" : "light");
  }

  try {
    applyTheme(localStorage.getItem(THEME_KEY) || "dark", false);
  } catch (_) {
    applyTheme("dark", false);
  }

  themeBtn.addEventListener("click", toggleTheme);

  // ----------------------------------------------------------
  // Terminal
  // ----------------------------------------------------------

  const MAX_TERM_LINES = 250;

  function print(html, cls = "") {
    const div = document.createElement("div");
    div.className = `term-line${cls ? " " + cls : ""}`;
    div.innerHTML = html;
    termOut.appendChild(div);
    while (termOut.children.length > MAX_TERM_LINES) termOut.firstElementChild.remove();
    termOut.scrollTop = termOut.scrollHeight;
  }

  function printBlank() {
    const div = document.createElement("div");
    div.className = "term-line";
    div.innerHTML = "&nbsp;";
    termOut.appendChild(div);
    termOut.scrollTop = termOut.scrollHeight;
  }

  const COMMANDS = ["cat", "cd", "clear", "date", "echo", "exit", "github", "help", "ls", "neofetch", "old", "open", "projects", "pwd", "sudo", "theme", "whoami"];

  const HELP_ROWS = [
    ["help", "显示这份帮助"],
    ["ls", "列出当前目录的文件"],
    ["open <file>", "在编辑器中打开文件"],
    ["cat <file>", "打印文件内容"],
    ["projects", "看看项目清单"],
    ["theme [dark|light]", "切换明暗主题"],
    ["neofetch", "查看这个网站的配置"],
    ["github", "打开 GitHub 主页"],
    ["old", "前往旧版主页"],
    ["date", "显示当前时间"],
    ["whoami / pwd", "身份与当前位置"],
    ["clear", "清空终端"],
    ["exit", "尝试退出（不会成功）"],
  ];

  function listFiles() {
    print(`<span class="accent">${fileNames.length} files</span> <span class="dim">·</span> ~/portfolio`, "muted");
    fileNames.forEach((name) => {
      const f = files[name];
      const size = new TextEncoder().encode(f.text).length;
      print(
        `  <span class="accent">${esc(name.padEnd(14))}</span><span class="dim">${String(size).padStart(4, " ")} B</span>  <span class="muted">${esc(f.lang)}</span>`,
        "muted"
      );
    });
  }

  function findFile(name) {
    if (!name) return null;
    const lower = name.toLowerCase();
    return fileNames.find((f) => f.toLowerCase() === lower) || null;
  }

  const commands = {
    help() {
      print(`<span class="accent">可用命令</span> <span class="dim">— 输入命令，回车执行</span>`, "muted");
      HELP_ROWS.forEach(([cmd, desc]) => {
        print(`  <span class="cmd-name">${cmd.padEnd(18, " ")}</span><span class="muted">${desc}</span>`, "muted");
      });
      print(`<span class="dim">小技巧：按 Tab 自动补全，↑ ↓ 翻历史。</span>`, "dim");
    },

    ls(args) {
      const arg = args[0];
      if (arg && arg !== "." && arg !== "~" && arg !== "~/portfolio") {
        print(`<span class="err">ls: 只有 ~/portfolio 这一个目录。</span>`, "err");
        return;
      }
      listFiles();
    },

    open(args) {
      const name = findFile(args[0]);
      if (!name) {
        print(args[0] ? `<span class="err">找不到文件：</span>${esc(args[0])}` : `<span class="err">用法：open &lt;file&gt;</span>`, "err");
        if (!args[0]) print(`<span class="dim">可用文件：${esc(fileNames.join(", "))}</span>`, "dim");
        return;
      }
      openFile(name, { quiet: true });
      print(`<span class="ok">已打开</span> ${esc(name)}`, "muted");
    },

    cat(args) {
      const name = findFile(args[0]);
      if (!name) {
        print(args[0] ? `<span class="err">cat: 找不到文件 ${esc(args[0])}</span>` : `<span class="err">用法：cat &lt;file&gt;</span>`, "err");
        return;
      }
      print(`<span class="dim"># ${esc(name)}</span>`, "dim");
      print(`<span class="muted">${esc(files[name].text)}</span>`, "muted");
    },

    projects() {
      print(`<span class="accent">projects</span> <span class="dim">· 3 条目</span>`, "muted");
      print(`  <span class="cmd-name">this-site</span>          <span class="ok">live</span>      终端风格个人主页（就是这里）`, "muted");
      print(`  <span class="cmd-name">old-site</span>           <span class="dim">archived</span>  初代主页，原地址仍在`, "muted");
      print(`  <span class="cmd-name">your-next-project</span>  <span class="dim">planned</span>   占位项目，等你来填`, "muted");
      print(`<span class="dim">详情看 projects.js，或输入 open projects.js。</span>`, "dim");
    },

    theme(args) {
      const want = (args[0] || "").toLowerCase();
      if (want && want !== "dark" && want !== "light") {
        print(`<span class="err">用法：theme [dark|light]</span>`, "err");
        return;
      }
      const next = want || (currentTheme() === "dark" ? "light" : "dark");
      applyTheme(next);
      print(`<span class="ok">主题已切换：</span>${next}`, "muted");
    },

    neofetch() {
      const art = [
        "    _                  ",
        "   (_) ___   ___ _   _ ",
        "   | |/ _ \\ / _ \\ | | |",
        "   | | (_) |  __/ |_| |",
        "  _/ |\\___/ \\___|\\__, |",
        " |__/            |___/ ",
      ];
      art.forEach((line) => print(`<span class="art">${esc(line)}</span>`, "muted"));
      print(`<span class="accent">joey</span>@<span class="accent">portfolio</span>`, "muted");
      print(`<span class="dim">------------------</span>`, "muted");
      print(`  OS        Web · GitHub Pages`, "muted");
      print(`  Shell     portfolio-sh 2.0`, "muted");
      print(`  Theme     ${currentTheme()}`, "muted");
      print(`  Files     ${fileNames.length}`, "muted");
      print(`  Uptime    since the last refresh`, "muted");
      print(`  Stack     HTML · CSS · Vanilla JS`, "muted");
    },

    whoami() {
      print(`<span class="accent">visitor</span> <span class="dim">— 谢谢你打开这个页面。</span>`, "muted");
    },

    pwd() {
      print(`/home/visitor/portfolio`, "muted");
    },

    cd(args) {
      const target = args[0] || "~";
      if (target === "~" || target === ".." || target === "../") {
        print(`<span class="dim">这里就是 ~/portfolio，没有别的地方可去。</span>`, "dim");
      } else {
        print(`<span class="err">cd: 这是一个网页，不是真的 shell。</span>`, "err");
        print(`<span class="dim">想离开的话，试试 <span class="cmd-name">old</span>。</span>`, "dim");
      }
    },

    date() {
      print(`<span class="muted">${esc(new Date().toLocaleString("zh-CN", { hour12: false }))}</span>`, "muted");
    },

    echo(args) {
      if (!args.length) {
        print("", "muted");
        return;
      }
      print(args.map(esc).join(" "), "muted");
    },

    github() {
      print(`<span class="dim">正在打开</span> <span class="accent">${GITHUB}</span>`, "muted");
      window.open(GITHUB, "_blank", "noopener");
    },

    old() {
      print(`<span class="warn">正在前往旧版主页…</span>`, "warn");
      print(`<span class="dim">新版会留在这里，随时回来。</span>`, "dim");
      window.setTimeout(() => {
        window.location.href = OLD_SITE;
      }, 420);
    },

    sudo(args) {
      print(`<span class="err">sudo: permission denied.</span> <span class="dim">你已经有访问全部内容的权限了。</span>`, "err");
      if (args.length) print(`<span class="dim">而且 ${esc(args.join(" "))} 听起来不像一个好主意。</span>`, "dim");
    },

    exit() {
      print(`<span class="warn">exit: 这个窗口不提供出口。</span>`, "warn");
      print(`<span class="dim">要离开的话，输入 <span class="cmd-name">old</span> 回旧版，或者直接关掉标签页。</span>`, "dim");
    },

    clear() {
      termOut.innerHTML = "";
    },
  };

  function runCommand(raw) {
    const input = raw.trim();
    if (!input) return;

    print(`<span class="term-ps1">visitor@portfolio:~$</span> ${esc(input)}`, "echo");

    state.history.push(input);
    if (state.history.length > 100) state.history.shift();
    state.historyIndex = state.history.length;

    const parts = input.split(/\s+/);
    const cmd = parts.shift().toLowerCase();
    const args = parts;

    if (Object.prototype.hasOwnProperty.call(commands, cmd)) {
      commands[cmd](args, input);
    } else {
      print(`<span class="err">command not found:</span> ${esc(cmd)}`, "err");
      print(`<span class="dim">输入 <span class="cmd-name">help</span> 看看有哪些命令。</span>`, "dim");
    }
  }

  termForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = termInput.value;
    termInput.value = "";
    runCommand(value);
    termInput.focus();
  });

  termInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!state.history.length) return;
      state.historyIndex = Math.max(0, state.historyIndex - 1);
      termInput.value = state.history[state.historyIndex] || "";
      termInput.setSelectionRange(termInput.value.length, termInput.value.length);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!state.history.length) return;
      state.historyIndex = Math.min(state.history.length, state.historyIndex + 1);
      termInput.value = state.history[state.historyIndex] || "";
      termInput.setSelectionRange(termInput.value.length, termInput.value.length);
    } else if (e.key === "Tab") {
      e.preventDefault();
      completeInput();
    }
  });

  function completeInput() {
    const value = termInput.value;
    const parts = value.split(/\s+/);
    const last = parts[parts.length - 1] || "";
    const isFileArg = parts.length > 1 && (parts[0] === "open" || parts[0] === "cat");
    const pool = isFileArg ? fileNames : COMMANDS;
    const matches = pool.filter((c) => c.toLowerCase().startsWith(last.toLowerCase()));

    if (matches.length === 1) {
      parts[parts.length - 1] = matches[0];
      termInput.value = parts.join(" ") + (parts.length === 1 ? " " : "");
      termInput.setSelectionRange(termInput.value.length, termInput.value.length);
    } else if (matches.length > 1) {
      print(`<span class="dim">${esc(matches.join("   "))}</span>`, "dim");
    }
  }

  terminalView.addEventListener("click", (e) => {
    if (e.target.closest("a")) return;
    termInput.focus();
  });

  termInput.addEventListener("focus", () => terminalView.classList.add("is-focused"));
  termInput.addEventListener("blur", () => terminalView.classList.remove("is-focused"));

  clearBtn.addEventListener("click", () => {
    termOut.innerHTML = "";
    termInput.focus();
  });

  function focusTerminal() {
    const panelTab = $('.panel-tab[data-view="terminal"]');
    if (panelTab) panelTab.click();
    termInput.focus();
    terminalView.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion.matches ? "auto" : "smooth" });
  }

  // ----------------------------------------------------------
  // Terminal / output tabs
  // ----------------------------------------------------------

  $$(".panel-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".panel-tab").forEach((t) => {
        const active = t === tab;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", String(active));
      });
      const showTerminal = tab.dataset.view === "terminal";
      terminalView.hidden = !showTerminal;
      outputView.hidden = showTerminal;
      if (showTerminal) termInput.focus();
    });
  });

  function renderBuildLog() {
    const rows = [
      [`$ audit --static`, "", ""],
      [`checking index.html ......... `, "ok", "ok"],
      [`checking styles.css ......... `, "ok", "ok"],
      [`checking app.js ............ `, "ok", "ok"],
      [`checking external requests . `, "ok", "0 found"],
      [``, "", ""],
      [`0 errors · 0 warnings · 100% static`, "ok", ""],
    ];
    buildOut.innerHTML = rows
      .map(([text, cls, suffix]) => {
        const label = suffix
          ? `<span class="build-ok">${esc(text)}</span>${esc(suffix)}`
          : text.startsWith("$")
            ? `<span class="build-dim">$</span>${esc(text.slice(1))}`
            : cls === "ok"
              ? `<span class="build-ok">${esc(text)}</span>`
              : `<span class="build-dim">${esc(text)}</span>`;
        return `<div class="term-line${cls ? " ok" : ""}">${label}</div>`;
      })
      .join("");
  }

  // ----------------------------------------------------------
  // Command palette
  // ----------------------------------------------------------

  function paletteActions() {
    return [
      { kind: "CMD", label: "切换明暗主题", hint: "theme", run: toggleTheme },
      { kind: "CMD", label: "切换 Markdown 预览 / 源码", hint: "md", run: toggleMdMode },
      { kind: "CMD", label: "聚焦终端", hint: "terminal", run: focusTerminal },
      { kind: "CMD", label: "打开旧版主页", hint: "old", run: () => (window.location.href = OLD_SITE) },
      { kind: "CMD", label: "打开 GitHub", hint: "github", run: () => window.open(GITHUB, "_blank", "noopener") },
      { kind: "CMD", label: "清空终端", hint: "clear", run: () => { termOut.innerHTML = ""; focusTerminal(); } },
    ];
  }

  function fuzzyMatch(text, query) {
    const haystack = text.toLowerCase();
    const needle = query.toLowerCase().replace(/\s+/g, "");
    let pos = 0;
    for (const ch of needle) {
      const found = haystack.indexOf(ch, pos);
      if (found === -1) return false;
      pos = found + 1;
    }
    return true;
  }

  function buildPalette(query) {
    const fileItems = fileNames.map((name) => ({
      kind: "FILE",
      label: name,
      hint: files[name].lang,
      run: () => openFile(name),
    }));
    const all = [...fileItems, ...paletteActions()];
    const q = query.trim();
    return q ? all.filter((item) => fuzzyMatch(`${item.label} ${item.hint} ${item.kind}`, q)) : all;
  }

  function renderPalette(query) {
    state.paletteItems = buildPalette(query);
    state.paletteIndex = Math.min(state.paletteIndex, Math.max(state.paletteItems.length - 1, 0));

    if (!state.paletteItems.length) {
      paletteList.innerHTML = `<li class="palette-empty">没有匹配的项目</li>`;
      return;
    }

    paletteList.innerHTML = state.paletteItems
      .map((item, i) => {
        const selected = i === state.paletteIndex;
        return `<li class="palette-item${selected ? " is-selected" : ""}" role="option" aria-selected="${selected}" data-index="${i}">
          <span class="p-kind">${esc(item.kind)}</span>
          <span class="p-label">${esc(item.label)}</span>
          <span class="p-hint">${esc(item.hint)}</span>
        </li>`;
      })
      .join("");

    const selectedEl = $(".palette-item.is-selected", paletteList);
    if (selectedEl) selectedEl.scrollIntoView({ block: "nearest" });
  }

  function openPalette() {
    paletteEl.hidden = false;
    paletteInput.value = "";
    state.paletteIndex = 0;
    renderPalette("");
    window.setTimeout(() => paletteInput.focus(), 0);
  }

  function closePalette() {
    paletteEl.hidden = true;
  }

  function runPaletteItem(index) {
    const item = state.paletteItems[index];
    if (!item) return;
    closePalette();
    item.run();
  }

  paletteInput.addEventListener("input", () => {
    state.paletteIndex = 0;
    renderPalette(paletteInput.value);
  });

  paletteInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      state.paletteIndex = Math.min(state.paletteIndex + 1, state.paletteItems.length - 1);
      renderPalette(paletteInput.value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      state.paletteIndex = Math.max(state.paletteIndex - 1, 0);
      renderPalette(paletteInput.value);
    } else if (e.key === "Enter") {
      e.preventDefault();
      runPaletteItem(state.paletteIndex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closePalette();
    }
  });

  paletteList.addEventListener("click", (e) => {
    const item = e.target.closest(".palette-item");
    if (item) runPaletteItem(Number(item.dataset.index));
  });

  paletteList.addEventListener("mousemove", (e) => {
    const item = e.target.closest(".palette-item");
    if (!item) return;
    const idx = Number(item.dataset.index);
    if (idx !== state.paletteIndex) {
      state.paletteIndex = idx;
      $$(".palette-item", paletteList).forEach((el, i) => {
        el.classList.toggle("is-selected", i === idx);
        el.setAttribute("aria-selected", String(i === idx));
      });
    }
  });

  paletteEl.addEventListener("click", (e) => {
    if (e.target.closest("[data-palette-close]")) closePalette();
  });

  searchBtn.addEventListener("click", openPalette);
  readmeBtn.addEventListener("click", () => openFile("README.md"));

  // ----------------------------------------------------------
  // Global shortcuts
  // ----------------------------------------------------------

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (paletteEl.hidden) openPalette();
      else closePalette();
      return;
    }

    if (e.key === "Escape" && !paletteEl.hidden) {
      e.preventDefault();
      closePalette();
      return;
    }

    const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (!inField && paletteEl.hidden && (e.key === "`" || e.key === "/")) {
      e.preventDefault();
      focusTerminal();
    }
  });

  // ----------------------------------------------------------
  // Status bar clock
  // ----------------------------------------------------------

  function tickClock() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  tickClock();
  window.setInterval(tickClock, 30000);

  // ----------------------------------------------------------
  // Welcome
  // ----------------------------------------------------------

  function welcome() {
    print(`<span class="accent">joey-zyc</span> <span class="dim">·</span> terminal portfolio <span class="warn">v2.0</span>`, "ok");
    print(`旧版还在原地。这里是新版，一个可以敲命令的主页。`, "muted");
    print(
      `输入 <span class="cmd-name">help</span> 查看命令 · <span class="dim">Ctrl + K</span> 打开命令面板 · <span class="dim">\`</span> 聚焦终端`,
      "muted"
    );
    printBlank();
  }

  // ----------------------------------------------------------
  // Boot
  // ----------------------------------------------------------

  const BOOT_LINES = [
    '<span class="b-dim">$</span> boot portfolio --site=joey-zyc',
    '<span class="b-ok">[ ok ]</span> terminal-ui <span class="b-dim">v2.0.0</span>',
    '<span class="b-ok">[ ok ]</span> grid-engine <span class="b-dim">online</span>',
    '<span class="b-ok">[ ok ]</span> content-indexed <span class="b-dim">5 files</span>',
    '<span class="b-ok">[ ok ]</span> theme <span class="b-dim">ready</span>',
    '<span class="b-key">&gt; welcome, visitor</span>',
  ];

  let bootDismissed = false;
  let bootTimer = null;
  let bootTypeTimer = null;

  function startApp() {
    if (state.started) return;
    state.started = true;
    welcome();
    renderBuildLog();
  }

  function finishBoot() {
    if (bootDismissed) return;
    bootDismissed = true;
    window.clearTimeout(bootTimer);
    bootEl.classList.add("is-hidden");
    try {
      sessionStorage.setItem(BOOT_KEY, "1");
    } catch (_) {
      /* private mode */
    }
    startApp();
    window.setTimeout(() => bootEl.remove(), 500);
  }

  function playBoot() {
    if (prefersReducedMotion.matches) {
      bootEl.remove();
      startApp();
      return;
    }

    let i = 0;
    const step = () => {
      if (i >= BOOT_LINES.length) {
        bootEnter.classList.add("is-visible");
        bootTimer = window.setTimeout(finishBoot, 2100);
        return;
      }
      const line = document.createElement("div");
      line.className = "boot-line";
      line.innerHTML = BOOT_LINES[i];
      bootLinesEl.appendChild(line);
      i++;
      bootTypeTimer = window.setTimeout(step, 170);
    };
    step();

    bootEl.addEventListener("pointerdown", finishBoot);
    window.addEventListener("keydown", finishBoot);
  }

  oldSiteLink.href = OLD_SITE;

  let alreadyBooted = false;
  try {
    alreadyBooted = sessionStorage.getItem(BOOT_KEY) === "1";
  } catch (_) {
    alreadyBooted = false;
  }

  renderTabs();
  renderEditor();

  if (alreadyBooted) {
    bootEl.remove();
    startApp();
  } else {
    playBoot();
  }

  // Clean up timers if the page goes away mid-boot.
  window.addEventListener("pagehide", () => {
    window.clearTimeout(bootTimer);
    window.clearTimeout(bootTypeTimer);
  });
})();
