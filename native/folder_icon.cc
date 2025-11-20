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

// 模块初始化
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "setFolderIcon"),
                Napi::Function::New(env, SetFolderIcon));
    exports.Set(Napi::String::New(env, "clearFolderIcon"),
                Napi::Function::New(env, ClearFolderIcon));
    return exports;
}

NODE_API_MODULE(folder_icon_native, Init)

