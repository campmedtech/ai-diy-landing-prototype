param(
  [int]$Port = 8000
)

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootWithSeparator = [System.IO.Path]::GetFullPath($rootPath + [System.IO.Path]::DirectorySeparatorChar)
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$address = "http://localhost:$Port/"

$contentTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
}

try {
  $listener.Start()
  Write-Host "AI-DIY prototype running at $address"
  Write-Host "Press Ctrl+C to stop."

  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($requestLine)) {
        continue
      }
      while (($headerLine = $reader.ReadLine()) -ne "" -and $null -ne $headerLine) {}

      $requestParts = $requestLine.Split(" ")
      if ($requestParts.Length -lt 2) {
        continue
      }
      $method = $requestParts[0]
      $requestUri = [System.Uri]::new("http://localhost" + $requestParts[1])
      $relativePath = $requestUri.AbsolutePath.TrimStart("/")
      if ([string]::IsNullOrWhiteSpace($relativePath)) {
        $relativePath = "index.html"
      }

      $relativePath = [System.Uri]::UnescapeDataString($relativePath).Replace("/", [System.IO.Path]::DirectorySeparatorChar)
      $requestedPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($rootPath, $relativePath))

      $status = "200 OK"
      $contentType = "text/plain; charset=utf-8"
      $bytes = [byte[]]::new(0)

      if ($method -ne "GET" -and $method -ne "HEAD") {
        $status = "405 Method Not Allowed"
      }
      elseif (-not $requestedPath.StartsWith($rootWithSeparator, [System.StringComparison]::OrdinalIgnoreCase)) {
        $status = "403 Forbidden"
      }
      elseif (-not [System.IO.File]::Exists($requestedPath)) {
        $status = "404 Not Found"
      }
      else {
        $extension = [System.IO.Path]::GetExtension($requestedPath).ToLowerInvariant()
        $contentType = if ($contentTypes.ContainsKey($extension)) { $contentTypes[$extension] } else { "application/octet-stream" }
        $bytes = [System.IO.File]::ReadAllBytes($requestedPath)
      }

      $headers = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      if ($method -eq "GET" -and $bytes.Length -gt 0) {
        $stream.Write($bytes, 0, $bytes.Length)
      }
      $stream.Flush()
    }
    catch {
      continue
    }
    finally {
      $client.Close()
    }
  }
}
finally {
  $listener.Stop()
}
