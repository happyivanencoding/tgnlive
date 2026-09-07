[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('Install','Info','Logs','Screenshot','Record')]
    [string]$Action,
    [Parameter(Mandatory=$true)][string]$Serial,
    [string]$Sdk = "$env:LOCALAPPDATA\Android\Sdk",
    [string]$Apk = '',
    [ValidateRange(5,60)][int]$Seconds = 20
)
$ErrorActionPreference = 'Stop'
$android = Split-Path $PSScriptRoot -Parent
$repo = [IO.Path]::GetFullPath((Join-Path $android '..\..'))
$out = Join-Path $repo '.runtime\android\device-pass'
New-Item -ItemType Directory -Force $out | Out-Null
$adb = Join-Path $Sdk 'platform-tools\adb.exe'
if (!(Test-Path $adb)) { throw "Android SDK adb not found: $adb" }
if ($Serial -notmatch '^[A-Za-z0-9_.:\-]+$') { throw 'Invalid explicit device serial' }
# No automatic authorization, key changes, global adb restart, or selection of another device.
$state = & $adb -s $Serial get-state 2>&1
if ($LASTEXITCODE -ne 0 -or (($state -join '').Trim() -ne 'device')) {
    throw 'Device is not available/authorized. Finish normal user-authorized debugging setup before running this script. No authorization changes were attempted.'
}
function Run-Adb([string[]]$Arguments) {
    & $adb -s $Serial @Arguments
    if ($LASTEXITCODE -ne 0) { throw "adb failed: $($Arguments[0])" }
}
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
switch ($Action) {
    'Install' {
        if (!$Apk) { $Apk = Join-Path $android 'app\build\outputs\apk\debug\app-debug.apk' }
        if (!(Test-Path $Apk -PathType Leaf)) { throw "Build the debug APK first: $Apk" }
        Run-Adb @('install','-r',$Apk)
        Run-Adb @('shell','am','start','-W','-n','com.thegreatnovel.tgnlive.debug/com.thegreatnovel.tgnlive.MainActivity')
    }
    'Info' {
        $file = Join-Path $out "$stamp-info.txt"
        "Explicit serial: $Serial`nEmulator results are NOT physical-device acceptance." | Set-Content -Encoding utf8 $file
        foreach ($property in @('ro.product.manufacturer','ro.product.model','ro.build.version.release','ro.build.version.sdk','ro.kernel.qemu')) {
            $value = & $adb -s $Serial shell getprop $property
            "$property=$value" | Add-Content -Encoding utf8 $file
        }
        & $adb -s $Serial shell wm size | Add-Content -Encoding utf8 $file
        & $adb -s $Serial shell wm density | Add-Content -Encoding utf8 $file
        & $adb -s $Serial shell settings get system font_scale | Add-Content -Encoding utf8 $file
        Get-Content $file
    }
    'Logs' {
        $file = Join-Path $out "$stamp-logcat.txt"
        # Bounded snapshot, no HTTP interceptor or token/header/prompt logging.
        & $adb -s $Serial logcat -d -v threadtime 'TGNNativePerf:I' 'AndroidRuntime:E' '*:S' | Set-Content -Encoding utf8 $file
        if ($LASTEXITCODE -ne 0) { throw 'logcat failed' }
        Write-Output $file
    }
    'Screenshot' {
        $remote = "/sdcard/tgn-native-$stamp.png"
        $file = Join-Path $out "$stamp.png"
        Run-Adb @('shell','screencap','-p',$remote)
        Run-Adb @('pull',$remote,$file)
        Run-Adb @('shell','rm',$remote)
        Write-Output $file
    }
    'Record' {
        $remote = "/sdcard/tgn-native-$stamp.mp4"
        $file = Join-Path $out "$stamp.mp4"
        Run-Adb @('shell','screenrecord','--time-limit',"$Seconds",$remote)
        Run-Adb @('pull',$remote,$file)
        Run-Adb @('shell','rm',$remote)
        Write-Output $file
    }
}
Write-Output 'Evidence files are local-only. Inspect for private story/account content before any sharing.'
