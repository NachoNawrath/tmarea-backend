Get-ChildItem sondaje-sitport\*.json | ForEach-Object {
    $f = $_.Name
    $j = Get-Content $_.FullName -Raw | ConvertFrom-Json
    $recs = $j.recordsets[0]
    $total = $recs.Count
    $bahias = ($recs | Select-Object -ExpandProperty GLBahia -Unique).Count
    $menores = ($recs | Where-Object { $_.NaveRecibe -match 'MENOR' }).Count
    Write-Host "$f | Total: $total | Bahias: $bahias | Afectan menores: $menores"
}
