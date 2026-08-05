$j = Get-Content src\services\data\puertos_chile_nacional.json -Raw | ConvertFrom-Json
foreach ($p in $j) {
    if ($p.nombre -match 'BAKER|PATACHE|TORTEL') {
        Write-Host "$($p.nombre) | lat=$($p.lat) | lng=$($p.lng)"
    }
}
Write-Host "`nTotal puertos MOP: $($j.Count)"
