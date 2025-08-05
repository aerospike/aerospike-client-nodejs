# Script parameters
param (
  [Parameter(Mandatory=$true)][string]$NodeLibFile,
  [string]$Configuration = "Release",
  [string]$Platform = "x64",
  [string]$CClientIni = "..\aerospike-client-c.ini",
  [string]$FileHashesIni = "..\aerospike-client-c.sha256",
  [string]$OpenSSLIni = "..\openssl-native.ini",
  [string]$OpenSSLHashesIni = "..\openssl-native.sha256",
  [string]$LuaIni = "..\lua.ini",
  [string]$LuaHashesIni = "..\lua.sha256",
  [string]$LibYamlIni = "..\libyaml.ini",
  [string]$LibYamlHashesIni = "..\libyaml.sha256"
)

Write-Host "NodeLibFile: $NodeLibFile"

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

	# debug
	$verbose = $true

	$params = "${params} /nr:False /m:4"
	$logdir = Resolve-Path ".\"
	Write-Host "Building VS project ${projectfile} using build params `"${params}`""

	$buildResult = Invoke-MsBuild  -Path $projectfile -Params $params -BuildLogDirectory $logdir -ShowBuildOutputInCurrentWindow
	# while (!$process.HasExited) {
	# 	Start-Sleep -Seconds 1
	# 	if (!$verbose) { Write-Host "." -NoNewline }
	# }
	# if (!$verbose) { Write-Host "" }

	if ($buildResult.BuildSucceeded -eq $true)
    {
        Write-Output ("Build completed successfully in {0:N1} seconds." -f $buildResult.BuildDuration.TotalSeconds)
    }
    elseif ($buildResult.BuildSucceeded -eq $false)
    {
        Write-Output ("Build failed after {0:N1} seconds. Check the build log file '$($buildResult.BuildLogFilePath)' for errors." -f $buildResult.BuildDuration.TotalSeconds)
    }
    elseif ($null -eq $buildResult.BuildSucceeded)
    {
        Write-Output "Unsure if build passed or failed: $($buildResult.Message)"
    }

	return $process.BuildSucceeded
}

$CClientCfg = Parse-IniFile $CClientIni
Write-Host ($CClientCfg | Out-String)

$OpenSSLCfg = Parse-IniFile $OpenSSLIni
Write-Host ($OpenSSLCfg | Out-String)

$LuaCfg = Parse-IniFile $LuaIni
Write-Host ($LuaCfg | Out-String)

$LibYamlCfg = Parse-IniFile $LibYamlIni
Write-Host ($LibYamlCfg | Out-String)

$FileHashes = Parse-IniFile $FileHashesIni -sep "  " -swap
Write-Host ($FileHashes | Out-String)

$OpenSSlHashes = Parse-IniFile $OpenSSLIni -sep "  " -swap
Write-Host ($OpenSSlHashes | Out-String)

$LuaHashes = Parse-IniFile $LuaIni -sep "  " -swap
Write-Host ($LibYamlHashes | Out-String)

$LibYamlHashes = Parse-IniFile $LibYamlIni -sep "  " -swap
Write-Host ($FileHashes | Out-String)

# C client path
Write-Host "Setting Aerospike C client source path"
$CClientSrcPath = "..\aerospike-client-c"

# Install C client dependencies package
Write-Host "Installing Aerospike C client dependencies"
$CClientDepsVersion = $CClientCfg["AEROSPIKE_C_DEPS_VERSION"]
$CClientDepsSrcPath = "aerospike-client-c-dependencies.${CClientDepsVersion}"
$CClientDepsArchive = "${CClientDepsSrcPath}.zip"
$CClientDepsUrl = "https://www.nuget.org/api/v2/package/aerospike-client-c-dependencies/${CClientDepsVersion}"
$CClientDepsArchiveHash = $FileHashes[$CClientDepsArchive]
Install-Package -uri $CClientDepsUrl -archive $CClientDepsArchive -outpath $CClientDepsSrcPath -hash $CClientDepsArchiveHash -createdir

# Install C openssl package
Write-Host "Installing Aerospike C client dependencies"

# Add ini file implementation later
#$OpenSSLVersion = $OpenSSLCfg["OPENSSL_VERSION"]
$OpenSSLVersion = "3.0.16"
$OpenSSLSrcPath = "openssl-native.${OpenSSLVersion}"
$OpenSSLArchive = "${OpenSSLSrcPath}.zip"
$OpenSSLUrl = "https://www.nuget.org/api/v2/package/openssl-native/${OpenSSLVersion}"

# Add hash file implementation later
# $OpenSSLArchiveHash = $OpenSSlHashes[$OpenSSLArchive]

Install-Package -uri $OpenSSLUrl -archive $OpenSSLArchive -outpath $OpenSSLSrcPath -hash "DA3A142BD072B0FFEBA67FE0C178D152EF8276A6469D6F80D6FE497C905C48EC" -createdir

# Install LUA package
Write-Host "Installing lua"

# Add ini file implementation later
# $LuaVersion = $LuaCfg["OPENSSL_VERSION"]

$LuaVersion = "5.4.6"
$LuaSrcPath = "lua.${LuaVersion}"
$LuaArchive = "${LuaSrcPath}.zip"
$LuaUrl = "https://www.nuget.org/api/v2/package/lua/${LuaVersion}"

# Add hash file implementation later
# $LuaArchiveHash = $LuaHashes[$LuaArchive]

Install-Package -uri $LuaUrl -archive $LuaArchive -outpath $LuaSrcPath -hash "D8D6B5CCA02B3E11C38DD9A4373CAC62E968C35DFAD750C7CDDD88EAA9223034"	 -createdir

#Install libyaml package
Write-Host "Installing libyaml"

# Add ini file implementation later
# $LibYamlVersion = $LibYamlCfg["LIBYAML_VERSION"]

$LibYamlVersion = "0.2.5.12"
$LibYamlSrcPath = "libyaml.${LibYamlVersion}"
$LibYamlArchive = "${LibYamlSrcPath}.zip"
$LibYamlUrl = "https://www.nuget.org/api/v2/package/libyaml/${LibYamlVersion}"

# Add hash file implementation later
# #$LibYamlArchiveHash = $LibYamlHashes[$LibYamlArchive]

Install-Package -uri $LibYamlUrl -archive $LibYamlArchive -outpath $LibYamlSrcPath -hash "DA3A142BD072B0FFEBA67FE0C178D152EF8276A6469D6F80D6FE497C905C48EC" -createdir

$ProjectFile = Resolve-Path (Join-Path $CClientSrcPath "vs\aerospike\aerospike.vcxproj")
$NodePath = Split-Path $NodeLibFile -Parent
$CClientConfiguration = "${Configuration} nodejs"
$PackagesPath = Resolve-Path ".\"
$BuildParams = "/p:Configuration=`"$CClientConfiguration`" /p:Platform=$Platform /p:NodejsPath=$NodePath /p:PackagesPath=$PackagesPath"
Write-Host "ProjectFile: $ProjectFile"
$BuildSuccess = Build-Project $ProjectFile $BuildParams
if (! $BuildSuccess) {
	Write-Error -Message "Failed to build aerospike-client-c dependency"
	throw "Failed to build aerospike-client-c dependency"
}

# Copy header files
$TargetPath = "..\aerospike-client-c-output"
New-Item -Path $TargetPath/include, $TargetPath/include/aerospike, $TargetPath/include/citrusleaf -ItemType "directory" -Force | out-null
Copy-Item $CClientDepsSrcPath\build\native\include\*.h $TargetPath\include -Include pthread.h,_ptw32.h,sched.h
Copy-Item $CClientSrcPath\src\include\aerospike\*.h $TargetPath\include\aerospike -Exclude as_tls.h
Copy-Item $CClientSrcPath\modules\common\src\include\aerospike\*.h $TargetPath\include\aerospike -Exclude ssl_util.h
Copy-Item $CClientSrcPath\modules\common\src\include\citrusleaf\*.h $TargetPath\include\citrusleaf -Exclude cf_crypto.h

# Copy library files
New-Item -Path $TargetPath/lib -ItemType "directory" -Force | out-null
Copy-Item $CClientDepsSrcPath\build\native\lib\$Platform\$Configuration\*.lib $TargetPath\lib

Copy-Item $CClientSrcPath\vs\aerospike\$Platform\$CClientConfiguration\aerospike.lib $TargetPath\lib

Copy-Item $OpenSSLSrcPath\lib\win-$Platform\native\libssl.lib $TargetPath\lib
Copy-Item $OpenSSLSrcPath\lib\win-$Platform\native\libcrypto.lib $TargetPath\lib

Copy-Item $LuaSrcPath\build\native\lib\$Platform\v143\Release\lua.lib $TargetPath\lib

Copy-Item $LibYamlSrcPath\build\native\lib\v142\$Platform\Release\yaml.lib $TargetPath\lib


# Copy dlls
New-Item -Path $Configuration -ItemType "directory" -Force | out-null
Copy-Item $CClientDepsSrcPath\build\native\lib\$Platform\$Configuration\*.dll $Configuration -Exclude libuv.dll
# Need pthreadVC2.dll (Release) even for Debug configuration!
Copy-Item $CClientDepsSrcPath\build\native\lib\$Platform\Release\pthreadVC2.dll $Configuration
Copy-Item $CClientSrcPath\vs\aerospike\$Platform\$CClientConfiguration\aerospike.dll $Configuration

Copy-Item $OpenSSLSrcPath\runtimes\win-$Platform\native\libcrypto-3-x64.dll $Configuration
Copy-Item $OpenSSLSrcPath\runtimes\win-$Platform\native\libssl-3-x64.dll $Configuration

Copy-Item $LuaSrcPath\build\native\bin\$Platform\v143\Release\lua.dll $Configuration

Write-Verbose "Successfully build aerospike-client-c dependency"