# MdReader - 专业的 Markdown 阅读与转换工具


**MdReader** 是一款专为 Windows 用户打造的轻量级 Markdown 阅读器与编辑器。它不仅拥有美观的现代化界面，更解决了 Markdown 用户最大的痛点——**将内容完美格式化并粘贴到 Microsoft Word 中**。

基于 **Wails** (Go + WebView2) 框架开发，体积小巧，性能强劲。

---

## ✨ 核心功能 (Features)

### 1. 📄 独家 "复制到 Word" 模式
不再为 Markdown 转 Word 的格式错乱而头疼。
- **一键复制**：点击工具栏按钮，自动将 Markdown 渲染为带有内联样式的富文本。
- **论文级排版**：内置精心调教的 CSS 样式（衬线字体、合理的行高与段间距），粘贴到 Word 中即可直接作为文档或论文草稿使用。

### 2. ⚡ 高性能渐进式渲染
- **秒开长文**：针对数万字的长文档进行了深度优化。
- **平滑加载**：采用分块异步渲染技术，打开大文件瞬间响应，剩余内容在后台静默加载，拒绝界面卡死。
- **防白屏机制**：内置全局错误边界捕获与重试机制，从容应对各种异常代码块。

### 3. 🖥️ Windows 原生深度集成
- **右键菜单**：支持一键添加到 Windows 右键菜单，选中 `.md` 文件即可快速打开。
- **多标签页**：支持同时打开多个文档，标签页之间独立管理状态。
- **状态记忆**：切换标签页时，编辑器滚动位置和光标位置完美保留（采用 Z-Index 堆叠技术）。

### 4. 📝 读写一体
- **沉浸阅读**：基于 GitHub Flavored Markdown 的标准渲染，支持代码高亮。
- **高效编辑**：集成 CodeMirror 编辑器，支持实时编辑与保存。
- **批量打开**：支持通过文件对话框一次性选择并打开多个 Markdown 文件。

---

## 🛠️ 技术栈 (Tech Stack)

*   **后端**: Go (Wails v2 框架) - 负责系统交互、文件读写、注册表操作。
*   **前端**: React + TypeScript + Vite - 负责 UI 交互。
*   **样式**: TailwindCSS - 现代化响应式布局。
*   **编辑器**: @uiw/react-codemirror。
*   **渲染**: react-markdown + rehype-highlight (自动忽略不支持的语言标签)。

---

## 🚀 快速开始 (Development)

如果你想自己在本地构建本项目：

### 前置要求
- Go 1.18+
- Node.js 16+
- Wails CLI (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)

### 构建步骤

1. 克隆仓库
   ```bash
   git clone https://github.com/your-username/MdReader.git
   cd MdReader
   ```

2. 安装依赖
   ```bash
   # 前端依赖会自动安装，但你也可以手动运行
   cd frontend && npm install
   ```

3. 运行开发模式
   ```bash
   wails dev
   ```

4. 打包发布 (Windows)
   ```bash
   wails build -clean
   ```
   构建完成后，可执行文件位于 `build/bin/MdReader.exe`。

---

## 🤝 贡献 (Contributing)

欢迎提交 Issue 或 Pull Request 来改进这个项目！无论是修复 Bug 还是增加新功能，你的贡献都非常重要。

## 📄 许可证 (License)

本项目采用 MIT 许可证。
