param(
  [switch]$UpdateHtml
)

$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
  $scriptDir = Split-Path -Parent $PSCommandPath
  return (Resolve-Path (Join-Path $scriptDir '..\\..')).Path
}

function Read-JsonFile([string]$path) {
  if (-not (Test-Path $path)) { throw "Missing file: $path" }
  $raw = Get-Content -Raw -Encoding UTF8 $path
  return $raw | ConvertFrom-Json
}

function Write-Utf8File([string]$path, [string]$content) {
  $dir = Split-Path -Parent $path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  Set-Content -Path $path -Encoding UTF8 -Value $content
}

function Get-ActivationCodeFromHtml([string]$htmlPath) {
  if (-not (Test-Path $htmlPath)) { return $null }
  $raw = Get-Content -Raw -Encoding UTF8 $htmlPath
  $pattern = 'const\s+ACTIVATION_CODE\s*=\s*[\x27\x22](?<code>[^\x27\x22]+)[\x27\x22]\s*;'
  $m = [regex]::Match($raw, $pattern)
  if (-not $m.Success) { return $null }
  return $m.Groups['code'].Value
}

function Set-ActivationCodeInHtml([string]$htmlPath, [string]$newCode) {
  $raw = Get-Content -Raw -Encoding UTF8 $htmlPath
  $pattern = 'const\s+ACTIVATION_CODE\s*=\s*[\x27\x22](?<code>[^\x27\x22]+)[\x27\x22]\s*;'
  $matches = [regex]::Matches($raw, $pattern)
  if ($matches.Count -ne 1) {
    throw "Expected exactly 1 ACTIVATION_CODE assignment in $htmlPath, found $($matches.Count)."
  }
  $updated = [regex]::Replace(
    $raw,
    $pattern,
    { param($m) "const ACTIVATION_CODE = '$newCode';" },
    1
  )
  Set-Content -Path $htmlPath -Encoding UTF8 -Value $updated
}

$repoRoot = Get-RepoRoot
$jsonPath = Join-Path $repoRoot '量表生成器\\config\\activation-codes.json'
$mdPath = Join-Path $repoRoot '激活码配置.md'

$config = Read-JsonFile $jsonPath
if (-not $config.records) { throw "Invalid activation-codes.json: missing records[]" }

$rows = @()
foreach ($r in $config.records) {
  if (-not $r.name) { throw "Record missing name: $($r | ConvertTo-Json -Compress)" }
  if (-not $r.file) { throw "Record missing file: $($r | ConvertTo-Json -Compress)" }
  if (-not $r.activationCode) { throw "Record missing activationCode: $($r | ConvertTo-Json -Compress)" }
  $rows += $r
}

$rows = $rows | Sort-Object { $_.id }

$tableLines = @(
  '| 测试名称 | 文件名 | 激活码 |',
  '|---------|--------|--------|'
)
foreach ($r in $rows) {
  $tableLines += ('| ' + $r.name + ' | ' + $r.file + ' | `' + $r.activationCode + '` |')
}

$md = @(
  '# 心理测试激活码配置',
  '',
  '> 注意：`量表生成器/config/activation-codes.json` 是激活码与量表条目的唯一真源。本文件仅用于展示/对外发码清单；如需修改，请先更新 JSON，再同步更新本文件与对应问卷页面内的 `ACTIVATION_CODE`。',
  '',
  '## 激活码列表',
  '',
  ($tableLines -join "`n"),
  '',
  '## 使用说明',
  '',
  '1. 用户购买测试后，发送对应的激活码',
  '2. 用户打开测试页面，输入激活码',
  '3. 激活成功后，该设备可永久使用',
  '',
  '## 修改激活码',
  '',
  '如需修改激活码，请按以下顺序更新：',
  '1. `量表生成器/config/activation-codes.json`（唯一真源）',
  '2. 本文件（展示清单，可选保留但需与 JSON 同步）',
  '3. 对应问卷 `*.html` 文件中的 `ACTIVATION_CODE` 变量',
  ''
) -join "`n"

Write-Utf8File -path $mdPath -content $md
Write-Host "Wrote: $mdPath"

$mismatches = 0
foreach ($r in $rows) {
  $htmlPath = Join-Path $repoRoot $r.file
  if (-not (Test-Path $htmlPath)) {
    Write-Warning "Missing HTML file: $($r.file)"
    continue
  }

  $current = Get-ActivationCodeFromHtml $htmlPath
  if ($null -eq $current) {
    Write-Warning "No ACTIVATION_CODE found in: $($r.file)"
    continue
  }

  if ($current -ne [string]$r.activationCode) {
    $mismatches++
    if ($UpdateHtml) {
      Set-ActivationCodeInHtml -htmlPath $htmlPath -newCode ([string]$r.activationCode)
      Write-Host "Updated ACTIVATION_CODE in: $($r.file) ($current -> $($r.activationCode))"
    } else {
      Write-Warning "Mismatch in $($r.file): html=$current json=$($r.activationCode) (run with -UpdateHtml to sync)"
    }
  }
}

if ($mismatches -gt 0 -and -not $UpdateHtml) {
  exit 2
}
