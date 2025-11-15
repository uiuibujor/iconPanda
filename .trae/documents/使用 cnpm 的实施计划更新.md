## 变更要求
- 全程使用 `cnpm` 进行依赖安装与更新，并配置国内镜像以提升 Electron 相关二进制的下载速度。

## 安装与环境
- 全局安装：`npm i -g cnpm --registry=https://registry.npmmirror.com`
- 项目级 `.npmrc`（创建/追加）：
  - `registry=https://registry.npmmirror.com`
  - `electron_mirror=https://npmmirror.com/mirrors/electron/`
  - `ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder/`
- 运行脚本：使用 `cnpm run <script>`（`cnpm`支持与 `npm` 相同的子命令）。

## 依赖管理流程
- 初始化与安装：
  - `cnpm init -y`
  - `cnpm install --save react react-dom`
  - `cnpm install --save-dev electron electron-builder typescript @types/node vite @vitejs/plugin-react`
  - 图像与 ICO：`cnpm install --save png2icons sharp`（或 `png-to-ico jimp` 作为备选）
  - 配置存储：`cnpm install --save electron-store`
  - EXE/DLL 图标提取（按需）：`cnpm install --save icon-extractor` 或 `exe-icon-extractor`
- 构建与打包：
  - 构建：`cnpm run build`
  - 打包：`cnpm run dist`（electron-builder 运行时下载二进制走镜像）

## Electron 下载加速
- 环境变量（可在构建脚本或 CI 中设置）：
  - `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`
  - `ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder/`
- 如需 Squirrel.Windows：设置 `SQUIRREL_WIN_MIRROR`（后续视打包目标决定）。

## 对原计划的影响
- 技术选型、模块划分与功能不变；仅替换包管理与二进制镜像来源。
- 右键菜单集成仍按原定路线（传统注册 → 现代 `IExplorerCommand`）。
- CI/CD 与脚本示例统一切换为 `cnpm`。

## 执行方式
- 后续所有依赖安装、更新与脚本调用均示范为 `cnpm` 版本。
- 若第三方工具内部调用 `npm`（如 electron-builder 某些流程），通过镜像配置保证不受影响。

确认后我将按该要求推进实现，并在每个里程碑中采用 `cnpm` 完成依赖安装与构建。