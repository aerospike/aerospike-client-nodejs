#!/usr/bin/env node
// *****************************************************************************
// Copyright 2013-2022 Aerospike, Inc.
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

// Monte Carlo simulation to estimate the value of Pi. This example creates a
// number of database records, each containing a bin with a GeoJSON Point. The
// points lie within the square spanned by the two points (-10, -10) and (10,
// 10) and have randomly generated lat/lon coordiantes. A secondary, geospatial
// index is created on the records and a "geoWithinRadius" query is then used
// to count the number of points within a circle around the origin (0, 0). The
// radius of the circle is approxmiated by calculating the great-circle
// distance between the center (0, 0) the point (10, 0) which lies on the
// circumference of the circle (using the havesine formula). The ratio between
// the points that fall within the square and the points that fall within the
// circle can then be used to approximate the value of Pi:
//
// Sqr := Points within square
// Cir := Points in circle
// l   := Length of the square
// r   := Radius of the circle
//
// l = 2 * r
//
// ( aera of circle ) / ( aera of square ) = Sqr / Cir
// ( pi * r * r ) / ( l * l ) = Sqr / Cir
// pi * ( r * r ) / ( 2 * r * 2 * r ) = Sqr / Cir
// pi / 4 = Sqr / Cir
// pi = Sqr / Cir * 4
//
// References:
// https://en.wikipedia.org/wiki/Monte_Carlo_method
// https://en.wikipedia.org/wiki/Haversine_formula

const Aerospike = require('aerospike')
const shared = require('./shared')
const path = require('path')

shared.runner()

async function monteCarlo (client, argv) {
  const game = {
    client,
    noDarts: argv.darts, // number of darts to throw
    maxInFlight: argv.maxInFlight,
    maxLatLng: 10, // pick coordinates between (-10, -10) and (10, 10)
    ns: argv.namespace,
    set: shared.random.identifier(),
    bin: 'geo',
    idx: shared.random.identifier()
  }

  await setup(game)
  await throwDarts(game)

  const hits = await countHits(game)
  console.info(`${hits} out of ${game.noDarts} darts landed in the circle.`)

  const piEstimate = calculatePi(hits, game.noDarts)
  console.info(`${hits} ÷ ${game.noDarts} × 4 = ${piEstimate}`)

  console.info()
  console.info(`𝛑 is estimated to be ${piEstimate}.`)

  await cleanUp(game)
}

async function setup (game) {
  const module = path.join(game.client.config.modlua.userPath, 'monte_carlo.lua')
  const udfJob = await game.client.udfRegister(module)

  const idx = {
    ns: game.ns,
    set: game.set,
    bin: game.bin,
    index: game.idx,
    datatype: Aerospike.indexDataType.GEO2DSPHERE
  }
  const idxJob = await game.client.createIndex(idx)

  return Promise.all([udfJob.wait(), idxJob.wait()])
}

async function cleanUp (game) {
  try {
    await game.client.indexRemove(game.ns, game.idx)
  } catch (error) {
    if (error.code !== Aerospike.status.ERR_INDEX_NOT_FOUND) {
      throw error
    }
  }

  await game.client.truncate(game.ns, game.set, 0)
}

async function throwDarts (game) {
  console.info(`Simulating throwing of ${game.noDarts} darts.`)
  const start = process.hrtime()

  let current = 0
  let inflight = 0

  return new Promise((resolve, reject) => {
    const cb = (err) => {
      if (err) {
        throw err
      }
      process.stdout.write(`\r${current}`)
      inflight--
      if (current < game.noDarts) {
        current++
        inflight++
        throwDart(game, current, cb)
      } else if (inflight === 0) {
        const elapsed = process.hrtime(start)
        const elapsedSecs = (elapsed[0] + elapsed[1] / 1e9).toFixed(1)
        console.info(`\rFinished simulating ${current} dart throws in ${elapsedSecs} seconds.`)
        process.stdout.write('\r              \n')
        resolve()
      }
    }
    for (let i = 0; i < Math.min(game.maxInFlight, game.noDarts); i++) {
      current++
      inflight++
      throwDart(game, current, cb)
    }
  })
}

function throwDart (game, id, cb) {
  const key = new Aerospike.Key(game.ns, game.set, id)
  const point = randomPoint(game.maxLatLng)
  const bins = {
    [game.bin]: point
  }
  game.client.put(key, bins, cb)
}

async function countHits (game) {
  const query = game.client.query(game.ns, game.set)
  const radius = harvesine(0, 0, 10, 0) // approximation
  query.where(Aerospike.filter.geoWithinRadius(game.bin, 0, 0, radius))

  const policy = new Aerospike.QueryPolicy({
    totalTimeout: 10000
  })
  const count = query.apply('monte_carlo', 'count', [], policy)
  return count
}

function calculatePi (circleHits, squareHits) {
  return 4.0 * circleHits / squareHits
}

function randomPoint (maxLatLng) {
  const lng = shared.random.float(-maxLatLng, maxLatLng)
  const lat = shared.random.float(-maxLatLng, maxLatLng)
  return new Aerospike.GeoJSON.Point(lng, lat)
}

// Calculates distance in meters between two coordinates
function harvesine (lat1, lon1, lat2, lon2) {
  const R = 6378.137 // Radius of earth in KM
  const dLat = lat2 * Math.PI / 180 - lat1 * Math.PI / 180
  const dLon = lon2 * Math.PI / 180 - lon1 * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const d = R * c
  return d * 1000 // meters
}

exports.command = 'geospatialMonteCarlo'
exports.describe = 'Run a Monte Carlo simulation to estimate Pi using Geospatial Queries'
exports.handler = shared.run(monteCarlo)
exports.builder = {
  darts: {
    desc: 'Number of darts to throw',
    group: 'Command:',
    type: 'number',
    default: 10000
  },
  maxInFlight: {
    desc: 'Max. number of darts to throw in parallel',
    group: 'Command:',
    type: 'number',
    default: 150
  }
}
