# Aerospike Node.js Client on Windows [![appveyor][appveyor-image]][appveyor-url]

[appveyor-image]: https://ci.appveyor.com/api/projects/status/1pwlt87blqrmgyis/branch/master?svg=true
[appveyor-url]: https://ci.appveyor.com/project/aerospike/aerospike-client-nodejs/

<a name="Prerequisites"></a>
## Prerequisites

Visual Studio is used to manage the Aerospike Node.js Client on Windows. Many components can be installed using the Visual Studio installer.  Neccessary components include:

* C++ core features
* MSVC (v143 recommended)
* Windows SDK (11 recommended)

Powershell 7 is required to build the project.  DO NOT use Windows Powershell; it will cause your install to fail.

Python 3.11 or below is also required to build the project.

When building the project, make sure the full path of the project directory does not have any spaces. C:\Users\Administrator\Documents\Visual Studio 2022\aerospike will fail to build.
The error given will be `error MSB1008: Only one project can be specified`.

<a name="aerospike-c-client-sdk"></a>
## Aerospike C Client SDK

The Aerospike Node.js client depends on the Aerospike C client. During
installation, a copy of the C client SDK is downloaded and compiled.

Additionally, a set of pre-built, third-party libraries are downloaded and
installed via the
[`aerospike-client-c-dependencies`](https://www.nuget.org/packages/aerospike-client-c-dependencies)
nuget package. These dependencies are required to build the project on Windows. To download these dependencies, use `nuget restore aerospike.sln` inside the `aerospike-client-c/vs` folder, or simply restoring the package inside the solution view of visual studio.

Please refer to the [Aerospike C client
documentation](https://github.com/aerospike/aerospike-client-c/tree/master/vs)
for further information on the visual studio build steps.

## Builidng the C Client dependency

If you are building on a local machine, you will need to build the C Cient dependency. This can be achieved by using the build script located at `scripts\build-package.ps1`

## Install the Aerospike Node.js Client

If you only wish to install the Client, the `aerospike` npm package supports windows installation using [nvm-windows](https://github.com/coreybutler/nvm-windows).

<a name="FAQ"></a>
## Frequently Asked Questions

#### While installing the client, I am getting an error that "build-c-client.ps1 cannot be loaded because running scripts is disabled on this system". What do I need to do?

PowerShell's execution policy prevents you from running the client's installation script. You can temporarily lift the restrictions for the current PowerShell session by running the following command:

    Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope Process

For further information, please refer to the PowerShell documentation [About Execution Policies](https://docs.microsoft.com/en-sg/powershell/module/microsoft.powershell.core/about/about_execution_policies).

#### Distutils has been removed from Python 3.12, which causes my node-gyp build to fail. How can I fix this?

Since Distutils is no longer included in Python after 3.12, it is necessary to install Distutils yourself if using Python 3.12 or above.

The following command should allow you to build with Python 3.12:

    python3 -m pip install packaging

For more information on this topic, see [here.](https://github.com/nodejs/node-gyp/issues/2869)

#### I'm receiving a linking error such as: LINK : fatal error LNK1181: cannot open input file 'libcrypto.lib'

The Windows build uses msbuild and visual studio to control the build and manage dependencies.

If you receive a message like this, you can add an additional path to `AdditionalLibraryDirectories` on the file `aerospike-client-c\vs\"props\nodejs.props"`
