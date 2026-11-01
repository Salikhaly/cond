const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..', '..');
const frontend = path.join(root, 'front-main', 'front-main');
const output = path.join(root, 'public');
const webpack = path.join(frontend, 'node_modules', 'webpack', 'bin', 'webpack.js');

if (!fs.existsSync(webpack)) {
    throw new Error('Frontend dependencies are not installed: ' + webpack);
}

fs.rmSync(output, { recursive: true, force: true });

execFileSync(process.execPath, [webpack, '--mode', 'production', '--output-path', output], {
    cwd: frontend,
    env: { ...process.env, PUBLIC_DEMO: 'true', LOCAL_DEMO: 'true' },
    stdio: 'inherit'
});

for (const required of ['index.html', 'manifest.webmanifest', 'sw.js']) {
    if (!fs.existsSync(path.join(output, required))) {
        throw new Error('Public build is missing ' + required);
    }
}

console.log('Public demo build is ready in ' + output);
