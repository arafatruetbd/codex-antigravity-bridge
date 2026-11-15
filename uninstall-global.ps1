# Remove only this kit's marked global instruction block and shared bridge.
# Leaves other Codex instructions, logs, and backups alone.
$ErrorActionPreference = 'Stop'
$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME '.codex' }
$codexHome = [System.IO.Path]::GetFullPath($codexHome)
$begin = '<!-- BEGIN CODEX_ANTIGRAVITY_GLOBAL -->'
$end = '<!-- END CODEX_ANTIGRAVITY_GLOBAL -->'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$globalDefault = Join-Path $codexHome 'AGENTS.md'
$globalOverride = Join-Path $codexHome 'AGENTS.override.md'

foreach ($globalRules in @($globalDefault, $globalOverride)) {
    if (-not (Test-Path -LiteralPath $globalRules -PathType Leaf)) { continue }
    $oldText = Get-Content -LiteralPath $globalRules -Raw -Encoding utf8
    # Empty global instruction files yield $null in PowerShell.
    if ($null -eq $oldText) { continue }
    $startIndex = $oldText.IndexOf($begin, [StringComparison]::Ordinal)
    $endIndex = $oldText.IndexOf($end, [StringComparison]::Ordinal)
    if (($startIndex -ge 0) -xor ($endIndex -ge 0)) {
        throw "Incomplete markers in $globalRules. Inspect manually before retrying."
    }
    if ($startIndex -lt 0) { continue }
    if ($endIndex -le $startIndex) { throw "Malformed markers in $globalRules" }
    Copy-Item -LiteralPath $globalRules -Destination "$globalRules.bak-$timestamp"
    $after = $endIndex + $end.Length
    $newText = ($oldText.Substring(0, $startIndex) + $oldText.Substring($after)).TrimEnd() + "`r`n"
    Set-Content -LiteralPath $globalRules -Value $newText -Encoding utf8 -NoNewline
    Write-Host "Removed marked policy from: $globalRules"
}

$targetBridge = Join-Path $codexHome 'bridges\antigravity\delegate-antigravity.mjs'
if (Test-Path -LiteralPath $targetBridge -PathType Leaf) {
    Copy-Item -LiteralPath $targetBridge -Destination "$targetBridge.bak-$timestamp"
    Remove-Item -LiteralPath $targetBridge
    Write-Host "Removed shared bridge: $targetBridge"
}
Write-Host 'Finished. Logs, backups, and unrelated Codex files were preserved.'
Write-Host 'Start a new Codex session to refresh global instructions.'
