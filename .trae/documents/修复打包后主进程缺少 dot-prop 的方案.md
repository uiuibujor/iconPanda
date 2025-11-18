## 问题分析
- 错误来源于主进程依赖链：`electron-store` → `conf` → `dot-prop`，打包后的 `app.asar/node_modules/conf` 在运行时动态 `import 'dot-prop'` 失败。
- 渲染层 external 已移除，但主进程不经 Vite 打包，必须在安装/打包阶段确保 `dot-prop` 作为生产依赖出现在 `app.asar/node_modules` 中。
- 本地安装曾失败（npm i 报错），需保证依赖安装与构建流程稳定。

## 修复步骤
1) 依赖保障
- 保持 `package.json` 中 `dependencies` 包含 `"dot-prop": "^7.2.0"`（已添加）。
- 使用干净安装：删除 `node_modules` 与锁文件（若存在），执行 `npm ci` 或在镜像异常时切换至官方源或使用 `cnpm` 完成安装。

2) 打包包含策略
- 更新 `electron-builder` 配置，显式包含主进程所需模块，避免被误排除：
  - 在 `build.files` 增加 `node_modules/conf/**` 与 `node_modules/dot-prop/**`。
  - 同时保留 `dist/**` 与 `src/electron/**`，排除未使用的 TS/JS 备份文件以减小体积。

3) 重新打包并验证
- 运行渲染构建与安装包打包，安装后启动，确认：
  - 不再出现 `ERR_MODULE_NOT_FOUND: dot-prop`。
  - `electron-store` 正常读写配置，主窗口与页面加载正常。

## 备用方案（如仍异常）
- 固定 `electron-store` 到不依赖 `dot-prop` 的版本（不推荐，优先保证依赖安装齐全）。
- 在 `asarUnpack` 加入相关模块（通常不需要，`dot-prop` 为纯 JS）。

## 变更范围
- 仅调整打包文件包含项与安装流程，不修改业务逻辑。