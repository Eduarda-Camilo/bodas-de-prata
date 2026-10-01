param(
  [string]$Destination = 'C:\Users\eduarda.camilo\Desktop\Descompactar\Github\bodas\bodas-de-prata'
)
$ErrorActionPreference = 'Stop'
$Repository = 'https://github.com/Eduarda-Camilo/bodas-de-prata.git'
function Run-Git {
  param([string[]]$GitArgs)
  & git @GitArgs
  if ($LASTEXITCODE -ne 0) { throw 'O Git interrompeu a operação. Nenhum merge automático foi feito.' }
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Instale Git for Windows antes de continuar.' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Instale Node.js 24 LTS antes de continuar.' }
if ((Test-Path -LiteralPath $Destination) -and (Test-Path -LiteralPath (Join-Path $Destination '.git'))) {
  $Remote = & git -C $Destination remote get-url origin
  if ($LASTEXITCODE -ne 0 -or $Remote -notmatch 'github\.com[:/]Eduarda-Camilo/bodas-de-prata(?:\.git)?$') {
    throw 'Esta pasta não está vinculada ao repositório esperado. Nada foi alterado.'
  }
  $Changes = & git -C $Destination status --porcelain
  if ($LASTEXITCODE -ne 0 -or $Changes) { throw 'Existem alterações locais. Faça commit e envie ao GitHub antes de sincronizar. Nada foi sobrescrito.' }
  $Branch = & git -C $Destination branch --show-current
  if ($LASTEXITCODE -ne 0 -or $Branch -ne 'main') { throw 'O checkout local precisa estar no branch main. Troque de branch conscientemente antes de continuar.' }
  Run-Git -GitArgs @('-C', $Destination, 'pull', '--ff-only', 'origin', 'main')
} else {
  if ((Test-Path -LiteralPath $Destination) -and (Get-ChildItem -LiteralPath $Destination -Force | Select-Object -First 1)) {
    throw 'A pasta já contém arquivos e não é um checkout Git. Nada foi sobrescrito. Mova essa pasta como backup e execute novamente.'
  }
  $Parent = Split-Path -Parent $Destination
  if (-not (Test-Path -LiteralPath $Parent)) { New-Item -ItemType Directory -Path $Parent -Force | Out-Null }
  Run-Git -GitArgs @('clone', '--branch', 'main', $Repository, $Destination)
}
Set-Location -LiteralPath $Destination
& npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'A instalação falhou. Leia o erro acima antes de continuar.' }
Write-Host 'Projeto preparado e vinculado ao GitHub. Abrindo o servidor de desenvolvimento.'
Write-Host 'Quando aparecer Ready, abra http://localhost:3000 no navegador. Ctrl+C encerra o servidor.'
& npm.cmd run dev
