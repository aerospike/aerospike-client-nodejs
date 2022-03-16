# Backward Incompatible API Changes

All notable changes to this project will be documented in this file.

## [4.0.0]

### totalTimeout Replaced by timeout Info Policy Option
* Usage
  * New "timeout" InfoPolicy

        const subject = new Aerospike.InfoPolicy({
          timeout: 1000,
          sendAsIs: true,
          checkBounds: false
        })

  * Deprecated "totalTimeout" InfoPolicy

        const subject = new Aerospike.InfoPolicy({
          totalTimeout: 1000,
          sendAsIs: true,
          checkBounds: false
        })
