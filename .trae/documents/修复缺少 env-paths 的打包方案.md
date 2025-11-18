## 问题
- conf 在主进程运行时需要其依赖 env-paths；当前打包配置仅包含部分 node_modules（conf、dot-prop），导致其二级依赖 env-paths 未被打包，出现 ERR_MODULE_NOT_FOUND。

## 方案
- 调整 electron-builder 的 build.files：包含完整的 production node_modules，而非按单个包白名单。
- 具体改动：
  - package.json → build.files：移除对 `node_modules/conf/**`、`node_modules/dot-prop/**` 的单独包含，改为 `node_modules/**`（让打包器自动裁剪 devDependencies）。
  - 保留 `dist/**` 与 `src/electron/**`，以及针对未使用的 TS/JS 的排除项。

## 验证
- 重新打包：执行 `pnpm run dist`。
- 启动安装包验证主进程不再报 `env-paths` 缺失。

## 影响
- 更稳健地包含主进程依赖链，避免逐包白名单遗漏；包体积可能小幅变化，但仍由 electron-builder 进行生产依赖裁剪。