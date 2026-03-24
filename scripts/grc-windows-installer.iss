; scripts/grc-windows-installer.iss

#define AppName "GRC"
#define AppFullName "GRC - Global Resource Center"
#define AppVersion "1.0.7"
#define AppPublisher "ITC CloudSoft"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#AppFullName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppFullName}
OutputBaseFilename=GRC-DesktopSetup-{#AppVersion}
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

english.DockerNotFound=Docker Desktop is not installed.%nGRC requires Docker to manage AI agent nodes.%n%nInstall Docker Desktop now?
japanese.DockerNotFound=Docker Desktop がインストールされていません。%nGRC は AI エージェントノードの管理に Docker が必要です。%n%n今すぐ Docker Desktop をインストールしますか？
chinesesimplified.DockerNotFound=未检测到 Docker Desktop。%nGRC 需要 Docker 来管理 AI 代理节点。%n%n是否立即安装 Docker Desktop？
korean.DockerNotFound=Docker Desktop가 설치되어 있지 않습니다.%nGRC는 AI 에이전트 노드 관리에 Docker가 필요합니다.%n%n지금 Docker Desktop을 설치하시겠습니까？

english.DockerInstalling=Downloading and installing Docker Desktop...%nThis may take a few minutes.
japanese.DockerInstalling=Docker Desktop をダウンロード・インストール中...%n数分かかる場合があります。
chinesesimplified.DockerInstalling=正在下载并安装 Docker Desktop...%n这可能需要几分钟。
korean.DockerInstalling=Docker Desktop 다운로드 및 설치 중...%n몇 분 정도 걸릴 수 있습니다.

english.DockerInstallSuccess=Docker Desktop installed successfully!%nPlease restart your computer after setup.
japanese.DockerInstallSuccess=Docker Desktop のインストールが完了しました！%nセットアップ後にコンピュータを再起動してください。
chinesesimplified.DockerInstallSuccess=Docker Desktop 安装成功！%n安装完成后请重启电脑。
korean.DockerInstallSuccess=Docker Desktop이 설치되었습니다!%n설치 후 컴퓨터를 재시작해 주세요.

english.DockerInstallFailed=Docker Desktop installation failed.%nPlease install manually from https://docker.com
japanese.DockerInstallFailed=Docker Desktop のインストールに失敗しました。%nhttps://docker.com から手動でインストールしてください。
chinesesimplified.DockerInstallFailed=Docker Desktop 安装失败。%n请从 https://docker.com 手动安装。
korean.DockerInstallFailed=Docker Desktop 설치에 실패했습니다.%nhttps://docker.com에서 수동으로 설치해 주세요.

english.DockerFound=Docker Desktop detected. Skipping installation.
japanese.DockerFound=Docker Desktop を検出しました。インストールをスキップします。
chinesesimplified.DockerFound=已检测到 Docker Desktop，跳过安装。
korean.DockerFound=Docker Desktop이 감지되었습니다. 설치를 건너뜁니다.

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

; Docker setup script
Source: "setup-docker.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion

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

// Check if Docker is installed by looking for docker.exe in common locations
function IsDockerInstalled: Boolean;
var
  DockerPath: String;
  ResultCode: Integer;
begin
  Result := False;

  // Method 1: Check if docker is in PATH
  if Exec('cmd.exe', '/c docker --version', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if ResultCode = 0 then
    begin
      Result := True;
      Exit;
    end;
  end;

  // Method 2: Check common install locations
  DockerPath := ExpandConstant('{pf}\Docker\Docker\resources\bin\docker.exe');
  if FileExists(DockerPath) then
  begin
    Result := True;
    Exit;
  end;

  DockerPath := ExpandConstant('{localappdata}\Programs\Docker\Docker\resources\bin\docker.exe');
  if FileExists(DockerPath) then
  begin
    Result := True;
    Exit;
  end;

  // Method 3: Check registry
  if RegKeyExists(HKEY_LOCAL_MACHINE, 'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Docker Desktop') then
  begin
    Result := True;
    Exit;
  end;
end;

// Download a file using PowerShell (Inno Setup has no built-in HTTP client)
function DownloadFile(const URL, DestPath: String): Boolean;
var
  ResultCode: Integer;
  PSCmd: String;
begin
  PSCmd := 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "' +
    '[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; ' +
    '$ProgressPreference = ''SilentlyContinue''; ' +
    'Invoke-WebRequest -Uri ''' + URL + ''' -OutFile ''' + DestPath + ''' -UseBasicParsing"';

  Result := Exec('cmd.exe', '/c ' + PSCmd, '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := Result and (ResultCode = 0) and FileExists(DestPath);
end;

// Install Docker Desktop silently
function InstallDockerDesktop: Boolean;
var
  InstallerPath: String;
  ResultCode: Integer;
  DownloadURL: String;
begin
  Result := False;
  InstallerPath := ExpandConstant('{tmp}\DockerDesktopInstaller.exe');
  DownloadURL := 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe';

  // Download
  WizardForm.StatusLabel.Caption := CustomMessage('DockerInstalling');
  WizardForm.ProgressGauge.Style := npbstMarquee;

  if not DownloadFile(DownloadURL, InstallerPath) then
  begin
    MsgBox(CustomMessage('DockerInstallFailed'), mbError, MB_OK);
    Exit;
  end;

  // Install silently
  if Exec(InstallerPath, 'install --quiet --accept-license', '', SW_SHOW, ewWaitUntilTerminated, ResultCode) then
  begin
    if ResultCode = 0 then
    begin
      Result := True;
      MsgBox(CustomMessage('DockerInstallSuccess'), mbInformation, MB_OK);
    end else
    begin
      MsgBox(CustomMessage('DockerInstallFailed'), mbError, MB_OK);
    end;
  end else
  begin
    MsgBox(CustomMessage('DockerInstallFailed'), mbError, MB_OK);
  end;

  // Clean up
  DeleteFile(InstallerPath);
  WizardForm.ProgressGauge.Style := npbstNormal;
end;

// Called after files are installed — check Docker and offer installation
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    if IsDockerInstalled then
    begin
      Log('Docker Desktop detected — skipping installation');
    end else
    begin
      Log('Docker Desktop not found — prompting user');
      if MsgBox(CustomMessage('DockerNotFound'), mbConfirmation, MB_YESNO or MB_DEFBUTTON1) = IDYES then
      begin
        InstallDockerDesktop;
      end;
    end;
  end;
end;

// Uninstall: ask user whether to keep data
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DataDir: String;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    DataDir := ExpandConstant('{userappdata}\GRC');
    if DirExists(DataDir) then
    begin
      if MsgBox('Do you want to keep your GRC data?' + Chr(13) + Chr(10) + Chr(13) + Chr(10) + 'Location: ' + DataDir + Chr(13) + Chr(10) + Chr(13) + Chr(10) + 'Yes = keep data, No = delete all.', mbConfirmation, MB_YESNO or MB_DEFBUTTON1) = IDNO then
      begin
        DelTree(DataDir, True, True, True);
      end;
    end;
  end;
end;
