'use strict'

// Expression corpus for the conversion fast-path tests: every node kind lib/exp*.js emits
// (op only, count, intVal, uintVal, floatVal, boolVal, strVal, bytesVal+sz, value, inf,
// wildcard, ctx, listPolicy, mapPolicy, nested exp), plus the real-world expressions from the
// capture-gate POC (stores.js) that motivated the change, plus malformed input.

const Aerospike = require('../../lib/aerospike')

const { exp, lists, maps } = Aerospike
const OPS = require('../../lib/native').exp.ops // op codes, for hand-built malformed nodes
const { EXISTS, VALUE } = maps.returnType
const UNLIMITED = Number.MAX_SAFE_INTEGER

// ---- capture-gate POC (shim/stores.js, connectAerospike) ----
const str = value => exp.str(String(value))
const int = value => exp.int(value)
const USED = exp.binMap('used')
const LIMIT = exp.binMap('limit')
const USERS = exp.binMap('users')
const hasKey = (map, key) => exp.maps.getByKey(map, key, exp.type.AUTO, EXISTS)
const usedOf = key => exp.cond(hasKey(USED, key), exp.maps.getByKey(USED, key, exp.type.INT, VALUE), int(0))
const availableOf = key => exp.cond(hasKey(LIMIT, key), exp.sub(exp.maps.getByKey(LIMIT, key, exp.type.INT, VALUE), usedOf(key)), int(UNLIMITED))
const groupOf = ids => exp.cond(hasKey(USERS, str(ids.userId)), exp.maps.getByKey(USERS, str(ids.userId), exp.type.STR, VALUE), str(`group:${ids.userGroupId}`))

function lushaOpen (ids = { userId: 'u1', userGroupId: 'g1' }, amount = 1) {
  const userKey = str(`user:${ids.userId}`)
  const group = exp.var('group')
  const tightest = exp.var('tightest')
  const grant = exp.var('grant')
  const scoped = body => exp.let(
    exp.def('group', groupOf(ids)),
    exp.def('tightest', exp.min(availableOf(userKey), availableOf(group), availableOf(str('account')))),
    exp.def('grant', exp.min(int(amount), exp.max(int(0), tightest))),
    body
  )
  const debit = [userKey, group, str('account')].reduce((m, k) => exp.maps.put(m, exp.add(usedOf(k), grant), k), USED)
  const answer = exp.lists.append(exp.lists.append(exp.lists.append(exp.list([]), grant), group), tightest)

  return { read: scoped(answer), write: scoped(debit), filter: scoped(exp.gt(tightest, int(0))) }
}

const lushaRefund = (layers = ['user:u1', 'group:g1', 'account'], n = 1) =>
  layers.reduce((m, id) => exp.maps.put(m, exp.max(int(0), exp.sub(usedOf(str(id)), int(n))), str(id)), USED)

// ---- coverage corpus: name -> () => expression ----
const ctxList = () => new Aerospike.cdt.Context().addListIndex(0)
const ctxMap = () => new Aerospike.cdt.Context().addMapKey('a').addListIndex(-1)
const listPolicy = () => new Aerospike.ListPolicy({ order: lists.order.ORDERED })
const mapPolicy = () => new Aerospike.MapPolicy({ order: maps.order.KEY_ORDERED })
const point = Aerospike.GeoJSON.Point(103.913, 1.308)

const corpus = {
  // scalar value nodes
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
  'list value': () => exp.list([1, 'a', [2, 3], { k: 'v' }]),
  'map value': () => exp.map({ a: 1, b: { c: [1, 2] } }),
  geo: () => exp.geo(point),

  // bins and metadata (op + count, op + strVal)
  bins: () => exp.and(exp.binExists('a'), exp.eq(exp.binInt('i'), exp.int(1)), exp.eq(exp.binStr('s'), exp.str('x')),
    exp.eq(exp.binFloat('f'), exp.float(1.5)), exp.eq(exp.binBool('b'), exp.bool(true)), exp.eq(exp.binType('t'), exp.int(1))),
  'bins collections': () => exp.or(exp.eq(exp.binList('l'), exp.list([])), exp.eq(exp.binMap('m'), exp.map({})),
    exp.eq(exp.binBlob('bl'), exp.bytes(Buffer.from('ab'), 2)), exp.cmpGeo(exp.binGeo('g'), exp.geo(point))),
  meta: () => exp.and(exp.gt(exp.ttl(), exp.int(0)), exp.gt(exp.voidTime(), exp.int(0)), exp.gt(exp.lastUpdate(), exp.int(0)),
    exp.ge(exp.sinceUpdate(), exp.int(0)), exp.eq(exp.setName(), exp.str('s')), exp.not(exp.isTombstone()),
    exp.ge(exp.recordSize(), exp.int(0)), exp.eq(exp.digestModulo(3), exp.int(1)), exp.keyExist()),
  keys: () => exp.or(exp.eq(exp.keyInt(), exp.int(1)), exp.eq(exp.keyStr(), exp.str('k')), exp.eq(exp.keyBlob(), exp.bytes(Buffer.from('k'), 1))),

  // logic / comparison / arithmetic
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

  // CDT: ctx and list/map policy nodes
  'list read ctx': () => exp.lists.getByIndex(exp.binList('l'), exp.int(0), exp.type.INT, lists.returnType.VALUE, ctxList()),
  'list append policy': () => exp.lists.append(exp.binList('l'), exp.int(1), listPolicy()),
  'list append policy ctx': () => exp.lists.append(exp.binList('l'), exp.str('x'), listPolicy(), ctxList()),
  'list insertItems': () => exp.lists.insertItems(exp.binList('l'), exp.list([1, 2]), exp.int(0), listPolicy()),
  'list increment': () => exp.lists.increment(exp.binList('l'), exp.int(1), exp.int(0), listPolicy()),
  'list sort': () => exp.lists.sort(exp.binList('l'), lists.sortFlags.DEFAULT),
  'list removeByValueList': () => exp.lists.removeByValueList(exp.binList('l'), exp.list([1]), ctxList()),
  'map put policy': () => exp.maps.put(exp.binMap('m'), exp.int(1), exp.str('k'), mapPolicy()),
  'map put policy ctx': () => exp.maps.put(exp.binMap('m'), exp.int(1), exp.str('k'), mapPolicy(), ctxMap()),
  'map putItems': () => exp.maps.putItems(exp.binMap('m'), exp.map({ a: 1 }), mapPolicy()),
  'map increment': () => exp.maps.increment(exp.binMap('m'), exp.int(1), exp.str('k'), mapPolicy()),
  'map getByKeyList': () => exp.maps.getByKeyList(exp.binMap('m'), exp.list(['a', 'b']), maps.returnType.VALUE, ctxMap()),
  'map relRank': () => exp.maps.getByValueRelRankRange(exp.binMap('m'), exp.int(2), exp.int(0), exp.int(5), maps.returnType.KEY),
  'map getByIndex': () => exp.maps.getByIndex(exp.binMap('m'), exp.int(0), exp.type.INT, maps.returnType.VALUE),

  // bit / hll
  'bit ops': () => exp.eq(exp.bit.count(exp.bit.reSize(exp.binBlob('b'), 0, exp.int(4)), exp.int(0), exp.int(8)),
    exp.bit.getInt(exp.bit.setInt(exp.binBlob('b'), exp.int(1), exp.int(8), exp.int(0)), true, exp.int(8), exp.int(0))),
  'hll ops': () => exp.and(exp.gt(exp.hll.getCount(exp.hll.add(exp.binHll('h'), 8, exp.list(['a', 'b']))), exp.int(0)),
    exp.eq(exp.hll.mayContain(exp.binHll('h'), exp.list(['a'])), exp.int(1)),
    exp.gt(exp.hll.getCount(exp.hll.init(exp.binHll('h'), 8)), exp.int(-1))),

  // path expressions: ctx + nested exp node (MERGE)
  selectByPath: () => exp.selectByPath(exp.binMap('m'), exp.type.MAP, 0, ctxMap()),
  modifyByPath: () => exp.modifyByPath(exp.binMap('m'), exp.type.MAP, exp.int(1), 0, ctxMap()),

  // the motivating expressions
  'lusha open read': () => lushaOpen().read,
  'lusha open write': () => lushaOpen().write,
  'lusha open filter': () => lushaOpen().filter,
  'lusha refund': () => lushaRefund(),

  // size stress
  'and of 2000 eq': () => exp.and(...Array.from({ length: 2000 }, (_, i) => exp.eq(exp.binInt(`b${i % 7}`), exp.int(i)))),
  'and of 500 str eq': () => exp.and(...Array.from({ length: 500 }, (_, i) => exp.eq(exp.binStr('s'), exp.str(`v${i}`))))
}

// malformed input: both paths must reject it the same way (error, no crash)
const invalid = {
  'empty node': () => [{}],
  'op not a number': () => [{ op: 'x' }],
  'count not a number': () => [{ op: OPS.AND, count: 'two' }],
  'sz not a number': () => [{ op: OPS.VAL_BYTES, sz: 'x', bytesVal: Buffer.from('a') }],
  'strVal not a string': () => [{ op: OPS.BIN, strVal: 5 }],
  'intVal not a number': () => [{ op: OPS.VAL_INT, intVal: 'x' }],
  'boolVal not a boolean': () => [{ op: OPS.VAL_BOOL, boolVal: 1 }],
  'value undefined': () => [{ op: OPS.AS_VAL, value: undefined }],
  'nested exp not array/string': () => [{ op: OPS.MERGE, exp: 5 }],
  'error after a string node (cleanup path)': () => [{ op: OPS.CMP_EQ, count: 3 }, ...exp.binStr('s'), ...exp.str('a'), { op: 'x' }]
}

module.exports = { corpus, invalid, lushaOpen, lushaRefund }
