import { spawn } from 'node:child_process';
import { watch } from 'node:fs';

const entrypoint = '/app/runtime/server.js';
let child;
let restartTimer;

function launch() {
  child = spawn(process.execPath, [entrypoint], { stdio: 'inherit', env: process.env });
  child.on('exit', (code, signal) => {
    if (!restartTimer && code !== 0) console.error(`Target child exited (${code ?? signal})`);
  });
}

function restart() {
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    restartTimer = undefined;
    child?.once('exit', launch);
    child?.kill('SIGTERM');
  }, 150);
}

watch('/app/runtime', { persistent: true }, (_event, filename) => {
  if (filename === 'server.js') restart();
});

for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child?.kill(signal));
launch();
