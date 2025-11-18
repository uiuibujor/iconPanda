// iconExtractor.js - 修复版
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync, execFile } from 'node:child_process'

/**
 * 展开 Windows 环境变量
 */
function expandEnvVars(str) {
  if (!str) return str;
  return str.replace(/%([^%]+)%/g, (_m, varName) => {
    const value = process.env[varName];
    if (value) return value;
    
    // 常见系统变量的回退
    const fallbacks = {
      'SystemRoot': 'C:\\Windows',
      'ProgramFiles': 'C:\\Program Files',
      'ProgramFiles(x86)': 'C:\\Program Files (x86)',
      'windir': 'C:\\Windows'
    };
    
    return fallbacks[varName] || `%${varName}%`;
  });
}

/**
 * 解析 IconLocation 字符串
 * 支持格式: "path,index" 或 "path" 或 '"path",index'
 */
function parseIconLocation(raw) {
  if (!raw || raw.trim() === '') return { path: '', index: 0 };
  
  const trimmed = raw.trim();
  
  // 检测无效格式：只有逗号和数字（如 ",0" 或 ",-1"）
  if (/^,?-?\d*$/.test(trimmed)) {
    console.warn('[parseIconLocation] 检测到无效格式:', trimmed);
    return { path: '', index: 0 };
  }
  
  // 尝试匹配带引号和索引的格式: "C:\\path\\file.exe",0
  let match = trimmed.match(/^"([^"]+)"\s*,\s*(-?\d+)$/);
  if (match) {
    return { 
      path: match[1].trim(), 
      index: parseInt(match[2], 10) 
    };
  }
  
  // 尝试匹配不带引号但有索引的格式: C:\\path\\file.exe,0
  match = trimmed.match(/^([^,]+)\s*,\s*(-?\d+)$/);
  if (match) {
    const parsedPath = match[1].trim();
    // 再次检查路径是否为空
    if (!parsedPath || parsedPath === '') {
      return { path: '', index: 0 };
    }
    return { 
      path: parsedPath, 
      index: parseInt(match[2], 10) 
    };
  }
  
  // 只有路径，没有索引：处理带引号的情况
  match = trimmed.match(/^"([^"]+)"$/);
  if (match) {
    return { 
      path: match[1].trim(), 
      index: 0 
    };
  }
  
  // 只有路径，没有索引：不带引号
  // 确保不是纯数字或空字符串
  if (trimmed && !/^-?\d+$/.test(trimmed)) {
    return { 
      path: trimmed, 
      index: 0 
    };
  }
  
  return { path: '', index: 0 };
}

/**
 * 读取 .lnk 快捷方式的图标信息（路径与索引）
 */
export async function readShortcutInfo(lnkPath) {
  let tmpDir = null;
  let scriptPath = null;
  
  try {
    // 验证输入
    if (!lnkPath || !fs.existsSync(lnkPath)) {
      console.warn(`[readShortcutInfo] 文件不存在: ${lnkPath}`);
      return { iconPath: '', iconIndex: 0, fromTarget: false };
    }
    try {
      const mod = await import('win-lnk-parser').catch(() => null)
      if (mod) {
        const lnkParser = mod.default || mod
        let meta = null
        try { meta = await lnkParser(lnkPath, 936) } catch {}
        if (!meta) { try { meta = await lnkParser(lnkPath) } catch {} }
        if (meta) {
          const rawStr = (meta.iconLocation && String(meta.iconLocation).trim()) ? String(meta.iconLocation) : (meta.targetPath ? String(meta.targetPath) : '')
          if (rawStr) {
            const parsed = parseIconLocation(rawStr)
            const expanded = expandEnvVars(parsed.path)
            const res = { iconPath: expanded, iconIndex: parsed.index, fromTarget: !(meta.iconLocation && String(meta.iconLocation).trim()) }
            console.log('[readShortcutInfo] 成功读取:', res)
            return res
          }
        }
      }
    } catch {}
    try {
      const wsp = await import('windows-shortcuts-ps').catch(() => null)
      if (wsp) {
        let rawStr = ''
        try {
          if (typeof wsp.getPath === 'function') {
            const t = await wsp.getPath(lnkPath).catch(() => null)
            if (typeof t === 'string' && t.trim()) rawStr = t
          }
        } catch {}
        if (!rawStr) {
          try {
            if (typeof wsp.query === 'function') {
              const q = await wsp.query(lnkPath).catch(() => null)
              if (q) {
                rawStr = (q.icon && String(q.icon).trim()) ? String(q.icon) : (q.iconLocation && String(q.iconLocation).trim()) ? String(q.iconLocation) : (q.target || q.targetPath || '')
              }
            }
          } catch {}
        }
        if (rawStr) {
          const parsed = parseIconLocation(rawStr)
          const expanded = expandEnvVars(parsed.path)
          const res = { iconPath: expanded, iconIndex: parsed.index, fromTarget: !((typeof wsp.query === 'function') && rawStr && rawStr !== (await (async () => { try { const q = await wsp.query(lnkPath).catch(() => null); return q ? (q.icon || q.iconLocation || '') : '' } catch { return '' } })())) }
          console.log('[readShortcutInfo] 成功读取:', res)
          return res
        }
      }
    } catch {}
    
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-helper-'));
    scriptPath = path.join(tmpDir, 'read.js');
    
    // 修复：WSH JScript 需要紧凑的 try-catch 语法
    const content = `try{var sh=WScript.CreateObject('WScript.Shell');var p=WScript.Arguments.Item(0);var s=sh.CreateShortcut(p);var loc=s.IconLocation||'';var t=s.TargetPath||'';loc=loc.replace(/^\\s+|\\s+$/g,'');var isValidLoc=false;if(loc&&loc.length>0){var cleaned=loc.replace(/^["']|["']$/g,'');if(cleaned&&cleaned!==''&&!cleaned.match(/^,?-?\\d*$/)){isValidLoc=true;}}if(isValidLoc){WScript.Echo('LOC|'+loc);}else if(t){WScript.Echo('TARGET|'+t);}else{WScript.Echo('EMPTY|');}}catch(e){WScript.Echo('ERROR|'+e.message);}`;
    
    fs.writeFileSync(scriptPath, content, { encoding: 'utf8' });
    
    const out = await new Promise((resolve, reject) => {
      execFile(
        'cscript', 
        ['//nologo', scriptPath, lnkPath], 
        { 
          windowsHide: true, 
          encoding: 'utf8',
          timeout: 10000 // 10秒超时
        }, 
        (err, stdout, stderr) => {
          if (err) {
            console.error('[readShortcutInfo] cscript 错误:', err.message);
            if (stderr) console.error('[readShortcutInfo] stderr:', stderr);
            reject(err);
          } else {
            resolve(typeof stdout === 'string' ? stdout.trim() : String(stdout).trim());
          }
        }
      );
    });
    
    // 如果输出存在乱码（常见于中文路径），使用 PowerShell 进行 UTF-8 回退解析
    if (!out || /[�]/.test(out)) {
      const psReadPath = path.join(tmpDir, 'read-utf8.ps1');
      const psContent = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'
$lnk = $args[0]
$shell = New-Object -ComObject WScript.Shell
$s = $shell.CreateShortcut($lnk)
$loc = if ($s.IconLocation) { $s.IconLocation.Trim() } else { '' }
$t = if ($s.TargetPath) { $s.TargetPath.Trim() } else { '' }
$isValid = $false
if ($loc -and ($loc -replace '^[\"\'']|[\"\'']$','') -and -not ($loc -match '^,?-?\d*$')) { $isValid = $true }
if ($isValid) { [Console]::Write('LOC|' + $loc) }
elseif ($t) { [Console]::Write('TARGET|' + $t) }
else { [Console]::Write('EMPTY|') }`;
      try { fs.writeFileSync(psReadPath, psContent, { encoding: 'utf8' }) } catch {}
      try {
        out = await new Promise((resolve) => {
          execFile('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psReadPath, lnkPath], { windowsHide: true, encoding: 'utf8' }, (_err, stdout) => {
            resolve(typeof stdout === 'string' ? stdout.trim() : String(stdout).trim())
          })
        })
      } catch {}
      try { fs.unlinkSync(psReadPath) } catch {}
    }
    // 解析输出
    const match = out.match(/^(LOC|TARGET|EMPTY|ERROR)\|(.*)$/);
    if (!match) {
      console.warn('[readShortcutInfo] 无法解析输出:', out);
      return { iconPath: '', iconIndex: 0, fromTarget: false };
    }
    
    const [, type, raw] = match;
    
    if (type === 'ERROR') {
      console.error('[readShortcutInfo] WSH 脚本错误:', raw);
      return { iconPath: '', iconIndex: 0, fromTarget: false };
    }
    
    if (type === 'EMPTY') {
      console.warn('[readShortcutInfo] 快捷方式无图标信息');
      return { iconPath: '', iconIndex: 0, fromTarget: false };
    }
    
    const fromTarget = type === 'TARGET';
    const { path: iconPath, index: iconIndex } = parseIconLocation(raw);
    
    // ⭐ 新增：验证解析结果的有效性
    if (!iconPath || iconPath.trim() === '' || iconPath === ',0') {
      console.warn('[readShortcutInfo] IconLocation 解析结果无效:', raw);
      
      // 如果从 IconLocation 解析失败，尝试使用 TargetPath
      if (!fromTarget) {
        console.log('[readShortcutInfo] 尝试使用 TargetPath 作为回退...');
        // 这里我们需要重新读取 TargetPath
        // 但由于当前逻辑限制，先返回空值，让调用方处理
      }
      
      return { iconPath: '', iconIndex: 0, fromTarget: false };
    }
    
    // 展开环境变量
    const expandedPath = expandEnvVars(iconPath);
    
    // ⭐ 再次验证展开后的路径
    if (!expandedPath || expandedPath.trim() === '' || expandedPath === ',0') {
      console.warn('[readShortcutInfo] 展开环境变量后路径仍无效:', expandedPath);
      return { iconPath: '', iconIndex: 0, fromTarget: false };
    }
    
    console.log('[readShortcutInfo] 成功读取:', { 
      iconPath: expandedPath, 
      iconIndex, 
      fromTarget 
    });
    
    return { 
      iconPath: expandedPath, 
      iconIndex, 
      fromTarget 
    };
    
  } catch (err) {
    console.error('[readShortcutInfo] 异常:', err);
    return { iconPath: '', iconIndex: 0, fromTarget: false };
  } finally {
    // 清理临时文件
    try { 
      if (scriptPath && fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
      }
    } catch (e) {
      console.warn('[readShortcutInfo] 清理脚本文件失败:', e.message);
    }
    
    try { 
      if (tmpDir && fs.existsSync(tmpDir)) {
        fs.rmdirSync(tmpDir);
      }
    } catch (e) {
      console.warn('[readShortcutInfo] 清理临时目录失败:', e.message);
    }
  }
}

/**
 * 从 .exe/.dll 文件按索引提取图标并转为 PNG DataURL（优先 256x256）
 */
export async function extractFileIconDataUrl(filePath, iconIndex) {
  let tmpDir = null;
  let scriptPath = null;
  
  try {
    console.log('[Extractor] extractFileIconDataUrl start', { filePath, iconIndex })
    // 验证输入
    if (!filePath || !fs.existsSync(filePath)) {
      console.warn(`[extractFileIconDataUrl] 文件不存在: ${filePath}`);
      return '';
    }
    
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-helper-'));
    scriptPath = path.join(tmpDir, 'extract-icon.ps1');
    
    // 修改 PowerShell 脚本：禁止所有非数据输出
    const ps = `$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"\nusing System;\nusing System.Runtime.InteropServices;\nusing System.Drawing;\npublic class IconExtractor {\n  [DllImport("Shell32.dll", CharSet=CharSet.Auto)]\n  public static extern uint ExtractIconEx(string lpszFile, int nIconIndex, IntPtr[] phiconLarge, IntPtr[] phiconSmall, uint nIcons);\n  [DllImport("User32.dll", CharSet=CharSet.Auto)]\n  public static extern uint PrivateExtractIcons(string lpszFile, int nIconIndex, int cxIcon, int cyIcon, IntPtr[] phicon, uint[] piconid, uint nIcons, uint flags);\n  [DllImport("User32.dll", CharSet=CharSet.Auto)]\n  public static extern bool DestroyIcon(IntPtr hIcon);\n  public static IntPtr ExtractSizeHandle(string file, int index, int w, int h) {\n    IntPtr[] arr = new IntPtr[1];\n    uint[] ids = new uint[1];\n    uint got = PrivateExtractIcons(file, index, w, h, arr, ids, 1, 0);\n    if (got == 0) return IntPtr.Zero;\n    return arr[0];\n  }\n}\n"@ -ReferencedAssemblies System.Drawing -WarningAction SilentlyContinue -ErrorAction SilentlyContinue | Out-Null

$path = $args[0]
$index = [int]$args[1]
$result = ''

try {
  $h = [IconExtractor]::ExtractSizeHandle($path, $index, 256, 256)
  if ($h -eq [IntPtr]::Zero -and $index -lt 0) { 
    $h = [IconExtractor]::ExtractSizeHandle($path, -$index, 256, 256) 
  }
  
  if ($h -ne [IntPtr]::Zero) { 
    $ms = New-Object System.IO.MemoryStream
    $bmp = [System.Drawing.Bitmap]::FromHicon($h)
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $result = [Convert]::ToBase64String($ms.ToArray())
    [IconExtractor]::DestroyIcon($h) | Out-Null
    $ms.Dispose()
    $bmp.Dispose()
  } else { 
    # 回退：使用 ExtractAssociatedIcon
    try { 
      $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($path)
      if ($icon -ne $null) { 
        $bmp = $icon.ToBitmap()
        $resized = New-Object System.Drawing.Bitmap 256,256
        $g = [System.Drawing.Graphics]::FromImage($resized)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($bmp, 0, 0, 256, 256)
        $g.Dispose()
        $ms = New-Object System.IO.MemoryStream
        $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $result = [Convert]::ToBase64String($ms.ToArray())
        $ms.Dispose()
        $resized.Dispose()
        $bmp.Dispose()
      } 
    } catch { }
  }
} catch { }

# 只输出 base64，不输出任何其他内容
if ($result) {
  Write-Output $result
}`;
    
    fs.writeFileSync(scriptPath, ps, { encoding: 'utf8' });
    
    const b64 = await new Promise((resolve, reject) => {
      execFile(
        'powershell', 
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, filePath, String(iconIndex)], 
        { 
          windowsHide: true, 
          encoding: 'utf8',
          timeout: 15000, // 15秒超时
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        }, 
        (err, stdout, stderr) => {
          if (err) {
            console.error('[extractFileIconDataUrl] PowerShell 错误:', err.message);
            if (stderr) console.error('[extractFileIconDataUrl] stderr:', stderr);
            resolve(''); // 静默失败
          } else {
            const output = typeof stdout === 'string' ? stdout.trim() : String(stdout).trim();
            
            // 验证 base64 格式（只包含 A-Z, a-z, 0-9, +, /, =）
            if (output && /^[A-Za-z0-9+/=]+$/.test(output)) {
              console.log(`[extractFileIconDataUrl] 成功提取 (长度: ${output.length})`);
              resolve(output);
            } else {
              console.warn(`[extractFileIconDataUrl] 输出格式异常:`, output.substring(0, 100));
              resolve('');
            }
          }
        }
      );
    });
    
    if (!b64) {
      console.warn(`[extractFileIconDataUrl] 未提取到图标数据: ${filePath} (索引 ${iconIndex})`);
      return '';
    }
    
    // 返回完整的 DataURL
    const dataUrl = `data:image/png;base64,${b64}`;
    console.log(`[extractFileIconDataUrl] DataURL 前缀:`, dataUrl.substring(0, 50));
    
    return dataUrl;
    
  } catch (err) {
    console.error('[extractFileIconDataUrl] 异常:', err);
    return '';
  } finally {
    console.log('[Extractor] extractFileIconDataUrl cleanup')
    // 清理临时文件
    try { 
      if (scriptPath && fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
      }
    } catch (e) {
      console.warn('[extractFileIconDataUrl] 清理脚本文件失败:', e.message);
    }
    
    try { 
      if (tmpDir && fs.existsSync(tmpDir)) {
        fs.rmdirSync(tmpDir);
      }
    } catch (e) {
      console.warn('[extractFileIconDataUrl] 清理临时目录失败:', e.message);
    }
  }
}

export async function extractFileIconDataUrls(filePath, iconIndex = 0) {
  let tmpDir = null;
  let scriptPath = null;
  try {
    console.log('[Extractor] extractFileIconDataUrls start', { filePath, iconIndex })
    if (!filePath || !fs.existsSync(filePath)) {
      return [];
    }
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-helper-'));
    scriptPath = path.join(tmpDir, 'extract-icons.ps1');
    const ps = `$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"\nusing System;\nusing System.Runtime.InteropServices;\nusing System.Drawing;\npublic class IconExtractor {\n  [DllImport("Shell32.dll", CharSet=CharSet.Auto)]\n  public static extern uint ExtractIconEx(string lpszFile, int nIconIndex, IntPtr[] phiconLarge, IntPtr[] phiconSmall, uint nIcons);\n  [DllImport("User32.dll", CharSet=CharSet.Auto)]\n  public static extern uint PrivateExtractIcons(string lpszFile, int nIconIndex, int cxIcon, int cyIcon, IntPtr[] phicon, uint[] piconid, uint nIcons, uint flags);\n  [DllImport("User32.dll", CharSet=CharSet.Auto)]\n  public static extern bool DestroyIcon(IntPtr hIcon);\n  public static IntPtr ExtractSizeHandle(string file, int index, int w, int h) {\n    IntPtr[] arr = new IntPtr[1];\n    uint[] ids = new uint[1];\n    uint got = PrivateExtractIcons(file, index, w, h, arr, ids, 1, 0);\n    if (got == 0) return IntPtr.Zero;\n    return arr[0];\n  }\n}\n"@ -ReferencedAssemblies System.Drawing -WarningAction SilentlyContinue -ErrorAction SilentlyContinue | Out-Null

function GetSizeBase64($path, $index, $w, $h) {
  $result = ''
  try {
    $hIcon = [IconExtractor]::ExtractSizeHandle($path, $index, $w, $h)
    if ($hIcon -eq [IntPtr]::Zero -and $index -lt 0) { $hIcon = [IconExtractor]::ExtractSizeHandle($path, -$index, $w, $h) }
    if ($hIcon -ne [IntPtr]::Zero) {
      $ms = New-Object System.IO.MemoryStream
      $bmp = [System.Drawing.Bitmap]::FromHicon($hIcon)
      $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
      $result = [Convert]::ToBase64String($ms.ToArray())
      [IconExtractor]::DestroyIcon($hIcon) | Out-Null
      $ms.Dispose()
      $bmp.Dispose()
    } else {
      try {
        $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($path)
        if ($icon -ne $null) {
          $bmp = $icon.ToBitmap()
          $resized = New-Object System.Drawing.Bitmap $w,$h
          $g = [System.Drawing.Graphics]::FromImage($resized)
          $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $g.DrawImage($bmp, 0, 0, $w, $h)
          $g.Dispose()
          $ms = New-Object System.IO.MemoryStream
          $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
          $result = [Convert]::ToBase64String($ms.ToArray())
          $ms.Dispose()
          $resized.Dispose()
          $bmp.Dispose()
        }
      } catch { }
    }
  } catch { }
  return $result
}

$path = $args[0]
$index = [int]$args[1]
$b16 = GetSizeBase64 $path $index 16 16
$b32 = GetSizeBase64 $path $index 32 32
$b48 = GetSizeBase64 $path $index 48 48
$b256 = GetSizeBase64 $path $index 256 256
if ($b16) { Write-Output "16:$b16" }
if ($b32) { Write-Output "32:$b32" }
if ($b48) { Write-Output "48:$b48" }
if ($b256) { Write-Output "256:$b256" }`
    fs.writeFileSync(scriptPath, ps, { encoding: 'utf8' });
    const stdout = await new Promise((resolve) => {
      execFile(
        'powershell',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, filePath, String(iconIndex)],
        { windowsHide: true, encoding: 'utf8', timeout: 15000, maxBuffer: 10 * 1024 * 1024 },
        (err, out, stderr) => { 
          if (err) console.error('[extractFileIconDataUrls] PowerShell 错误:', err.message)
          if (stderr) console.error('[extractFileIconDataUrls] stderr:', stderr)
          resolve(typeof out === 'string' ? out : String(out)) 
        }
      );
    });
    const items = [];
    const lines = String(stdout || '').trim().split(/\r?\n/).filter(Boolean);
    console.log('[Extractor] extractFileIconDataUrls raw lines', { count: lines.length })
    for (const line of lines) {
      const m = line.match(/^([0-9]+|small|large):([A-Za-z0-9+/=]+)$/);
      if (!m) continue;
      const sizeRaw = m[1];
      const b64 = m[2];
      const num = (sizeRaw === 'small') ? 16 : (sizeRaw === 'large') ? 48 : parseInt(sizeRaw, 10);
      items.push({ size: num, dataUrl: `data:image/png;base64,${b64}` });
    }
    console.log('[Extractor] extractFileIconDataUrls parsed items', { sizes: items.map((i) => i.size), count: items.length })
    return items;
  } catch {
    console.error('[Extractor] extractFileIconDataUrls error')
    return [];
  } finally {
    console.log('[Extractor] extractFileIconDataUrls cleanup')
    try { if (scriptPath && fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath) } catch {}
    try { if (tmpDir && fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir) } catch {}
  }
}

export async function extractFileIconToIco(filePath, iconIndex, destPath, size) {
  let tmpDir = null;
  let scriptPath = null;
  try {
    console.log('[Extractor] extractFileIconToIco start', { filePath, iconIndex, destPath, size })
    if (!filePath || !fs.existsSync(filePath)) {
      return false;
    }
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-helper-'));
    scriptPath = path.join(tmpDir, 'save-ico.ps1');
    const ps = `Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"\nusing System;\nusing System.Runtime.InteropServices;\nusing System.Drawing;\npublic class IconExtractor {\n  [DllImport("Shell32.dll", CharSet=CharSet.Auto)]\n  public static extern uint ExtractIconEx(string lpszFile, int nIconIndex, IntPtr[] phiconLarge, IntPtr[] phiconSmall, uint nIcons);\n  [DllImport("User32.dll", CharSet=CharSet.Auto)]\n  public static extern uint PrivateExtractIcons(string lpszFile, int nIconIndex, int cxIcon, int cyIcon, IntPtr[] phicon, uint[] piconid, uint nIcons, uint flags);\n  [DllImport("User32.dll", CharSet=CharSet.Auto)]\n  public static extern bool DestroyIcon(IntPtr hIcon);\n  public static IntPtr ExtractSizeHandle(string file, int index, int w, int h) {\n    IntPtr[] arr = new IntPtr[1];\n    uint[] ids = new uint[1];\n    uint got = PrivateExtractIcons(file, index, w, h, arr, ids, 1, 0);\n    if (got == 0) return IntPtr.Zero;\n    return arr[0];\n  }\n  public static IntPtr ExtractIndexHandle(string file, int index, bool large) {\n    IntPtr[] largeIcons = new IntPtr[1];\n    IntPtr[] smallIcons = new IntPtr[1];\n    ExtractIconEx(file, index, large ? largeIcons : null, large ? null : smallIcons, 1);\n    return large ? largeIcons[0] : smallIcons[0];\n  }\n}\n"@ -ReferencedAssemblies System.Drawing
$path = $args[0]
$index = [int]$args[1]
$dest = $args[2]
$sizeArg = $args[3]
$w = 48
$h = 48
if ($sizeArg -and $sizeArg -eq 'small') { $w = 16; $h = 16 }
elseif ($sizeArg -and $sizeArg -eq 'large') { $w = 48; $h = 48 }
else { try { $w = [int]$sizeArg; $h = $w } catch { } }
$hIcon = [IconExtractor]::ExtractSizeHandle($path, $index, $w, $h)
if ($hIcon -eq [IntPtr]::Zero -and $index -lt 0) { $hIcon = [IconExtractor]::ExtractSizeHandle($path, -$index, $w, $h) }
if ($hIcon -eq [IntPtr]::Zero) { $hIcon = [IconExtractor]::ExtractIndexHandle($path, $index, $true) }
if ($hIcon -eq [IntPtr]::Zero -and $index -lt 0) { $hIcon = [IconExtractor]::ExtractIndexHandle($path, -$index, $true) }
if ($hIcon -ne [IntPtr]::Zero) {
  try {
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    $fs = [System.IO.File]::Open($dest, [System.IO.FileMode]::Create)
    $icon.Save($fs)
    $fs.Close()
  } catch { }
  [IconExtractor]::DestroyIcon($hIcon) | Out-Null
}`;
    fs.writeFileSync(scriptPath, ps, { encoding: 'utf8' });
    await new Promise((resolve) => {
      execFile(
        'powershell',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, filePath, String(iconIndex), destPath, String(size || 'large')],
        { windowsHide: true, encoding: 'utf8', timeout: 15000 },
        (err, _out, stderr) => { 
          if (err) console.error('[extractFileIconToIco] PowerShell 错误:', err.message)
          if (stderr) console.error('[extractFileIconToIco] stderr:', stderr)
          resolve(null) 
        }
      );
    });
    console.log('[Extractor] extractFileIconToIco result', { exists: fs.existsSync(destPath) })
    return fs.existsSync(destPath);
  } catch {
    console.error('[Extractor] extractFileIconToIco error')
    return false;
  } finally {
    console.log('[Extractor] extractFileIconToIco cleanup')
    try { if (scriptPath && fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath) } catch {}
    try { if (tmpDir && fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir) } catch {}
  }
}
// ... 其他函数保持不变（extractFileIconDataUrls、extractFileIconToIco）
