param(
  [Parameter(Mandatory = $true)]
  [string]$OutputPath,
  [int]$Dpi = 300
)

$ErrorActionPreference = 'Stop'

try {
  $dialog = New-Object -ComObject WIA.CommonDialog
  $formatJpeg = '{B96B3CAA-0728-11D3-9D7B-0000F81EF32E}'
  
  # Tenta configurar o scanner diretamente para 300 DPI
  $deviceManager = New-Object -ComObject WIA.DeviceManager
  $scannerInfo = $null
  foreach ($info in $deviceManager.DeviceInfos) {
    if ($info.Type -eq 1) {
      $scannerInfo = $info
      break
    }
  }

  if ($null -ne $scannerInfo) {
    $device = $scannerInfo.Connect()
    if ($device.Items.Count -gt 0) {
      $item = $device.Items.Item(1)
      foreach ($prop in $item.Properties) {
        if ($prop.PropertyID -eq 6147) { try { $prop.Value = $Dpi } catch {} } # 300 DPI Horizontal
        if ($prop.PropertyID -eq 6148) { try { $prop.Value = $Dpi } catch {} } # 300 DPI Vertical
      }
      $imageFile = $item.Transfer($formatJpeg)
      if ($null -ne $imageFile) {
        if (Test-Path $OutputPath) { Remove-Item $OutputPath -Force }
        $imageFile.SaveFile($OutputPath)
        Write-Output 'OK'
        exit 0
      }
    }
  }

  # Fallback caso transferência direta não responda
  $imagem = $dialog.ShowAcquireImage(1, 1, 1, $formatJpeg, $false, $true, $false)
  if ($null -eq $imagem) { Write-Output 'CANCELADO'; exit 2 }
  if (Test-Path $OutputPath) { Remove-Item $OutputPath -Force }
  $imagem.SaveFile($OutputPath)
  Write-Output 'OK'
} catch {
  if ($_.Exception.Message -match 'cancel|80210064') { Write-Output 'CANCELADO'; exit 2 }
  try {
    $dialog = New-Object -ComObject WIA.CommonDialog
    $imagem = $dialog.ShowAcquireImage(1, 1, 1, '{B96B3CAA-0728-11D3-9D7B-0000F81EF32E}', $true, $true, $false)
    if ($null -ne $imagem) {
      if (Test-Path $OutputPath) { Remove-Item $OutputPath -Force }
      $imagem.SaveFile($OutputPath)
      Write-Output 'OK'
      exit 0
    }
  } catch {}
  Write-Error $_.Exception.Message
  exit 1
}
