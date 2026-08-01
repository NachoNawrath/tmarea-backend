while ($true) {
    $ts = Get-Date -Format "yyyy-MM-dd_HH-mm"
    $file = "sondaje-sitport\restricciones_$ts.json"
    try {
        Invoke-WebRequest -Uri "https://orion.directemar.cl/sitport/back/users/consultaRestricciones" -Method POST -ContentType "application/json" -Body "{}" -OutFile $file
        Write-Host "[$ts] Captura OK -> $file"
    } catch {
        Write-Host "[$ts] ERROR: $_"
    }
    Start-Sleep -Seconds 14400
}
