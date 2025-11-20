#!/usr/bin/env node
/**
 * ElevatedWorker - 提权辅助工具
 *
 * 用途：当 Electron 主进程检测到需要管理员权限时，
 * 通过 runas 启动此工具，在管理员权限下执行文件夹图标设置操作
 *
 * 命令格式：
 *   elevated-worker.exe set <folderPath> <iconPath>
 *   elevated-worker.exe clear <folderPath>
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// 日志文件路径
const LOG_FILE = path.join(os.tmpdir(), 'ElevatedWorker.log');

// 日志函数
function log(...args) {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${args.join(' ')}\n`;
  console.log(...args);
  try {
    fs.appendFileSync(LOG_FILE, message, 'utf8');
  } catch (err) {
    // 忽略日志写入错误
  }
}

log('=== ElevatedWorker Started ===');
log('Process ID:', process.pid);
log('Working Directory:', process.cwd());
log('Arguments:', process.argv);

// 加载原生模块
let nativeModule = null;
try {
  log('Attempting to load native module...');
  log('__dirname:', __dirname);
  log('process.cwd():', process.cwd());
  log('process.execPath:', process.execPath);
  log('process.resourcesPath:', process.resourcesPath);

  // 尝试从多个可能的位置加载
  const possiblePaths = [
    // 开发模式：从项目根目录
    path.join(process.cwd(), 'native/build/Release/folder_icon_native.node'),
    // pkg 打包后：从 exe 所在目录
    path.join(path.dirname(process.execPath), 'native/build/Release/folder_icon_native.node'),
    // 相对于脚本位置
    path.join(__dirname, 'build/Release/folder_icon_native.node'),
    path.join(__dirname, '../build/Release/folder_icon_native.node'),
  ];

  // 如果 process.resourcesPath 存在（Electron 环境），也加入搜索路径
  if (process.resourcesPath && typeof process.resourcesPath === 'string') {
    possiblePaths.push(path.join(process.resourcesPath, 'native/build/Release/folder_icon_native.node'));
  }

  log('Possible paths:', JSON.stringify(possiblePaths, null, 2));

  for (const modulePath of possiblePaths) {
    log(`Checking: ${modulePath}`);
    if (fs.existsSync(modulePath)) {
      log(`Found! Attempting to require...`);
      nativeModule = require(modulePath);
      log(`SUCCESS: Native module loaded from: ${modulePath}`);
      break;
    } else {
      log(`Not found: ${modulePath}`);
    }
  }

  if (!nativeModule) {
    throw new Error('Native module not found in any expected location');
  }
} catch (err) {
  log('ERROR: Failed to load native module:', err.message);
  log('Stack:', err.stack);
  process.exit(1);
}

/**
 * 设置文件夹图标
 */
function setFolderIcon(folderPath, iconPath) {
  log(`Setting icon for: ${folderPath}`);
  log(`Icon file: ${iconPath}`);

  // 1. 检查路径是否存在
  if (!fs.existsSync(folderPath)) {
    throw new Error(`Folder not found: ${folderPath}`);
  }
  if (!fs.existsSync(iconPath)) {
    throw new Error(`Icon file not found: ${iconPath}`);
  }
  log('Both paths exist, proceeding...');

  // 2. 复制图标文件到目标文件夹
  const timestamp = Date.now();
  const targetIconName = `folder_${timestamp}.ico`;
  const targetIconPath = path.join(folderPath, targetIconName);

  log(`Copying icon to: ${targetIconPath}`);
  try {
    fs.copyFileSync(iconPath, targetIconPath);
    log('Icon file copied successfully');
  } catch (err) {
    log('ERROR: Failed to copy icon file:', err.message);
    throw err;
  }

  // 设置图标文件为隐藏
  try {
    const { execSync } = require('child_process');
    log('Setting icon file as hidden...');
    execSync(`attrib +h "${targetIconPath}"`, { encoding: 'utf8' });
    log('Icon file set as hidden');
  } catch (err) {
    log('WARNING: Failed to set icon file as hidden:', err.message);
  }

  // 3. 调用原生模块设置 desktop.ini
  log(`Calling native setFolderIcon...`);
  try {
    nativeModule.setFolderIcon(folderPath, targetIconPath);
    log('Native setFolderIcon succeeded');
  } catch (err) {
    log('ERROR: Native setFolderIcon failed:', err.message);
    throw err;
  }

  // 4. 刷新图标缓存
  log(`Refreshing icon cache...`);
  try {
    nativeModule.refreshIconCache(folderPath);
    log('Icon cache refreshed');
  } catch (err) {
    log('WARNING: Native refreshIconCache failed:', err.message);
  }

  log(`Icon set successfully for ${folderPath}`);
}

/**
 * 清除文件夹图标
 */
function clearFolderIcon(folderPath) {
  log(`Clearing icon for: ${folderPath}`);

  if (!fs.existsSync(folderPath)) {
    throw new Error(`Folder not found: ${folderPath}`);
  }
  log('Folder exists, proceeding...');

  // 1. 删除文件夹中的图标文件
  try {
    const files = fs.readdirSync(folderPath);
    const iconFiles = files.filter(f => /^folder(_\d+)?\.ico$/i.test(f));
    log(`Found ${iconFiles.length} icon files to delete`);

    for (const iconFile of iconFiles) {
      const fullPath = path.join(folderPath, iconFile);
      log(`Deleting icon file: ${fullPath}`);

      // 先去掉隐藏属性
      try {
        const { execSync } = require('child_process');
        execSync(`attrib -h "${fullPath}"`, { encoding: 'utf8' });
        log('Hidden attribute removed');
      } catch (err) {
        log('WARNING: Failed to remove hidden attribute:', err.message);
      }

      fs.unlinkSync(fullPath);
      log('Icon file deleted');
    }
  } catch (err) {
    log('WARNING: Failed to delete icon files:', err.message);
  }

  // 2. 调用原生模块清除 desktop.ini
  log(`Calling native clearFolderIcon...`);
  try {
    nativeModule.clearFolderIcon(folderPath);
    log('Native clearFolderIcon succeeded');
  } catch (err) {
    log('ERROR: Native clearFolderIcon failed:', err.message);
    throw err;
  }

  // 3. 刷新图标缓存
  log(`Refreshing icon cache...`);
  try {
    nativeModule.refreshIconCache(folderPath);
    log('Icon cache refreshed');
  } catch (err) {
    log('WARNING: Native refreshIconCache failed:', err.message);
  }

  log(`Icon cleared successfully for ${folderPath}`);
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage:');
    console.error('  elevated-worker.exe set <folderPath> <iconPath>');
    console.error('  elevated-worker.exe clear <folderPath>');
    process.exit(1);
  }

  const command = args[0].toLowerCase();
  const folderPath = args[1];

  try {
    switch (command) {
      case 'set':
        if (args.length < 3) {
          throw new Error('Missing iconPath argument for "set" command');
        }
        const iconPath = args[2];
        setFolderIcon(folderPath, iconPath);
        break;

      case 'clear':
        clearFolderIcon(folderPath);
        break;

      default:
        throw new Error(`Unknown command: ${command}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('[ElevatedWorker] Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// 运行
main();

