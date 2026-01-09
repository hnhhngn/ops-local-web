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

    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $bytes = $utf8.GetBytes($json)
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

    # Force UTF-8 for reading request body to handle Unicode characters (VN, etc.)
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $reader = New-Object System.IO.StreamReader(
        $Request.InputStream,
        $utf8
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
# Helper: Launch Resource
# -----------------------------
function Launch-Resource($Path) {
    if ([string]::IsNullOrWhiteSpace($Path)) {
        return @{ ok = $false; error = "Path is required" }
    }

    $Path = $Path.Trim()
    $alreadyOpen = $false

    # Smart Focus Logic for Folders/Files (Local Paths)
    # Check if window is already open using Shell.Application
    if (Test-Path $Path) {
        try {
            $shell = New-Object -ComObject Shell.Application
            $windows = $shell.Windows()
            
            # Normalize path for comparison
            $targetPath = (Get-Item $Path).FullName
            
            foreach ($win in $windows) {
                try {
                    # Check if window has a path
                    if ($win.Document -and $win.Document.Folder) {
                        $winPath = $win.Document.Folder.Self.Path
                        if ($winPath -eq $targetPath) {
                            $alreadyOpen = $true
                            # Optional: Try to bring to front (not guaranteed stable in pure PS without C# P/Invoke)
                            break
                        }
                    }
                }
                catch {}
            }
        }
        catch {
            # Ignore COM errors
        }
    }

    try {
        Start-Process -FilePath $Path -ErrorAction Stop
        return @{ ok = $true; alreadyOpen = $alreadyOpen }
    }
    catch {
        return @{ ok = $false; error = $_.Exception.Message }
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
    $MatchKey = "$Method $Path".Trim()

    switch ($MatchKey) {
        # -------------------------------------------------
        # Generic Data CRUD
        # Query: ?file=filename.json
        # -------------------------------------------------
        "GET /api/data" {
            $FileName = $Request.QueryString["file"]
            if ([string]::IsNullOrWhiteSpace($FileName)) {
                return Write-JsonResponse $Response 400 @{ ok = $false; error = @{ code = "MISSING_FILE_PARAM"; message = "Query parameter 'file' is required" } }
            }

            $FilePath = Join-Path $DataDir $FileName
            # Security: Prevent path traversal
            if (-not ([System.IO.Path]::GetFullPath($FilePath)).StartsWith(([System.IO.Path]::GetFullPath($DataDir)))) {
                return Write-JsonResponse $Response 403 @{ ok = $false; error = @{ code = "ACCESS_DENIED"; message = "Access to file outside data directory is prohibited" } }
            }

            if (-not (Test-Path $FilePath)) {
                return Write-JsonResponse $Response 200 @() # Return empty array if file doesn't exist yet
            }

            try {
                $content = Get-Content $FilePath -Raw -Encoding utf8 -ErrorAction Stop
                $data = $content | ConvertFrom-Json -ErrorAction Stop
                Write-JsonResponse $Response 200 $data
                break
            }
            catch {
                Write-JsonResponse $Response 500 @{ ok = $false; error = @{ code = "READ_ERROR"; message = "Failed to read or parse data file" } }
                break
            }
        }

        "POST /api/data" {
            $FileName = $Request.QueryString["file"]
            if ([string]::IsNullOrWhiteSpace($FileName)) {
                return Write-JsonResponse $Response 400 @{ ok = $false; error = @{ code = "MISSING_FILE_PARAM"; message = "Query parameter 'file' is required" } }
            }

            $FilePath = Join-Path $DataDir $FileName
            if (-not ([System.IO.Path]::GetFullPath($FilePath)).StartsWith(([System.IO.Path]::GetFullPath($DataDir)))) {
                return Write-JsonResponse $Response 403 @{ ok = $false; error = @{ code = "ACCESS_DENIED"; message = "Access to file outside data directory is prohibited" } }
            }

            $Payload = Read-JsonBody $Request
            if ($null -eq $Payload) {
                return Write-JsonResponse $Response 400 @{ ok = $false; error = @{ code = "INVALID_JSON"; message = "Request body must be valid JSON" } }
            }

            try {
                $json = $Payload | ConvertTo-Json -Depth 10 -ErrorAction Stop
                Set-Content -Path $FilePath -Value $json -Force -Encoding utf8 -ErrorAction Stop
                Write-JsonResponse $Response 200 @{ ok = $true }
                break
            }
            catch {
                Write-JsonResponse $Response 500 @{ ok = $false; error = @{ code = "WRITE_ERROR"; message = "Failed to write data file" } }
                break
            }
        }

        "POST /api/launch" {
            $Payload = Read-JsonBody $Request
            $Path = $Payload.path
            
            $result = Launch-Resource $Path
            
            if ($result.ok) {
                Write-JsonResponse $Response 200 $result
            }
            else {
                if ($result.error -eq "Path is required") {
                    Write-JsonResponse $Response 400 @{ ok = $false; error = @{ code = "MISSING_PATH"; message = $result.error } }
                }
                else {
                    Write-JsonResponse $Response 500 @{ ok = $false; error = @{ code = "LAUNCH_FAILED"; message = $result.error } }
                }
            }
            break
        }

        "POST /api/automation/run" {
            $Payload = Read-JsonBody $Request
            $Actions = $Payload.actions

            if (-not $Actions -or $Actions.Count -eq 0) {
                Write-JsonResponse $Response 400 @{ ok = $false; error = @{ code = "NO_ACTIONS"; message = "No actions provided" } }
                break
            }

            $results = @()
            foreach ($action in $Actions) {
                if ($action.type -eq "open") {
                    $res = Launch-Resource $action.path
                    $results += @{ action = $action; result = $res }
                    Start-Sleep -Milliseconds 500 # Small delay between actions
                }
            }
            
            Write-JsonResponse $Response 200 @{ ok = $true; results = $results }
            break
        }

        "GET /api/health" {
            Write-JsonResponse $Response 200 @{
                ok   = $true
                time = (Get-Date).ToString("s")
            }
            break
        }
        default {
            Write-Host "[WARNING] No matching handler for: '$MatchKey'"
            Write-JsonResponse $Response 404 @{
                ok    = $false
                error = @{
                    code    = "NOT_IMPLEMENTED"
                    message = "API endpoint not implemented: $MatchKey"
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
