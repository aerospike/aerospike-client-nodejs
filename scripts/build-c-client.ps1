# Script parameters
param (
  [Parameter(Mandatory=$true)][string]$NodeLibFile,
  [string]$Configuration = "Release",
  [string]$Platform = "x64",
  [string]$CClientIni = "..\aerospike-client-c.ini",
  [string]$FileHashesIni = "..\aerospike-client-c.sha256"
)

# Required to unzip files
Add-Type -AssemblyName System.IO.Compression.FileSystem

# Utility module to invoke MSBuild tool
Import-Module "..\scripts\Invoke-MsBuild.psm1"

# Parse name-value pairs, separated by "=" or another separator, from the given
# file.
function Parse-IniFile {
	param(
		[Parameter(Mandatory=$true)][string]$file,
		[string]$sep,
		[switch]$swap=$false
	)

	$ini = Get-Content $file
	if ($sep) {
	  $ini = $ini -replace $sep, "="
	}
	if ($swap) {
		$ini = $ini -replace "^(\w+)=(.+)$", "`$2=`$1"
	}
	return ConvertFrom-StringData($ini -join "`n")
}

# Download a file and check it's SHA256 checksum.
function Download {
	param(
		[string]$uri,
		[string]$outfile,
		[string]$hash
	)

	Write-Host "Downloading ${uri} to ${outfile}"
	Invoke-WebRequest -Uri $uri -OutFile $outfile
	$sha256 = (Get-FileHash $outfile -Algorithm Sha256).Hash
	Write-Verbose "Validating ${outfile} checksum (expected: ${hash})"
	if (! $sha256 -eq $hash) {
		Write-Error "Checksum mis-match: ${outfile} - expected: ${hash}, actual: ${sha256}"
		throw "Checksum mis-match: ${outfile} - expected: ${hash}, actual: ${sha256}"
	}
}

# Uncompress a zip archive.
function Unzip {
	param(
		[string]$zipfile,
		[string]$outpath = (Resolve-Path ".\")
	)

	Write-Verbose "Expanding ${zipfile} archive to ${outpath}"
	$zipfile = Resolve-Path $zipfile
	New-Item -Path $outpath -ItemType "directory" -Force | out-null
	[System.IO.Compression.ZipFile]::ExtractToDirectory($zipfile, $outpath)
}

# Downloads and unpacks a zip-compressed archive from the given URL.
function Install-Package {
	param(
		[string]$uri,
		[string]$archive,
		[string]$hash,
		[string]$outpath,
		[switch]$createDir = $false
	)

	if (! (Test-Path $outpath)) {
		if (! (Test-Path $archive)) {
			Download $uri $archive $hash
		}
		if ($createDir) {
			Unzip $archive $outpath
		} else {
			Unzip $archive ".\"
		}
	}
}

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
	$logfile = "$(Split-Path $projectfile -Leaf).msbuild.log"
	return Select-String -Path $logfile -Pattern "Build succeeded." -SimpleMatch -Quiet
}

$CClientCfg = Parse-IniFile $CClientIni
Write-Debug ($CClientCfg | Out-String)
$FileHashes = Parse-IniFile $FileHashesIni -sep "  " -swap
Write-Debug ($FileHashes | Out-String)

# Install C client source package
Write-Host "Installing Aerospike C client source package"
$CClientVersion = $CClientCfg["AEROSPIKE_C_VERSION"]
$CClientSrcPath = "aerospike-client-c-src-${CClientVersion}"
$CClientArchive = "${CClientSrcPath}.zip"
$CClientUrl = "https://artifacts.aerospike.com/aerospike-client-c/${CClientVersion}/${CClientArchive}"
$CClientArchiveHash = $FileHashes[$CClientArchive]
Install-Package -uri $CClientUrl -archive $CClientArchive -outpath $CClientSrcPath -hash $CClientArchiveHash

# Install C client dependencies package
Write-Host "Installing Aerospike C client dependencies"
$CClientDepsVersion = $CClientCfg["AEROSPIKE_C_DEPS_VERSION"]
$CClientDepsSrcPath = "aerospike-client-c-dependencies.${CClientDepsVersion}"
$CClientDepsArchive = "${CClientDepsSrcPath}.zip"
$CClientDepsUrl = "https://www.nuget.org/api/v2/package/aerospike-client-c-dependencies/${CClientDepsVersion}"
$CClientDepsArchiveHash = $FileHashes[$CClientDepsArchive]
Install-Package -uri $CClientDepsUrl -archive $CClientDepsArchive -outpath $CClientDepsSrcPath -hash $CClientDepsArchiveHash -createdir

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
