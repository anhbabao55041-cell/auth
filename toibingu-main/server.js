/**
 * CyberAuth - Node to Python Bridge for Render
 * File này giúp Render nếu chạy ở chế độ Node.js vẫn khởi động được backend Python FastAPI!
 */
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log("===============================================================");
console.log("🚀 CYBERAUTH SECURITY - IDENTITY & LICENSE CONTROL SYSTEM");
console.log("🚀 Starting Python FastAPI backend via Render Bridge...");
console.log("===============================================================");

const port = process.env.PORT || '10000';

// Tự động tìm thư mục chứa app
let workDir = __dirname;
if (!fs.existsSync(path.join(workDir, 'app')) && fs.existsSync(path.join(workDir, 'toibingu-main', 'app'))) {
    workDir = path.join(workDir, 'toibingu-main');
    console.log(`📂 Detected subfolder: ${workDir}`);
}

// Cố gắng cài requirements nếu chưa có
try {
    const reqPath = path.join(workDir, 'requirements.txt');
    if (fs.existsSync(reqPath)) {
        console.log("📦 Installing Python dependencies...");
        execSync('pip3 install -r requirements.txt || pip install -r requirements.txt', {
            cwd: workDir,
            stdio: 'inherit'
        });
    }
} catch (err) {
    console.log("ℹ️ Note: pip install step passed or handled by Render build.");
}

// Khởi chạy FastAPI
console.log(`🌐 Launching FastAPI on 0.0.0.0:${port}...`);

function launch() {
    const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
    const args = ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', port, '--proxy-headers', '--forwarded-allow-ips=*'];

    const child = spawn(pyCmd, args, {
        cwd: workDir,
        stdio: 'inherit',
        env: {
            ...process.env,
            PORT: port,
            HOST: '0.0.0.0',
            PYTHONUNBUFFERED: '1'
        }
    });

    child.on('error', (err) => {
        console.warn("⚠️ python3 -m uvicorn failed, trying python run_server.py...", err.message);
        const fallback = spawn(pyCmd, ['run_server.py'], {
            cwd: workDir,
            stdio: 'inherit',
            env: {
                ...process.env,
                PORT: port,
                HOST: '0.0.0.0',
                PYTHONUNBUFFERED: '1'
            }
        });
        fallback.on('error', (e) => {
            console.error("❌ Critical: Python runtime is missing in this container:", e.message);
            console.error("👉 HÃY VÀO RENDER DASHBOARD -> SETTINGS -> ĐỔI RUNTIME TỪ NODE SANG PYTHON 3!");
        });
    });

    child.on('exit', (code) => {
        console.log(`FastAPI process exited with code ${code}`);
        process.exit(code || 0);
    });
}

launch();
