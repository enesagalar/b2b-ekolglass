param(
  [int]$IntervalMinutes = 30,
  [int]$MaxRuns = 1,
  [switch]$Continuous
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$reportDir = Join-Path $repoRoot "docs\agent-reports"
$codexPath = "C:\Users\enesagalar\AppData\Local\OpenAI\Codex\bin\ea1c60319a1dcb19\codex.exe"

New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

if (-not (Test-Path -LiteralPath $codexPath)) {
  throw "Codex CLI not found at $codexPath"
}

function Invoke-CodexAdvisorRun {
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $reportPath = Join-Path $reportDir "advisor-$timestamp.md"
  $logPath = Join-Path $reportDir "advisor-$timestamp.log"
  $promptPath = Join-Path $reportDir "advisor-$timestamp.prompt.txt"

  $prompt = @"
You are the EkolGlass B2B background advisor lane.

Read codex.md first and follow its operating approach where relevant. Work read-only. Do not edit files. Do not run git writes.

Project objective: professional database-backed CMS/B2B portal for EkolGlass.

Inspect:
- docs/04-next-actions.md
- docs/02-current-state.md
- docs/01-roadmap.md
- docs/phases/phase-03-1-product-catalog-ux.md
- src/app/admin
- src/features
- prisma/schema.prisma

Print a concise Turkish Markdown report to stdout between these exact markers:
BEGIN_ADVISOR_REPORT
END_ADVISOR_REPORT

Report sections:
1. En mantikli sonraki 5 gelistirme
2. Bulunan riskler / test aciklari
3. Ana ajanla entegrasyon onerisi
4. Dokunulacak ve dokunulmayacak dosya sinirlari

Use concrete file paths. Keep it actionable. Do not wrap the report in a code fence.
"@

  Set-Content -LiteralPath $promptPath -Value $prompt -Encoding UTF8
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    Get-Content -LiteralPath $promptPath -Raw |
      & $codexPath exec --ignore-user-config --skip-git-repo-check -C $repoRoot -m gpt-5.5 -c model_reasoning_effort=high --sandbox workspace-write --color never - *>&1 |
      Set-Content -LiteralPath $logPath -Encoding UTF8
    $codexExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  if ($codexExitCode -ne 0) {
    Write-Output "advisor_failed exit=$codexExitCode log=$logPath"
    return
  }

  $logContent = Get-Content -LiteralPath $logPath -Raw
  $matches = [regex]::Matches($logContent, "BEGIN_ADVISOR_REPORT\s*(?<report>[\s\S]*?)\s*END_ADVISOR_REPORT")
  $report = $matches |
    ForEach-Object { $_.Groups["report"].Value -replace "(?m)^System\.Management\.Automation\.RemoteException\r?\n?", "" } |
    Where-Object { $_.Trim().Length -gt 80 } |
    Select-Object -Last 1

  if ($report) {
    Set-Content -LiteralPath $reportPath -Value $report.Trim() -Encoding UTF8
  }

  if (Test-Path -LiteralPath $reportPath) {
    Write-Output "report=$reportPath"
  } else {
    Write-Output "report_missing log=$logPath"
  }
}

$run = 0
do {
  $run += 1
  Invoke-CodexAdvisorRun

  if (-not $Continuous) {
    break
  }

  if ($MaxRuns -gt 0 -and $run -ge $MaxRuns) {
    break
  }

  Start-Sleep -Seconds ($IntervalMinutes * 60)
} while ($true)
