// *****************************************************************************
// Copyright 2013-2017 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the 'License')
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// *****************************************************************************

'use strict'

/**
 * @module aerospike/info
 *
 * @description The info protocol provides access to configuration and
 * statistics for the Aerospike server. This module provides the {@link
 * module:aerospike/info.parse|parse} utility function for parsing the info
 * data returned by the Aerospike server.
 *
 * @see {@link Client#info}
 * @see <a href="http://www.aerospike.com/docs/reference/info" title="Info Command Reference">&uArr;Info Command Reference</a>
 *
 * @example
 *
 * const Aerospike = require('aerospike')
 * Aerospike.connect((error, client) => {
 *   if (error) throw error
 *
 *   var cmd = 'build\nfeatures'
 *   client.infoAny(cmd, (err, infoStr) => {
 *     if (err) {
 *       console.error('error retrieving info for cmd "%s": %s [%d]',
   *       cmd, err.message, err.code)
 *     } else {
 *       var info = Aerospike.info.parse(infoStr)
 *       console.log(info) // => { build: '3.12.0',
 *                         //      features: [
 *                         //        'cdt-list',
 *                         //        'pipelining',
 *                         //        'geo',
 *                         //        ...,
 *                         //        'udf' ] }
 *     }
 *     client.close()
 *   })
 * })
 */

/**
 * @function module:aerospike/info.parse
 *
 * @summary Parses the info string returned from a cluster node into key-value pairs.
 *
 * @param {string} info - The info string returned by the cluster node.
 * @returns {Object} key-value pairs
 *
 * @since v2.6
 */
function parse (info) {
  if (!info) return {}
  var infoHash = parseKeyValue(info, '\n', '\t')
  Object.keys(infoHash).forEach(function (key) {
    var separators = getSeparators(key)
    if (separators) {
      var value = infoHash[key]
      infoHash[key] = splitString(value, separators)
    }
  })
  return infoHash
}

/**
 * Parses a string value into a primitive type (string or number).
 *
 * Ex.:
 *   - parseValue('foo') => 'foo'
 *   - parseValue('42') => 42
 *
 * @private
 */
function parseValue (value) {
  if (Number(value).toString() === value) {
    return Number(value)
  }
  return value
}

/**
 * Parses a string value representing a key-value-map separated by sep1 and
 * sep2 into an Object.
 *
 * Ex.:
 *   - parseKeyValue('a=1;b=2', ';', '=') => { a: 1, b: 2 }
 *
 * @private
 */
function parseKeyValue (str, sep1, sep2) {
  var result = {}
  str.split(sep1).forEach(function (kv) {
    if (kv.length > 0) {
      kv = kv.split(sep2, 2)
      result[kv[0]] = parseValue(kv[1])
    }
  })
  return result
}

/**
 * Split string into list or key-value-pairs depending on whether
 * the given separator chars appear in the string. This is the logic used by
 * the old parseInfo function and the default logic used by the new parse
 * function unless a specific format is defined for an info key.
 *
 * Ex.:
 *   - smartParse('foo') => 'foo'
 *   - smartParse('foo;bar') => ['foo', 'bar']
 *   - smartParse('foo=1;bar=2') => {foo: 1, bar: 2}
 *
 * @private
 */
function smartParse (str, sep1, sep2) {
  sep1 = sep1 || ';'
  sep2 = sep2 || '='
  if ((typeof str === 'string') && str.indexOf(sep1) >= 0) {
    if (str.indexOf(sep2) >= 0) {
      return parseKeyValue(str, sep1, sep2)
    } else {
      return str.split(sep1)
    }
  }
  return str
}

/**
 * Normalizes the key name in an info hash by turning a parameterized key into
 * a unique key name.
 *
 * Ex.:
 *   - normalizeKey('sindex/test/idx-name') => 'sindex-stats'
 *
 * @private
 */
function normalizeKey (key) {
  if (key.startsWith('sindex')) {
    return key.split('/').length === 3 ? 'sindex-stats' : 'sindex-list'
  } else if (key.startsWith('bins/')) {
    return 'bins-ns'
  } else if (key.startsWith('namespace/')) {
    return 'namespace'
  }
  return key
}

/**
 * Returns separators to use for the given info key.
 *
 * @private
 */
function getSeparators (key) {
  let name = normalizeKey(key)
  return separators[name] || defaultSeparators
}

/**
 * Splits a string into a, possibly nested, array or object using the given
 * separators.
 *
 * @private
 */
function splitString (str, separators) {
  if (separators.length === 0) {
    return str
  }
  var sep = separators[0]
  switch (typeof sep) {
    case 'function':
      return sep(str)
    case 'string':
      if (sep.length === 2) {
        var map = parseKeyValue(str, sep[0], sep[1])
        Object.keys(map).forEach(function (key) {
          var value = map[key]
          map[key] = splitString(value, separators.slice(1))
        })
        return map
      } else {
        var list = str.split(sep)
        if (list.slice(-1)[0].length === 0) {
          list.pop()
        }
        return list.map(function (e) {
          return splitString(e, separators.slice(1))
        })
      }
  }
}

/**
 * Separators to use for specific info keys. A single-char separator splits the
 * info value into a list of strings; a separator consisting of two characters
 * splits the info value into a list of key-value-pairs. For keys containing
 * nested key-value-lists, multiple separators can be specified. For info keys
 * that require more complex parsing logic, a split function can
 * be specified instead of a character separator.
 *
 * @private
 */
let separators = {
  'bins': [';:', splitBins],
  'bins-ns': [splitBins],
  'namespace': [';='],
  'service': [';'],
  'sindex-list': [';', ':='],
  'statistics': [';='],
  'udf-list': [';', ',='],
  'udf-stats': [';='],
  'get-dc-config': [';', ':=']
}

let defaultSeparators = [smartParse]

/**********************************************************
 * Functions for dealing with specific info command results
 **********************************************************/

function splitBins (str) {
  var stats = {}
  var names = []
  str.split(',').forEach(function (elem) {
    var parts = elem.split('=', 2)
    if (parts.length === 2) {
      stats[parts[0]] = parts[1]
    } else {
      names.push(parts[0])
    }
  })
  return {
    stats: stats,
    names: names
  }
}

module.exports = {
  parse: parse,
  separators: separators
}
