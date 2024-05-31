const os = require('node:os')
const fs = require('fs')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const rename = util.promisify(fs.rename)
const rm = util.promisify(fs.rm)

;(async function () {
  const platform = await os.platform()

  const arch = await os.arch()

  if (platform === 'darwin') {
    console.log("Darwin binaries")
    rm('lib/binding/node-v127-win32-x64', { recursive: true, force: true })
    rm('lib/binding/node-v115-win32-x64', { recursive: true, force: true })
    rm('lib/binding/node-v108-win32-x64', { recursive: true, force: true })
    if (arch === 'x64') {
      rm('lib/binding/node-v127-darwin-arm64', { recursive: true, force: true })
      rm('lib/binding/node-v115-darwin-arm64', { recursive: true, force: true })
      rm('lib/binding/node-v108-darwin-arm64', { recursive: true, force: true })
    } else {
      rm('lib/binding/node-v127-darwin-x64', { recursive: true, force: true })
      rm('lib/binding/node-v115-darwin-x64', { recursive: true, force: true })
      rm('lib/binding/node-v108-darwin-x64', { recursive: true, force: true })
    }
    await rm('lib/binding/glibc@3', { recursive: true, force: true })
    await rm('lib/binding/glibc@1', { recursive: true, force: true })
  } else if (platform === 'win32') {
    console.log("Windows binaries")
    rm('lib/binding/node-v127-darwin-arm64', { recursive: true, force: true })
    rm('lib/binding/node-v115-darwin-arm64', { recursive: true, force: true })
    rm('lib/binding/node-v108-darwin-arm64', { recursive: true, force: true })
    rm('lib/binding/node-v127-darwin-x64', { recursive: true, force: true })
    rm('lib/binding/node-v115-darwin-x64', { recursive: true, force: true })
    rm('lib/binding/node-v108-darwin-x64', { recursive: true, force: true })
    await rm('lib/binding/glibc@3', { recursive: true, force: true })
    await rm('lib/binding/glibc@1', { recursive: true, force: true })
  } else {
    console.log("Linux binaries")
    rm('lib/binding/node-v127-win32-x64', { recursive: true, force: true })
    rm('lib/binding/node-v115-win32-x64', { recursive: true, force: true })
    rm('lib/binding/node-v108-win32-x64', { recursive: true, force: true })
    rm('lib/binding/node-v127-darwin-arm64', { recursive: true, force: true })
    rm('lib/binding/node-v115-darwin-arm64', { recursive: true, force: true })
    rm('lib/binding/node-v108-darwin-arm64', { recursive: true, force: true })
    rm('lib/binding/node-v127-darwin-x64', { recursive: true, force: true })
    rm('lib/binding/node-v115-darwin-x64', { recursive: true, force: true })
    rm('lib/binding/node-v108-darwin-x64', { recursive: true, force: true })
    await rm('lib/binding/node-v115-darwin-x64', { recursive: true, force: true })
    await rm('lib/binding/node-v108-darwin-x64', { recursive: true, force: true })

    const output = await exec("ldd --version | awk 'NR==1{print $NF}'")
    const version = Number(output.stdout)

    let glibc
    if (version < 2.39) {
      if (version < 2.35) {
        glibc = '2.31'
      } else {
        glibc = '2.35'
      }
    } else {
      glibc = '2.39'
    }
    console.log("GLIBC version: " + glibc)
    console.log("ARCH: " + arch)
    if (arch === 'x64') {
      await rename('lib/binding/glibc@' + glibc + '/node-v127-linux-x64', 'lib/binding/node-v127-linux-x64')
      await rename('lib/binding/glibc@' + glibc + '/node-v115-linux-x64', 'lib/binding/node-v115-linux-x64')
      await rename('lib/binding/glibc@' + glibc + '/node-v108-linux-x64', 'lib/binding/node-v108-linux-x64')
    } else {
      await rename('lib/binding/glibc@' + glibc + '/node-v127-linux-arm64', 'lib/binding/node-v127-linux-arm64')
      await rename('lib/binding/glibc@' + glibc + '/node-v115-linux-arm64', 'lib/binding/node-v115-linux-arm64')
      await rename('lib/binding/glibc@' + glibc + '/node-v108-linux-arm64', 'lib/binding/node-v108-linux-arm64')
    }
    await rm('lib/binding/glibc@2.31', { recursive: true, force: true })
    await rm('lib/binding/glibc@2.35', { recursive: true, force: true })
    await rm('lib/binding/glibc@2.39', { recursive: true, force: true })
  }
})()
