const { exec } = require('child_process')
const fs = require('fs')
exec('openssl version', (error, stdout, stderr) => {
  if (error) throw error
  exec('uname -s', (error, OS, stderr) => {
    if (error) throw error
    exec('uname -m', (error, arch, stderr) => {
      if (error) throw error
      const openssl = stdout.split(' ')
      OS = OS.trim()
      arch = arch.trim()
      const dict = {
        v19: 'v111',
        v18: 'v108',
        v16: 'v93',
        v14: 'v83',
        Linux: 'linux',
        Darwin: 'darwin',
        arm64: 'arm64',
        x86_64: 'x64',
        aarch64: 'arm64'
      }
      if ((openssl[1][0] === '3') && (openssl[0] !== 'LibreSSL')) {
        console.log('lib/binding/openssl@3/node-v111-' + dict[OS] + '-' + dict[arch])
        fs.rename('lib/binding/openssl@3/node-v111-' + dict[OS] + '-' + dict[arch],
          'lib/binding/node-v111-' + dict[OS] + '-' + dict[arch], (err) => {
            if (err) throw err
            fs.rename('lib/binding/openssl@3/node-v108-' + dict[OS] + '-' + dict[arch],
              'lib/binding/node-v108-' + dict[OS] + '-' + dict[arch], (err) => {
                if (err) throw err
                fs.rename('lib/binding/openssl@3/node-v93-' + dict[OS] + '-' + dict[arch],
                  'lib/binding/node-v93-' + dict[OS] + '-' + dict[arch], (err) => {
                    if (err) throw err
                    fs.rename('lib/binding/openssl@3/node-v83-' + dict[OS] + '-' + dict[arch],
                      'lib/binding/node-v83-' + dict[OS] + '-' + dict[arch], (err) => {
                        if (err) return
                        fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
                          if (e) throw e
                        })
                        fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
                          if (e) throw e
                        })
                      })
                  })
              })
          })
      } else {
        fs.rename('lib/binding/openssl@1/node-v111-' + dict[OS] + '-' + dict[arch],
          'lib/binding/node-v111-' + dict[OS] + '-' + dict[arch], (err) => {
            if (err) throw err
            fs.rename('lib/binding/openssl@1/node-v108-' + dict[OS] + '-' + dict[arch],
              'lib/binding/node-v108-' + dict[OS] + '-' + dict[arch], (err) => {
                if (err) throw err
                fs.rename('lib/binding/openssl@1/node-v93-' + dict[OS] + '-' + dict[arch],
                  'lib/binding/node-v93-' + dict[OS] + '-' + dict[arch], (err) => {
                    if (err) throw err
                    fs.rename('lib/binding/openssl@1/node-v83-' + dict[OS] + '-' + dict[arch],
                      'lib/binding/node-v83-' + dict[OS] + '-' + dict[arch], (err) => {
                        if (err) return
                        fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
                          if (e) throw e
                        })
                        fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
                          if (e) throw e
                        })
                      })
                  })
              })
          })
      }
    })
  })
})
