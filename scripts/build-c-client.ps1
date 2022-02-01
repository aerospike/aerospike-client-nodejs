# Script parameters
param (
  [Parameter(Mandatory=$true)][string]$NodeLibFile,
  [string]$Configuration = "Release",
  [string]$Platform = "x64"
)

# Required to unzip files
Add-Type -AssemblyName System.IO.Compression.FileSystem

# Utility module to invoke MSBuild tool
Import-Module "..\scripts\Invoke-MsBuild.psm1"

# Builds a VS project
function Build-Project {
	param(
		[string]$projectfile,
		[string]$params,
		[switch]$verbose = ($VerbosePreference -ne 'SilentlyContinue')
	)

	$params = "${params} /nr:False /m:4"
	$logdir = Resolve-Path ".\"
	Write-Host "Building VS project ${projectfile} using build params `"${params}`""
	$process = Invoke-MsBuild -PassThru -Path $projectfile -Params $params -BuildLogDirectory $logdir -ShowBuildOutputInCurrentWindow:$verbose
	while (!$process.HasExited) {
		Start-Sleep -Seconds 1
		if (!$verbose) { Write-Host "." -NoNewline }
	}
	if (!$verbose) { Write-Host "" }
	return $process.ExitCode -eq 0
}

$ProjectFile = Resolve-Path (Join-Path $CClientSrcPath "vs\aerospike\aerospike.vcxproj")
$NodePath = Split-Path $NodeLibFile -Parent
$CClientConfiguration = "${Configuration} nodejs"
$PackagesPath = Resolve-Path ".\"
$BuildParams = "/p:Configuration=`"$CClientConfiguration`" /p:Platform=$Platform /p:NodejsPath=$NodePath /p:PackagesPath=$PackagesPath"
$BuildSuccess = Build-Project $ProjectFile $BuildParams
if (-not $BuildSuccess) {
	Write-Error -Message "Failed to build aerospike-client-c dependency"
	throw "Failed to build aerospike-client-c dependency"
}

# Copy header files
$TargetPath = "..\aerospike-client-c"
New-Item -Path $TargetPath/include, $TargetPath/include/aerospike, $TargetPath/include/citrusleaf -ItemType "directory" -Force | out-null
Copy-Item $CClientDepsSrcPath\build\native\include\*.h $TargetPath\include -Include pthread.h,_ptw32.h,sched.h
Copy-Item $CClientSrcPath\src\include\aerospike\*.h $TargetPath\include\aerospike -Exclude as_tls.h
Copy-Item $CClientSrcPath\modules\common\src\include\aerospike\*.h $TargetPath\include\aerospike -Exclude ssl_util.h
Copy-Item $CClientSrcPath\modules\common\src\include\citrusleaf\*.h $TargetPath\include\citrusleaf -Exclude cf_crypto.h

# Copy library files
New-Item -Path $TargetPath/lib -ItemType "directory" -Force | out-null
Copy-Item $CClientDepsSrcPath\build\native\lib\$Platform\$Configuration\*.lib $TargetPath\lib
Copy-Item $CClientSrcPath\vs\aerospike\$Platform\$CClientConfiguration\aerospike.lib $TargetPath\lib

# Copy dlls
New-Item -Path $Configuration -ItemType "directory" -Force | out-null
Copy-Item $CClientDepsSrcPath\build\native\lib\$Platform\$Configuration\*.dll $Configuration -Exclude libuv.dll
# Need pthreadVC2.dll (Release) even for Debug configuration!
Copy-Item $CClientDepsSrcPath\build\native\lib\$Platform\Release\pthreadVC2.dll $Configuration
Copy-Item $CClientSrcPath\vs\aerospike\$Platform\$CClientConfiguration\aerospike.dll $Configuration

Write-Verbose "Successfully build aerospike-client-c dependency"
