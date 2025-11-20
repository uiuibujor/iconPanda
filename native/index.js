// Native module wrapper for folder icon operations
const path = require('path');
const fs = require('fs');

let nativeModule = null;

try {
  // 尝试加载编译好的原生模块
  nativeModule = require('./build/Release/folder_icon_native.node');
} catch (err) {
  console.warn('Native module not found, trying Debug build...');
  try {
    nativeModule = require('./build/Debug/folder_icon_native.node');
  } catch (err2) {
    console.error('Failed to load native module:', err2.message);
    console.error('Please run: npm run rebuild');
  }
}

/**
 * 设置文件夹图标（支持中文路径）
 * @param {string} folderPath - 文件夹路径
 * @param {string} iconPath - 图标文件路径
 * @returns {Promise<boolean>}
 */
async function setFolderIcon(folderPath, iconPath) {
  if (!nativeModule) {
    throw new Error('Native module not loaded. Please run: npm run rebuild');
  }

  if (!fs.existsSync(folderPath)) {
    throw new Error(`Folder does not exist: ${folderPath}`);
  }

  if (!fs.existsSync(iconPath)) {
    throw new Error(`Icon file does not exist: ${iconPath}`);
  }

  // 确保路径是绝对路径
  const absFolder = path.resolve(folderPath);
  const absIcon = path.resolve(iconPath);

  return new Promise((resolve, reject) => {
    try {
      const result = nativeModule.setFolderIcon(absFolder, absIcon);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 清除文件夹图标
 * @param {string} folderPath - 文件夹路径
 * @returns {Promise<boolean>}
 */
async function clearFolderIcon(folderPath) {
  if (!nativeModule) {
    throw new Error('Native module not loaded. Please run: npm run rebuild');
  }

  if (!fs.existsSync(folderPath)) {
    throw new Error(`Folder does not exist: ${folderPath}`);
  }

  const absFolder = path.resolve(folderPath);

  return new Promise((resolve, reject) => {
    try {
      const result = nativeModule.clearFolderIcon(absFolder);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 刷新图标缓存（可选指定单个文件夹路径）
 * 直接调用 C++ 原生模块，使用 Windows Shell API
 * @param {string|null} [folderPath]
 * @returns {boolean}
 */
function refreshIconCache(folderPath = null) {
  if (!nativeModule) {
    throw new Error('Native module not loaded. Please run: npm run rebuild');
  }

  if (typeof folderPath === 'string' && folderPath.trim().length > 0) {
    const absFolder = path.resolve(folderPath);
    return nativeModule.refreshIconCache(absFolder);
  }

  return nativeModule.refreshIconCache();
}

/**
 * 检查原生模块是否可用
 * @returns {boolean}
 */
function isNativeModuleAvailable() {
  return nativeModule !== null;
}

/**
 * 以管理员权限运行程序
 * @param {string} exePath - 可执行文件路径
 * @param {string} arguments - 命令行参数
 * @returns {{ success: boolean, errorCode: number }}
 */
function runElevated(exePath, arguments) {
  if (!nativeModule) {
    throw new Error('Native module not loaded. Please run: npm run rebuild');
  }

  return nativeModule.runElevated(exePath, arguments);
}

module.exports = {
  setFolderIcon,
  clearFolderIcon,
  refreshIconCache,
  isNativeModuleAvailable,
  runElevated
};

