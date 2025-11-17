# 图标替换助手｜项目结构说明（面向 AI）

## 概览
- 技术栈：Electron + Vite + React + TypeScript
- UI：Radix UI 组件封装、`lucide-react` 图标、Tailwind 基础样式（见 `src/index.css`）
- 运行脚本：
  - 开发：`cnpm run dev`（Vite + Electron 并行）
  - 构建：`cnpm run build`（仅前端构建，生产包由 Electron 启动时加载）
  - 启动：`cnpm start`
  - 打包：`cnpm run dist`
- 主进程入口：`electron/main.js`

## 目录结构
- `src/ui/App.tsx`：页面容器，编排状态与 UI 组件
- `src/ui/parts/`：拆分后的可复用 UI 组件
  - `Topbar.tsx`：顶部栏
  - `TargetsSidebar.tsx`：左侧待处理侧栏
  - `LibraryToolbar.tsx`：图标库工具栏
  - `IconLibraryGrid.tsx`：图标库网格与分页
  - `PreviewPanel.tsx`：右侧实时预览与相似推荐
  - `BatchActionsBar.tsx`：底部批量操作栏
  - `BatchPreviewModal.tsx`：批量预览弹窗
- `src/ui/hooks/`：副作用与数据编排的 Hooks
  - `useIconLibrary.ts`：图标库数据与缩略图加载
  - `usePreviews.ts`：图标与文件夹预览、文件夹缩略图
  - `useTheme.ts`：主题切换与持久化
  - `useWindowControls.ts`：窗口最小化/最大化/关闭
- `src/ui/lib/`：纯函数库
  - `matching.ts`：名称相似度评分与最佳匹配

## 核心数据流
- `window.api`（渲染进程暴露的主进程 API）定义于 `src/ui/App.tsx:20-47`
  - 选择/导入：`pickFolder/pickShortcut/pickIcon/pickIcons/importIcon`
  - 应用/还原：`applyIcon/restoreIcon/applyShortcutIcon/restoreShortcutIcon`
  - 预览：`getIconPreview/getFolderPreview`
  - 图标库：`listIcons/openIconLibraryFolder/resetIconLibraryPath`
  - 窗口：`windowMinimize/windowToggleMaximize/windowIsMaximized/windowClose`

- 页面容器状态（示例关键项）
  - 目标集：`folders`（待处理项），`selectedFolderItem`（当前选中）
  - 图标库：`libraryIcons`、`thumbs`、分页 `libraryPage/pageItems/pageCount`
  - 预览：`iconPreview`（图标）、`folderPreview`（文件夹）、`folderThumbs`（文件夹缩略图）
  - 批量：`batchCandidates/batchPreviewOpen/batchPreviewMode`（预览弹窗驱动）
  - 显示筛选：`searchQuery`、`typeFilter`、`recommendFilterActive`

## Hooks 职责
- `useIconLibrary.ts:1-57`
  - 管理 `libraryIcons`、`libraryLoading`、`thumbs`
  - `loadLibrary()` 拉取图标库；内部自动计算缩略图
  - `pickIcon(onImported?)` 导入单/多图标，结束后回调设定最新图标路径

- `usePreviews.ts:1-44`
  - 监听 `icon` 更新 `iconPreview`
  - 监听 `folder` 更新 `folderPreview`
  - 监听 `folders` 批量计算 `folderThumbs`
  - 暴露 `setFolderPreview/setFolderThumbs` 以便应用/还原后刷新

- `useTheme.ts:1-24`
  - `isDark/toggleDark`，持久化到 `localStorage('theme')` 并同步到 `documentElement.classList`

- `useWindowControls.ts:1-17`
  - `isMaximized` 初始化与同步
  - 提供 `minimize/toggleMaximize/close` 窗口控制

## 纯函数库
- `matching.ts:1-51`
  - `normalize/tokenize/levenshtein/scoreIcon/matchBestIcon`
  - 用于推荐与“一键匹配”评分选择（不涉及副作用）

## 组件编排（页面骨架）
- 顶部栏：`TopBar` 调用位置 `src/ui/App.tsx:528-538`
  - 传入：`searchQuery/onSearchChange`、`isDark/onToggleDark`、窗口控制 `isMaximized/onMinimize/onToggleMaximize/onClose`

- 左侧：`TargetsSidebar` 调用位置 `src/ui/App.tsx:541-561`
  - 传入：列表 `viewItems`、筛选 `typeFilter`、多选 `selectedFolderPaths`、操作回调（选择/勾选/全选/删除/添加）
  - 展示：类型徽章 `typeEmoji/typeLabel/typeIcon/typeBadgeClass`、文件夹缩略图 `folderThumbs`

- 中间：`LibraryToolbar` + `IconLibraryGrid` 调用位置 `src/ui/App.tsx:563-588`
  - 工具栏：导入/打开库/刷新/清除筛选（均为回调，逻辑在容器）
  - 网格：`pageItems/thumbs/icon/isApplied` 与分页控制；“应用/还原”按钮经父级回调处理副作用

- 右侧：`PreviewPanel` 调用位置 `src/ui/App.tsx:591-604`
  - 展示当前预览；提供“应用图标/还原/一键匹配/相似推荐”入口，均通过父级回调执行业务逻辑

- 底部：`BatchActionsBar` 调用位置 `src/ui/App.tsx:607-614`
  - 展示选中统计；提供批量操作四项，均由父级生成候选后交由弹窗确认

- 弹窗：`BatchPreviewModal` 调用位置 `src/ui/App.tsx:616-626`
  - `candidates/mode` 驱动展示；`onConfirm` 内执行实际应用或还原，并批量刷新状态

## 推荐与筛选
- 推荐集合计算：`src/ui/App.tsx:331-348`
  - 基于 `scoreIcon` 对库项打分并排序，剔除当前选中图标后取 Top-N
- 推荐库与搜索：
  - `baseLib = recommendationsLib | libraryIcons`（受 `recommendFilterActive` 影响）
  - 文本搜索过滤 `filteredLib`；分页切片得到 `pageItems`

## 批量逻辑
- 回调位置：`src/ui/App.tsx:460-524`
  - `handleBatchApply/Match/Restore/Delete` 生成候选并打开弹窗
  - 弹窗确认 `onConfirm` 执行副作用后批量刷新 `folders/folderThumbs/appliedIcons` 等

## 约定与扩展建议
- 组件尽量“无副作用”，副作用集中在 Hooks；业务逻辑在容器中统一编排
- 复用类型建议集中到 `src/ui/types.ts`（当前类型就地声明，可视需要抽取）
- 扩展功能的最佳切入点：
  - 图标匹配算法 → `src/ui/lib/matching.ts`
  - 图标库数据流与分页 →（可进一步抽到独立 Hook，如 `useLibraryPagination`）
  - 批量操作与候选生成 →（可进一步抽到 `useBatchActions`）

## 脚本与运行
- `package.json:8-12`
  - `dev` 同时启动 Vite 与 Electron 并自动等待端口
  - `build` 仅前端构建；生产中 Electron 直接加载打包资源
  - `start` 以当前目录启动 Electron 主进程
  - `dist` 使用 `electron-builder` 打包应用