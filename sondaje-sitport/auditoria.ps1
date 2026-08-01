$sitport = @{}
Get-ChildItem sondaje-sitport\*.json | ForEach-Object {
    $j = Get-Content $_.FullName -Raw | ConvertFrom-Json
    foreach ($r in $j.recordsets[0]) {
        if (-not $sitport.ContainsKey($r.bahia)) {
            $sitport[$r.bahia] = $r.GLBahia
        }
    }
}
$coords = @{}
$file = Get-Content "src\routes\sitport-routes.js" -Raw
$ms = [regex]::Matches($file, '(\d+):\s*\{\s*lat:\s*([-\d.]+),\s*lng:\s*([-\d.]+)')
foreach ($m in $ms) { $coords[$m.Groups[1].Value] = "$($m.Groups[2].Value), $($m.Groups[3].Value)" }
Write-Host "SITPORT: $($sitport.Count) bahias | APP: $($coords.Count) mapeadas"
Write-Host "`nFALTANTES EN LA APP:"
$f = 0
foreach ($id in ($sitport.Keys | Sort-Object { [int]$_ })) {
    if (-not $coords.ContainsKey("$id")) { Write-Host "  ID $id : $($sitport[$id])"; $f++ }
}
Write-Host "Total faltantes: $f"
