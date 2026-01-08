# =========================================================
# serve.ps1 — Minimal Local Ops Server
# CORE ONLY / NO BUSINESS LOGIC
# =========================================================

# =========================================================
# 1. CORE CONFIG
# =========================================================

$BaseDir = if ($MyInvocation.MyCommand.Path) {
    Split-Path -Parent $MyInvocation.MyCommand.Path
}
else {
    (Get-Location).Path
}

$DataDir = Join-Path $BaseDir "data"

# Ensure data directory exists
if (-not (Test-Path $DataDir)) {
    try { New-Item -ItemType Directory -Path $DataDir | Out-Null } catch {}
}

# =========================================================
# 2. HTTP SERVER CORE
# =========================================================

$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add("http://localhost:8087/")
$Listener.Start()

Write-Host "[INFO] Local server started at http://localhost:8087"
Write-Host "[INFO] Press Ctrl+C to stop"

# Graceful shutdown on Ctrl+C
[Console]::add_CancelKeyPress({
        param($sender, $args)
        $args.Cancel = $true
        Write-Host "[INFO] Stopping listener..."
        try { $Listener.Stop() } catch {}
        try { $Listener.Close() } catch {}
        Exit
    })

# =========================================================
# 3. CORE HELPERS
# =========================================================

# -----------------------------
# Write JSON response
# -----------------------------
function Write-JsonResponse($Response, $StatusCode, $Payload) {
    $Response.StatusCode = $StatusCode
    $Response.ContentType = "application/json; charset=utf-8"

    try {
        $json = $Payload | ConvertTo-Json -Depth 10 -ErrorAction Stop
    }
    catch {
        $json = '{"ok":false,"error":{"code":"JSON_SERIALIZE_ERROR","message":"Failed to serialize response"}}'
        $Response.StatusCode = 500
    }

    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $Response.ContentLength64 = $bytes.Length
    $Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $Response.OutputStream.Flush()
    $Response.Close()
}

# -----------------------------
# Read JSON request body
# -----------------------------
function Read-JsonBody($Request) {
    if (-not $Request.HasEntityBody) { return $null }

    $reader = New-Object System.IO.StreamReader(
        $Request.InputStream,
        $Request.ContentEncoding
    )

    try {
        $raw = $reader.ReadToEnd()
    }
    finally {
        $reader.Close()
    }

    if ([string]::IsNullOrWhiteSpace($raw)) { return $null }

    try {
        return $raw | ConvertFrom-Json -ErrorAction Stop
    }
    catch {
        return $null
    }
}

# -----------------------------
# Normalize JSON array
# -----------------------------
function Normalize-Array($Data) {
    if (-not $Data) { return @() }
    if ($Data -is [System.Array]) { return $Data }
    return @($Data)
}

# =========================================================
# 4. STATIC FILE SERVER
# =========================================================

function Serve-StaticFile($Path, $Response) {

    $Requested = $Path.TrimStart("/")
    $FilePath = if ($Requested -eq "") {
        Join-Path $BaseDir "index.html"
    }
    else {
        Join-Path $BaseDir $Requested
    }

    # Prevent path traversal by resolving full paths
    try {
        $FullPath = [System.IO.Path]::GetFullPath($FilePath)
        $BaseFull = [System.IO.Path]::GetFullPath($BaseDir)
    }
    catch {
        $Response.StatusCode = 400
        $Response.Close()
        return
    }

    if (-not $FullPath.StartsWith($BaseFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        $Response.StatusCode = 403
        $Response.Close()
        return
    }

    if (-not (Test-Path $FullPath)) {
        $Response.StatusCode = 404
        $Response.Close()
        return
    }

    switch ([System.IO.Path]::GetExtension($FullPath)) {
        ".html" { $Response.ContentType = "text/html" }
        ".js" { $Response.ContentType = "application/javascript" }
        ".css" { $Response.ContentType = "text/css" }
        ".json" { $Response.ContentType = "application/json" }
        default { $Response.ContentType = "application/octet-stream" }
    }

    $fs = [System.IO.File]::OpenRead($FullPath)
    try {
        $Response.ContentLength64 = $fs.Length
        $buffer = New-Object byte[] 8192
        while (($read = $fs.Read($buffer, 0, $buffer.Length)) -gt 0) {
            $Response.OutputStream.Write($buffer, 0, $read)
        }
        $Response.OutputStream.Flush()
    }
    finally {
        $fs.Close()
        $Response.Close()
    }
}

# =========================================================
# 5. API BASE HANDLER (EMPTY)
# =========================================================

function Handle-ApiRequest($Request, $Response) {

    $Method = $Request.HttpMethod
    $Path = $Request.Url.AbsolutePath
    switch ("$Method $Path") {
        # -------------------------------------------------
        # Example placeholder (REMOVE OR REPLACE)
        # -------------------------------------------------
        "GET /api/health" {
            Write-JsonResponse $Response 200 @{
                ok   = $true
                time = (Get-Date).ToString("s")
            }
        }
        default {
            Write-JsonResponse $Response 404 @{
                ok    = $false
                error = @{
                    code    = "NOT_IMPLEMENTED"
                    message = "API endpoint not implemented"
                }
            }
        }
    }
}

# =========================================================
# 6. MAIN REQUEST LOOP
# =========================================================

while ($Listener.IsListening) {

    $Context = $Listener.GetContext()
    $Request = $Context.Request
    $Response = $Context.Response

    $Method = $Request.HttpMethod
    $Path = $Request.Url.AbsolutePath

    Write-Host "[INFO] $Method $Path"

    try {

        # Serve static files
        if ($Method -eq "GET" -and -not $Path.StartsWith("/api")) {
            Serve-StaticFile $Path $Response
            continue
        }

        # Base API handler
        if ($Path.StartsWith("/api")) {
            Handle-ApiRequest $Request $Response
            continue
        }

        # Fallback
        Write-JsonResponse $Response 404 @{
            ok    = $false
            error = @{
                code    = "NOT_FOUND"
                message = "Endpoint not found"
            }
        }

    }
    catch {

        Write-Host "[ERROR]" $_.Exception.Message

        Write-JsonResponse $Response 500 @{
            ok    = $false
            error = @{
                code    = "SERVER_ERROR"
                message = "Internal server error"
            }
        }
    }
}
