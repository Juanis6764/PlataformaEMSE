param(
  [int]$PuertoPrueba = 3010,
  [switch]$MantenerServidor
)

$ErrorActionPreference = 'Stop'
$raizProyecto = Split-Path -Parent $PSScriptRoot
$origen = Join-Path $raizProyecto 'frontend'
$baseTemporal = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$nombreTemporal = 'emse-qa-frontend-' + [guid]::NewGuid().ToString('N')
$destino = [System.IO.Path]::GetFullPath((Join-Path $baseTemporal $nombreTemporal))

if (-not $destino.StartsWith($baseTemporal, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'La ruta temporal quedo fuera del directorio temporal permitido.'
}
if ((Split-Path -Leaf $destino) -notlike 'emse-qa-frontend-*') {
  throw 'La ruta temporal no tiene el prefijo de seguridad esperado.'
}

$proceso = $null
try {
  New-Item -ItemType Directory -Path $destino | Out-Null
  foreach ($directorio in @('src', 'public')) {
    Copy-Item -LiteralPath (Join-Path $origen $directorio) -Destination $destino -Recurse
  }
  foreach ($archivo in @(
    'package.json',
    'package-lock.json',
    'next.config.ts',
    'tsconfig.json',
    'next-env.d.ts',
    'eslint.config.mjs',
    'postcss.config.mjs'
  )) {
    Copy-Item -LiteralPath (Join-Path $origen $archivo) -Destination $destino
  }
  Write-Output 'Copiando dependencias ya instaladas al entorno aislado (sin instalacion)...'
  Copy-Item -LiteralPath (Join-Path $origen 'node_modules') -Destination $destino -Recurse

  Write-Output "CLEANROOM=$destino"
  Push-Location $destino
  try {
    & npm.cmd run build
    $codigoBuild = $LASTEXITCODE
  } finally {
    Pop-Location
  }
  Write-Output "BUILD_EXIT=$codigoBuild"
  if ($codigoBuild -ne 0) {
    throw "El build limpio fallo con codigo $codigoBuild."
  }

  $salida = Join-Path $destino 'next-start.stdout.log'
  $errores = Join-Path $destino 'next-start.stderr.log'
  $binNext = Join-Path $destino 'node_modules\next\dist\bin\next'
  # El entorno del sandbox expone PATH y Path simultaneamente. Start-Process
  # usa un diccionario insensible a mayusculas y falla si ambas permanecen.
  $rutaEjecutables = [Environment]::GetEnvironmentVariable('PATH', 'Process')
  [Environment]::SetEnvironmentVariable('Path', $null, 'Process')
  [Environment]::SetEnvironmentVariable('PATH', $rutaEjecutables, 'Process')
  $proceso = Start-Process -FilePath 'node.exe' `
    -ArgumentList @($binNext, 'start', '-p', [string]$PuertoPrueba) `
    -WorkingDirectory $destino `
    -WindowStyle Hidden `
    -RedirectStandardOutput $salida `
    -RedirectStandardError $errores `
    -PassThru

  $limite = (Get-Date).AddSeconds(45)
  $disponible = $false
  while ((Get-Date) -lt $limite -and -not $proceso.HasExited) {
    try {
      $raiz = Invoke-WebRequest -Uri "http://127.0.0.1:$PuertoPrueba/" -UseBasicParsing -TimeoutSec 2
      $disponible = $true
      break
    } catch {
      Start-Sleep -Milliseconds 300
    }
  }
  if (-not $disponible) {
    throw 'El frontend limpio no quedo disponible dentro de 45 segundos.'
  }

  $resultados = @()
  foreach ($ruta in @('/', '/iniciar-sesion', '/panel', '/modulos/control-acceso/usuarios')) {
    $cronometro = [Diagnostics.Stopwatch]::StartNew()
    try {
      $respuesta = Invoke-WebRequest -Uri ("http://127.0.0.1:$PuertoPrueba" + $ruta) -UseBasicParsing -TimeoutSec 10
      $codigo = [int]$respuesta.StatusCode
      $titulo = ([regex]::Match($respuesta.Content, '<title>(.*?)</title>')).Groups[1].Value
    } catch {
      $codigo = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
      $titulo = $_.Exception.Message
    }
    $cronometro.Stop()
    $resultados += [pscustomobject]@{
      ruta = $ruta
      codigo_http = $codigo
      tiempo_ms = $cronometro.ElapsedMilliseconds
      titulo = $titulo
    }
  }

  Write-Output 'RESULTADOS_HTTP_LIMPIOS'
  $resultados | ConvertTo-Json -Depth 3
  Write-Output 'LOG_NEXT_START'
  if (Test-Path -LiteralPath $salida) { Get-Content -LiteralPath $salida }
  if (Test-Path -LiteralPath $errores) { Get-Content -LiteralPath $errores }
  if ($MantenerServidor) {
    Write-Output "SERVIDOR_QA_LISTO=http://127.0.0.1:$PuertoPrueba PID=$($proceso.Id)"
    Wait-Process -Id $proceso.Id
  }
} finally {
  if ($proceso -and -not $proceso.HasExited) {
    Stop-Process -Id $proceso.Id -Force
    $proceso.WaitForExit(5000)
  }
  if (Test-Path -LiteralPath $destino) {
    $destinoVerificado = [System.IO.Path]::GetFullPath($destino)
    if (
      $destinoVerificado.StartsWith($baseTemporal, [System.StringComparison]::OrdinalIgnoreCase) -and
      (Split-Path -Leaf $destinoVerificado) -like 'emse-qa-frontend-*'
    ) {
      Remove-Item -LiteralPath $destinoVerificado -Recurse -Force
      Write-Output "CLEANROOM_REMOVED=$destinoVerificado"
    }
  }
}
