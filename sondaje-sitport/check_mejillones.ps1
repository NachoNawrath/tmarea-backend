$j = Get-Content sondaje-sitport\check_ahora.json -Raw | ConvertFrom-Json
foreach ($r in $j.recordsets[0]) {
    if ($r.GLBahia -match 'MEJILLONES|MICHILLA|TOCOPILLA') {
        $obs = if ($r.Observacion.Length -gt 150) { $r.Observacion.Substring(0,150) } else { $r.Observacion }
        Write-Host "ID=$($r.bahia) | tipo=$($r.tipo) | bahia=$($r.GLBahia) | NaveRecibe=$($r.NaveRecibe) | Obs=$obs"
    }
}
