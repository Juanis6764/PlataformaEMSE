param(
  [string]$NombreBasePruebas = 'emse_disciplina_fase2_test'
)

$ErrorActionPreference = 'Stop'
$raizBackend = Split-Path -Parent $PSScriptRoot
$archivoEnv = Join-Path $raizBackend '.env'
$lineaBase = Get-Content $archivoEnv | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
if (-not $lineaBase) { throw 'DATABASE_URL no está definida en backend/.env.' }

$urlPrincipal = $lineaBase.Substring($lineaBase.IndexOf('=') + 1).Trim('"')
$uriPrincipal = [System.Uri]$urlPrincipal
$nombrePrincipal = $uriPrincipal.AbsolutePath.TrimStart('/')
if ($NombreBasePruebas -notmatch '^emse_disciplina_[a-z0-9_]*test$') {
  throw 'El nombre de la base aislada debe seguir el patrón emse_disciplina_*test.'
}
if ($nombrePrincipal -eq $NombreBasePruebas -or $NombreBasePruebas -eq 'emse_db') {
  throw 'La base de pruebas debe ser distinta de emse_db.'
}

$binPostgres = 'C:\Program Files\PostgreSQL\16\bin'
$pgDump = Join-Path $binPostgres 'pg_dump.exe'
$pgRestore = Join-Path $binPostgres 'pg_restore.exe'
$createdb = Join-Path $binPostgres 'createdb.exe'
$dropdb = Join-Path $binPostgres 'dropdb.exe'
foreach ($programa in @($pgDump, $pgRestore, $createdb, $dropdb)) {
  if (-not (Test-Path -LiteralPath $programa)) { throw "No se encontró $programa" }
}

$credenciales = $uriPrincipal.UserInfo.Split(':', 2)
$usuarioDb = $credenciales[0]
$databaseUrlAnterior = $env:DATABASE_URL
$nodeEnvAnterior = $env:NODE_ENV
$pgPasswordAnterior = $env:PGPASSWORD
$env:PGPASSWORD = $credenciales[1]
$respaldoTemporal = Join-Path ([System.IO.Path]::GetTempPath()) "$NombreBasePruebas.dump"
$urlPruebas = $urlPrincipal -replace "/$([regex]::Escape($nombrePrincipal))\?", "/${NombreBasePruebas}?"

try {
  & $dropdb --if-exists --host $uriPrincipal.Host --port $uriPrincipal.Port --username $usuarioDb $NombreBasePruebas
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar la base de pruebas.' }
  & $pgDump --format custom --file $respaldoTemporal --host $uriPrincipal.Host --port $uriPrincipal.Port --username $usuarioDb $nombrePrincipal
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo clonar la estructura para pruebas.' }
  & $createdb --host $uriPrincipal.Host --port $uriPrincipal.Port --username $usuarioDb $NombreBasePruebas
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear la base exclusiva de pruebas.' }
  & $pgRestore --exit-on-error --no-owner --dbname $NombreBasePruebas --host $uriPrincipal.Host --port $uriPrincipal.Port --username $usuarioDb $respaldoTemporal
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo restaurar la copia aislada.' }

  $env:DATABASE_URL = $urlPruebas
  $env:NODE_ENV = 'test'
  if (([System.Uri]$env:DATABASE_URL).AbsolutePath.TrimStart('/') -ne $NombreBasePruebas) {
    throw 'No se pudo aislar DATABASE_URL para las pruebas.'
  }
  Write-Host "Ejecutando pruebas en la base aislada: $NombreBasePruebas"
  Push-Location $raizBackend
  try {
    & npx.cmd prisma migrate deploy
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron aplicar las migraciones en la base aislada.' }
    & npx.cmd jest --config ./test/jest-e2e.json --runInBand test/notas-disciplina.e2e-spec.ts
    if ($LASTEXITCODE -ne 0) { throw 'Las pruebas integrales de Disciplina fallaron.' }
  }
  finally {
    Pop-Location
  }
}
finally {
  & $dropdb --if-exists --force --host $uriPrincipal.Host --port $uriPrincipal.Port --username $usuarioDb $NombreBasePruebas
  if (Test-Path -LiteralPath $respaldoTemporal) {
    Remove-Item -LiteralPath $respaldoTemporal -Force
  }
  if ($null -eq $databaseUrlAnterior) { Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue } else { $env:DATABASE_URL = $databaseUrlAnterior }
  if ($null -eq $nodeEnvAnterior) { Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue } else { $env:NODE_ENV = $nodeEnvAnterior }
  if ($null -eq $pgPasswordAnterior) { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue } else { $env:PGPASSWORD = $pgPasswordAnterior }
}
