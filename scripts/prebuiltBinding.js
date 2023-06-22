const fs = require('fs')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const rename = util.promisify(fs.rename)
const rm = util.promisify(fs.rm)
const dict = {
  Linux: 'linux',
  Darwin: 'darwin',
  arm64: 'arm64',
  x86_64: 'x64',
  aarch64: 'arm64'
}

;(async function () {
  let output = await exec('uname -s')
  const os = output.stdout.trim()
  output = await exec('uname -m')
  const arch = output.stdout.trim()
  output = await exec('openssl version')
  const version = output.stdout
  const openssl = version.split(' ')[1].slice(0, 1)
  const deleteList = []
  if (dict[os] === 'linux') {
    deleteList.push('lib/binding/node-v115-darwin-arm64')
    deleteList.push('lib/binding/node-v111-darwin-arm64')
    deleteList.push('lib/binding/node-v108-darwin-arm64')
    deleteList.push('lib/binding/node-v93-darwin-arm64')
    deleteList.push('lib/binding/node-v115-darwin-x64')
    deleteList.push('lib/binding/node-v111-darwin-x64')
    deleteList.push('lib/binding/node-v108-darwin-x64')
    deleteList.push('lib/binding/node-v93-darwin-x64')

    if (dict[arch] === 'arm64') {
      await rename('lib/binding/openssl@' + openssl + '/node-v115-linux-arm64', 'lib/binding/node-v115-linux-arm64')
      await rename('lib/binding/openssl@' + openssl + '/node-v111-linux-arm64', 'lib/binding/node-v111-linux-arm64')
      await rename('lib/binding/openssl@' + openssl + '/node-v108-linux-arm64', 'lib/binding/node-v108-linux-arm64')
      await rename('lib/binding/openssl@' + openssl + '/node-v93-linux-arm64', 'lib/binding/node-v93-linux-arm64')
    } else {
      await rename('lib/binding/openssl@' + openssl + '/node-v115-linux-x64', 'lib/binding/node-v115-linux-x64')
      await rename('lib/binding/openssl@' + openssl + '/node-v111-linux-x64', 'lib/binding/node-v111-linux-x64')
      await rename('lib/binding/openssl@' + openssl + '/node-v108-linux-x64', 'lib/binding/node-v108-linux-x64')
      await rename('lib/binding/openssl@' + openssl + '/node-v93-linux-x64', 'lib/binding/node-v93-linux-x64')
    }
    await rm('lib/binding/openssl@3', { recursive: true, force: true })
    await rm('lib/binding/openssl@1', { recursive: true, force: true })
    await rm(deleteList[0], { recursive: true, force: true })
    await rm(deleteList[1], { recursive: true, force: true })
    await rm(deleteList[2], { recursive: true, force: true })
    await rm(deleteList[3], { recursive: true, force: true })
    await rm(deleteList[4], { recursive: true, force: true })
    await rm(deleteList[5], { recursive: true, force: true })
    await rm(deleteList[6], { recursive: true, force: true })
    await rm(deleteList[7], { recursive: true, force: true })
  } else {
    if (dict[arch] === 'arm64') {
      deleteList.push('lib/binding/node-v115-darwin-x64')
      deleteList.push('lib/binding/node-v111-darwin-x64')
      deleteList.push('lib/binding/node-v108-darwin-x64')
      deleteList.push('lib/binding/node-v93-darwin-x64')
    } else {
      deleteList.push('lib/binding/node-v115-darwin-arm64')
      deleteList.push('lib/binding/node-v111-darwin-arm64')
      deleteList.push('lib/binding/node-v108-darwin-arm64')
      deleteList.push('lib/binding/node-v93-darwin-arm64')
    }
    await rm('lib/binding/openssl@3', { recursive: true, force: true })
    await rm('lib/binding/openssl@1', { recursive: true, force: true })
    await rm(deleteList[0], { recursive: true, force: true })
    await rm(deleteList[1], { recursive: true, force: true })
    await rm(deleteList[2], { recursive: true, force: true })
    await rm(deleteList[3], { recursive: true, force: true })
  }
})()
