# 智能提权功能使用指南

## 功能概述

本应用实现了类似 ChangeFolderIcon 的"智能提权"机制：

- **主程序以普通权限运行**，不会在启动时弹出 UAC
- **自动检测目标路径是否需要管理员权限**
- **仅在必要时弹出系统 UAC 请求**，让用户选择是否授权
- **通过独立的提权进程执行需要管理员权限的操作**

---

## 架构设计

```
Electron 主进程（普通权限）
    ↓
检测目标路径（路径前缀 + 写入测试）
    ↓
需要提权 → 询问用户 → 启动 ElevatedWorker.exe (runas) → UAC 弹出 → 执行操作
不需要   → 直接在主进程执行
```

### 核心组件

1. **`native/elevated-worker.js`**  
   提权辅助工具的 Node.js 脚本，负责在管理员权限下执行文件夹图标设置/清除操作

2. **`native/bin/ElevatedWorker.exe`**  
   由 `elevated-worker.js` 打包而成的独立可执行文件

3. **`src/electron/elevationService.js`**  
   权限管理服务，提供：
   - `needsElevation(folderPath)`: 检测是否需要提权
   - `runElevated(command, folderPath, iconPath)`: 启动提权进程

4. **`src/electron/main.js`**  
   主进程集成，在 `apply-icon`、`apply-icon-batch`、`restore-icon-batch` 中调用提权服务

---

## 使用流程

### 开发阶段

#### 1. 安装依赖

首先安装 `pkg` 工具（用于将 Node.js 脚本打包成 .exe）：

```powershell
npm install -g pkg
```

#### 2. 构建提权工具

```powershell
npm run build:elevated
```

这会在 `native/bin/` 目录下生成 `ElevatedWorker.exe`。

#### 3. 运行开发服务器

```powershell
npm run dev
```

#### 4. 测试提权功能

在应用中尝试修改以下路径的文件夹图标：

- `C:\Program Files\<某个文件夹>`
- `C:\Windows\<某个文件夹>`（不推荐，仅用于测试）

应用会：
1. 检测到需要管理员权限
2. 弹出对话框询问用户
3. 用户点击"确定"后，系统弹出 UAC 提示
4. 用户在 UAC 中点击"是"后，操作成功执行

---

### 打包发布

#### 1. 配置 electron-builder

在 `package.json` 的 `build` 配置中添加：

```json
{
  "build": {
    "files": [
      "dist/**",
      "src/electron/**",
      "native/bin/ElevatedWorker.exe",
      "native/build/Release/folder_icon_native.node",
      "!src/electron/*.ts"
    ],
    "extraResources": [
      {
        "from": "native/bin/ElevatedWorker.exe",
        "to": "native/bin/ElevatedWorker.exe"
      },
      {
        "from": "native/build/Release/folder_icon_native.node",
        "to": "native/build/Release/folder_icon_native.node"
      }
    ]
  }
}
```

#### 2. 构建并打包

```powershell
npm run build:elevated
npm run build
npm run dist
```

---

## 权限检测逻辑

### 1. 路径前缀检测

检查目标路径是否以以下前缀开头：

- `C:\Program Files`
- `C:\Program Files (x86)`
- `C:\Windows`
- `C:\ProgramData`

### 2. 写入测试

如果不是明显的系统保护目录，尝试在目标文件夹中创建并删除一个临时文件：

- 成功 → 当前权限足够
- 失败（`EPERM`/`EACCES`）→ 需要提权

---

## 用户体验

### 单个文件夹操作

当用户尝试修改 `C:\Program Files\Docker` 的图标时：

1. 应用弹出对话框：
   ```
   需要管理员权限
   
   此文件夹位于系统保护目录中
   目标路径：C:\Program Files\Docker
   
   修改此文件夹需要管理员权限。点击"确定"将弹出系统权限请求。
   
   [确定]  [取消]
   ```

2. 用户点击"确定"后，系统弹出 UAC：
   ```
   用户账户控制
   
   你要允许此应用对你的设备进行更改吗？
   
   ElevatedWorker.exe
   已验证的发布者：未知
   
   [是]  [否]
   ```

3. 用户点击"是"后，操作成功执行

### 批量操作

当批量操作中包含多个需要提权的文件夹时：

1. 应用弹出对话框：
   ```
   需要管理员权限
   
   批量操作中有 3 个文件夹需要管理员权限
   
   这些文件夹位于系统保护目录中（如 Program Files）。
   
   点击"确定"将为这些文件夹弹出系统权限请求。
   
   [确定]  [跳过这些文件夹]  [取消全部操作]
   ```

2. 用户可以选择：
   - **确定**：为每个需要提权的文件夹弹出 UAC
   - **跳过这些文件夹**：只处理不需要提权的文件夹
   - **取消全部操作**：取消整个批量操作

---

## 故障排查

### 问题：提权工具未找到

**错误信息：**
```
ElevatedWorker.exe not found
```

**解决方案：**
1. 确认已运行 `npm run build:elevated`
2. 检查 `native/bin/ElevatedWorker.exe` 是否存在
3. 如果是打包版本，检查 `resources/native/bin/ElevatedWorker.exe` 是否存在

### 问题：原生模块加载失败

**错误信息：**
```
[ElevatedWorker] Failed to load native module
```

**解决方案：**
1. 确认已运行 `npm run rebuild`
2. 检查 `native/build/Release/folder_icon_native.node` 是否存在
3. 确保打包时包含了原生模块文件

### 问题：用户拒绝 UAC 后没有提示

这是正常行为。当用户在 UAC 对话框中点击"否"时，`runElevated` 会返回 `false`，应用会显示"操作失败"的提示。

---

## 与 ChangeFolderIcon 的对比

| 特性 | ChangeFolderIcon (C#) | 本应用 (Electron + Node.js) |
|------|----------------------|----------------------------|
| 主程序权限 | 普通权限 | 普通权限 |
| 提权工具 | ElevatedWorker.exe (C#) | ElevatedWorker.exe (Node.js) |
| 权限检测 | 路径前缀 + 写入测试 | 路径前缀 + 写入测试 |
| UAC 触发方式 | `Process.Start` + `Verb="runas"` | PowerShell `Start-Process -Verb RunAs` |
| 原生 API 调用 | P/Invoke (C#) | N-API (C++) |

---

## 总结

通过这套智能提权机制，应用可以：

✅ 在普通权限下运行，不会在启动时弹 UAC  
✅ 自动检测是否需要管理员权限  
✅ 仅在必要时请求权限，提升用户体验  
✅ 支持单个和批量操作的提权  
✅ 提供清晰的用户提示和错误处理  

这与 ChangeFolderIcon 的设计理念完全一致，确保了安全性和易用性的平衡。

