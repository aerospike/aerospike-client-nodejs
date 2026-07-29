// *****************************************************************************
// Copyright 2026 Aerospike, Inc.
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

const Aerospike = require('../harness/aerospikeClient')

const DEFAULT_DARTS = 500
const DEFAULT_MAX_IN_FLIGHT = 20
const MAX_LAT_LNG = 10
const GEO_BIN = 'geo'

function dartCount (args) {
  const fromEnv = parseInt(process.env.EXAMPLES_GEO_DARTS || '', 10)
  if (!Number.isNaN(fromEnv) && fromEnv > 0) {
    return fromEnv
  }
  return args.monteCarloDarts || DEFAULT_DARTS
}

function maxInFlight (args) {
  return args.monteCarloMaxInFlight || DEFAULT_MAX_IN_FLIGHT
}

function randomPoint (maxLatLng) {
  const lng = (Math.random() * 2 * maxLatLng) - maxLatLng
  const lat = (Math.random() * 2 * maxLatLng) - maxLatLng
  return new Aerospike.GeoJSON.Point(lng, lat)
}

function haversineMeters (lat1, lon1, lat2, lon2) {
  const R = 6378.137
  const dLat = lat2 * Math.PI / 180 - lat1 * Math.PI / 180
  const dLon = lon2 * Math.PI / 180 - lon1 * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c * 1000
}

async function throwDarts ({ client, ns, set, writePolicy, noDarts, maxInflight }) {
  let current = 0
  let inflight = 0

  await new Promise((resolve, reject) => {
    const onComplete = (err) => {
      if (err) {
        reject(err)
        return
      }
      inflight--
      if (current < noDarts) {
        current++
        inflight++
        throwOne()
      } else if (inflight === 0) {
        resolve()
      }
    }

    function throwOne () {
      const key = new Aerospike.Key(ns, set, current)
      const bins = { [GEO_BIN]: randomPoint(MAX_LAT_LNG) }
      client.put(key, bins, writePolicy, onComplete)
    }

    const initial = Math.min(maxInflight, noDarts)
    for (let i = 0; i < initial; i++) {
      current++
      inflight++
      throwOne()
    }
  })
}

async function countCircleHits ({ client, ns, set, policy }) {
  const query = client.query(ns, set)
  const radius = haversineMeters(0, 0, 10, 0)
  query.where(Aerospike.filter.geoWithinRadius(GEO_BIN, 0, 0, radius))
  const queryPolicy = new Aerospike.QueryPolicy({
    totalTimeout: Math.max(policy.totalTimeout || 1000, 10000)
  })
  return query.apply('monte_carlo', 'count', [], queryPolicy)
}

async function runExample ({ client, ns, args, writePolicy, policy, console }) {
  const setName = args.monteCarloSet
  const noDarts = dartCount(args)
  const inflight = maxInFlight(args)

  console.info(`GeospatialMonteCarlo throwing ${noDarts} darts (set=${setName})`)
  await throwDarts({ client, ns, set: setName, writePolicy, noDarts, maxInflight: inflight })

  const hits = await countCircleHits({ client, ns, set: setName, policy })
  const piEstimate = 4.0 * hits / noDarts
  console.info(`${hits} of ${noDarts} darts in circle; pi estimate=${piEstimate}`)
  args.monteCarloLastHits = hits
  args.monteCarloLastDarts = noDarts
}

module.exports = {
  name: 'GeospatialMonteCarlo',
  runExample,
  GEO_BIN,
  DEFAULT_DARTS
}
