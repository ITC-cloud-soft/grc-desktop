; scripts/grc-windows-installer.iss

#define AppName "GRC"
#define AppFullName "GRC - Global Resource Center"
#define AppVersion "1.0.0"
#define AppPublisher "ITC CloudSoft"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#AppFullName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppFullName}
OutputBaseFilename=GRCSetup-{#AppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
PrivilegesRequired=lowest
MinVersion=10.0.17763
SetupIconFile=..\apps\electron\assets\grc-icon.ico
UninstallDisplayIcon={app}\desktop\grc.exe
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "japanese"; MessagesFile: "compiler:Languages\Japanese.isl"
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"

[CustomMessages]
english.AutoStartDesc=Start with Windows
japanese.AutoStartDesc=Windows 起動時に自動起動
chinesesimplified.AutoStartDesc=开机自启动
korean.AutoStartDesc=Windows 시작 시 자동 실행

english.LaunchApp=Launch GRC
japanese.LaunchApp=GRC を起動
chinesesimplified.LaunchApp=启动 GRC
korean.LaunchApp=GRC 실행

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "autostart"; Description: "{cm:AutoStartDesc}"; Flags: unchecked

[Files]
; Electron desktop shell
Source: "..\dist\electron-out\grc-win32-x64\*"; DestDir: "{app}\desktop"; \
  Flags: ignoreversion recursesubdirs createallsubdirs

; GRC server (Express + Dashboard)
Source: "..\dist\server\*"; DestDir: "{app}\server"; \
  Flags: ignoreversion recursesubdirs createallsubdirs

; Embedded Node.js
Source: "..\dist\node\*"; DestDir: "{app}\node"; \
  Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppFullName}"; Filename: "{app}\desktop\grc.exe"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\desktop\grc.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\desktop\grc.exe"; Description: "{cm:LaunchApp}"; Flags: nowait postinstall skipifsilent

[Registry]
; Auto-start with Windows
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
  ValueType: string; ValueName: "GRC"; \
  ValueData: """{app}\desktop\grc.exe"" --background"; \
  Flags: uninsdeletevalue; Tasks: autostart

[UninstallRun]
Filename: "taskkill"; Parameters: "/F /IM grc.exe"; Flags: runhidden; RunOnceId: "StopGrc"
Filename: "taskkill"; Parameters: "/F /IM node.exe"; Flags: runhidden; RunOnceId: "StopNode"

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Code]
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DataDir: String;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    DataDir := ExpandConstant('{userappdata}\GRC');
    if DirExists(DataDir) then
    begin
      if MsgBox(
        'Do you want to keep your GRC data (database, settings, logs)?'#13#10 +
        #13#10 +
        'Location: ' + DataDir + #13#10 +
        #13#10 +
        'Click "Yes" to keep data (recommended for reinstall).'#13#10 +
        'Click "No" to delete all data permanently.',
        mbConfirmation, MB_YESNO or MB_DEFBUTTON1) = IDNO then
      begin
        DelTree(DataDir, True, True, True);
      end;
    end;
  end;
end;
