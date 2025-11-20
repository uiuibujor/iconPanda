# iconPanda 🐼

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-30+-blue.svg)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)

[English](#english) | [中文](#中文)

---

## English

### Overview

**iconPanda** is a modern desktop application for Windows that helps you customize folder icons with ease. Built with Electron, React, and TypeScript, it provides an intuitive interface for managing and applying custom icons to your folders and shortcuts.

### ✨ Key Features

- 🎨 **Icon Library Management** - Browse and manage your custom icon collection with pagination
- 📁 **Folder Icon Customization** - Apply custom icons to folders with one click
- 🔗 **Shortcut Icon Support** - Customize shortcut (.lnk) icons
- 🔍 **Smart Matching** - Automatically match folders with similar-named icons using advanced algorithms
- 👀 **Live Preview** - Preview icons and folders with thumbnails before applying
- 📊 **Batch Operations** - Apply, match, or restore icons for multiple items at once
- 🌓 **Dark Mode** - Built-in dark/light theme support with system detection
- 💾 **Icon Import** - Import new icons into your library with drag-and-drop support
- 🔐 **Smart Elevation** - Automatically detect and request admin privileges only when needed
- 🌍 **Unicode Support** - Perfect support for Chinese and international file paths
- ⚡ **High Performance** - Native C++ module for direct Windows API calls

### 🛠 Tech Stack

- **Electron** - Cross-platform desktop framework
- **React** - Modern UI framework with hooks
- **TypeScript** - Type-safe development experience
- **Vite** - Lightning-fast build tool and dev server
- **Tailwind CSS** - Utility-first styling framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icon set
- **Native C++ Module** - Direct Windows API integration

### 🚀 Installation

#### Prerequisites
- **Node.js** (v16 or higher)
- **pnpm** (recommended) or npm
- **Visual Studio Build Tools** (for native module compilation)
- **Python 3.x** (required by node-gyp)

#### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/iconpanda.git
cd iconpanda

# Install dependencies
pnpm install

# Build native modules
pnpm run rebuild

# Start development server
pnpm run dev
```

#### Build & Package

```bash
# Build for production
pnpm run build

# Build elevated worker for admin privileges
pnpm run build:elevated

# Package the application
pnpm run dist
```

### 📖 Usage Guide

1. **Add Folders/Shortcuts** - Click the "+" button to add folders or shortcuts you want to customize
2. **Browse Icon Library** - View available icons in the center panel with pagination
3. **Preview & Apply** - Select an icon to preview, then click "Apply" to set it
4. **Smart Match** - Use "Auto Match" to automatically pair folders with similar-named icons
5. **Batch Operations** - Select multiple items and use batch actions at the bottom
6. **Import Icons** - Drag and drop .ico files or use the import button

### 🏗 Project Structure

```
iconpanda/
├── src/
│   ├── ui/
│   │   ├── App.tsx              # Main application container
│   │   ├── parts/               # UI components
│   │   │   ├── Topbar.tsx       # Top navigation bar
│   │   │   ├── TargetsSidebar.tsx # Left sidebar for folders/shortcuts
│   │   │   ├── LibraryToolbar.tsx # Icon library toolbar
│   │   │   ├── IconLibraryGrid.tsx # Icon grid with pagination
│   │   │   ├── PreviewPanel.tsx # Right preview panel
│   │   │   ├── BatchActionsBar.tsx # Bottom batch actions
│   │   │   └── BatchPreviewModal.tsx # Batch preview modal
│   │   ├── hooks/               # Custom React hooks
│   │   │   ├── useIconLibrary.ts # Icon library management
│   │   │   ├── usePreviews.ts    # Preview generation
│   │   │   ├── useTheme.ts       # Theme management
│   │   │   └── useWindowControls.ts # Window controls
│   │   └── lib/                 # Utility functions
│   │       └── matching.ts      # Icon matching algorithms
│   ├── electron/
│   │   ├── main.ts              # Electron main process
│   │   ├── preload.ts           # Preload script
│   │   └── elevationService.ts  # Smart elevation service
│   └── components/              # Shared components
├── native/
│   ├── folder_icon.cc           # C++ native module
│   ├── elevated-worker.js       # Elevated worker script
│   └── bin/                     # Compiled executables
├── docs/                        # Documentation
├── iconlibrary/                 # Default icon collection
└── build/                      # Build assets and icons
```

### 🔧 Advanced Features

#### Smart Elevation
The app automatically detects when admin privileges are needed and requests them only when necessary:
- No UAC prompt on startup
- Automatic detection for system directories (Program Files, Windows, etc.)
- User-friendly elevation dialogs
- Batch operation support with selective elevation

#### Native Module Integration
- Direct Windows API calls via C++ native module
- Perfect Unicode/Chinese path support
- High-performance folder icon operations
- Fallback to PowerShell when native module unavailable

#### Icon Matching Algorithm
- Advanced string similarity scoring
- Token-based name matching
- Levenshtein distance calculation
- Intelligent recommendations based on folder names

### 🐛 Troubleshooting

#### Common Issues

**Native module compilation fails:**
```bash
# Rebuild native modules
pnpm run rebuild

# Ensure Visual Studio Build Tools are installed
# Check Python is in PATH
```

**Elevated worker not found:**
```bash
# Build the elevated worker
pnpm run build:elevated
```

**Chinese path issues:**
- The native C++ module handles Unicode paths correctly
- Ensure native module is compiled: `native/build/Release/folder_icon_native.node`

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

#### Development Guidelines
- Use TypeScript for type safety
- Follow the existing component structure
- Test with both English and Chinese file paths
- Ensure native module compatibility before submitting PRs

### � Acknowledgments

This project stands on the shoulders of giants. We'd like to express our sincere gratitude to:

- **[ChangeFolderIcon](https://github.com/YILING0013/ChangeFolderIcon)** by @YILING0013
  Provided invaluable technical inspiration for Windows API integration and smart elevation mechanisms. The approach to handling UAC and system directory permissions was heavily influenced by this excellent project.

- **[Folder11](https://github.com/icon11-community/Folder11)** by icon11-community
  Contributed a comprehensive icon library that serves as the foundation for our default icon collection. Their high-quality icon designs and organization have been instrumental in making iconPanda visually appealing.

These open-source projects demonstrate the power of community collaboration and have significantly accelerated the development of iconPanda.

### �📞 Support

- 📧 Create an [Issue](https://github.com/your-username/iconpanda/issues) for bug reports
- 💡 Check the [docs](docs/) folder for detailed guides
- 🔧 See [BUILD_NATIVE.md](BUILD_NATIVE.md) for native module setup

---

## 中文

### 概述

**iconPanda** 是一款现代化的 Windows 桌面应用程序，帮助您轻松自定义文件夹图标。基于 Electron、React 和 TypeScript 构建，提供直观的界面来管理和应用自定义图标到您的文件夹和快捷方式。

### ✨ 核心功能

- 🎨 **图标库管理** - 浏览和管理您的自定义图标集合，支持分页显示
- 📁 **文件夹图标自定义** - 一键为文件夹应用自定义图标
- 🔗 **快捷方式图标支持** - 自定义快捷方式（.lnk）图标
- 🔍 **智能匹配** - 使用高级算法自动匹配文件夹与相似名称的图标
- 👀 **实时预览** - 应用前预览图标和文件夹缩略图效果
- 📊 **批量操作** - 批量应用、匹配或还原多个项目的图标
- 🌓 **深色模式** - 内置深色/浅色主题支持，自动检测系统主题
- 💾 **图标导入** - 支持拖拽导入新图标到您的图标库
- 🔐 **智能提权** - 自动检测并仅在需要时请求管理员权限
- 🌍 **完美中文支持** - 完美支持中文和国际文件路径
- ⚡ **高性能** - 原生 C++ 模块直接调用 Windows API

### 🛠 技术栈

- **Electron** - 跨平台桌面应用框架
- **React** - 现代 UI 框架，支持 Hooks
- **TypeScript** - 类型安全开发体验
- **Vite** - 极速构建工具和开发服务器
- **Tailwind CSS** - 实用优先的样式框架
- **Radix UI** - 无障碍组件基础库
- **Lucide React** - 精美图标库
- **原生 C++ 模块** - 直接集成 Windows API

### 🚀 安装指南

#### 前置要求
- **Node.js**（v16 或更高版本）
- **pnpm**（推荐）或 npm
- **Visual Studio Build Tools**（用于编译原生模块）
- **Python 3.x**（node-gyp 依赖）

#### 快速开始

```bash
# 克隆仓库
git clone https://github.com/your-username/iconpanda.git
cd iconpanda

# 安装依赖
pnpm install

# 构建原生模块
pnpm run rebuild

# 启动开发服务器
pnpm run dev
```

#### 构建与打包

```bash
# 生产构建
pnpm run build

# 构建提权工具（管理员权限支持）
pnpm run build:elevated

# 打包应用程序
pnpm run dist
```

### 📖 使用指南

1. **添加文件夹/快捷方式** - 点击"+"按钮添加要自定义的文件夹或快捷方式
2. **浏览图标库** - 在中间面板查看可用图标，支持分页浏览
3. **预览与应用** - 选择图标进行预览，然后点击"应用"进行设置
4. **智能匹配** - 使用"自动匹配"功能自动配对文件夹与相似名称的图标
5. **批量操作** - 选择多个项目，使用底部的批量操作功能
6. **导入图标** - 拖拽 .ico 文件或使用导入按钮添加新图标

### 🏗 项目结构

```
iconpanda/
├── src/
│   ├── ui/
│   │   ├── App.tsx              # 主应用容器
│   │   ├── parts/               # UI 组件
│   │   │   ├── Topbar.tsx       # 顶部导航栏
│   │   │   ├── TargetsSidebar.tsx # 左侧文件夹/快捷方式栏
│   │   │   ├── LibraryToolbar.tsx # 图标库工具栏
│   │   │   ├── IconLibraryGrid.tsx # 图标网格与分页
│   │   │   ├── PreviewPanel.tsx # 右侧预览面板
│   │   │   ├── BatchActionsBar.tsx # 底部批量操作
│   │   │   └── BatchPreviewModal.tsx # 批量预览弹窗
│   │   ├── hooks/               # 自定义 React Hooks
│   │   │   ├── useIconLibrary.ts # 图标库管理
│   │   │   ├── usePreviews.ts    # 预览生成
│   │   │   ├── useTheme.ts       # 主题管理
│   │   │   └── useWindowControls.ts # 窗口控制
│   │   └── lib/                 # 工具函数
│   │       └── matching.ts      # 图标匹配算法
│   ├── electron/
│   │   ├── main.ts              # Electron 主进程
│   │   ├── preload.ts           # 预加载脚本
│   │   └── elevationService.ts  # 智能提权服务
│   └── components/              # 共享组件
├── native/
│   ├── folder_icon.cc           # C++ 原生模块
│   ├── elevated-worker.js       # 提权工作脚本
│   └── bin/                     # 编译后的可执行文件
├── docs/                        # 文档
├── iconlibrary/                 # 默认图标集合
└── build/                      # 构建资源和图标
```

### 🔧 高级特性

#### 智能提权
应用自动检测何时需要管理员权限，并仅在必要时请求：
- 启动时不弹出 UAC 提示
- 自动检测系统目录（Program Files、Windows 等）
- 用户友好的提权对话框
- 支持批量操作的选择性提权

#### 原生模块集成
- 通过 C++ 原生模块直接调用 Windows API
- 完美的 Unicode/中文路径支持
- 高性能文件夹图标操作
- 原生模块不可用时回退到 PowerShell

#### 图标匹配算法
- 高级字符串相似度评分
- 基于令牌的名称匹配
- Levenshtein 距离计算
- 基于文件夹名称的智能推荐

### 🐛 故障排除

#### 常见问题

**原生模块编译失败：**
```bash
# 重新构建原生模块
pnpm run rebuild

# 确保已安装 Visual Studio Build Tools
# 检查 Python 是否在 PATH 中
```

**提权工具未找到：**
```bash
# 构建提权工具
pnpm run build:elevated
```

**中文路径问题：**
- 原生 C++ 模块正确处理 Unicode 路径
- 确保原生模块已编译：`native/build/Release/folder_icon_native.node`

### 📄 开源协议

本项目采用 MIT 协议 - 详见 [LICENSE](LICENSE) 文件。

### 🤝 贡献

欢迎贡献！随时提出问题或提交拉取请求。

#### 开发指南
- 使用 TypeScript 确保类型安全
- 遵循现有组件结构
- 测试英文和中文文件路径
- 提交 PR 前确保原生模块兼容性

### � 致谢

本项目站在巨人的肩膀上。我们想诚挚地感谢：

- **[ChangeFolderIcon](https://github.com/YILING0013/ChangeFolderIcon)** by @YILING0013
  为 Windows API 集成和智能提权机制提供了宝贵的技术灵感。在处理 UAC 和系统目录权限方面的方法深受这个优秀项目的影响。

- **[Folder11](https://github.com/icon11-community/Folder11)** by icon11-community
  贡献了全面的图标库，作为我们默认图标集合的基础。他们高质量的图标设计和组织对于让 iconPanda 具有视觉吸引力起到了重要作用。

这些开源项目展示了社区协作的力量，并显著加速了 iconPanda 的开发进程。

### �📞 技术支持

- 📧 创建 [Issue](https://github.com/your-username/iconpanda/issues) 报告错误
- 💡 查看 [docs](docs/) 文件夹获取详细指南
- 🔧 参见 [BUILD_NATIVE.md](BUILD_NATIVE.md) 了解原生模块设置

