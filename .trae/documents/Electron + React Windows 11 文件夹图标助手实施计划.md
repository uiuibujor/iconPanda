## 项目目标
- 为 Windows（重点 Win11）提供便捷的文件夹图标更换工具，支持单个/批量、拖拽、右键菜单、图标库与撤销。
- 稳定、安全、对系统友好：遵循 Explorer 自定义图标机制，避免破坏系统设置与权限。

## 关键原理与系统约束
- 文件夹自定义图标依赖 `desktop.ini` 与文件夹属性（需标记为系统/只读），核心节为 `[.ShellClassInfo]`，字段 `IconFile`+`IconIndex` 或 `IconResource`。[官方文档: Microsoft Learn “Customize Folders with Desktop.ini”](https://learn.microsoft.com/en-us/windows/win32/shell/how-to-customize-folders-with-desktop-ini)
- Explorer 仅在文件夹有 `+S`（系统）或 `+R`（只读）时查找 `desktop.ini`；常见实践为 `attrib +s` 并将 `desktop.ini` 标记为隐藏/系统。[参考: SuperUser: Folder icon, desktop.ini and file attributes]
- 图标缓存刷新：必要时调用 `ie4uinit.exe -ClearIconCache` 或 `SHChangeNotify` 触发刷新，尽量避免重启 Explorer。

## 技术选型
- 框架：Electron 28+、React 18+、TypeScript、打包使用 `electron-builder`。
- UI：Ant Design 或 Fluent UI；支持深色模式与高 DPI。
- 数据存储：`electron-store` 做轻量配置与元数据；图标库文件存磁盘（`app.getPath('userData')/icons`）。如需更复杂查询，后续可切换到 SQLite（`better-sqlite3`）。
- 图像处理与 ICO：`sharp` 或 `jimp` 做 PNG/JPG 处理；ICO 生成使用 `png-to-ico` 或质量更优的 `png2icons`。
- EXE/DLL 图标提取：
  - 方案 A：Electron `nativeImage.createFromPath(exe)`（易用，尺寸选择有限）。
  - 方案 B：Node 调用 .NET 辅助程序提取关联图标（如 npm `icon-extractor`，包装 C# `Icon.ExtractAssociatedIcon`），或使用专用 `exe-icon-extractor`。[参考: npm icon-extractor]
  - 优先 A，若尺寸/稳定性不足再启用 B。
- 右键菜单（Win11）：
  - MVP：注册目录类的传统右键 verb（`HKCU\Software\Classes\Directory\shell\...` 及 `Directory\Background\shell\...`），显示于“显示更多选项”。
  - 现代菜单：C++ 实现 `IExplorerCommand` 并通过 MSIX/Sparse 包注册，进入 Win11 顶层菜单。[参考: Windows Developer Blog “Extending the Context Menu in Windows 11”]
- 权限与安全：敏感路径写入失败时提示提升权限；所有路径与编码均做健壮处理；不写入环境变量/密钥。

## 模块划分
- 主进程（Electron Main）：
  - FolderIconService：读写 `desktop.ini`，设置文件夹属性（`+s`/`+r`）、隐藏系统属性；触发图标缓存刷新。
  - IconConvertService：PNG/JPG → 多尺寸 PNG → ICO；Emoji 渲染到画布后生成 ICO。
  - IconExtractService：从 `.exe/.dll` 解析图标，返回多尺寸。
  - LibraryService：图标库存取、标签、最近使用、备份/导出。
  - ContextBridge（preload）：暴露安全 API，开启 contextIsolation。
- 渲染层（React）：
  - 主页：拖拽区域（接受文件夹/图标）；最近使用；快速应用。
  - 图标源面板：本地 `.ico`、图片转 ICO、EXE/DLL 提取、Emoji 生成。
  - 应用面板：单个/批量（递归）应用；预览与目标选择；冲突与权限提示。
  - 图标库：收藏、标签管理、搜索、导出/备份；历史记录与撤销。

## 功能设计与实现要点
- 图标来源
  - 本地 `.ico`：解析并显示多尺寸；可加入库。
  - EXE/DLL：提取主图标与其他索引；允许选择尺寸；失败回退到默认图标。
  - PNG/JPG 自动转 ICO：生成 16/32/48/64/128/256 等尺寸；保持透明；文件过大时裁剪或等比缩放。
  - Emoji → ICO：使用 `Segoe UI Emoji` 在画布绘制指定符号与背景（可选圆角/底色），输出多尺寸 PNG，再打包 ICO。
- 应用方式
  - 单个文件夹：写入/更新 `desktop.ini`；优先使用 `IconFile`+`IconIndex=0`；尽可能用相对路径（提升移动兼容）。将文件夹设为系统/只读；`desktop.ini` 设为隐藏/系统；必要时刷新缓存。[官方字段参考: Microsoft Learn]
  - 批量修改：快速扫描树（可选择包含/排除规则）；支持“仅叶子”“全部层级”；出错时收集报告与局部回滚。
  - 拖拽支持：拖 folder 触发目标选择；拖 `.ico`/图片/EXE/DLL 触发源选择与预览。
  - 右键菜单集成：
    - MVP：注册传统右键 verb，传递选中路径给应用（命令行参数）。
    - 现代：C++ Shell 扩展（`IExplorerCommand`）+ Sparse 包；与主应用通过 IPC 通讯。[官方博客参考]
- 图标管理
  - 个人图标库：按文件夹存储；元数据（标签、来源、创建时间、使用次数）。
  - 分类标签：预置“工作/游戏/项目”等；支持自定义与多标签。
  - 最近使用历史：记录应用目标与时间；一键重用。
  - 备份与导出：
    - 应用前备份目标文件夹原 `desktop.ini`（若存在）。
    - 提供整库导出（打包 ICO 与元数据 JSON）。
  - 撤销操作：删除/还原 `desktop.ini` 的 `IconFile/IconResource` 字段或恢复备份；必要时刷新缓存。

## 可靠性与体验
- 权限与失败处理：对受保护路径显示“以管理员运行”提示；批量时收集失败项并支持重试。
- 路径策略：优先相对路径（保证可移动盘符）；图标库引用绝对路径时提示用户导出到目标磁盘。
- 性能：批量操作异步并发（受限并发）+ 进度与取消；避免频繁刷新图标缓存，集中刷新一次。
- 国际化与本地化：中文为主，后续可加英文。

## 测试与验证
- 单元测试：`desktop.ini` 读写、属性设置模拟、图片→ICO 转换、Emoji 生成。
- 集成测试：在测试目录树上应用/撤销；验证图标显示与缓存刷新效果。
- 手动验证：Win11 下不同 DPI、Dark/Light；网络盘与可移动盘相对路径兼容。

## 交付里程碑
- M1（基础）：项目骨架、图标来源（ICO/PNG/JPG/EXE）、单个应用、拖拽、库与历史。
- M2（增强）：批量应用、撤销与备份、Emoji→ICO、缓存刷新。
- M3（集成）：传统右键菜单注册、相对路径策略完善、权限提升流程。
- M4（Win11 现代菜单）：C++ `IExplorerCommand` 扩展 + Sparse 包注册、与主应用通信。

## 后续拓展
- 模板主题（统一风格的 Emoji/配色预设）。
- 云同步（图标库与标签）。
- 命令行模式（批处理脚本对接）。

如果以上计划符合预期，我将按里程碑从 M1 开始实施，并在实现过程中补充必要的验证与优化。