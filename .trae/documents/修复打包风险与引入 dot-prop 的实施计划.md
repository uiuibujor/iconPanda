## 目标

* 清除渲染构建 external 配置导致的运行时缺失风险。

* 修正生产环境资源与路径引用，保证打包后窗口图标与页面加载稳定。

* 引入并可用 `dot-prop`，用于后续在渲染进程安全读写深层对象。

## 拟修改项

### 1) 渲染 external 配置

* 文件：`vite.config.ts`

* 操作：从 `build.rollupOptions.external` 移除 `dot-prop`，仅保留 `'electron'`，以避免将 `dot-prop`排除出渲染包导致运行时缺失。

* 同步检查：无需在 `optimizeDeps.exclude` 中排除 `dot-prop`。

### 2) 路径与资源

* 文件：`src/electron/main.js`

* 窗口图标：

  * 开发环境保持 `path.join(__dirname, '../../build/icons/icon.ico')`。

  * 生产环境改为从 `process.resourcesPath` 读取：`path.join(process.resourcesPath, 'icons', 'icon.ico')`，与 `electron-builder` 的 `buildResources` 保持一致；若找不到则回退使用可执行文件图标（不显式设置 `icon`）。

* 生产页面加载：

  * 将 `win.loadFile(path.join(__dirname, '../../dist/index.html'))` 改为 `win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))`，增强健壮性。

* 默认图标库目录：

  * 将 `getIconLibraryPath()` 的默认值从 `d:\codes\图标替换助手\iconlibrary` 改为 `path.join(app.getPath('userData'), 'iconlibrary')`。

  * 同步修改 `reset-icon-library-path` IPC 处理函数，使用同样逻辑。

### 3) 引入 dot-prop

* 文件：`package.json`

* 操作：在 `dependencies` 增加 `"dot-prop": "^7.2.0"`（当前稳定版本，ESM 友好）。

* 使用方式（后续可选）：渲染进程通过 `import {getProperty, setProperty, hasProperty, deleteProperty} from 'dot-prop'` 使用；本次仅引入依赖并移除 external，确保可用。

## 验证步骤

* 开发模式：

  * 运行 `npm run dev`，确认窗口图标、页面加载正常；新增默认图标库会在用户数据目录创建。

* 生产打包：

  * 运行 `npm run build` 后 `npm run dist`。

  * 安装并启动：

    * 窗口图标显示正常（来自 `resources/icons/icon.ico`）。

    * 页面加载正常（`app.getAppPath()/dist/index.html`）。

    * 图标库默认目录可写且存在（用户数据目录）。

* 依赖校验：

  * 在渲染进程临时导入 `dot-prop` 做一次读写 smoke test（可在后续 PR 中补充单元测试），确保打包后不缺失。

## 变更影响范围与兼容性

* 仅影响主进程窗口创建与库目录选址，功能不变；用户数据目录更安全且可移植。

* 渲染构建不再外置 `dot-prop`，不会引入运行时缺失；包体积变化可忽略。

* 平台：应用仍为 Windows 专属，无跨平台行为改变。

## 后续可选优化

* 若希望在生产环境也显示自定义窗口图标而不依赖 exe 图标，建议将 `build/icons/icon.ico` 通过 `extraResources` 显式复制到 `resources/icons/` 并按上述路径读取。

* 为 `getIconLibraryPath()` 引入异常提示与只读目录检测，提升可维护性。

