$targets = @{
    'next' = 'c:/Users/user/.homeu-commerce/packages/next'
    'cms' = 'c:/Users/user/.homeu-commerce/packages/davincios'
    'db-postgres' = 'c:/Users/user/.homeu-commerce/packages/db-postgres'
    'richtext-lexical' = 'c:/Users/user/.homeu-commerce/packages/richtext-lexical'
    'graphql' = 'c:/Users/user/.homeu-commerce/apps/website/node_modules/@payloadcms/graphql'
    'ui' = 'c:/Users/user/.homeu-commerce/apps/website/node_modules/@payloadcms/ui'
    'translations' = 'c:/Users/user/.homeu-commerce/apps/website/node_modules/@payloadcms/translations'
    'drizzle' = 'c:/Users/user/.homeu-commerce/apps/website/node_modules/@payloadcms/drizzle'
}

$base = 'c:/Users/user/.homeu-commerce/apps/website/node_modules/@davincios'

foreach ($pkg in $targets.Keys) {
    $path = Join-Path $base $pkg
    $target = $targets[$pkg]
    if (Test-Path $target) {
        New-Item -ItemType Junction -Path $path -Target $target -Force
        Write-Host "Created: $path -> $target"
    } else {
        Write-Host "SKIPPED: $target not found"
    }
}
