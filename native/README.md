# 原生模块 - 文件夹图标设置

这个原生 C++ 模块直接调用 Windows Shell API 来设置文件夹图标，完美支持中文路径。

## 为什么需要原生模块？

之前的实现使用 PowerShell 脚本调用 Windows API，存在以下问题：
- **中文路径编码问题**：Node.js (UTF-8) → PowerShell 脚本 → C# API (UTF-16) 的多层转换导致中文字符损坏
- **字符串插值问题**：中文字符在 PowerShell 模板字符串中可能被错误解析
- **性能开销**：每次都要创建临时脚本文件并启动 PowerShell 进程

原生模块直接使用 C++ 调用 Windows API，避免了所有中间层，完美支持 Unicode。

## 构建要求

### Windows 环境
- **Visual Studio 2019 或更高版本**（需要 C++ 构建工具）
- **Python 3.x**（node-gyp 依赖）
- **Node.js 16+**

### 安装 Visual Studio 构建工具

如果没有完整的 Visual Studio，可以只安装构建工具：

```bash
# 下载并安装 Visual Studio Build Tools
# https://visualstudio.microsoft.com/downloads/
# 选择 "使用 C++ 的桌面开发" 工作负载
```

或使用 Chocolatey：
```bash
choco install visualstudio2019buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools"
```

## 构建步骤

### 1. 安装依赖
```bash
# 在项目根目录
pnpm install
```

### 2. 构建原生模块
```bash
# 方法 1：使用 npm script
npm run rebuild

# 方法 2：手动构建
cd native
node-gyp rebuild
```

### 3. 验证构建
构建成功后，应该在以下位置看到编译好的模块：
- `native/build/Release/folder_icon_native.node` (Release 版本)
- 或 `native/build/Debug/folder_icon_native.node` (Debug 版本)

## 使用方法

```javascript
const nativeModule = require('./native/index.js');

// 设置文件夹图标
await nativeModule.setFolderIcon('D:\\测试文件夹', 'D:\\icon.ico');

// 清除文件夹图标
await nativeModule.clearFolderIcon('D:\\测试文件夹');

// 检查模块是否可用
if (nativeModule.isNativeModuleAvailable()) {
  console.log('原生模块已加载');
}
```

## 故障排除

### 错误：`Native module not loaded`
**原因**：原生模块未编译或编译失败

**解决方案**：
```bash
npm run rebuild
```

### 错误：`MSBuild.exe not found`
**原因**：未安装 Visual Studio 构建工具

**解决方案**：安装 Visual Studio 2019+ 或 Build Tools

### 错误：`Python not found`
**原因**：node-gyp 需要 Python

**解决方案**：
```bash
# 安装 Python 3.x
# 或配置 node-gyp 使用特定 Python 版本
npm config set python /path/to/python
```

## 技术细节

### API 调用
模块直接调用 `SHGetSetFolderCustomSettings` Windows Shell API：
- 使用 `CharSet.Unicode` 确保正确处理中文路径
- 直接传递 UTF-16 字符串给 Windows API
- 无需任何编码转换或字符串转义

### 优势
✅ **完美支持中文路径**：直接使用 Unicode API  
✅ **性能更好**：无需启动外部进程  
✅ **更可靠**：减少了失败点  
✅ **代码更简洁**：无需复杂的 PowerShell 脚本

## 打包说明

在使用 electron-builder 打包时，需要确保原生模块被包含：

```json
{
  "build": {
    "files": [
      "native/build/Release/*.node",
      "native/index.js",
      "native/package.json"
    ]
  }
}
```

原生模块会自动针对当前平台编译，无需额外配置。

