#include <napi.h>
#include <windows.h>
#include <shlobj.h>
#include <string>

// SHFOLDERCUSTOMSETTINGS 结构体定义
typedef struct {
    DWORD dwSize;
    DWORD dwMask;
    SHELLVIEWID *pvid;
    LPWSTR pszWebViewTemplate;
    DWORD cchWebViewTemplate;
    LPWSTR pszWebViewTemplateVersion;
    LPWSTR pszInfoTip;
    DWORD cchInfoTip;
    CLSID *pclsid;
    DWORD dwFlags;
    LPWSTR pszIconFile;
    DWORD cchIconFile;
    int iIconIndex;
    LPWSTR pszLogo;
    DWORD cchLogo;
} SHFOLDERCUSTOMSETTINGS_CUSTOM;

// 动态加载 SHGetSetFolderCustomSettings
typedef HRESULT (WINAPI *SHGetSetFolderCustomSettingsProc)(
    SHFOLDERCUSTOMSETTINGS_CUSTOM *pfcs,
    LPCWSTR pszPath,
    DWORD dwReadWrite
);

#define FCSM_ICONFILE 0x00000010
#define FCS_FORCEWRITE 0x00000002
#define FCS_READ 0x00000001

// 设置文件夹图标
Napi::Value SetFolderIcon(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Expected 2 arguments: folderPath, iconPath")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    if (!info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "Arguments must be strings")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    // Napi::String::Utf16Value 返回 std::u16string，这里显式转换为 std::wstring
    std::u16string folderPathU16 = info[0].As<Napi::String>().Utf16Value();
    std::u16string iconPathU16 = info[1].As<Napi::String>().Utf16Value();
    std::wstring folderPath(folderPathU16.begin(), folderPathU16.end());
    std::wstring iconPath(iconPathU16.begin(), iconPathU16.end());

    // 加载 shell32.dll
    HMODULE hShell32 = LoadLibraryW(L"shell32.dll");
    if (!hShell32) {
        Napi::Error::New(env, "Failed to load shell32.dll")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    SHGetSetFolderCustomSettingsProc pSHGetSetFolderCustomSettings =
        (SHGetSetFolderCustomSettingsProc)GetProcAddress(hShell32, "SHGetSetFolderCustomSettings");

    if (!pSHGetSetFolderCustomSettings) {
        FreeLibrary(hShell32);
        Napi::Error::New(env, "Failed to get SHGetSetFolderCustomSettings")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    // 设置文件夹自定义设置
    SHFOLDERCUSTOMSETTINGS_CUSTOM fcs = {0};
    fcs.dwSize = sizeof(SHFOLDERCUSTOMSETTINGS_CUSTOM);
    fcs.dwMask = FCSM_ICONFILE;
    fcs.pszIconFile = (LPWSTR)iconPath.c_str();
    fcs.cchIconFile = (DWORD)iconPath.length();
    fcs.iIconIndex = 0;

    HRESULT hr = pSHGetSetFolderCustomSettings(&fcs, folderPath.c_str(), FCS_FORCEWRITE);

    FreeLibrary(hShell32);

    if (FAILED(hr)) {
        char errorMsg[256];
        sprintf_s(errorMsg, "SHGetSetFolderCustomSettings failed with HRESULT: 0x%08X", hr);
        Napi::Error::New(env, errorMsg).ThrowAsJavaScriptException();
        return env.Null();
    }

    // 设置文件夹为只读属性（必须）
    DWORD attrs = GetFileAttributesW(folderPath.c_str());
    if (attrs != INVALID_FILE_ATTRIBUTES) {
        SetFileAttributesW(folderPath.c_str(), attrs | FILE_ATTRIBUTE_READONLY);
    }

    return Napi::Boolean::New(env, true);
}

// 清除文件夹图标
Napi::Value ClearFolderIcon(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1) {
        Napi::TypeError::New(env, "Expected 1 argument: folderPath")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    if (!info[0].IsString()) {
        Napi::TypeError::New(env, "Argument must be a string")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    // Napi::String::Utf16Value 返回 std::u16string，这里显式转换为 std::wstring
    std::u16string folderPathU16 = info[0].As<Napi::String>().Utf16Value();
    std::wstring folderPath(folderPathU16.begin(), folderPathU16.end());

    // 移除只读属性
    DWORD attrs = GetFileAttributesW(folderPath.c_str());
    if (attrs != INVALID_FILE_ATTRIBUTES && (attrs & FILE_ATTRIBUTE_READONLY)) {
        SetFileAttributesW(folderPath.c_str(), attrs & ~FILE_ATTRIBUTE_READONLY);
    }

    return Napi::Boolean::New(env, true);
}

// 刷新图标缓存（可选指定单个文件夹路径）
Napi::Value RefreshIconCache(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    std::wstring folderPath;
    bool hasFolderPath = false;

    if (info.Length() >= 1 && info[0].IsString()) {
        std::u16string folderPathU16 = info[0].As<Napi::String>().Utf16Value();
        if (!folderPathU16.empty()) {
            folderPath.assign(folderPathU16.begin(), folderPathU16.end());
            hasFolderPath = true;
        }
    }

    // 方法1：使用 ILCreateFromPath + SHChangeNotify 尝试立即刷新指定路径
    if (hasFolderPath) {
        PIDLIST_ABSOLUTE pidl = ILCreateFromPathW(folderPath.c_str());
        if (pidl != nullptr) {
            UINT flags = SHCNF_IDLIST | SHCNF_FLUSH;
            SHChangeNotify(SHCNE_UPDATEITEM, flags, pidl, nullptr);
            SHChangeNotify(SHCNE_UPDATEDIR, flags, pidl, nullptr);
            CoTaskMemFree(pidl);
        }
    }

    // 方法2：无论是否有具体路径，都发送关联变更通知，强制刷新全局图标缓存
    SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_FLUSH, nullptr, nullptr);

    return Napi::Boolean::New(env, true);
}

// 以管理员权限运行程序
// 参数：exePath, arguments
// 返回：{ success: boolean, errorCode: number }
Napi::Value RunElevated(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Expected 2 arguments: exePath, arguments")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    if (!info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "Arguments must be strings")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    // 获取参数
    std::u16string exePath = info[0].As<Napi::String>().Utf16Value();
    std::u16string arguments = info[1].As<Napi::String>().Utf16Value();

    // 使用 ShellExecuteW 以管理员权限启动进程
    SHELLEXECUTEINFOW sei = { sizeof(sei) };
    sei.fMask = SEE_MASK_NOCLOSEPROCESS | SEE_MASK_NOASYNC;
    sei.lpVerb = L"runas";  // 关键：触发 UAC
    sei.lpFile = (LPCWSTR)exePath.c_str();
    sei.lpParameters = (LPCWSTR)arguments.c_str();
    sei.nShow = SW_HIDE;

    BOOL result = ShellExecuteExW(&sei);

    Napi::Object returnObj = Napi::Object::New(env);

    if (!result) {
        DWORD errorCode = GetLastError();
        returnObj.Set("success", Napi::Boolean::New(env, false));
        returnObj.Set("errorCode", Napi::Number::New(env, errorCode));
        return returnObj;
    }

    // 等待进程完成
    if (sei.hProcess != nullptr) {
        WaitForSingleObject(sei.hProcess, INFINITE);

        DWORD exitCode = 0;
        GetExitCodeProcess(sei.hProcess, &exitCode);

        CloseHandle(sei.hProcess);

        returnObj.Set("success", Napi::Boolean::New(env, exitCode == 0));
        returnObj.Set("errorCode", Napi::Number::New(env, exitCode));
    } else {
        returnObj.Set("success", Napi::Boolean::New(env, true));
        returnObj.Set("errorCode", Napi::Number::New(env, 0));
    }

    return returnObj;
}

// 模块初始化
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "setFolderIcon"),
                Napi::Function::New(env, SetFolderIcon));
    exports.Set(Napi::String::New(env, "clearFolderIcon"),
                Napi::Function::New(env, ClearFolderIcon));
    exports.Set(Napi::String::New(env, "refreshIconCache"),
                Napi::Function::New(env, RefreshIconCache));
    exports.Set(Napi::String::New(env, "runElevated"),
                Napi::Function::New(env, RunElevated));
    return exports;
}

NODE_API_MODULE(folder_icon_native, Init)

