{
  "targets": [
    {
      "target_name": "folder_icon_native",
      "sources": [ "folder_icon.cc" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS", "UNICODE", "_UNICODE" ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "AdditionalOptions": [ "/utf-8" ]
        }
      },
      "libraries": [
        "shell32.lib",
        "ole32.lib"
      ],
      "conditions": [
        ["OS=='win'", {
          "defines": [ "WIN32" ]
        }]
      ]
    }
  ]
}

