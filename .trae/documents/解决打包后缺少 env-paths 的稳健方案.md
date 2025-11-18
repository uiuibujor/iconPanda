## 问题
- 使用 pnpm 安装后，依赖呈现为符号链接与 .pnpm 存储结构。electron-builder 打包到 asar 时若未进行扁平化或遗漏二级依赖，主进程解析 `conf` 的 `env-paths` 失败。

## 方案
1) 扁平化 node_modules
- 在 `.npmrc` 增加 `shamefully-hoist=true`，让 pnpm 将依赖扁平化到 `node_modules` 根，避免 asar 内的符号链接解析问题。
- 重新安装依赖并构建打包。

2) 显式保障依赖存在
- 在 `package.json` 的 `dependencies` 增加 `env-paths`（与 `dot-prop` 类似），确保生产依赖链完整。
- （可保持 `build.files` 已包含 `node_modules/**`）

## 验证
- 重新执行安装（pnpm）、构建与打包，安装后启动，确认不再出现 `ERR_MODULE_NOT_FOUND: env-paths`。

## 影响
- 打包更稳健，避免遗漏二级依赖。包体积变化有限，功能不受影响。