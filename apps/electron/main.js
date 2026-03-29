"use strict";

/**
 * GRC Desktop — Electron Main Process
 *
 * Lifecycle:
 *   app.whenReady → loadConfig → startServer → waitForServer → createWindow + createTray
 *
 * Server entry: <appPath>/../server/dist/index.js
 */

const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  shell,
  ipcMain,
  dialog,
  nativeImage,
} = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const APP_NAME = "GRC";
const DEFAULT_PORT = 3100;
const HEALTH_CHECK_INTERVAL_MS = 2000;
const HEALTH_CHECK_MAX_RETRIES = 30;
const SPLASH_URL = `file://${path.join(__dirname, "assets", "splash.html")}`;

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const appDataDir = path.join(app.getPath("appData"), APP_NAME);
const configPath = path.join(appDataDir, "config.json");
const logsDir = path.join(appDataDir, "logs");
const dataDir = path.join(appDataDir, "data");
const sqlitePath = path.join(dataDir, "grc.db");
const logFilePath = path.join(logsDir, `app-${datestamp()}.log`);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** @type {BrowserWindow|null} */
let mainWindow = null;

/** @type {BrowserWindow|null} */
let splashWindow = null;

/** @type {Tray|null} */
let tray = null;

/** @type {import("child_process").ChildProcess|null} */
let serverProcess = null;

/** @type {fs.WriteStream|null} */
let logStream = null;

/** @type {object} */
let config = {};

/** @type {boolean} */
let isQuitting = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a YYYYMMDD string for log file naming.
 * @returns {string}
 */
function datestamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Write a timestamped log line to the log file and optionally to stdout.
 * @param {string} level
 * @param {string} message
 */
function log(level, message) {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}\n`;
  if (logStream && !logStream.destroyed) {
    logStream.write(line);
  }
  // Also emit to console in development
  if (process.env.NODE_ENV !== "production") {
    process.stdout.write(line);
  }
}

const logger = {
  info: (msg) => log("info", msg),
  warn: (msg) => log("warn", msg),
  error: (msg) => log("error", msg),
  debug: (msg) => log("debug", msg),
};

/**
 * Ensure a directory exists, creating it recursively if needed.
 * @param {string} dirPath
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/**
 * Default configuration values.
 * @returns {object}
 */
function defaultConfig() {
  return {
    port: DEFAULT_PORT,
    dbDialect: "sqlite",
    dataDir,
    sqlitePath,
    databaseUrl: "",
    nodeEnv: "production",
  };
}

/**
 * Load configuration from %APPDATA%/GRC/config.json.
 * Missing fields are filled from defaults and the file is re-written.
 */
function loadConfig() {
  ensureDir(appDataDir);
  ensureDir(logsDir);
  ensureDir(dataDir);

  let loaded = {};
  if (fs.existsSync(configPath)) {
    try {
      loaded = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (err) {
      logger.warn(`Failed to parse config.json: ${err.message}. Using defaults.`);
    }
  }

  config = Object.assign(defaultConfig(), loaded);
  saveConfig();
  logger.info(`Config loaded: port=${config.port} dialect=${config.dbDialect}`);
}

/**
 * Persist the current config to disk.
 */
function saveConfig() {
  ensureDir(appDataDir);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
}

// ---------------------------------------------------------------------------
// Logging initialisation
// ---------------------------------------------------------------------------

function initLogging() {
  ensureDir(logsDir);
  ensureDir(dataDir);

  // Log rotation: delete log files older than 7 days, cap total at 500MB
  try {
    const MAX_LOG_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    const MAX_TOTAL_LOG_BYTES = 500 * 1024 * 1024; // 500MB
    const now = Date.now();
    const logFiles = fs.readdirSync(logsDir)
      .filter((f) => f.startsWith("app-") && f.endsWith(".log"))
      .map((f) => ({ name: f, path: path.join(logsDir, f), stat: fs.statSync(path.join(logsDir, f)) }))
      .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs); // newest first

    // Delete old files
    for (const f of logFiles) {
      if (now - f.stat.mtimeMs > MAX_LOG_AGE_MS) {
        fs.unlinkSync(f.path);
      }
    }

    // Cap total size (delete oldest first)
    let totalBytes = logFiles.reduce((sum, f) => sum + f.stat.size, 0);
    for (let i = logFiles.length - 1; i >= 0 && totalBytes > MAX_TOTAL_LOG_BYTES; i--) {
      try { fs.unlinkSync(logFiles[i].path); } catch {}
      totalBytes -= logFiles[i].stat.size;
    }
  } catch {}

  logStream = fs.createWriteStream(logFilePath, { flags: "a" });
  logStream.on("error", (err) => {
    process.stderr.write(`Log stream error: ${err.message}\n`);
  });
  logger.info(`=== GRC Desktop starting (pid=${process.pid}) ===`);
  logger.info(`Log file: ${logFilePath}`);
}

// ---------------------------------------------------------------------------
// Node.js executable discovery
// ---------------------------------------------------------------------------

/**
 * Locate the Node.js executable to use for spawning the server.
 * Priority: embedded node (next to electron) > system node > electron itself.
 * @returns {string}
 */
function findNodeExecutable() {
  // 1. Embedded node bundled alongside the packaged app
  // Check for embedded Node.js in <install>/node/node.exe
  const installRoot = path.join(app.getAppPath(), "..", "..", "..");
  const embeddedNode = path.join(installRoot, "node", "node.exe");
  if (fs.existsSync(embeddedNode)) {
    logger.info(`Using embedded Node.js: ${embeddedNode}`);
    return embeddedNode;
  }

  // 2. node on system PATH
  try {
    const { execSync } = require("child_process");
    const which = process.platform === "win32" ? "where node" : "which node";
    const result = execSync(which, { encoding: "utf8", timeout: 3000 }).trim().split("\n")[0].trim();
    if (result && fs.existsSync(result)) {
      logger.info(`Using system Node.js: ${result}`);
      return result;
    }
  } catch (_) {
    // not found on PATH
  }

  // 3. Fall back to the electron binary itself (supports --run in some versions)
  logger.warn("Node.js not found; falling back to Electron binary as Node runtime.");
  return process.execPath;
}

// ---------------------------------------------------------------------------
// Server process management
// ---------------------------------------------------------------------------

/**
 * Compute the path to the GRC server entry point.
 *
 * Installed layout:
 *   <install>/desktop/resources/app/main.js  ← app.getAppPath()
 *   <install>/server/dist/index.js           ← target
 *   <install>/node/node.exe
 *
 * So we go up 3 levels from app.getAppPath() to reach <install>/.
 * @returns {string}
 */
function getServerEntryPath() {
  const installRoot = path.join(app.getAppPath(), "..", "..", "..");
  return path.join(installRoot, "server", "dist", "index.js");
}

/**
 * Build the environment variables that should be passed to the server process.
 * @returns {Record<string,string>}
 */
function buildServerEnv() {
  const env = Object.assign({}, process.env);

  env.PORT = String(config.port);
  env.NODE_ENV = config.nodeEnv || "production";
  env.GRC_DB_DIALECT = config.dbDialect || "sqlite";
  env.GRC_DATA_DIR = config.dataDir || dataDir;
  env.GRC_SQLITE_PATH = config.sqlitePath || sqlitePath;

  // Tell the server where to store skill tarballs locally
  env.GRC_SKILLS_LOCAL_PATH = path.join(dataDir, "skills");

  if (config.databaseUrl) {
    env.DATABASE_URL = config.databaseUrl;
  }

  return env;
}

/**
 * Spawn the GRC server child process.
 * stdout/stderr are piped to the log file.
 * @returns {Promise<void>}
 */
function startServer() {
  return new Promise((resolve, reject) => {
    const serverEntry = getServerEntryPath();
    logger.info(`Server entry: ${serverEntry}`);

    if (!fs.existsSync(serverEntry)) {
      const msg = `Server entry not found: ${serverEntry}`;
      logger.error(msg);
      return reject(new Error(msg));
    }

    const nodeExec = findNodeExecutable();
    const serverEnv = buildServerEnv();

    logger.info(`Spawning server: ${nodeExec} ${serverEntry}`);

    serverProcess = spawn(nodeExec, [serverEntry], {
      env: serverEnv,
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    // Pipe server stdout/stderr to log file
    if (serverProcess.stdout) {
      serverProcess.stdout.on("data", (chunk) => {
        if (logStream && !logStream.destroyed) {
          logStream.write(`[SERVER] ${chunk}`);
        }
      });
    }
    if (serverProcess.stderr) {
      serverProcess.stderr.on("data", (chunk) => {
        if (logStream && !logStream.destroyed) {
          logStream.write(`[SERVER:ERR] ${chunk}`);
        }
      });
    }

    serverProcess.on("error", (err) => {
      logger.error(`Server process error: ${err.message}`);
      reject(err);
    });

    serverProcess.on("exit", (code, signal) => {
      logger.warn(`Server process exited: code=${code} signal=${signal}`);
      serverProcess = null;

      if (!isQuitting) {
        // Auto-restart server after unexpected crash
        logger.info("Auto-restarting server in 3 seconds...");
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("server-restarting");
        }
        setTimeout(async () => {
          if (!isQuitting) {
            try {
              await startServer();
              logger.info("Server auto-restarted successfully");
            } catch (err) {
              logger.error(`Server auto-restart failed: ${err.message}`);
            }
          }
        }, 3000);
      }
    });

    // Resolve as soon as the process is spawned (health check will confirm readiness)
    serverProcess.once("spawn", () => {
      logger.info(`Server spawned (pid=${serverProcess.pid})`);
      resolve();
    });

    // If we never get 'spawn', the error handler above will reject
    setTimeout(() => {
      if (serverProcess && serverProcess.pid) {
        resolve();
      }
    }, 500);
  });
}

/**
 * Kill the current server process gracefully, then forcefully.
 * @returns {Promise<void>}
 */
function killServer() {
  return new Promise((resolve) => {
    if (!serverProcess) {
      return resolve();
    }

    const proc = serverProcess;
    serverProcess = null;

    const forceKillTimer = setTimeout(() => {
      try { proc.kill("SIGKILL"); } catch (_) {}
      resolve();
    }, 5000);

    proc.once("exit", () => {
      clearTimeout(forceKillTimer);
      resolve();
    });

    try {
      proc.kill("SIGTERM");
    } catch (err) {
      logger.warn(`Could not SIGTERM server: ${err.message}`);
      clearTimeout(forceKillTimer);
      resolve();
    }
  });
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

/**
 * Poll the server's /health endpoint until it responds 200.
 * @returns {Promise<void>}
 */
function waitForServer() {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    function check() {
      attempts++;
      logger.debug(`Health check attempt ${attempts}/${HEALTH_CHECK_MAX_RETRIES}`);

      const req = http.get(
        {
          hostname: "127.0.0.1",
          port: config.port,
          path: "/health",
          timeout: 1500,
        },
        (res) => {
          if (res.statusCode === 200) {
            logger.info(`Server healthy after ${attempts} attempt(s)`);
            resolve();
          } else {
            logger.debug(`Health check returned ${res.statusCode}, retrying…`);
            scheduleRetry();
          }
          // Drain response
          res.resume();
        }
      );

      req.on("error", () => scheduleRetry());
      req.on("timeout", () => {
        req.destroy();
        scheduleRetry();
      });
    }

    function scheduleRetry() {
      if (attempts >= HEALTH_CHECK_MAX_RETRIES) {
        return reject(
          new Error(
            `Server did not become healthy after ${HEALTH_CHECK_MAX_RETRIES} retries`
          )
        );
      }
      setTimeout(check, HEALTH_CHECK_INTERVAL_MS);
    }

    check();
  });
}

// ---------------------------------------------------------------------------
// Splash window
// ---------------------------------------------------------------------------

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.loadURL(SPLASH_URL);
  splashWindow.once("ready-to-show", () => {
    splashWindow.show();
  });
}

function closeSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
}

// ---------------------------------------------------------------------------
// Main window
// ---------------------------------------------------------------------------

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: "GRC — Global Resource Center",
    icon: path.join(__dirname, "assets", "grc-icon.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      sandbox: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${config.port}/`);

  mainWindow.once("ready-to-show", () => {
    closeSplashWindow();
    mainWindow.show();
    logger.info("Main window shown");
  });

  // Minimise to tray instead of closing
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      logger.info("Window hidden to tray");
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Open external links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://127.0.0.1:${config.port}`)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`http://127.0.0.1:${config.port}`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

// ---------------------------------------------------------------------------
// System Tray
// ---------------------------------------------------------------------------

function createTray() {
  const iconPath = path.join(__dirname, "assets", "grc-icon.ico");
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip(`GRC Desktop — port ${config.port}`);
  tray.setContextMenu(buildTrayMenu());

  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  logger.info("System tray created");
}

/**
 * Build (or rebuild) the tray context menu.
 * @returns {Menu}
 */
function buildTrayMenu() {
  return Menu.buildFromTemplate([
    {
      label: "Open Dashboard",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "Open in Browser",
      click: () => shell.openExternal(`http://127.0.0.1:${config.port}/`),
    },
    { type: "separator" },
    {
      label: `Port: ${config.port}`,
      enabled: false,
    },
    {
      label: "DB Settings…",
      click: showDbSettingsDialog,
    },
    {
      label: "Open Data Directory",
      click: () => shell.openPath(config.dataDir || dataDir),
    },
    {
      label: "View Logs",
      click: () => shell.openPath(logsDir),
    },
    { type: "separator" },
    {
      label: "Restart Server",
      click: restartServer,
    },
    { type: "separator" },
    {
      label: "Quit GRC",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

// ---------------------------------------------------------------------------
// DB Settings Dialog
// ---------------------------------------------------------------------------

/**
 * Show a dialog allowing the user to switch the database dialect.
 */
async function showDbSettingsDialog() {
  const currentDialect = config.dbDialect || "sqlite";

  const choices = ["sqlite", "mysql"];
  const currentIndex = choices.indexOf(currentDialect);

  const { response } = await dialog.showMessageBox({
    type: "question",
    title: "Database Settings",
    message: "Select Database Dialect",
    detail:
      `Current dialect: ${currentDialect}\n\n` +
      "Changing the dialect requires a server restart.\n" +
      "Make sure the DATABASE_URL is configured in config.json before switching.",
    buttons: ["SQLite (default)", "MySQL / MariaDB", "Cancel"],
    defaultId: currentIndex === -1 ? 0 : currentIndex,
    cancelId: 2,
  });

  if (response === 2) return; // Cancel

  const dialectMap = { 0: "sqlite", 1: "mysql" };
  const newDialect = dialectMap[response];

  if (newDialect === currentDialect) {
    dialog.showMessageBox({ type: "info", message: "No change — dialect unchanged." });
    return;
  }

  config.dbDialect = newDialect;
  saveConfig();
  logger.info(`DB dialect changed to ${newDialect}`);

  const { response: restart } = await dialog.showMessageBox({
    type: "question",
    title: "Restart Required",
    message: `Dialect set to "${newDialect}". Restart the server now?`,
    buttons: ["Restart Now", "Later"],
    defaultId: 0,
  });

  if (restart === 0) {
    restartServer();
  }
}

// ---------------------------------------------------------------------------
// Server restart
// ---------------------------------------------------------------------------

/**
 * Kill the running server, start a fresh one, then reload the main window.
 */
async function restartServer() {
  logger.info("Server restart requested");

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("server-restarting");
    mainWindow.loadURL(SPLASH_URL);
  }

  await killServer();

  try {
    await startServer();
    await waitForServer();
    logger.info("Server restarted successfully");

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL(`http://127.0.0.1:${config.port}/`);
    }

    // Rebuild tray menu in case port changed
    if (tray) {
      tray.setContextMenu(buildTrayMenu());
      tray.setToolTip(`GRC Desktop — port ${config.port}`);
    }
  } catch (err) {
    logger.error(`Server restart failed: ${err.message}`);
    dialog.showErrorBox(
      "Server Restart Failed",
      `The GRC server could not be restarted.\n\n${err.message}\n\nCheck the logs for details:\n${logsDir}`
    );
  }
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------

ipcMain.handle("get-version", () => app.getVersion());

ipcMain.handle("get-config", () => ({
  port: config.port,
  dbDialect: config.dbDialect,
  dataDir: config.dataDir,
  sqlitePath: config.sqlitePath,
}));

ipcMain.handle("select-directory", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "Select Workspace Directory",
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle("set-db-dialect", async (_event, dialect) => {
  const allowed = ["sqlite", "mysql", "postgres"];
  if (!allowed.includes(dialect)) {
    throw new Error(`Invalid dialect: ${dialect}`);
  }
  config.dbDialect = dialect;
  saveConfig();
  logger.info(`DB dialect updated via IPC: ${dialect}`);
  return { ok: true };
});

ipcMain.on("open-external", (_event, url) => {
  if (typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"))) {
    shell.openExternal(url);
  }
});

ipcMain.on("show-context-menu", (_event, x, y) => {
  if (tray) {
    buildTrayMenu().popup({ x, y });
  }
});

// ---------------------------------------------------------------------------
// Single instance lock
// ---------------------------------------------------------------------------

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  // Another instance is already running — bring it to the foreground and exit
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(async () => {
  initLogging();
  loadConfig();

  // Show splash while server boots
  createSplashWindow();

  try {
    await startServer();
    await waitForServer();
  } catch (err) {
    closeSplashWindow();
    logger.error(`Fatal: ${err.message}`);
    dialog.showErrorBox(
      "GRC Failed to Start",
      `The GRC server could not be started.\n\n${err.message}\n\nCheck the logs for details:\n${logsDir}`
    );
    app.quit();
    return;
  }

  createWindow();
  createTray();

  logger.info("Application ready");
});

// Prevent the app from quitting when all windows are closed (stay in tray)
app.on("window-all-closed", (event) => {
  if (process.platform !== "darwin" && !isQuitting) {
    // Stay alive — window was hidden to tray
  }
});

app.on("activate", () => {
  // macOS: re-show window when dock icon is clicked
  if (mainWindow) {
    mainWindow.show();
  } else if (serverProcess) {
    createWindow();
  }
});

app.on("before-quit", async (event) => {
  if (isQuitting) return; // already handled

  event.preventDefault();
  isQuitting = true;
  logger.info("Application quitting — stopping server…");

  await killServer();

  if (logStream && !logStream.destroyed) {
    logStream.end(() => {
      app.quit();
    });
  } else {
    app.quit();
  }
});
