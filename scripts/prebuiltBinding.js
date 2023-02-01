const { exec } = require('child_process')
const fs = require('fs')
exec('openssl version; uname -s; uname -m; node -v;', (error, stdout, stderr) => {
  if (error) throw error
  const words = stdout.split(' ')
  const lastToken = words[5]
  const OS = lastToken.split('\n')[1]
  const arch = lastToken.split('\n')[2]
  const nodeVersion = lastToken.split('\n')[3].split('.')[0]
  if ((words[1][0] === '3') && (words[0] !== 'LibreSSL')) {
    if (OS === 'Linux') {
      if (arch === 'x86_64') {
        if (nodeVersion === 'v19') {
          fs.rename('lib/binding/openssl@3/node-v111-linux-x64', 'lib/binding/node-v111-linux-x64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else if (nodeVersion === 'v18') {
          fs.rename('lib/binding/openssl@3/node-v108-linux-x64', 'lib/binding/node-v108-linux-x64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else if (nodeVersion === 'v16') {
          fs.rename('lib/binding/openssl@3/node-v93-linux-x64', 'lib/binding/node-v93-linux-x64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else {
          fs.rename('lib/binding/openssl@3/node-v83-linux-x64', 'lib/binding/node-v83-linux-x64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        }
      } else {
        if (nodeVersion === 'v19') {
          fs.rename('lib/binding/openssl@3/node-v111-linux-arm64', 'lib/binding/node-v111-linux-arm64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else if (nodeVersion === 'v18') {
          fs.rename('lib/binding/openssl@3/node-v108-linux-arm64', 'lib/binding/node-v108-linux-arm64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else if (nodeVersion === 'v16') {
          fs.rename('lib/binding/openssl@3/node-v93-linux-arm64', 'lib/binding/node-v93-linux-arm64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else {
          fs.rename('lib/binding/openssl@3/node-v83-linux-arm64', 'lib/binding/node-v83-linux-arm64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        }
      }
    } else {
      if (arch === 'x86_64') {
        if (nodeVersion === 'v19') {
          fs.rename('lib/binding/openssl@3/node-v111-darwin-x64', 'lib/binding/node-v111-darwin-x64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else if (nodeVersion === 'v18') {
          fs.rename('lib/binding/openssl@3/node-v108-darwin-x64', 'lib/binding/node-v108-darwin-x64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else if (nodeVersion === 'v16') {
          fs.rename('lib/binding/openssl@3/node-v93-darwin-x64', 'lib/binding/node-v93-darwin-x64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else {
          fs.rename('lib/binding/openssl@3/node-v83-darwin-x64', 'lib/binding/node-v83-darwin-x64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        }
      } else {
        if (nodeVersion === 'v19') {
          fs.rename('lib/binding/openssl@3/node-v111-darwin-arm64', 'lib/binding/node-v111-darwin-arm64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else if (nodeVersion === 'v18') {
          fs.rename('lib/binding/openssl@3/node-v108-darwin-arm64', 'lib/binding/node-v108-darwin-arm64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else if (nodeVersion === 'v16') {
          fs.rename('lib/binding/openssl@3/node-v93-darwin-arm64', 'lib/binding/node-v93-darwin-arm64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else {
          fs.rename('lib/binding/openssl@3/node-v83-darwin-arm64', 'lib/binding/node-v83-darwin-arm64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        }
      }
    }
  } else {
    if (OS === 'Linux') {
      if (arch === 'x86_64') {
        if (nodeVersion === 'v19') {
          fs.rename('lib/binding/openssl@1/node-v111-linux-x64', 'lib/binding/node-v111-linux-x64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else if (nodeVersion === 'v18') {
          fs.rename('lib/binding/openssl@1/node-v108-linux-x64', 'lib/binding/node-v108-linux-x64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else if (nodeVersion === 'v16') {
          fs.rename('lib/binding/openssl@1/node-v93-linux-x64', 'lib/binding/node-v93-linux-x64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else {
          fs.rename('lib/binding/openssl@1/node-v83-linux-x64', 'lib/binding/node-v83-linux-x64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        }
      } else {
        if (nodeVersion === 'v19') {
          fs.rename('lib/binding/openssl@1/node-v111-linux-arm64', 'lib/binding/node-v111-linux-arm64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else if (nodeVersion === 'v18') {
          fs.rename('lib/binding/openssl@1/node-v108-linux-arm64', 'lib/binding/node-v108-linux-arm64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else if (nodeVersion === 'v16') {
          fs.rename('lib/binding/openssl@1/node-v93-linux-arm64', 'lib/binding/node-v93-linux-arm64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else {
          fs.rename('lib/binding/openssl@1/node-v83-linux-arm64', 'lib/binding/node-v83-linux-arm64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        }
      }
    } else {
      if (arch === 'x86_64') {
        if (nodeVersion === 'v19') {
          fs.rename('lib/binding/openssl@1/node-v111-darwin-x64', 'lib/binding/node-v111-darwin-x64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else if (nodeVersion === 'v18') {
          fs.rename('lib/binding/openssl@1/node-v108-darwin-x64', 'lib/binding/node-v108-darwin-x64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else if (nodeVersion === 'v16') {
          fs.rename('lib/binding/openssl@1/node-v93-darwin-x64', 'lib/binding/node-v93-darwin-x64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else {
          fs.rename('lib/binding/openssl@1/node-v83-darwin-x64', 'lib/binding/node-v83-darwin-x64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        }
      } else {
        if (nodeVersion === 'v19') {
          fs.rename('lib/binding/openssl@1/node-v111-darwin-arm64', 'lib/binding/node-v111-darwin-arm64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else if (nodeVersion === 'v18') {
          fs.rename('lib/binding/openssl@1/node-v108-darwin-arm64', 'lib/binding/node-v108-darwin-arm64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else if (nodeVersion === 'v16') {
          fs.rename('lib/binding/openssl@1/node-v93-darwin-arm64', 'lib/binding/node-v93-darwin-arm64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        } else {
          fs.rename('lib/binding/openssl@1/node-v83-darwin-arm64', 'lib/binding/node-v83-darwin-arm64', (err) => {
            if (err) return
            fs.rm('lib/binding/openssl@3', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
            fs.rm('lib/binding/openssl@1', { recursive: true, force: true }, (e) => {
              if (e) throw e
            })
          })
        }
      }
    }
  }
})
