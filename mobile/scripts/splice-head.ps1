param(
  [Parameter(Mandatory)] [string] $Target,
  [Parameter(Mandatory)] [string] $Head,
  [string] $Marker = 'const styles = StyleSheet.create({'
)

$utf8 = New-Object Text.UTF8Encoding($false)
$targetPath = (Resolve-Path -LiteralPath $Target).Path
$headPath = (Resolve-Path -LiteralPath $Head).Path

$text = [IO.File]::ReadAllText($targetPath, $utf8)
$index = $text.IndexOf($Marker)
if ($index -lt 0) { throw "Marker not found in $Target" }

$headText = [IO.File]::ReadAllText($headPath, $utf8)
[IO.File]::WriteAllText($targetPath, $headText + $text.Substring($index), $utf8)
Remove-Item -LiteralPath $headPath
"spliced $Target"
