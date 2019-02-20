# Aerospike Node.js Client on Windows [![appveyor][appveyor-image]][appveyor-url]

[appveyor-image]: https://ci.appveyor.com/api/projects/status/1pwlt87blqrmgyis/branch/master?svg=true
[appveyor-url]: https://ci.appveyor.com/project/aerospike/aerospike-client-nodejs/

The Aerospike Node.js client port to Windows is a community supported project
and suitable for application prototyping and development.

<a name="Prerequisites"></a>
## Prerequisites

* Windows 7 or later
* Visual C++ 2015 Build Tools or later
* Node.js v6.x (LTS) or later

The package includes a native add-on. To compile the add-on, Microsoft's Visual
C++ Build Tools 2015 are required. The easiest way to install the build tools,
is to install the [`windows-build-tools`
](https://www.npmjs.com/package/windows-build-tools) package using npm.

The Aerospike Node.js client depends on the Aerospike C client. During
installation, a copy of the C client SDK is downloaded and compiled.
Additionally set of pre-built, third-party libraries are downloaded and
installed via the
[`aerospike-client-c-dependencies`](https://www.nuget.org/packages/aerospike-client-c-dependencies)
nuget package. Please refer to the [Aerospike C client
documentation](https://github.com/aerospike/aerospike-client-c/tree/master/vs)
for further information.
