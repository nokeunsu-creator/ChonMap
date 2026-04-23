Add-Type -AssemblyName System.Drawing
$w = 1024
$h = 500
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAliasGridFit'
$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$c1 = [System.Drawing.Color]::FromArgb(255, 196, 150, 26)
$c2 = [System.Drawing.Color]::FromArgb(255, 139, 105, 20)
$grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45.0)
$g.FillRectangle($grad, $rect)
$circle = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(25, 255, 255, 255))
$g.FillEllipse($circle, 820, -120, 340, 340)
$g.FillEllipse($circle, -100, 380, 280, 280)
$titleFont = New-Object System.Drawing.Font('Malgun Gothic', 110, [System.Drawing.FontStyle]::Bold)
$titleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = 'Center'
$fmt.LineAlignment = 'Center'
$titleRect = New-Object System.Drawing.RectangleF(0, 130, $w, 150)
$g.DrawString('촌맵', $titleFont, $titleBrush, $titleRect, $fmt)
$subFont = New-Object System.Drawing.Font('Malgun Gothic', 32)
$subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 245, 240, 224))
$subRect = New-Object System.Drawing.RectangleF(0, 290, $w, 60)
$g.DrawString('한국식 촌수 기반 가계도', $subFont, $subBrush, $subRect, $fmt)
$tagFont = New-Object System.Drawing.Font('Malgun Gothic', 20)
$tagBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 232, 216, 200))
$tagRect = New-Object System.Drawing.RectangleF(0, 370, $w, 40)
$g.DrawString('탭 한 번으로 80가지 호칭이 자동으로 바뀝니다', $tagFont, $tagBrush, $tagRect, $fmt)
$out = 'F:\workspace\ChonMap\android\feature-graphic.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Host "Saved: $out"
