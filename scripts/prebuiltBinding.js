const { exec } = require('child_process')
const fs = require('fs')
exec('openssl version; uname -s; uname -m; node -v;', (error, stdout, stderr) => {
  if (error) throw error
  const words = stdout.split(' ')
  const lastToken = words[5]
  const OS = lastToken.split('\n')[1]
  const arch = lastToken.split('\n')[2]
  const nodeVersion = lastToken.split('\n')[3].split('.')[0]
  const dict = {
    v19: 'v111',
    v18: 'v108',
    v16: 'v93',
    v14: 'v83',
    Linux: 'linux',
    Darwin: 'darwin',
    arm64: 'arm64',
    x86_64: 'x64'
  }
  if ((words[1][0] === '3') && (words[0] !== 'LibreSSL')) {
    fs.rename('lib/binding/openssl@3/node-' + dict[nodeVersion] + '-' + dict[OS] + '-' + dict[arch],
      'lib/binding/node-' + dict[nodeVersion] + '-' + dict[OS] + '-' + dict[arch], (err) => {
        if (err) return
        fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
          if (e) throw e
        })
        fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
          if (e) throw e
        })
      })
  } else {
    fs.rename('lib/binding/openssl@3/node-' + dict[nodeVersion] + '-' + dict[OS] + '-' + dict[arch],
      'lib/binding/node-' + dict[nodeVersion] + '-' + dict[OS] + '-' + dict[arch], (err) => {
        if (err) return
        fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
          if (e) throw e
        })
        fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
          if (e) throw e
        })
      })
  }
})
