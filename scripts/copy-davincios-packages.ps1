$targetDir = 'c:/Users/user/.homeu-commerce/apps/website/node_modules/@davincios'

# Local packages (copy package.json + dist/)
$localPackages = @{
    'next' = 'c:/Users/user/.homeu-commerce/packages/next'
    'cms' = 'c:/Users/user/.homeu-commerce/packages/davincios'
    'db-postgres' = 'c:/Users/user/.homeu-commerce/packages/db-postgres'
    'richtext-lexical' = 'c:/Users/user/.homeu-commerce/packages/richtext-lexical'
}

Write-Host "=== Copying local packages ==="
foreach ($pkg in $localPackages.Keys) {
    $src = $localPackages[$pkg]
    $dest = Join-Path $targetDir $pkg
    Write-Host "Copying $pkg from $src to $dest..."
    
    # Create destination directory
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
    
    # Copy package.json
    Copy-Item (Join-Path $src 'package.json') (Join-Path $dest 'package.json') -Force
    
    # Copy dist/ directory
    if (Test-Path (Join-Path $src 'dist')) {
        Copy-Item (Join-Path $src 'dist') $dest -Recurse -Force
    }
    
    # Copy bin.js if it exists (for cms package)
    if (Test-Path (Join-Path $src 'bin.js')) {
        Copy-Item (Join-Path $src 'bin.js') $dest -Force
    }
    
    # Copy LICENSE.md if it exists
    if (Test-Path (Join-Path $src 'LICENSE.md')) {
        Copy-Item (Join-Path $src 'LICENSE.md') $dest -Force
    }
    
    # Copy README.md if it exists
    if (Test-Path (Join-Path $src 'README.md')) {
        Copy-Item (Join-Path $src 'README.md') $dest -Force
    }
}

# PayloadCMS aliases (copy package.json + dist/ from @payloadcms/*)
$payloadAliases = @{
    'graphql' = 'c:/Users/user/.homeu-commerce/apps/website/node_modules/@payloadcms/graphql'
    'ui' = 'c:/Users/user/.homeu-commerce/apps/website/node_modules/@payloadcms/ui'
    'translations' = 'c:/Users/user/.homeu-commerce/apps/website/node_modules/@payloadcms/translations'
    'drizzle' = 'c:/Users/user/.homeu-commerce/apps/website/node_modules/@payloadcms/drizzle'
}

Write-Host "=== Copying PayloadCMS aliases ==="
foreach ($pkg in $payloadAliases.Keys) {
    $src = $payloadAliases[$pkg]
    $dest = Join-Path $targetDir $pkg
    Write-Host "Copying $pkg from $src to $dest..."
    
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
    
    # Copy package.json
    Copy-Item (Join-Path $src 'package.json') (Join-Path $dest 'package.json') -Force
    
    # Copy entire package contents
    Get-ChildItem -Path $src -Exclude 'node_modules' | ForEach-Object {
        $itemDest = Join-Path $dest $_.Name
        if ($_.PSIsContainer) {
            Copy-Item $_.FullName $dest -Recurse -Force
        } else {
            Copy-Item $_.FullName $dest -Force
        }
    }
}

Write-Host "=== Done ==="
