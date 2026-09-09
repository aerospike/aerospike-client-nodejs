// *****************************************************************************
// Copyright 2013-2026 Aerospike, Inc.
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

'use strict'

const { orderByType, order: sortOrder, orderByFlags } = require('./query_enums')

// -----------------------------------------------------------------------------
// Client-side global Top-K reduce - see
// docs/design/vector-phase-1-client-design.md §4.5 ("Client-side global
// Top-K reduce") for the full design rationale. This is a line-for-line
// translation of the real Java client's `OrderKey` + `TopKReduceSpec`
// (aerospike-client-java, aie/vector branch,
// client/src/com/aerospike/client/query/), which is itself a single
// global bounded-heap reduce fed every matching record from every
// partition/node - there is no per-node pre-reduction or N-way merge of
// already-sorted streams involved, confirmed against the real
// implementation (see §4.3.3).
// -----------------------------------------------------------------------------

/**
 * @private
 * @class TopKReduce
 *
 * @classdesc Client-side, digest-deduplicated, bounded Top-K reducer. Fed
 * one record at a time (via {@link TopKReduce#acceptPartial}) as an
 * ordinary, unmodified query streams results back - see {@link
 * RecordStream}, which routes incoming records through this class instead
 * of emitting them immediately whenever {@link Query#orderBy} is set.
 * Once the underlying stream signals completion, {@link
 * TopKReduce#getResult} returns the best <code>k</code> records, sorted
 * best-first.
 *
 * Conceptually mirrors the real Java client's worst-first bounded
 * `PriorityQueue` (`TopKReduceSpec`), but is implemented here as an
 * always-sorted array rather than a hand-rolled binary heap: with `k`
 * capped at 1000 (enforced by {@link Query#topK}), an O(k) array-splice
 * insert/evict is just as fast in practice and far simpler to verify
 * correct than a binary heap that would also need arbitrary-element
 * removal to support the digest-dedup case below - Java's own
 * `PriorityQueue#remove(Object)` is O(n) for the same reason.
 *
 * @param {string} binName - Name of the (projected or physical) bin to order by.
 * @param {number} type - One of {@link module:aerospike/query.orderByType}.
 * @param {number} direction - One of {@link module:aerospike/query.order}.
 * @param {number} flags - One of {@link module:aerospike/query.orderByFlags}.
 * @param {number} k - Bounded queue size; the final result has at most this many records.
 */
class TopKReduce {
  constructor (binName, type, direction, flags, k) {
    this.binName = binName
    this.type = type
    this.direction = direction
    this.flags = flags || orderByFlags.NONE
    this.k = k

    // digest (hex) -> entry, for O(1) dedup-by-digest lookups. An entry is
    // only present here while it is also present in `this.sorted` below.
    this.byDigest = new Map()

    // Always-sorted, best-first array of at most `k` entries; entries are
    // { record, digest (Buffer), orderValue: { isNil, value } }.
    this.sorted = []
  }

  /**
   * @function TopKReduce#acceptPartial
   *
   * @summary Feeds one record from the underlying query result stream into
   * the reducer. Mirrors `TopKReduceSpec#acceptPartial`.
   *
   * @description Builds the record's {@link OrderKey}-equivalent sort
   * value; if this digest has already been seen (a record may be re-seen
   * if partition ownership migrates mid-scan), keeps whichever occurrence
   * is better-ranked and discards the other. Otherwise inserts the new
   * entry and, if the bounded size <code>k</code> is now exceeded, evicts
   * the single worst entry.
   *
   * @param {AerospikeRecord} record - record as delivered by the
   * underlying (ordinary, unmodified) query/scan result stream.
   */
  acceptPartial (record) {
    const digest = digestOf(record)
    const digestHex = digest.toString('hex')
    const orderValue = extractOrderValue(record, this.binName, this.type)
    const entry = { record, digest, orderValue }

    const existing = this.byDigest.get(digestHex)
    if (existing) {
      if (compareEntries(existing, entry, this.type, this.direction, this.flags) <= 0) {
        // Existing occurrence is already at least as good; discard the new one.
        return
      }
      removeSorted(this.sorted, existing)
      this.byDigest.delete(digestHex)
    }

    insertSorted(this.sorted, entry, this.type, this.direction, this.flags)
    this.byDigest.set(digestHex, entry)

    if (this.sorted.length > this.k) {
      const worst = this.sorted.pop()
      this.byDigest.delete(worst.digest.toString('hex'))
    }
  }

  /**
   * @function TopKReduce#getResult
   *
   * @summary Drains the reducer once the underlying query stream ends
   * (i.e. once every partition/node has finished). Mirrors
   * `TopKReduceSpec#getResult`.
   *
   * @return {AerospikeRecord[]} up to <code>k</code> records, best-first.
   */
  getResult () {
    return this.sorted.map(entry => entry.record)
  }
}

// -----------------------------------------------------------------------------
// OrderKey-equivalent extraction + comparison - mirrors OrderKey.java.
// -----------------------------------------------------------------------------

function digestOf (record) {
  const digest = record && record.key && record.key.digest
  if (Buffer.isBuffer(digest)) return digest
  // Fallback identity for hand-built records (e.g. unit tests) that don't
  // carry a real 20-byte digest. Query/scan-returned keys always have one.
  const key = (record && record.key) || {}
  return Buffer.from(JSON.stringify([key.ns, key.set, String(key.key)]))
}

// Extracts and type-coerces the order-by bin's value. Missing bins, the
// wrong scalar type, and list/map (collection) values all resolve to NIL,
// matching OrderKey's "if the bin is missing, the wrong scalar type, or a
// list/map, the value is NIL" rule.
//
// Note: unlike the Java client - where AS_INTEGER/AS_DOUBLE bins
// deserialize to distinguishable Long/Double wrapper objects - this
// client deserializes both integer and double bins to plain JS `number`,
// so wire-type mismatches between declared INTEGER/DOUBLE and the actual
// bin's particle type cannot be detected purely from the deserialized
// value. INTEGER additionally accepts `bigint` (converted to `Number`,
// which is exact for all safe-integer magnitudes and a documented
// simplification for larger values).
function extractOrderValue (record, binName, type) {
  const raw = record && record.bins ? record.bins[binName] : undefined
  if (raw === undefined || raw === null) {
    return { isNil: true, value: null }
  }
  switch (type) {
    case orderByType.INTEGER:
      if (typeof raw === 'number' && Number.isInteger(raw)) return { isNil: false, value: raw }
      if (typeof raw === 'bigint') return { isNil: false, value: Number(raw) }
      return { isNil: true, value: null }
    case orderByType.DOUBLE:
      if (typeof raw === 'number' && Number.isFinite(raw)) return { isNil: false, value: raw }
      return { isNil: true, value: null }
    case orderByType.STRING:
      if (typeof raw === 'string') return { isNil: false, value: raw }
      return { isNil: true, value: null }
    case orderByType.BYTES:
      if (Buffer.isBuffer(raw)) return { isNil: false, value: raw }
      return { isNil: true, value: null }
    default:
      return { isNil: true, value: null }
  }
}

// Ascending "natural" ranking order (best-first): NIL sorts last
// regardless of direction (both NIL breaks the tie by digest ascending);
// otherwise compares by type-aware value, negated for DESC, with ties
// (including exact-value ties) broken by digest ascending - stable,
// deterministic ordering with no reliance on arrival order.
//
// Returns <0 if `a` ranks better than `b`, >0 if `a` ranks worse, 0 only
// when `a` and `b` are the same digest (used by acceptPartial's
// keep-the-better-occurrence check).
function compareEntries (a, b, type, direction, flags) {
  if (a.orderValue.isNil || b.orderValue.isNil) {
    if (a.orderValue.isNil && b.orderValue.isNil) {
      return Buffer.compare(a.digest, b.digest)
    }
    return a.orderValue.isNil ? 1 : -1
  }

  const cmp = compareTypedValues(a.orderValue.value, b.orderValue.value, type, flags)
  const directed = direction === sortOrder.DESC ? -cmp : cmp
  if (directed !== 0) return directed

  return Buffer.compare(a.digest, b.digest)
}

function compareTypedValues (a, b, type, flags) {
  if (type === orderByType.STRING) {
    if (flags === orderByFlags.CASE_INSENSITIVE) {
      const la = a.toLowerCase()
      const lb = b.toLowerCase()
      return la < lb ? -1 : la > lb ? 1 : 0
    }
    return a < b ? -1 : a > b ? 1 : 0
  }
  if (type === orderByType.BYTES) {
    return Buffer.compare(a, b)
  }
  // INTEGER / DOUBLE
  return a < b ? -1 : a > b ? 1 : 0
}

// Binary-search insertion into the always-sorted (best-first) array.
function insertSorted (sorted, entry, type, direction, flags) {
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (compareEntries(sorted[mid], entry, type, direction, flags) <= 0) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }
  sorted.splice(lo, 0, entry)
}

// Removes a specific entry (by reference) from the sorted array.
function removeSorted (sorted, entry) {
  const idx = sorted.indexOf(entry)
  if (idx !== -1) sorted.splice(idx, 1)
}

module.exports = TopKReduce
