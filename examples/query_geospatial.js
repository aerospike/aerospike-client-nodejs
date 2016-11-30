// *****************************************************************************
// Copyright 2013-2016 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License")
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// *****************************************************************************

// *****************************************************************************
// Write a record
// *****************************************************************************

const Aerospike = require('aerospike')
const fs = require('fs')
const yargs = require('yargs')

const status = Aerospike.status
const filter = Aerospike.filter
const GeoJSON = Aerospike.GeoJSON
const Key = Aerospike.Key

// *****************************************************************************
// Options parsing
// *****************************************************************************

var argp = yargs
  .usage('$0 [options] key')
  .options({
    help: {
      boolean: true,
      describe: 'Display this message.'
    },
    host: {
      alias: 'h',
      default: process.env.AEROSPIKE_HOSTS || 'localhost:3000',
      describe: 'Aerospike database address.'
    },
    timeout: {
      alias: 't',
      default: 1000,
      describe: 'Timeout in milliseconds.'
    },
    'log-level': {
      alias: 'l',
      default: Aerospike.log.INFO,
      describe: 'Log level [0-5]'
    },
    'log-file': {
      default: undefined,
      describe: 'Path to a file send log messages to.'
    },
    namespace: {
      alias: 'n',
      default: 'test',
      describe: 'Namespace for the keys.'
    },
    set: {
      alias: 's',
      default: 'demo',
      describe: 'Set for the keys.'
    },
    user: {
      alias: 'U',
      default: null,
      describe: 'Username to connect to secured cluster'
    },
    password: {
      alias: 'P',
      default: null,
      describe: 'Password to connec to secured cluster'
    }
  })

var argv = argp.argv

if (argv.help === true) {
  argp.showHelp()
  process.exit(0)
}

// *****************************************************************************
// Configure the client
// *****************************************************************************

var config = {
  hosts: argv.host,
  log: {
    level: argv['log-level'],
    file: argv['log-file'] ? fs.openSync(argv['log-file'], 'a') : 2
  },
  policies: {
    timeout: argv.timeout
  },
  modlua: {
    userPath: __dirname
  },
  user: argv.user,
  password: argv.password
}

var numberOfRecords = 20
var geoIndex = 'points-loc-index'

function executeQuery (client, done) {
  var count = 0
  var region = GeoJSON.Polygon([-122.500000, 37.000000], [-121.000000, 37.000000],
        [-121.000000, 38.080000], [-122.500000, 38.080000], [-122.500000, 37.000000])

  var options = { filters: [filter.geoWithin('loc', region)] }

  var q = client.query(argv.namespace, argv.set, options)

  var stream = q.execute()

  stream.on('data', function (rec) {
    console.log(rec)
    count++
  })

  stream.on('error', function (err) {
    console.log('at error')
    console.log(err)
    cleanup(client, done)
  })

  stream.on('end', function () {
    console.log('RECORDS FOUND:', count)
    cleanup(client, done)
  })
}

function insertRecords (client, ndx, end, done) {
  if (ndx >= end) {
    return executeQuery(client, done)
  }

  var key = new Key(argv.namespace, argv.set, ndx)
  var lat = 37.5 + (0.1 * ndx)
  var lng = -122 + (0.1 * ndx)
  var bins = { loc: GeoJSON.Point(lng, lat) }
  client.put(key, bins, function (err, key) {
    if (err) throw err
    insertRecords(client, ndx + 1, end, done)
  })
}

function createIndex (client, done) {
  var options = {
    ns: argv.namespace,
    set: argv.set,
    bin: 'loc',
    index: geoIndex
  }
  client.createGeo2DSphereIndex(options, function (err, job) {
    if (err) throw err
    job.waitUntilDone(100, function (err) {
      if (err) throw err
      insertRecords(client, 0, numberOfRecords, done)
    })
  })
}

function removeIndex (client, done) {
  client.indexRemove(argv.namespace, geoIndex, function (err) {
    if (err) throw err
    done(client)
  })
}

function removeRecords (client, ndx, end, done) {
  if (ndx >= end) {
    return removeIndex(client, done)
  }

  var key = new Key(argv.namespace, argv.set, ndx)

  client.remove(key, function (err, key) {
    if (err && err.code !== status.AEROSPIKE_ERR_RECORD_NOT_FOUND) throw err
    removeRecords(client, ndx + 1, end, done)
  })
}

function cleanup (client, done) {
  removeRecords(client, 0, numberOfRecords, done)
}

Aerospike.connect(config, function (err, client) {
  if (err) throw err
  createIndex(client, function () {
    client.close()
  })
})
