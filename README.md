# iconPanda 🐼

[English](#english) | [中文](#中文)

---

## English

### Overview

**iconPanda** is a modern desktop application for Windows that helps you customize folder icons with ease. Built with Electron, React, and TypeScript, it provides an intuitive interface for managing and applying custom icons to your folders and shortcuts.

### Features

- 🎨 **Icon Library Management** - Browse and manage your custom icon collection
- 📁 **Folder Icon Customization** - Apply custom icons to folders with one click
- 🔗 **Shortcut Icon Support** - Customize shortcut (.lnk) icons
- 🔍 **Smart Matching** - Automatically match folders with similar-named icons
- 👀 **Live Preview** - Preview icons before applying them
- 📊 **Batch Operations** - Apply, match, or restore icons for multiple items at once
- 🌓 **Dark Mode** - Built-in dark/light theme support
- 💾 **Icon Import** - Import new icons into your library

### Tech Stack

- **Electron** - Cross-platform desktop framework
- **React** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives

### Installation

#### Prerequisites
- Node.js (v16 or higher)
- pnpm (recommended) or npm

#### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Package the application
pnpm run dist
```

### Usage

1. **Add Folders/Shortcuts** - Click the "+" button to add folders or shortcuts you want to customize
2. **Browse Icon Library** - View available icons in the center panel
3. **Preview & Apply** - Select an icon to preview, then click "Apply" to set it
4. **Smart Match** - Use "Auto Match" to automatically pair folders with similar-named icons
5. **Batch Operations** - Select multiple items and use batch actions at the bottom

### Project Structure

```
src/
├── ui/
│   ├── App.tsx              # Main application container
│   ├── parts/               # UI components
│   ├── hooks/               # Custom React hooks
│   └── lib/                 # Utility functions
├── electron/
│   ├── main.ts              # Electron main process
│   └── preload.ts           # Preload script
└── components/              # Shared components
```

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

---

## 中文

### 概述

**iconPanda** 是一款现代化的 Windows 桌面应用程序，帮助您轻松自定义文件夹图标。基于 Electron、React 和 TypeScript 构建，提供直观的界面来管理和应用自定义图标到您的文件夹和快捷方式。

### 功能特性

- 🎨 **图标库管理** - 浏览和管理您的自定义图标集合
- 📁 **文件夹图标自定义** - 一键为文件夹应用自定义图标
- 🔗 **快捷方式图标支持** - 自定义快捷方式（.lnk）图标
- 🔍 **智能匹配** - 自动匹配文件夹与相似名称的图标
- 👀 **实时预览** - 应用前预览图标效果
- 📊 **批量操作** - 批量应用、匹配或还原多个项目的图标
- 🌓 **深色模式** - 内置深色/浅色主题支持
- 💾 **图标导入** - 将新图标导入到您的图标库

### 技术栈

- **Electron** - 跨平台桌面应用框架
- **React** - UI 框架
- **TypeScript** - 类型安全开发
- **Vite** - 快速构建工具
- **Tailwind CSS** - 实用优先的样式框架
- **Radix UI** - 无障碍组件基础库

### 安装

#### 前置要求
- Node.js（v16 或更高版本）
- pnpm（推荐）或 npm

#### 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev

# 生产构建
pnpm run build

# 打包应用程序
pnpm run dist
```

### 使用方法

1. **添加文件夹/快捷方式** - 点击"+"按钮添加要自定义的文件夹或快捷方式
2. **浏览图标库** - 在中间面板查看可用图标
3. **预览与应用** - 选择图标进行预览，然后点击"应用"进行设置
4. **智能匹配** - 使用"自动匹配"功能自动配对文件夹与相似名称的图标
5. **批量操作** - 选择多个项目，使用底部的批量操作功能

### 项目结构

```
src/
├── ui/
│   ├── App.tsx              # 主应用容器
│   ├── parts/               # UI 组件
│   ├── hooks/               # 自定义 React Hooks
│   └── lib/                 # 工具函数
├── electron/
│   ├── main.ts              # Electron 主进程
│   └── preload.ts           # 预加载脚本
└── components/              # 共享组件
```

### 开源协议

本项目采用 MIT 协议 - 详见 [LICENSE](LICENSE) 文件。

### 贡献

欢迎贡献！随时提出问题或提交拉取请求。

