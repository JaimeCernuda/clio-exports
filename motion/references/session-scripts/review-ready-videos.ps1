$ErrorActionPreference = 'Stop'
$ndpWorkRoot = 'C:/Users/jaime/Documents/Codex/2026-10-27/i-found-the-earlier-session-on/work'
$ndpRepository = 'D:/Libraries/Documents/projects/clio-exports'
foreach ($ndpSession in @('alta','konza')) {
  $ndpLog = Join-Path $ndpWorkRoot ($ndpSession + '-render.log')
  $ndpDone = $false
  while (-not $ndpDone) {
    if (Test-Path -LiteralPath $ndpLog) { $ndpDone = [bool](Get-Content -LiteralPath $ndpLog -Tail 2 | Select-String -SimpleMatch ('DONE D:\Libraries\Documents\projects\clio-exports\motion\out\ndp-clio-' + $ndpSession + '-v1.mp4')) }
    if (-not $ndpDone) { Start-Sleep -Seconds 5 }
  }
  $ndpVideo = Join-Path $ndpRepository ('motion/out/ndp-clio-' + $ndpSession + '-v1.mp4')
  $ndpFrames = if ($ndpSession -eq 'alta') {5880} else {5940}
  Set-Location -LiteralPath $ndpRepository
  uv run python tools/verify_video.py $ndpVideo --width 1920 --height 1080 --fps 60 --frames $ndpFrames --audio absent --out (Join-Path $ndpWorkRoot ($ndpSession + '-verification.json'))
  if ($LASTEXITCODE -ne 0) { throw 'Verification failed' }
  Set-Location -LiteralPath $ndpWorkRoot
  $ndpChatFilter = 'crop=988:660:60:169,scale=480:320,signalstats,metadata=print:key=lavfi.signalstats.YDIF:file=' + $ndpSession + '-chat-diff.txt'
  ffmpeg -v error -y -threads 2 -i $ndpVideo -vf $ndpChatFilter -an -f null NUL
  if ($LASTEXITCODE -ne 0) { throw 'Chat scan failed' }
  $ndpCanvasFilter = 'crop=808:840:1050:168,scale=480:360,signalstats,metadata=print:key=lavfi.signalstats.YDIF:file=' + $ndpSession + '-canvas-diff.txt'
  ffmpeg -v error -y -threads 2 -i $ndpVideo -vf $ndpCanvasFilter -an -f null NUL
  if ($LASTEXITCODE -ne 0) { throw 'Canvas scan failed' }
  $ndpSheetFilter = "fps=2,scale=480:270,drawtext=fontfile=font.ttf:text='%{pts\:hms}':x=8:y=8:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.65,tile=4x4"
  ffmpeg -v error -y -threads 2 -i $ndpVideo -vf $ndpSheetFilter ($ndpSession + '-review-%02d.png')
  if ($LASTEXITCODE -ne 0) { throw 'Contact sheet generation failed' }
  $ErrorActionPreference = 'Continue'
  ffmpeg -v info -threads 2 -i $ndpVideo -vf 'freezedetect=noise=0.0003:d=6' -an -f null NUL 2> ($ndpSession + '-freeze.log')
  $ndpFreezeExit = $LASTEXITCODE
  $ErrorActionPreference = 'Stop'
  if ($ndpFreezeExit -ne 0) { throw 'Freeze scan failed' }
  node review-ndp-motion.mjs $ndpSession
  if ($LASTEXITCODE -ne 0) { throw 'Motion audit failed' }
  Write-Output ($ndpSession + ' REVIEW READY')
}

