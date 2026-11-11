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

'use strict'

// The expressions the conversion tests compile, by set. Each case builds its
// expression when called, in the process that compiles it.

import * as vm from 'vm';
import * as Aerospike from '../../lib/aerospike.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const OPS = require('../../lib/native').exp.ops

const { exp, lists, maps, Vector, vectorDistanceMetric } = Aerospike as any

type Cases = Record<string, () => any>

const ctxList = () => new Aerospike.cdt.Context().addListIndex(0)
const ctxMap = () => new Aerospike.cdt.Context().addMapKey('a').addListIndex(-1)
const listPolicy = () => new Aerospike.ListPolicy({ order: lists.order.ORDERED })
const mapPolicy = () => new Aerospike.MapPolicy({ order: maps.order.KEY_ORDERED })
const point = new Aerospike.GeoJSON.Point(103.913, 1.308)
const many = (n: number, node: (i: number) => any[]) => exp.and(...Array.from({ length: n }, (_, i) => node(i)))

// Every node kind lib/exp*.js emits.
const builders: Cases = {
  'int 0': () => exp.int(0),
  'int negative': () => exp.int(-123456789),
  'int max safe': () => exp.int(Number.MAX_SAFE_INTEGER),
  uint: () => exp.uint(7),
  float: () => exp.float(1.5),
  'float negative': () => exp.float(-0.25),
  'bool true': () => exp.bool(true),
  'bool false': () => exp.bool(false),
  'str empty': () => exp.str(''),
  'str ascii': () => exp.str('hello'),
  'str unicode': () => exp.str('héllo ünicode 🚀 中文'),
  'str long': () => exp.str('x'.repeat(10000)),
  bytes: () => exp.bytes(Buffer.from([1, 2, 3, 255]), 4),
  nil: () => exp.nil(),
  inf: () => exp.inf(),
  wildcard: () => exp.wildcard(),
  unknown: () => exp.unknown(),
  'list value': () => exp.list([1, 'a', [2, 3], { k: 'v' }]),
  'map value': () => exp.map({ a: 1, b: { c: [1, 2] } }),
  geo: () => exp.geo(point),
  bins: () => exp.and(exp.binExists('a'), exp.eq(exp.binInt('i'), exp.int(1)), exp.eq(exp.binStr('s'), exp.str('x')),
    exp.eq(exp.binFloat('f'), exp.float(1.5)), exp.eq(exp.binBool('b'), exp.bool(true)), exp.eq(exp.binType('t'), exp.int(1))),
  'bins collections': () => exp.or(exp.eq(exp.binList('l'), exp.list([])), exp.eq(exp.binMap('m'), exp.map({})),
    exp.eq(exp.binBlob('bl'), exp.bytes(Buffer.from('ab'), 2)), exp.cmpGeo(exp.binGeo('g'), exp.geo(point)),
    exp.eq(exp.binHll('h'), exp.nil())),
  meta: () => exp.and(exp.gt(exp.ttl(), exp.int(0)), exp.gt(exp.voidTime(), exp.int(0)), exp.gt(exp.lastUpdate(), exp.int(0)),
    exp.ge(exp.sinceUpdate(), exp.int(0)), exp.eq(exp.setName(), exp.str('s')), exp.not(exp.isTombstone()),
    exp.ge(exp.recordSize(), exp.int(0)), exp.eq(exp.digestModulo(3), exp.int(1)), exp.keyExist()),
  keys: () => exp.or(exp.eq(exp.keyInt(), exp.int(1)), exp.eq(exp.keyStr(), exp.str('k')), exp.eq(exp.keyBlob(), exp.bytes(Buffer.from('k'), 1))),
  logic: () => exp.exclusive(exp.and(exp.bool(true), exp.not(exp.bool(false))), exp.or(exp.bool(false), exp.bool(true))),
  compare: () => exp.and(exp.ne(exp.int(1), exp.int(2)), exp.lt(exp.int(1), exp.int(2)), exp.le(exp.int(1), exp.int(1)),
    exp.ge(exp.int(2), exp.int(1))),
  regex: () => exp.cmpRegex(0, 'a.*b', exp.binStr('s')),
  inList: () => exp.inList(exp.int(1), exp.list([1, 2, 3])),
  arithmetic: () => exp.eq(exp.add(exp.sub(exp.mul(exp.int(2), exp.int(3)), exp.div(exp.int(8), exp.int(2))), exp.mod(exp.int(7), exp.int(3)),
    exp.abs(exp.int(-1)), exp.toInt(exp.floor(exp.float(1.7))), exp.toInt(exp.ceil(exp.float(1.2)))), exp.int(0)),
  'float math': () => exp.gt(exp.add(exp.pow(exp.float(2), exp.float(3)), exp.log(exp.float(8), exp.float(2)), exp.toFloat(exp.int(1))), exp.float(0)),
  'int bits': () => exp.eq(exp.intXor(exp.intAnd(exp.int(6), exp.int(3)), exp.intOr(exp.int(1), exp.int(2)), exp.intNot(exp.int(0)),
    exp.intLshift(exp.int(1), exp.int(3)), exp.intRshift(exp.int(8), exp.int(1)), exp.intArshift(exp.int(-8), exp.int(1)),
    exp.intCount(exp.int(7)), exp.intLscan(exp.int(1), exp.bool(true)), exp.intRscan(exp.int(1), exp.bool(true))), exp.int(0)),
  'min max': () => exp.eq(exp.min(exp.int(1), exp.int(2), exp.int(3)), exp.max(exp.int(1), exp.int(0))),
  'let cond': () => exp.let(exp.def('x', exp.int(1)), exp.def('y', exp.binInt('a')),
    exp.cond(exp.gt(exp.var('x'), exp.var('y')), exp.var('x'), exp.lt(exp.var('x'), exp.int(0)), exp.int(0), exp.var('y'))),
  'list read ctx': () => exp.lists.getByIndex(exp.binList('l'), exp.int(0), exp.type.INT, lists.returnType.VALUE, ctxList()),
  'list append policy': () => exp.lists.append(exp.binList('l'), exp.int(1), listPolicy()),
  'list append policy ctx': () => exp.lists.append(exp.binList('l'), exp.str('x'), listPolicy(), ctxList()),
  'list insertItems': () => exp.lists.insertItems(exp.binList('l'), exp.list([1, 2]), exp.int(0), listPolicy()),
  'list increment': () => exp.lists.increment(exp.binList('l'), exp.int(1), exp.int(0), listPolicy()),
  'list sort': () => exp.lists.sort(exp.binList('l'), lists.sortFlags.DEFAULT),
  'list removeByValueList': () => exp.lists.removeByValueList(exp.binList('l'), exp.list([1]), ctxList()),
  'list append no policy': () => exp.lists.append(exp.binList('l'), exp.int(1)),
  'map put no policy': () => exp.maps.put(exp.binMap('m'), exp.int(1), exp.str('k')),
  'map put policy': () => exp.maps.put(exp.binMap('m'), exp.int(1), exp.str('k'), mapPolicy()),
  'map put policy ctx': () => exp.maps.put(exp.binMap('m'), exp.int(1), exp.str('k'), mapPolicy(), ctxMap()),
  'map putItems': () => exp.maps.putItems(exp.binMap('m'), exp.map({ a: 1 }), mapPolicy()),
  'map increment': () => exp.maps.increment(exp.binMap('m'), exp.int(1), exp.str('k'), mapPolicy()),
  'map getByKeyList': () => exp.maps.getByKeyList(exp.binMap('m'), exp.list(['a', 'b']), maps.returnType.VALUE, ctxMap()),
  'map relRank': () => exp.maps.getByValueRelRankRange(exp.binMap('m'), exp.int(2), exp.int(0), exp.int(5), maps.returnType.KEY),
  'map getByIndex': () => exp.maps.getByIndex(exp.binMap('m'), exp.int(0), exp.type.INT, maps.returnType.VALUE),
  'bit ops': () => exp.eq(exp.bit.count(exp.bit.reSize(exp.binBlob('b'), 0, exp.int(4)), exp.int(0), exp.int(8)),
    exp.bit.getInt(exp.bit.setInt(exp.binBlob('b'), exp.int(1), exp.int(8), exp.int(0)), true, exp.int(8), exp.int(0))),
  'hll ops': () => exp.and(exp.gt(exp.hll.getCount(exp.hll.add(exp.binHll('h'), 8, exp.list(['a', 'b']))), exp.int(0)),
    exp.eq(exp.hll.mayContain(exp.binHll('h'), exp.list(['a'])), exp.int(1)),
    exp.gt(exp.hll.getCount(exp.hll.init(exp.binHll('h'), 8)), exp.int(-1))),
  'string read': () => exp.and(exp.gt(exp.string.strlen(exp.binStr('s')), exp.int(0)),
    exp.eq(exp.string.substr(1, 3, exp.binStr('s')), exp.str('bc')), exp.string.contains('a', exp.binStr('s'))),
  'string modify': () => exp.eq(exp.string.concat(null, 'x', exp.string.snipStart(null, 5, exp.binStr('s'))), exp.str('y')),
  'string regexReplace': () => exp.string.regexReplace({ flags: 0 }, 'a', 'b', 0, exp.binStr('x')),
  selectByPath: () => exp.selectByPath(exp.binMap('m'), exp.type.MAP, 0, ctxMap()),
  modifyByPath: () => exp.modifyByPath(exp.binMap('m'), exp.type.MAP, exp.int(1), 0, ctxMap()),
  'ctx with a filter expression': () => exp.selectByPath(exp.binMap('m'), exp.type.MAP, 0,
    new Aerospike.cdt.Context().addAllChildrenWithFilter(exp.gt(exp.loopVarInt(0), exp.int(1)))),
  'ctx with an and filter': () => exp.selectByPath(exp.binMap('m'), exp.type.MAP, 0,
    new Aerospike.cdt.Context().addAllChildren().addAndFilter(exp.eq(exp.loopVarStr(0), exp.str('a')))),
  'nested base64 expression': () => [{ op: OPS.MERGE, exp: 'kwGTUQKhYQE=' }],
  'vector distance float32': () => exp.vectorDistance(vectorDistanceMetric.COSINE_SIMILARITY,
    Vector.ofFloat32([0.1, 0.2, 0.3]), exp.binVector('v')),
  'vector distance each metric and type': () => exp.and(
    exp.lt(exp.vectorDistance(vectorDistanceMetric.EUCLIDEAN_SQUARED, Vector.ofFloat16([1, 2]), exp.binVector('a')), exp.float(1)),
    exp.lt(exp.vectorDistance(vectorDistanceMetric.DOT_PRODUCT, Vector.ofInt32([1, 2]), exp.binVector('b')), exp.float(1)),
    exp.lt(exp.vectorDistance(vectorDistanceMetric.COSINE_SIMILARITY, Vector.ofFloat64([1, 2]), exp.binVector('c')), exp.float(1))),
  'vector distance 65536 dimensions': () => exp.vectorDistance(vectorDistanceMetric.DOT_PRODUCT,
    Vector.ofFloat32(new Float32Array(65536).fill(0.5)), exp.binVector('v')),
  'and of 2000 eq': () => many(2000, i => exp.eq(exp.binInt(`b${i % 7}`), exp.int(i))),
  'and of 500 str eq': () => many(500, i => exp.eq(exp.binStr('s'), exp.str(`v${i}`)))
}

// Nodes not built by lib/exp*.js: own, inherited, hidden and exotic properties.
// The fast path must read each exactly as the legacy path does.
class Node {
  op: number
  intVal: number
  constructor () { this.op = OPS.VAL_INT; this.intVal = 5 }
}
const node = (props: object) => Object.assign({}, props)
const shapes: Cases = {
  'class instance': () => [new Node()],
  'class instance with a value on the prototype': () => {
    class WithValue { op = OPS.AS_VAL }
    (WithValue.prototype as any).value = 'from the prototype'
    return [new WithValue()]
  },
  'value kind inherited from a prototype': () => [Object.assign(Object.create({ intVal: 9 }), { op: OPS.VAL_INT })],
  'op inherited from a prototype': () => [Object.assign(Object.create({ op: OPS.VAL_INT }), { intVal: 3 })],
  'lower value kind own, higher inherited': () => [Object.assign(Object.create({ strVal: 'proto' }), { op: OPS.VAL_STR, intVal: 1 })],
  'null prototype': () => [Object.assign(Object.create(null), { op: OPS.VAL_STR, strVal: 'np' })],
  'non-enumerable value kind': () => [Object.defineProperty({ op: OPS.VAL_INT }, 'intVal', { value: 4, enumerable: false })],
  'non-enumerable op': () => [Object.defineProperty({ intVal: 4 }, 'op', { value: OPS.VAL_INT, enumerable: false })],
  'getter value kind': () => [{ op: OPS.VAL_STR, get strVal () { return 'got' } }],
  'getter on a key the legacy path never reads': () => [{ op: OPS.VAL_INT, intVal: 1, get strVal2 () { throw new Error('read') }, get floatVal () { throw new Error('read') } }],
  'computed key names': () => [{ ['o' + 'p']: OPS.VAL_STR, ['str' + 'Val']: 'computed' }],
  'keys from JSON.parse': () => JSON.parse(`[{"op":${OPS.VAL_STR},"strVal":"json"},{"op":${OPS.VAL_INT},"intVal":2,"count":0}]`),
  'dictionary-mode object': () => {
    const n: any = { op: OPS.VAL_INT, a: 1, b: 2, c: 3, intVal: 8 }
    delete n.a; delete n.b; delete n.c
    return [n]
  },
  'many extra keys': () => [Object.assign(Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, i])), { op: OPS.VAL_INT, intVal: 6 })],
  'integer-like keys': () => [{ 0: 'zero', 1: 'one', op: OPS.VAL_INT, intVal: 7 }],
  'frozen node': () => [Object.freeze({ op: OPS.VAL_STR, strVal: 'frozen' })],
  'sealed node': () => [Object.seal({ op: OPS.VAL_INT, intVal: 11 })],
  'Proxy node': () => [new Proxy({ op: OPS.VAL_INT, intVal: 12 }, {})],
  'Proxy hiding its keys': () => [new Proxy({ op: OPS.VAL_INT, intVal: 13 }, { ownKeys: () => [] })],
  'node from another realm': () => vm.runInNewContext(`[{ op: ${OPS.VAL_STR}, strVal: 'realm' }]`),
  'array node with props': () => [Object.assign([], { op: OPS.VAL_INT, intVal: 14 })],
  'function node with props': () => [Object.assign(function () {}, { op: OPS.VAL_INT, intVal: 15 })],
  'mixed plain and unusual nodes': () => [
    { op: OPS.CMP_EQ, count: 3 }, new Node(), node({ op: OPS.VAL_INT, intVal: 5 })],
  'unusual node inside a nested exp': () => [{ op: OPS.MERGE, exp: [new Node()] }],
  'symbol keys': () => [{ op: OPS.VAL_INT, intVal: 16, [Symbol('strVal')]: 'sym' }],
  'value and every lower kind': () => [{ op: OPS.AS_VAL, value: 1, strVal: 'x', bytesVal: 5, intVal: 'x', uintVal: 'x', floatVal: 'x', boolVal: 'x', ctx: 5, exp: 5, listPolicy: 5, mapPolicy: 5, inf: 1, wildcard: 1 }],
  'inf and wildcard together': () => [{ op: OPS.AS_VAL, inf: null, wildcard: null }],
  'value undefined but present': () => [{ op: OPS.AS_VAL, value: undefined, strVal: 'ignored' }],
  'count and sz null': () => [{ op: OPS.VAL_INT, count: null, sz: undefined, intVal: 1 }],
  'polluted Object.prototype': () => {
    // removed again as soon as the expression is compiled, see child.ts
    (Object.prototype as any).intVal = 99
    return [{ op: OPS.VAL_INT }, { op: OPS.VAL_STR, strVal: 'p' }]
  }
}

// Malformed input: both paths must reject it the same way.
const invalid: Cases = {
  'empty node': () => [{}],
  'op not a number': () => [{ op: 'x' }],
  'count not a number': () => [{ op: OPS.AND, count: 'two' }],
  'sz not a number': () => [{ op: OPS.VAL_BYTES, sz: 'x', bytesVal: Buffer.from('a') }],
  'strVal not a string': () => [{ op: OPS.BIN, strVal: 5 }],
  'bytesVal not a Buffer': () => [{ op: OPS.VAL_BYTES, bytesVal: 'x' }],
  'intVal not a number': () => [{ op: OPS.VAL_INT, intVal: 'x' }],
  'uintVal not a number': () => [{ op: OPS.VAL_UINT, uintVal: 'x' }],
  'floatVal not a number': () => [{ op: OPS.VAL_FLOAT, floatVal: 'x' }],
  'boolVal not a boolean': () => [{ op: OPS.VAL_BOOL, boolVal: 1 }],
  'value undefined': () => [{ op: OPS.AS_VAL, value: undefined }],
  'ctx not an object': () => [{ op: OPS.CALL, ctx: 5 }],
  'nested exp not array or string': () => [{ op: OPS.MERGE, exp: 5 }],
  'nested exp invalid': () => [{ op: OPS.MERGE, exp: [{ op: 'x' }] }],
  'error after a string node': () => [{ op: OPS.CMP_EQ, count: 3 }, ...exp.binStr('s'), ...exp.str('a'), { op: 'x' }],
  'error after every owning kind': () => [
    ...exp.str('a'), ...exp.bytes(Buffer.from('ab'), 2), ...exp.lists.append(exp.binList('l'), exp.int(1), listPolicy(), ctxList()),
    ...exp.maps.put(exp.binMap('m'), exp.int(1), exp.str('k'), mapPolicy()), { op: OPS.MERGE, exp: exp.int(1) }, { op: 'x' }],
  'error in a class instance after a string node': () => [...exp.str('a'), Object.assign(new Node(), { intVal: 'x' })],
  'error in a ctx node after owning nodes': () => [...exp.str('a'), { op: OPS.CALL, ctx: new Aerospike.cdt.Context().addListIndex(0).addMapKeysIn(5 as any) }]
}

// Random nodes: every value kind, valid and wrong types, extra lower-precedence
// and unknown keys (some with getters that throw if read), random key order and
// random containers. Deterministic for a seed, so both processes build the same.
// Nodes with no value use leaf ops: a variadic op (and, or, add...) without its
// end marker makes the C client pack uninitialized bytes, whichever path built it.
const KINDS = ['value', 'strVal', 'bytesVal', 'intVal', 'uintVal', 'floatVal', 'boolVal', 'exp', 'inf', 'wildcard', 'none']
const LOWER = ['value', 'strVal', 'bytesVal', 'intVal', 'uintVal', 'floatVal', 'boolVal', 'ctx', 'exp', 'listPolicy', 'mapPolicy', 'inf', 'wildcard']
const OP_FOR: Record<string, number> = {
  value: OPS.AS_VAL, strVal: OPS.VAL_STR, bytesVal: OPS.VAL_BYTES, intVal: OPS.VAL_INT, uintVal: OPS.VAL_UINT,
  floatVal: OPS.VAL_FLOAT, boolVal: OPS.VAL_BOOL, exp: OPS.MERGE, inf: OPS.AS_VAL, wildcard: OPS.AS_VAL
}
const VALID: Record<string, () => any[]> = {
  value: () => [null, 1, -5, 'a', [1, 'b'], { a: 1 }, 1.5, true, Buffer.from([1]), new Aerospike.Double(2), point],
  strVal: () => ['', 'abc', 'ünï'],
  bytesVal: () => [Buffer.from([1, 2]), Buffer.alloc(0)],
  intVal: () => [0, -1, 2 ** 40, 1.5],
  uintVal: () => [0, 7, 2 ** 53],
  floatVal: () => [0.5, -2, new Aerospike.Double(1.25)],
  boolVal: () => [true, false],
  exp: () => ['kwGTUQKhYQE=', exp.int(3), exp.and(exp.bool(true), exp.binBool('b'))],
  inf: () => [null, 1],
  wildcard: () => [null, 'x']
}
const WRONG: Record<string, any[]> = {
  value: [undefined],
  strVal: [5, null, undefined, {}],
  bytesVal: ['x', 5, null, [1]],
  intVal: ['1', null, true, undefined],
  uintVal: ['1', null],
  floatVal: ['1', null, true],
  boolVal: [1, 'true', null],
  exp: [5, null, {}]
}
const GARBAGE = [5, 'x', null, undefined, {}, [], true, 1.5]

function mulberry32 (seed: number) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function fuzzCases (count: number, seed: number): Cases {
  const rand = mulberry32(seed)
  const pick = <T>(items: T[]): T => items[Math.floor(rand() * items.length)]
  const chance = (p: number) => rand() < p

  function leaf (depth: number) {
    const kind = pick(KINDS)
    const props: Array<[string, any, boolean]> = [] // [key, value, getter that throws]
    if (!chance(0.05)) props.push(['op', chance(0.95) ? (OP_FOR[kind] ?? pick([OPS.KEY_EXIST, OPS.TTL, OPS.UNKNOWN])) : pick(['x', null, undefined]), false])
    if (chance(0.3)) props.push(['count', chance(0.9) ? pick([0, 1, 2, null, undefined]) : pick(['x', {}]), false])
    if (chance(0.2)) props.push(['sz', chance(0.9) ? pick([0, 3, null]) : 'x', false])
    if (kind !== 'none') {
      let value = chance(0.85) || !WRONG[kind] ? pick(VALID[kind]()) : pick(WRONG[kind])
      if (kind === 'exp' && Array.isArray(value) && depth < 2 && chance(0.5)) value = expression(depth + 1)
      props.push([kind, value, false])
      for (const lower of LOWER.slice(LOWER.indexOf(kind) + 1)) {
        if (chance(0.3)) props.push([lower, pick(GARBAGE), chance(0.3)])
      }
    }
    if (chance(0.3)) props.push([pick(['foo', 'Op', 'opx', 'values']), pick(GARBAGE), chance(0.5)])

    // random key order
    for (let i = props.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [props[i], props[j]] = [props[j], props[i]]
    }

    const container = rand()
    let target: any
    if (container < 0.8) target = {}
    else if (container < 0.85) target = Object.create(null)
    else if (container < 0.9) target = new (class Leaf {})()
    else if (container < 0.95) target = vm.runInNewContext('({})')
    else target = Object.create({ unrelated: 1 })
    for (const [key, value, throws] of props) {
      if (throws) Object.defineProperty(target, key, { get () { throw new Error(`read ${key}`) }, enumerable: true, configurable: true })
      else if (key !== 'op' && chance(0.05)) Object.defineProperty(target, key, { value, enumerable: false })
      else target[key] = value
    }
    return chance(0.03) ? new Proxy(target, {}) : target
  }

  function expression (depth: number) {
    return Array.from({ length: 1 + Math.floor(rand() * 4) }, () => leaf(depth))
  }

  const cases: Cases = {}
  for (let i = 0; i < count; i++) {
    const built = expression(0)
    cases[`fuzz ${seed}/${i}`] = () => built
  }
  return cases
}

export const FUZZ_COUNT = 3000

export function sets (): Record<string, Cases> {
  return { builders, shapes, invalid, fuzz: fuzzCases(FUZZ_COUNT, Number(process.env.EXP_FUZZ_SEED ?? 20261111)) }
}

// Inputs the legacy path cannot take at all (it casts them blindly, which can
// crash the process). Only the fast path compiles these, and must throw cleanly.
export const fastOnly: Cases = {
  'number entry': () => [5],
  'null entry': () => [null],
  'hole in the array': () => [, { op: OPS.VAL_INT, intVal: 1 }], // eslint-disable-line no-sparse-arrays
  'string entry after an owning node': () => [...exp.str('a'), 'x'],
  'getter that throws on op': () => [{ get op () { throw new Error('op getter') } }],
  'getter that throws on the value kind': () => [...exp.str('a'), { op: OPS.VAL_STR, get strVal () { throw new Error('strVal getter') } }],
  'getter that throws on an array element': () => {
    const entries = [...exp.str('a'), null]
    Object.defineProperty(entries, 1, { get () { throw new Error('element getter') } })
    return entries
  },
  // every other key the fast path reads, after a node that owns memory
  ...Object.fromEntries(['count', 'sz', 'value', 'intVal', 'uintVal', 'boolVal', 'exp', 'listPolicy', 'mapPolicy'].map(key =>
    [`getter that throws on ${key}`, () => [...exp.str('a'), Object.defineProperty({ op: OPS.VAL_INT }, key, {
      get () { throw new Error(`${key} getter`) }, enumerable: true
    })]]))
}
