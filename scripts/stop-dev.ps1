$ErrorActionPreference = "SilentlyContinue"
$port = 3001
$conn = Get-NetTCPConnection -LocalPort $port -State Listen
if (-not $conn) {
  Write-Host "端口 $port 没有正在运行的服务。"
  exit 0
}
$pids = $conn | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $pids) {
  Write-Host "停止进程 $procId ..."
  & taskkill.exe /PID $procId /T /F | Out-Null
}
Write-Host "已停止校园电脑管家后台服务。"
