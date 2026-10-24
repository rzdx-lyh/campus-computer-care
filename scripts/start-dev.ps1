$ErrorActionPreference = "Stop"

$project = Split-Path -Parent $PSScriptRoot
$port = 3001
$logDir = Join-Path $project ".logs"
$outLog = Join-Path $logDir "dev.log"
$errLog = Join-Path $logDir "dev.err.log"
$startError = Join-Path $logDir "start-error.log"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Test-App {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -UseBasicParsing -TimeoutSec 2
    return ($r.StatusCode -eq 200)
  } catch {
    return $false
  }
}

function Open-App {
  Start-Process "http://localhost:$port/" | Out-Null
}

if (Test-App) {
  Write-Host "检测到服务已在运行，直接打开网页..."
  Open-App
  exit 0
}

$running = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($running) {
  "端口 $port 已被占用，但没有返回 200。请先运行「停止校园电脑管家.bat」，或检查 .logs\dev.err.log" |
    Tee-Object -FilePath $startError
  exit 1
}

if (-not (Test-Path (Join-Path $project "node_modules\next"))) {
  "缺少 node_modules，请先在项目目录执行 npm install" | Tee-Object -FilePath $startError
  exit 1
}

$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npm) {
  $npm = (Get-Command npm -ErrorAction SilentlyContinue).Source
}
if (-not $npm) {
  "找不到 npm，请确认 Node.js 已安装" | Tee-Object -FilePath $startError
  exit 1
}

Write-Host "正在启动校园电脑管家后台服务（端口 $port）..."
"$(Get-Date -Format o) start $npm run dev -- -p $port" | Out-File -FilePath $outLog -Encoding utf8
$npmArgs = @("run", "dev", "--", "-p", "$port")
$p = Start-Process -FilePath $npm -ArgumentList $npmArgs -WorkingDirectory $project `
  -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru

Write-Host "等待服务就绪（首次启动可能需要 10-30 秒）..."
for ($i = 0; $i -lt 120; $i++) {
  Start-Sleep -Seconds 1
  if (Test-App) {
    Write-Host "服务已就绪，正在打开网页..."
    Open-App
    exit 0
  }
  if ($p.HasExited) {
    "后台进程已退出，退出码 $($p.ExitCode)。请查看 $errLog" | Tee-Object -FilePath $startError
    exit 1
  }
}

"等待超时（120 秒）。请查看 $outLog 和 $errLog" | Tee-Object -FilePath $startError
exit 1

