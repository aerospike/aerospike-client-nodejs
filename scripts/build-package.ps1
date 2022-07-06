# Script parameters
param (
	[string]$AS_HOST="bob-cluster-a",
	[string]$AS_USER="generic_client",
	[string]$AS_PWD="generic_client",
	[string]$AS_PORT="3000",
	[string]$AS_NAMESPACE="test"
)

function build_nodejs_client {
	param(
		[string]$NODE_VERSION
	)
#  Remove-Item –LiteralPath ".\\node_modules" -Force -Recurse
#  Remove-Item ".\\package-lock.json"
  nvm install $NODE_VERSION
  nvm use $NODE_VERSION
  npm install --unsafe-perm --build-from-source
  # node ${CWD}/node_modules/.bin/mocha --exit --U ${AS_USER} --P ${AS_PWD} --h ${AS_HOST} --port ${AS_PORT} --namespace ${AS_NAMESPACE}
}

# Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope Process -Force
# Invoke-WebRequest https://github.com/coreybutler/nvm-windows/releases/download/1.1.9/nvm-setup.exe -UseBasicParsing -OutFile .\nvm-setup.exe
# .\nvm-setup.exe /VERYSILENT /SUPRESSMSGBOXES /SP
# nvm root .\nvm

# pwd

# cd $Env:USERPROFILE;
# Invoke-WebRequest https://raw.githubusercontent.com/jchip/nvm/v1.5.4/install.ps1 -OutFile install.ps1;
# .\install.ps1 -nvmhome $Env:USERPROFILE\nvm;
# del install.ps1

# cd D:\a\aerospike-client-nodejs\aerospike-client-nodejs
 
build_nodejs_client v10.20.0
build_nodejs_client v12.22.10
build_nodejs_client v14.19.0
build_nodejs_client v16.14.0
build_nodejs_client v17.8.0
build_nodejs_client v18.0.0

nvm use v16.14.0
