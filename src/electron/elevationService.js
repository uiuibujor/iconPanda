/**
 * ElevationService - 权限管理服务
 *
 * 负责检测是否需要管理员权限，并在需要时启动提权进程
 */

import { existsSync, writeFileSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

// 加载原生模块
const require = createRequire(import.meta.url)
const nativeModule = require(join(dirname(fileURLToPath(import.meta.url)), '../../native/index.js'))

/**
 * 系统保护目录列表
 */
const PROTECTED_PATHS = [
  'C:\\Program Files',
  'C:\\Program Files (x86)',
  'C:\\Windows',
  'C:\\ProgramData'
]

/**
 * 检查路径是否在系统保护目录下
 */
function isProtectedPath(folderPath) {
  const normalized = folderPath.toUpperCase()
  return PROTECTED_PATHS.some(protectedPath => 
    normalized.startsWith(protectedPath.toUpperCase())
  )
}

/**
 * 通过尝试写入测试文件来检测是否有写权限
 */
function canWriteToFolder(folderPath) {
  const testFile = join(folderPath, `__test_${Date.now()}.tmp`)
  
  try {
    writeFileSync(testFile, 'test', 'utf8')
    unlinkSync(testFile)
    return true
  } catch (err) {
    // EPERM, EACCES 等权限错误
    if (err.code === 'EPERM' || err.code === 'EACCES') {
      return false
    }
    // 其他错误（如路径不存在）也认为需要提权
    return false
  }
}

/**
 * 判断是否需要管理员权限
 * 
 * @param {string} folderPath - 目标文件夹路径
 * @returns {boolean} 是否需要提权
 */
export function needsElevation(folderPath) {
  // 1. 先检查是否是系统保护目录
  if (isProtectedPath(folderPath)) {
    console.log(`[ElevationService] Path is protected: ${folderPath}`)
    return true
  }

  // 2. 尝试写入测试
  const canWrite = canWriteToFolder(folderPath)
  if (!canWrite) {
    console.log(`[ElevationService] Cannot write to folder: ${folderPath}`)
    return true
  }

  return false
}

/**
 * 获取 ElevatedWorker.exe 的路径
 */
function getElevatedWorkerPath() {
  // 开发模式：从 native/bin 目录
  const devPath = join(process.cwd(), 'native/bin/ElevatedWorker.exe')
  if (existsSync(devPath)) {
    return devPath
  }

  // 打包模式：从 resources 目录
  const prodPath = join(process.resourcesPath, 'native/bin/ElevatedWorker.exe')
  if (existsSync(prodPath)) {
    return prodPath
  }

  throw new Error('ElevatedWorker.exe not found')
}

/**
 * 以管理员权限运行 ElevatedWorker
 *
 * @param {string} command - 命令 ('set' 或 'clear')
 * @param {string} folderPath - 文件夹路径
 * @param {string} [iconPath] - 图标路径（仅 set 命令需要）
 * @returns {Promise<boolean>} 是否成功
 */
export function runElevated(command, folderPath, iconPath = null) {
  return new Promise((resolve) => {
    try {
      const workerPath = getElevatedWorkerPath()

      // 构建参数字符串，用引号包裹每个参数以处理空格
      const args = iconPath
        ? `"${command}" "${folderPath}" "${iconPath}"`
        : `"${command}" "${folderPath}"`

      console.log(`[ElevationService] Starting elevated process:`, {
        workerPath,
        arguments: args
      })

      // 使用原生模块的 runElevated 函数，直接调用 Windows ShellExecuteW API
      const result = nativeModule.runElevated(workerPath, args)

      console.log(`[ElevationService] Native runElevated result:`, result)

      if (result.success) {
        console.log(`[ElevationService] Elevated operation succeeded`)
        resolve(true)
      } else {
        console.error(`[ElevationService] Elevated operation failed with error code ${result.errorCode}`)
        // 错误码 1223 表示用户取消了 UAC
        if (result.errorCode === 1223) {
          console.log(`[ElevationService] User cancelled UAC prompt`)
        }
        resolve(false)
      }

    } catch (err) {
      console.error(`[ElevationService] Error in runElevated:`, err)
      resolve(false)
    }
  })
}

