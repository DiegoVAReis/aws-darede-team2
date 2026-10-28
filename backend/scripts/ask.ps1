# Atalho para testar a API local no PowerShell.
# Uso (a partir de backend/):   . .\scripts\ask.ps1
#   $r = Ask "Qual a garantia padrão dos tratores?"
#   $r | ConvertTo-Json -Depth 5
#   Ask "E as colheitadeiras?" $r.session_id

$ApiBaseUrl = if ($env:API_BASE_URL) { $env:API_BASE_URL } else { "http://localhost:8000" }

function Ask {
    param(
        [Parameter(Mandatory = $true)][string]$Text,
        [string]$SessionId
    )
    $payload = @{ text = $Text }
    if ($SessionId) { $payload.session_id = $SessionId }
    $json = $payload | ConvertTo-Json -Compress
    try {
        # Envia UTF-8 explicitamente: sem isso, acentos podem chegar corrompidos no Windows PowerShell 5.1.
        Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/v1/ask" `
            -ContentType "application/json; charset=utf-8" `
            -Body ([Text.Encoding]::UTF8.GetBytes($json))
    }
    catch {
        # Em erros 4xx/5xx mostra o corpo padronizado {"error": {"code", "message"}}.
        if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message | ConvertFrom-Json }
        else { $_.Exception.Message }
    }
}

function Test-Health {
    Invoke-RestMethod "$ApiBaseUrl/health"
}
