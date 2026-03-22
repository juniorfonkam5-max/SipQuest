$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Listening on http://localhost:$port/"
try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $path = $request.Url.LocalPath.TrimStart('/')
        if ($path -eq '') { $path = 'index.html' }
        $fullPath = Join-Path (Get-Location).Path $path
        
        if (Test-Path $fullPath -PathType Leaf) {
            $content = [System.IO.File]::ReadAllBytes($fullPath)
            $response.ContentLength64 = $content.Length
            
            if ($path.EndsWith('.html')) { $response.ContentType = 'text/html' }
            elseif ($path.EndsWith('.css')) { $response.ContentType = 'text/css' }
            elseif ($path.EndsWith('.js')) { $response.ContentType = 'application/javascript' }
            
            $output = $response.OutputStream
            $output.Write($content, 0, $content.Length)
            $output.Close()
        } else {
            $response.StatusCode = 404
            $response.Close()
        }
    }
} catch {
    Write-Host "Server stopped."
} finally {
    $listener.Stop()
}
