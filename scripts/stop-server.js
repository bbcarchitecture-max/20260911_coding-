import { execSync } from 'child_process';

console.log('========================================================');
console.log('  工程研發專案管理系統 (PMS) - 正在關閉本地伺服器');
console.log('========================================================\n');

const port = 3000;
let killedCount = 0;

try {
  if (process.platform === 'win32') {
    // 取得佔用 3000 埠的 PID
    const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf-8' });
    const lines = output.trim().split('\n');
    const pids = new Set();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(Number(pid))) {
        pids.add(pid);
      }
    }

    for (const pid of pids) {
      console.log(`[處理] 正在終止佔用連接埠 ${port} 的行程 (PID: ${pid})...`);
      try {
        execSync(`taskkill /F /PID ${pid} /T`);
        killedCount++;
      } catch (e) {
        // 忽略已關閉的程序錯誤
      }
    }
  } else {
    // Linux / macOS
    const output = execSync(`lsof -t -i:${port}`, { encoding: 'utf-8' });
    const pids = output.trim().split('\n');
    for (const pid of pids) {
      if (pid) {
        execSync(`kill -9 ${pid}`);
        killedCount++;
      }
    }
  }
} catch (err) {
  // netstat 或 lsof 沒有找到匹配項目時會拋出 errorcode 1
}

if (killedCount > 0) {
  console.log(`\n[成功] 已成功停止 ${killedCount} 個相關伺服器程序！`);
} else {
  console.log(`\n[提示] 連接埠 ${port} 目前沒有運作中的伺服器。`);
}

console.log('========================================================\n');
