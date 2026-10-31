import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import pgClient from 'pg';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// initdb on Windows cannot bootstrap a UTF-8 cluster under some Cyrillic paths.
const databaseDir = process.env.COND_PG_DATA || (process.platform === 'win32' ? 'C:/codex-local/cond-postgres' : path.join(root, '.local-data', 'postgres'));
const native = path.join(root, 'node_modules/@embedded-postgres/windows-x64/native');
if (process.platform !== 'win32') throw new Error('This local launcher is for Windows. Use a regular PostgreSQL and .env on other systems.');
const runtime = 'C:/codex-local/cond-postgres-runtime';
fs.mkdirSync(runtime, { recursive: true });
if (!fs.existsSync(path.join(runtime, 'bin/postgres.exe'))) {
    execFileSync('powershell.exe', ['-NoProfile', '-File', path.join(root, 'scripts/copy-postgres.ps1'), '-Source', native, '-Destination', runtime], { windowsHide: true });
}
const env = { ...process.env, TEMP: runtime, TMP: runtime, LC_MESSAGES: 'C' };
const execute = (file, args) => new Promise((resolve, reject) => {
    const child = spawn(path.join(runtime, 'bin', file), args, { cwd: runtime, env, windowsHide: true });
    let output = ''; child.stdout.on('data', d => { output += d; }); child.stderr.on('data', d => { output += d; });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve(output) : reject(new Error(output)));
});
if (!fs.existsSync(path.join(databaseDir, 'PG_VERSION'))) {
    const pw = path.join(runtime, 'init-password'); fs.writeFileSync(pw, 'cond_local_dev\n');
    try { await execute('initdb.exe', ['-D', databaseDir, '-U', 'cond_local', '--pwfile=' + pw, '--auth=password', '--encoding=UTF8', '--locale=C']); }
    finally { fs.unlinkSync(pw); }
}
let running = false;
try { await execute('pg_ctl.exe', ['-D', databaseDir, 'status']); running = true; } catch {}
if (!running) await execute('pg_ctl.exe', ['-D', databaseDir, '-l', path.join(runtime, 'postgres.log'), '-o', '-p 55432 -h 127.0.0.1', '-w', 'start']);
const client = new pgClient.Client({ host: '127.0.0.1', port: 55432, user: 'cond_local', password: 'cond_local_dev', database: 'postgres' });
await client.connect();
if (!(await client.query("SELECT 1 FROM pg_database WHERE datname = 'cond_local'")).rowCount) await client.query('CREATE DATABASE cond_local');
await client.end();
console.log('Local PostgreSQL ready on 127.0.0.1:55432. Data: ' + databaseDir);
// pg_ctl starts PostgreSQL independently; close it with the matching local stop script.
process.exit(0);


