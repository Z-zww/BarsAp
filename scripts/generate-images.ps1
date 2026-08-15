$ErrorActionPreference = 'Stop'
$drinksPath = 'F:\BarsAp\drinker\server\data\drinks.json'
$outDir = 'F:\BarsAp\drinker\server\public\img'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Add-Type -AssemblyName System.Drawing

$drinks = Get-Content $drinksPath -Raw -Encoding UTF8 | ConvertFrom-Json

$colors = @{
  'old-fashioned' = @('#6B4226','#B98A5E')
  'margarita' = @('#2F7A4D','#8FCF8A')
  'mojito' = @('#2E6B4E','#7CC49A')
  'cosmopolitan' = @('#B54A6A','#E89AB2')
  'negroni' = @('#A03A28','#E07B5A')
  'espresso-martini' = @('#33261E','#6B5240')
  'pina-colada' = @('#C78B1F','#F0C95E')
  'gin-tonic' = @('#2A6B6E','#7FBFC0')
  'hot-toddy' = @('#9C6A22','#D8A655')
  'daiquiri' = @('#4E8738','#A2C968')
  'whisky-sour' = @('#8F5A2E','#C89A5E')
  'aperol-spritz' = @('#C65A22','#F09050')
  'bloody-mary' = @('#9C2822','#D96855')
  'virgin-mojito' = @('#3E8F64','#94CDA8')
}

foreach ($d in $drinks) {
  $slug = [string]$d.id
  $c = $colors[$slug]
  if (-not $c) { Write-Warning ('no color for ' + $slug); continue }
  $c1 = [System.Drawing.ColorTranslator]::FromHtml($c[0])
  $c2 = [System.Drawing.ColorTranslator]::FromHtml($c[1])
  $bmp = New-Object System.Drawing.Bitmap 800,500
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
  $rect = New-Object System.Drawing.Rectangle 0,0,800,500
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
  $g.FillRectangle($brush, $rect)
  $white = [System.Drawing.Brushes]::White
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $font1 = New-Object System.Drawing.Font('Microsoft YaHei', 54, [System.Drawing.FontStyle]::Bold)
  $g.DrawString([string]$d.name, $font1, $white, (New-Object System.Drawing.RectangleF 20,160,760,110), $sf)
  $font2 = New-Object System.Drawing.Font('Microsoft YaHei', 26)
  $g.DrawString([string]$d.nameEn, $font2, $white, (New-Object System.Drawing.RectangleF 20,295,760,60), $sf)
  $g.Dispose()
  $bmp.Save((Join-Path $outDir ($slug + '.png')), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output ('generated ' + $slug + '.png')
}
Write-Output 'DONE'
