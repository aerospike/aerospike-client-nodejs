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
    rm('lib/binding/node-v120-win32-x64', { recursive: true, force: true })
    rm('lib/binding/node-v115-win32-x64', { recursive: true, force: true })
    rm('lib/binding/node-v108-win32-x64', { recursive: true, force: true })
    if (arch === 'x64') {
      rm('lib/binding/node-v120-darwin-arm64', { recursive: true, force: true })
      rm('lib/binding/node-v115-darwin-arm64', { recursive: true, force: true })
      rm('lib/binding/node-v108-darwin-arm64', { recursive: true, force: true })
    } else {
      rm('lib/binding/node-v120-darwin-x64', { recursive: true, force: true })
      rm('lib/binding/node-v115-darwin-x64', { recursive: true, force: true })
      rm('lib/binding/node-v108-darwin-x64', { recursive: true, force: true })
    }
    await rm('lib/binding/openssl@3', { recursive: true, force: true })
    await rm('lib/binding/openssl@1', { recursive: true, force: true })
  } else if (platform === 'win32') {
    rm('lib/binding/node-v120-darwin-arm64', { recursive: true, force: true })
    rm('lib/binding/node-v115-darwin-arm64', { recursive: true, force: true })
    rm('lib/binding/node-v108-darwin-arm64', { recursive: true, force: true })
    rm('lib/binding/node-v120-darwin-x64', { recursive: true, force: true })
    rm('lib/binding/node-v115-darwin-x64', { recursive: true, force: true })
    rm('lib/binding/node-v108-darwin-x64', { recursive: true, force: true })
    await rm('lib/binding/openssl@3', { recursive: true, force: true })
    await rm('lib/binding/openssl@1', { recursive: true, force: true })
  } else {
    rm('lib/binding/node-v120-win32-x64', { recursive: true, force: true })
    rm('lib/binding/node-v115-win32-x64', { recursive: true, force: true })
    rm('lib/binding/node-v108-win32-x64', { recursive: true, force: true })
    rm('lib/binding/node-v120-darwin-arm64', { recursive: true, force: true })
    rm('lib/binding/node-v115-darwin-arm64', { recursive: true, force: true })
    rm('lib/binding/node-v108-darwin-arm64', { recursive: true, force: true })
    rm('lib/binding/node-v120-darwin-x64', { recursive: true, force: true })
    rm('lib/binding/node-v115-darwin-x64', { recursive: true, force: true })
    rm('lib/binding/node-v108-darwin-x64', { recursive: true, force: true })

    const output = await exec("ldd --version | awk 'NR==1{print $NF}'")
    const version = Number(output.stdout)

    let openssl
    if (version < 2.33) {
      openssl = '1'
    } else {
      openssl = '3'
    }

    if (arch === 'x64') {
      await rename('lib/binding/openssl@' + openssl + '/node-v120-linux-x64', 'lib/binding/node-v120-linux-x64')
      await rename('lib/binding/openssl@' + openssl + '/node-v115-linux-x64', 'lib/binding/node-v115-linux-x64')
      await rename('lib/binding/openssl@' + openssl + '/node-v108-linux-x64', 'lib/binding/node-v108-linux-x64')
    } else {
      await rename('lib/binding/openssl@' + openssl + '/node-v120-linux-arm64', 'lib/binding/node-v120-linux-arm64')
      await rename('lib/binding/openssl@' + openssl + '/node-v115-linux-arm64', 'lib/binding/node-v115-linux-arm64')
      await rename('lib/binding/openssl@' + openssl + '/node-v108-linux-arm64', 'lib/binding/node-v108-linux-arm64')
    }
    await rm('lib/binding/openssl@3', { recursive: true, force: true })
    await rm('lib/binding/openssl@1', { recursive: true, force: true })
  }
})()
