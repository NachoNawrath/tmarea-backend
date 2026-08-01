$archivos = Get-ChildItem sondaje-sitport\*.json | Sort-Object Name
$todas = @{}
foreach ($arch in $archivos) {
    $j = Get-Content $arch.FullName -Raw | ConvertFrom-Json
    $recs = $j.recordsets[0] | Where-Object { $_.NaveRecibe -match 'MENOR' -and $_.tipo -match 'TODOS' }
    foreach ($r in $recs) {
        $bahia = $r.GLBahia
        $obs = $r.Observacion
        if (-not $todas.ContainsKey($bahia)) { $todas[$bahia] = @{} }
        $todas[$bahia][$arch.Name] = $obs
    }
}
Write-Host "`n=== BAHIAS QUE CAMBIARON DE TEXTO ENTRE CAPTURAS ==="
foreach ($bahia in ($todas.Keys | Sort-Object)) {
    $textos = $todas[$bahia].Values | Select-Object -Unique
    if ($textos.Count -gt 1) {
        Write-Host "`n--- $bahia ---"
        foreach ($arch in ($todas[$bahia].Keys | Sort-Object)) {
            $t = $todas[$bahia][$arch]
            if ($t.Length -gt 150) { $t = $t.Substring(0,150) + "..." }
            Write-Host "  $arch : $t"
        }
    }
}
Write-Host "`n=== BAHIAS QUE APARECEN SOLO EN ALGUNAS CAPTURAS ==="
foreach ($bahia in ($todas.Keys | Sort-Object)) {
    $n = $todas[$bahia].Count
    if ($n -lt $archivos.Count) {
        $en = ($todas[$bahia].Keys | Sort-Object) -join ", "
        Write-Host "  $bahia (en $n de 5): $en"
    }
}
