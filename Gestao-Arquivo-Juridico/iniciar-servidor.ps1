$server = netstat -ano | Select-String -Pattern ':3000\s+.*LISTENING'
if (-not $server) {
  Start-Process -FilePath 'cmd.exe' -ArgumentList @('/k', 'node server.js') -WorkingDirectory $PSScriptRoot -WindowStyle Normal
}
