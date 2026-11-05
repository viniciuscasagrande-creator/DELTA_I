import 'dotenv/config';
import { spawn } from 'node:child_process';

function runProcess(label, colorCode, command, args) {
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  const prefix = `\x1b[${colorCode}m[${label}]\x1b[0m `;

  child.stdout.on('data', (chunk) => {
    const lines = chunk.toString().split(/\r?\n/);
    for (const line of lines) {
      if (line.trim()) process.stdout.write(`${prefix}${line}\n`);
    }
  });

  child.stderr.on('data', (chunk) => {
    const lines = chunk.toString().split(/\r?\n/);
    for (const line of lines) {
      if (line.trim()) process.stderr.write(`${prefix}${line}\n`);
    }
  });

  return child;
}

console.log('\x1b[36m============================================================\x1b[0m');
console.log('\x1b[1m🚀 ENTERPRISE ERP v1.0 — Iniciando API (3000) + Web (5173)\x1b[0m');
console.log('\x1b[36m============================================================\x1b[0m');

const apiProc = runProcess('API:3000', '34', 'npm', ['--workspace=@delta-erp/api', 'run', 'dev']);
const webProc = runProcess('WEB:5173', '32', 'npm', ['--workspace=@delta-erp/web', 'run', 'dev']);

process.on('SIGINT', () => {
  apiProc.kill();
  webProc.kill();
  process.exit(0);
});
