import { execSync, spawn } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('========================================================');
console.log('  工程研發專案管理系統 (PMS) - 本地伺服器啟動中');
console.log('========================================================\n');

// 1. 檢查 node_modules
if (!fs.existsSync(path.join(rootDir, 'node_modules'))) {
  console.log('[提示] 尚未安裝依賴套件，正在為您自動執行 npm install...');
  try {
    execSync('npm.cmd install', { cwd: rootDir, stdio: 'inherit' });
    console.log('[成功] 套件安裝完成！\n');
  } catch (err) {
    console.error('[錯誤] 套件安裝失敗，請檢查網路後再試。');
    process.exit(1);
  }
}

// 2. 檢查 3000 埠是否被佔用
function checkPortInUse(port) {
  return new Promise((resolve) => {
    const tester = http.createServer()
      .once('error', (err) => {
        if (err.code === 'EADDRINUSE') resolve(true);
        else resolve(false);
      })
      .once('listening', () => {
        tester.close();
        resolve(false);
      })
      .listen(port);
  });
}

const port = 3000;
const isOccupied = await checkPortInUse(port);

if (isOccupied) {
  console.log(`[提示] 偵測到連接埠 ${port} 已經在運行中！`);
  console.log(`[提示] 正在為您開啟瀏覽器：http://localhost:${port}`);
  execSync(`start http://localhost:${port}`);
  console.log('\n若需要重新啟動，請先執行 stop.bat 關閉舊伺服器。');
  process.exit(0);
}

// 3. 啟動 Vite 開發伺服器
console.log(`[1/2] 正在啟動 Vite 伺服器 (http://localhost:${port})...`);
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const child = spawn(npmCmd, ['run', 'dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

// 4. 等待伺服器就緒後開啟瀏覽器
let browserOpened = false;
function pollServer() {
  const req = http.get(`http://localhost:${port}`, (res) => {
    if (!browserOpened) {
      browserOpened = true;
      console.log(`\n[2/2] 伺服器就緒！自動開啟瀏覽器：http://localhost:${port}\n`);
      console.log('========================================================');
      console.log('  【伺服器運行中】');
      console.log('  - 本地網址: http://localhost:3000');
      console.log('  - 關閉伺服器: 直接按 Ctrl+C，或雙擊執行 stop.bat');
      console.log('========================================================\n');
      execSync(`start http://localhost:${port}`);
    }
  });

  req.on('error', () => {
    if (!browserOpened) {
      setTimeout(pollServer, 500);
    }
  });
}

setTimeout(pollServer, 1000);

child.on('exit', (code) => {
  console.log(`伺服器程序已結束 (代碼: ${code})`);
  process.exit(code || 0);
});
