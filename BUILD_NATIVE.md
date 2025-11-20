# 构建原生模块指南

## 快速开始

### 1. 安装依赖
```bash
pnpm install
```

### 2. 构建原生模块
```bash
npm run rebuild
```

### 3. 运行应用
```bash
npm run dev
```

## 详细说明

原生模块位于 `native/` 目录，使用 C++ 直接调用 Windows API，完美支持中文路径。

详细文档请查看：[native/README.md](native/README.md)

## 验证构建

构建成功后，检查以下文件是否存在：
- `native/build/Release/folder_icon_native.node`

## 常见问题

**Q: 构建失败，提示找不到 MSBuild.exe**  
A: 需要安装 Visual Studio 2019+ 或 Visual Studio Build Tools

**Q: 提示 Python not found**  
A: 安装 Python 3.x 并添加到 PATH

**Q: 中文文件夹名仍然报错**  
A: 确保原生模块已成功编译，检查控制台是否有 "Native module not available" 警告

