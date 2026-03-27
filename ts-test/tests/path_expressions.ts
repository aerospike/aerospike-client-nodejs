// *****************************************************************************
// Copyright 2022-2023 Aerospike, Inc.
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

/* eslint-env mocha */
/* global expect */

import Aerospike, { maps as Maps, AerospikeBins, RecordMetadata, Key, AerospikeRecord, AerospikeExp, operations, exp as expModule, cdt, GeoJSON, hll} from '../../lib/aerospike';

const Context: typeof cdt.Context = Aerospike.cdt.Context

import { expect, assert } from 'chai'; 
import * as helper from './test_helper';

const exp: typeof expModule = Aerospike.exp
const op: typeof operations = Aerospike.operations

const pathSelectFlags: any = exp.pathSelectFlags
const pathModifyFlags: any = exp.pathModifyFlags
const loopVarPart: any = exp.loopVarPart
const type: any = exp.type

const keygen = helper.keygen
const tempBin = 'ExpVar'

describe('Aerospike.exp.selectByPath', async function () {
  const client = helper.client

  helper.skipUnlessVersion('>= 5.0.0', this)

  const key: Key = new Aerospike.Key(helper.namespace, helper.set, 1)

  const addAllChildren: cdt.Context = new Context().addAllChildren()
  const doubleAddAllChildren: cdt.Context = new Context().addAllChildren().addAllChildren()

  async function verifySelectByPath(bin: string, expression: AerospikeExp, expected: any, ) {

    const ops = [
      exp.operations.read(bin, expression, exp.expReadFlags.DEFAULT)
    ]

    const result: any = await client.operate(key, ops)
    expect(expected).to.eql(result.bins[bin])
  }

  async function verifyModifyByPath(bin: string, expression: AerospikeExp, expected: any) {

    const ops = [
      exp.operations.write(bin, expression, exp.expWriteFlags.DEFAULT)
    ]

    await client.operate(key, ops)

    const result: any = await client.get(key)

    expect(expected).to.eql(result.bins[bin])

  }

  const hllCats: Buffer = Buffer.from([0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0,
    0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])

  const record = {
    c_example: {
      book: [{'title': 'abc', 'price': 1.48}, {'title': 'def', 'price': 2.78}]
    },
    floatMap: {a: 1.5, b: 3.0, c: 4.5},
    floatList: [2.4, 4.8, 7.2],
    // n=nested
    nFloatList: [[2.4, 4.8, 7.2]],
    // dn=doubleNested
    dnFloatList: [[[2.4, 4.8, 7.2]]],
    intList: [2, 4, 6],
    nIntList: [[2, 4, 6]],
    dnIntList: [[[2, 4, 6]]],
    strList: ['bob', 'tom', 'harry'],
    nStrList: [['bob', 'tom', 'harry']],
    dnStrList: [[['bob', 'tom', 'harry']]],
    blobList: [Buffer.from('bob'), Buffer.from('tom'), Buffer.from('harry')],
    nBlobList: [[Buffer.from('bob'), Buffer.from('tom'), Buffer.from('harry')]],
    dnBlobList: [[[Buffer.from('bob'), Buffer.from('tom'), Buffer.from('harry')]]],
    boolList: [false, true, false],
    nBoolList: [[false, true, false]],
    dnBoolList: [[[false, true, false]]],
    nilList: [null, null, null],
    geoList: [new GeoJSON.Point(50.913, 50.308), new GeoJSON.Point(0.913, 0.308), new GeoJSON.Point(0.913, 0.308)],
    mapList: [{a: 1}, {b: 2}, {c: 3}],
    listList: [[1], [2], [3]],
    listListList: [[[1], [2], [3]]]
    //boolList: [2.4, 4.8, 7.2],
    //nNilList: [[2.4, 4.8, 7.2]],
    //dnNilList: [[[2.4, 4.8, 7.2]]],

  }

  context('Positive tests', function () {


    context('modifyByPath', function () {
      context('arguments', function () {

        context('bin', function () {

          it('accepts exp.mapBin', async function () {

            const modExpression = exp.float(14.0)

            const modifyByPath = exp.modifyByPath(exp.binMap('c_example'), exp.type.MAP, modExpression, pathModifyFlags.DEFAULT, addAllChildren)
            
            await verifyModifyByPath('c_example', modifyByPath, {book: 14})

          })
        })

        context('valueTypes', function () {

          it('accepts exp.type.MAP', async function () {

            const modExpression = exp.float(14.0)

            const modifyByPath = exp.modifyByPath(exp.binMap('floatMap'), exp.type.MAP, modExpression, pathModifyFlags.DEFAULT, addAllChildren)
            
            await verifyModifyByPath('floatMap', modifyByPath, {a: 14, b: 14, c: 14})

          })

          it('accepts exp.type.LIST', async function () {

            const modExpression = exp.float(14.0)

            const modifyByPath = exp.modifyByPath(exp.binList('floatList'), exp.type.LIST, modExpression, pathModifyFlags.DEFAULT, addAllChildren)
            
            await verifyModifyByPath('floatList', modifyByPath, [14, 14, 14])

          })

        })

        context('flags', function () {


          context('pathModifyFlags', function () {

            context('DEFAULT', function () {

              const flags = pathModifyFlags.DEFAULT
              const noFailFlags = pathModifyFlags.DEFAULT | pathModifyFlags.NO_FAIL

              it('equals the correct numeric value', async function () {
                expect(flags).to.eql(0)
                expect(noFailFlags).to.eql(16)
              })

              it('returns the correct value when used with operate', async function () {
                const modExpression = exp.float(14.0)

                const modifyByPath = exp.modifyByPath(exp.binMap('floatMap'), exp.type.MAP, modExpression, flags, addAllChildren)
  
                await verifyModifyByPath('floatMap', modifyByPath, {a: 14, b: 14, c: 14})
              })

              it('returns the correct value when used with operate and NO_FAIL', async function () {
                const modExpression = exp.float(14.0)

                const modifyByPath = exp.modifyByPath(exp.binMap('floatMap'), exp.type.MAP, modExpression, noFailFlags, addAllChildren)
  
                await verifyModifyByPath('floatMap', modifyByPath, {a: 14, b: 14, c: 14})
              })

            })

            context('NO_FAIL', function () {
              it('equals the correct numeric value', async function () {
                expect(pathModifyFlags.NO_FAIL).to.eql(16)
              })
            })

          })
        })

        context('modExp', function () {


          it('modifies with standard expression', async function () {

            const modExpression = exp.float(14.0)

            const modifyByPath = exp.modifyByPath(exp.binMap('c_example'), exp.type.MAP, modExpression, pathModifyFlags.DEFAULT, addAllChildren)
            
            await verifyModifyByPath('c_example', modifyByPath, {book: 14})
  
          })

          it('modifies with result remove expression', async function () {

            const modExpression = exp.resultRemove()

            const modifyByPath = exp.modifyByPath(exp.binMap('c_example'), exp.type.MAP, modExpression, pathModifyFlags.DEFAULT, addAllChildren)
            
            await verifyModifyByPath('c_example', modifyByPath, {})
  
          })

          it('modifies with standard loop variable expression', async function () {

            const modExpression = exp.mul(exp.loopVarFloat(exp.loopVarPart.VALUE), exp.float(3.7))

            const modifyByPath = exp.modifyByPath(exp.binList('floatList'), exp.type.LIST, modExpression, pathModifyFlags.DEFAULT, addAllChildren)
            
            await verifyModifyByPath('floatList', modifyByPath, [ 8.88, 17.76, 26.64 ])

          })

          it('modifies with nested loop variable expression', async function () {

            const modExpression = exp.mul(exp.loopVarFloat(exp.loopVarPart.VALUE), exp.float(3.7))

            const modifyByPath = exp.modifyByPath(exp.binList('nFloatList'), exp.type.LIST, modExpression, pathModifyFlags.DEFAULT, doubleAddAllChildren)
            
            await verifyModifyByPath('nFloatList', modifyByPath, [[ 8.88, 17.76, 26.64 ]])

          })

          it('modifies with double nested loop variable expression', async function () {

            const ctx: cdt.Context = new Context().addListIndex(0).addAllChildren().addAllChildren()

            const modExpression = exp.mul(exp.loopVarFloat(exp.loopVarPart.VALUE), exp.float(3.7))

            const modifyByPath = exp.modifyByPath(exp.binList('dnFloatList'), exp.type.LIST, modExpression, pathModifyFlags.DEFAULT, ctx)
            
            await verifyModifyByPath('dnFloatList', modifyByPath, [[[ 8.88, 17.76, 26.64 ]]]  )

          })

          context('loopVar', function () {

            it('use loopVarFloat Expression', async function () {
              const modExpression = exp.cond(exp.gt(exp.loopVarFloat(exp.loopVarPart.VALUE), exp.float(3.6)), exp.float(1.0), exp.float(0.0))

              const modifyByPath = exp.modifyByPath(exp.binList('floatList'), exp.type.LIST, modExpression, pathModifyFlags.DEFAULT, addAllChildren)
              
              await verifyModifyByPath('floatList', modifyByPath, [ 0.0, 1.0, 1.0 ]  )

            })

            it('use loopVarInt Expression', async function () {
              const modExpression = exp.cond(exp.gt(exp.loopVarInt(exp.loopVarPart.VALUE), exp.int(2)), exp.int(1), exp.int(0))

              const modifyByPath = exp.modifyByPath(exp.binList('intList'), exp.type.LIST, modExpression, pathModifyFlags.DEFAULT, addAllChildren)
              
              await verifyModifyByPath('intList', modifyByPath, [ 0, 1, 1 ]  )

            })

            it('use loopVarStr Expression', async function () {
              const modExpression = exp.cond(exp.eq(exp.loopVarStr(exp.loopVarPart.VALUE), exp.str("bob")), exp.str("pass"), exp.str("fail"))

              const modifyByPath = exp.modifyByPath(exp.binList('strList'), exp.type.LIST, modExpression, pathModifyFlags.DEFAULT, addAllChildren)
              
              await verifyModifyByPath('strList', modifyByPath, [ "pass", "fail", "fail" ]  )

            })

            it('use loopVarBlob Expression', async function () {
              const modExpression = exp.cond(exp.eq(exp.loopVarBlob(exp.loopVarPart.VALUE), exp.bytes(Buffer.from('bob'))), exp.bytes(Buffer.from('pass')), exp.bytes(Buffer.from('fail')))

              const modifyByPath = exp.modifyByPath(exp.binList('blobList'), exp.type.LIST, modExpression, pathModifyFlags.DEFAULT, addAllChildren)
              await verifyModifyByPath('blobList', modifyByPath, [ Buffer.from('pass'), Buffer.from('fail'), Buffer.from('fail') ]  )

            })

            it('use loopVarBool Expression', async function () {
              const modExpression = exp.cond(exp.eq(exp.loopVarBool(exp.loopVarPart.VALUE), exp.bool(true)), exp.bool(false), exp.bool(true))

              const modifyByPath = exp.modifyByPath(exp.binList('boolList'), exp.type.LIST, modExpression, pathModifyFlags.DEFAULT, addAllChildren)
              
              await verifyModifyByPath('boolList', modifyByPath, [ true, false, true ]  )

            })

            it('use loopVarNil Expression', async function () {
              const expression = exp.eq(exp.loopVarNil(exp.loopVarPart.VALUE), exp.nil())

              const ctx: cdt.Context = new Context().addAllChildrenWithFilter(expression)

              const selectByPath = exp.selectByPath(exp.binList('nilList'), exp.type.LIST, pathSelectFlags.MAP_VALUE, ctx)

              await verifySelectByPath('nilList', selectByPath, [null, null, null])



            })

            it('use loopVarHLL Expression', async function () {

              Aerospike.wrapHLL(true)

              const ops = [
                hll.add('hll' as any, [...Array(5000).keys()], 4, 4),
                hll.getCount('hll')
              ]

              let result: any = await client.operate(key, ops)

              result = await client.get(key)

              const hllValue: any = result.bins.hll
              expect(result.bins.hll).to.be.instanceOf(Aerospike.HyperLogLog)

              const mapHll: any = {
                'a': hllValue
              }

              const selectExpression = exp.ge(exp.hll.getCount(exp.loopVarStr(exp.loopVarPart.VALUE)), exp.int(0))

              const ctx: cdt.Context = new Context().addAllChildren()

              await client.put(key, { hllMap: mapHll })

              const ops2 = [
                op.selectByPath('hllMap', exp.pathSelectFlags.VALUE, ctx)
              ]

              const result2: any = await client.operate(key, ops2)

              expect(result2.bins.hllMap).to.eql([hllValue])
              expect(result2.bins.hllMap[0]).to.be.instanceOf(Aerospike.HyperLogLog)


            })

            it('use loopVarGeo Expression', async function () {
              const modExpression = exp.cond(exp.cmpGeo(exp.geo(new GeoJSON.Circle(50.913, 50.308, 4)), exp.loopVarGeoJSON(exp.loopVarPart.VALUE)), exp.bool(true), exp.bool(false))



              const modifyByPath = exp.modifyByPath(exp.binList('geoList'), exp.type.LIST, modExpression, pathModifyFlags.DEFAULT, addAllChildren)
              
              await verifyModifyByPath('geoList', modifyByPath, [ true, false, false ]  )


            })


            it('use loopVarMap Expression', async function () {
              const modExpression = exp.cond(exp.eq(exp.loopVarMap(exp.loopVarPart.VALUE), exp.map({b: 2})), exp.bool(false), exp.bool(true))

              const modifyByPath = exp.modifyByPath(exp.binList('mapList'), exp.type.LIST, modExpression, pathModifyFlags.DEFAULT, addAllChildren)
              
              await verifyModifyByPath('mapList', modifyByPath, [ true, false, true ]  )


            })


            it('use loopVarList Expression', async function () {
              const loopVar = exp.loopVarList(exp.loopVarPart.VALUE)

              const modExpression = exp.cond(exp.eq(loopVar, exp.list([1])), exp.bool(false), exp.bool(true))
              expect(loopVar[2].intVal).to.eql(1)


              const modifyByPath = exp.modifyByPath(exp.binList('listList'), exp.type.LIST, modExpression, pathModifyFlags.DEFAULT, addAllChildren)
              
              await verifyModifyByPath('listList', modifyByPath, [ false, true, true ]  )


            })

            context('loopVarPart', async function () {

              it('use loopVarBool Expression with loopVarPart.VALUE', async function () {
                const modExpression = exp.cond(exp.eq(exp.loopVarBool(exp.loopVarPart.VALUE), exp.bool(true)), exp.bool(false), exp.bool(true))
  
                const modifyByPath = exp.modifyByPath(exp.binList('boolList'), exp.type.LIST, modExpression, pathModifyFlags.DEFAULT, addAllChildren)
                
                await verifyModifyByPath('boolList', modifyByPath, [ true, false, true ]  )
  
              })

              it('use loopVarStr Expression with loopVarPart.KEY', async function () {
                const loopVar = exp.loopVarStr(exp.loopVarPart.KEY)

                expect(loopVar[2].intVal).to.eql(0)

                const modExpression = exp.cond(exp.eq(loopVar, exp.str('a')), exp.str('pass'), exp.str('fail'))

                const modifyByPath = exp.modifyByPath(exp.binMap('floatMap'), exp.type.MAP, modExpression, pathModifyFlags.DEFAULT, addAllChildren)
                
                await verifyModifyByPath('floatMap', modifyByPath, { a: 'pass', b: 'fail', c: 'fail' }  )


              })

              it('use loopVarInt Expression with loopVarPart.VALUE', async function () {
                const loopVar = exp.loopVarInt(exp.loopVarPart.INDEX)

                const modExpression = exp.cond(exp.eq(loopVar, exp.int(1)), exp.bool(true), exp.bool(false))
                expect(loopVar[2].intVal).to.eql(2)


                const modifyByPath = exp.modifyByPath(exp.binList('listList'), exp.type.LIST, modExpression, pathModifyFlags.DEFAULT, addAllChildren)
                
                await verifyModifyByPath('listList', modifyByPath, [ false, true, false ]  )


              })
            })
          })





        })

      })
    })

    context('selectByPath', function () {
      context('arguments', function () {

        context('bin', function () {
          it('accepts exp.mapBin', async function () {
            const ctx: cdt.Context = new Context().addMapKey('book').addAllChildren().addMapKey('price')

            const selectByPath = exp.selectByPath(exp.binMap('c_example'), exp.type.LIST, pathSelectFlags.MAP_VALUE, ctx)

            await verifySelectByPath('c_example', selectByPath, [1.48, 2.78])
          })
        })

        context('context', function () {
          it('Adds addAllChildren', async function () {
            const selectByPath = exp.selectByPath(exp.binList('floatList'), exp.type.LIST, pathSelectFlags.VALUE, addAllChildren)
  
            await verifySelectByPath('floatList', selectByPath, record.floatList)

          })

          it('Adds addAllChildren twice', async function () {

            const selectByPath = exp.selectByPath(exp.binList('nFloatList'), exp.type.LIST, pathSelectFlags.VALUE, doubleAddAllChildren)
  
            await verifySelectByPath('nFloatList', selectByPath, record.nFloatList[0])
          })

          it('Adds addAllChildren with nested value', async function () {
            const ctx: cdt.Context = new Context().addListIndex(0).addAllChildren()

            const selectByPath = exp.selectByPath(exp.binList('dnFloatList'), exp.type.LIST, pathSelectFlags.VALUE, ctx)
  
            await verifySelectByPath('dnFloatList', selectByPath, record.dnFloatList[0])
          })

          it('Adds addAllChildren with filter', async function () {
            const ctx: cdt.Context = new Context().addListIndex(0).addAllChildrenWithFilter(exp.eq(exp.bool(true), exp.bool(true)))

            const selectByPath = exp.selectByPath(exp.binList('dnFloatList'), exp.type.LIST, pathSelectFlags.VALUE, ctx)
  
            await verifySelectByPath('dnFloatList', selectByPath, record.dnFloatList[0])
          })

          it('Adds addAllChildren with filter that evaluates to false', async function () {
            const ctx: cdt.Context = new Context().addListIndex(0).addAllChildrenWithFilter(exp.eq(exp.bool(true), exp.bool(false)))

            const selectByPath = exp.selectByPath(exp.binList('dnFloatList'), exp.type.LIST, pathSelectFlags.VALUE, ctx)
  
            await verifySelectByPath('dnFloatList', selectByPath, [])
          })

        })

        context('valueTypes', function () {
          it('accepts exp.type.LIST', async function () {
            const selectByPath = exp.selectByPath(exp.binList('floatList'), exp.type.LIST, pathSelectFlags.VALUE, addAllChildren)
  
            await verifySelectByPath('floatList', selectByPath, record.floatList)
          })

          it('accepts exp.type.MAP', async function () {
            const selectByPath = exp.selectByPath(exp.binMap('floatMap'), exp.type.MAP, pathSelectFlags.MATCHING_TREE, addAllChildren)
  
            await verifySelectByPath('floatMap', selectByPath, record.floatMap)
          })
        })


        context('flags', function () {


          context('pathSelectFlags', function () {

            context('MATCHING_TREE', function () {
              const flags = pathSelectFlags.MATCHING_TREE
              const noFailFlags = pathSelectFlags.MATCHING_TREE | pathSelectFlags.NO_FAIL

              it('equals the correct numeric value', async function () {
                expect(flags).to.eql(0)
                expect(noFailFlags).to.eql(16)
              })

              it('returns the correct value when used with operate', async function () {
                const selectByPath = exp.selectByPath(exp.binMap('floatMap'), exp.type.MAP, flags, addAllChildren)
  
                await verifySelectByPath('floatMap', selectByPath, record.floatMap)             
              })

              it('returns the correct value when used with operate and NO_FAIL', async function () {
                const selectByPath = exp.selectByPath(exp.binMap('floatMap'), exp.type.MAP, noFailFlags, addAllChildren)
  
                await verifySelectByPath('floatMap', selectByPath, record.floatMap)
              })

            })

            context('VALUE', function () {
              const flags = pathSelectFlags.VALUE
              const noFailFlags = pathSelectFlags.VALUE | pathSelectFlags.NO_FAIL

              it('equals the correct numeric value', async function () {
                expect(flags).to.eql(1)
                expect(noFailFlags).to.eql(17)
              })

              it('returns the correct value when used with operate', async function () {
                const selectByPath = exp.selectByPath(exp.binMap('floatMap'), exp.type.LIST, flags, addAllChildren)
  
                await verifySelectByPath('floatMap', selectByPath, Object.values(record.floatMap))             
              })

              it('returns the correct value when used with operate and NO_FAIL', async function () {
                const selectByPath = exp.selectByPath(exp.binMap('floatMap'), exp.type.LIST, noFailFlags, addAllChildren)
  
                await verifySelectByPath('floatMap', selectByPath, Object.values(record.floatMap))
              })

            })

            context('LIST_VALUE', function () {
              const flags = pathSelectFlags.LIST_VALUE
              const noFailFlags = pathSelectFlags.LIST_VALUE | pathSelectFlags.NO_FAIL

              it('equals the correct numeric value', async function () {
                expect(flags).to.eql(1)
                expect(noFailFlags).to.eql(17)
              })

              it('returns the correct value when used with operate', async function () {
                const selectByPath = exp.selectByPath(exp.binList('nFloatList'), exp.type.LIST, flags, addAllChildren)
  
                await verifySelectByPath('nFloatList', selectByPath, record.nFloatList)             
              })

              it('returns the correct value when used with operate and NO_FAIL', async function () {
                const selectByPath = exp.selectByPath(exp.binList('nFloatList'), exp.type.LIST, noFailFlags, addAllChildren)
  
                await verifySelectByPath('nFloatList', selectByPath, record.nFloatList)
              })

            })

            context('MAP_VALUE', function () {
              const flags = pathSelectFlags.MAP_VALUE
              const noFailFlags = pathSelectFlags.MAP_VALUE | pathSelectFlags.NO_FAIL

              it('returns the correct value when used with operate', async function () {
                const selectByPath = exp.selectByPath(exp.binMap('floatMap'), exp.type.LIST, flags, addAllChildren)
  
                await verifySelectByPath('floatMap', selectByPath, Object.values(record.floatMap))             
              })

              it('returns the correct value when used with operate and NO_FAIL', async function () {
                const selectByPath = exp.selectByPath(exp.binMap('floatMap'), exp.type.LIST, noFailFlags, addAllChildren)
  
                await verifySelectByPath('floatMap', selectByPath, Object.values(record.floatMap))
              })

            })

            context('MAP_KEY', function () {
              const flags = pathSelectFlags.MAP_KEY
              const noFailFlags = pathSelectFlags.MAP_KEY | pathSelectFlags.NO_FAIL

              it('equals the correct numeric value', async function () {
                expect(flags).to.eql(2)
                expect(noFailFlags).to.eql(18)
              })

              it('returns the correct value when used with operate', async function () {
                const selectByPath = exp.selectByPath(exp.binMap('floatMap'), exp.type.LIST, flags, addAllChildren)
  
                await verifySelectByPath('floatMap', selectByPath, Object.keys(record.floatMap))          
              })

              it('returns the correct value when used with operate and NO_FAIL', async function () {
                const selectByPath = exp.selectByPath(exp.binMap('floatMap'), exp.type.LIST, noFailFlags, addAllChildren)
  
                await verifySelectByPath('floatMap', selectByPath, Object.keys(record.floatMap))
              })

            })

            context('MAP_KEY_VALUE', function () {
              const flags = pathSelectFlags.MAP_KEY_VALUE
              const noFailFlags = pathSelectFlags.MAP_KEY_VALUE | pathSelectFlags.NO_FAIL

              it('equals the correct numeric value', async function () {
                expect(flags).to.eql(3)
                expect(noFailFlags).to.eql(19)
              })

              it('returns the correct value when used with operate', async function () {
                const selectByPath = exp.selectByPath(exp.binMap('floatMap'), exp.type.LIST, flags, addAllChildren)
  
                await verifySelectByPath('floatMap', selectByPath, Object.entries(record.floatMap).flat())          
              })

              it('returns the correct value when used with operate and NO_FAIL', async function () {
                const selectByPath = exp.selectByPath(exp.binMap('floatMap'), exp.type.LIST, noFailFlags, addAllChildren)
  
                await verifySelectByPath('floatMap', selectByPath, Object.entries(record.floatMap).flat())
              })

            })

            context('NO_FAIL', function () {
              it('equals the correct numeric value', async function () {
                expect(pathSelectFlags.NO_FAIL).to.eql(16)
              })
            })

          })



        })


      })

    })
  })

  context('Negative tests', function () {
    context('selectByPath', function () {
      context('arguments', function () {
        context('bin', function () {

                          //const selectByPath = exp.selectByPath(exp.binMap('floatMap'), exp.type.LIST, noFailFlags, addAllChildren)

          it('Does not accept non-string values', async function () {

            try{
              const selectByPath = exp.selectByPath(2 as any, exp.type.LIST, exp.pathSelectFlags.MATCHING_TREE, addAllChildren)
              assert.fail("An error should have been caught!")
            }
            catch(error: any){
              expect(error.message).to.eql("bin is not iterable")
            }
          })
        })

        context('valueType', function () {
          it('Does not accept non-number values', async function () {
            const selectByPath = exp.selectByPath(exp.binMap('floatMap'), null as any, exp.pathSelectFlags.MATCHING_TREE, addAllChildren)

            try{
              await verifySelectByPath('floatMap', selectByPath, null)
              assert.fail("An error should have been caught!")
            }
            catch(error: any){
              expect(error.message).to.eql("Operations array invalid")
            }          
          })
        })

        context('pathSelectFlags', function () {
          it('Does not accept non-number values', async function () {
            const selectByPath = exp.selectByPath(exp.binMap('floatMap'), exp.type.LIST, null as any, addAllChildren)

            try{
              await verifySelectByPath('floatMap', selectByPath, null)
              assert.fail("An error should have been caught!")
            }
            catch(error: any){
              expect(error.message).to.eql("Operations array invalid")
            }          
          })
        })

        context('context', function () {
          it('Does not accept non-number values', async function () {

            try{
              const selectByPath = exp.selectByPath(exp.binMap('floatMap'), exp.type.LIST, exp.pathSelectFlags.MATCHING_TREE, null as any)
              assert.fail("An error should have been caught!")
            }
            catch(error: any){
              expect(error.message).to.eql("ctx must be a CDT Context")
            }          
          })
        })




      })
    })

    context('modifyByPath', function () {
      context('arguments', function () {
        context('bin', function () {

          it('Does not accept non-string values', async function () {

            try{
              const modifyByPath = exp.modifyByPath(2 as any, exp.type.LIST, exp.float(14.0), exp.pathModifyFlags.DEFAULT, addAllChildren)
              assert.fail("An error should have been caught!")
            }
            catch(error: any){
              expect(error.message).to.eql("bin is not iterable")
              expect(error instanceof TypeError).to.eql(true)
            }
          })
        })

        context('valueType', function () {
          it('Does not accept non-number values', async function () {
            const modifyByPath = exp.modifyByPath(exp.binMap('floatMap'), null as any, exp.float(14.0), exp.pathModifyFlags.DEFAULT, addAllChildren)

            try{
              await verifyModifyByPath('floatMap', modifyByPath, null)
              assert.fail("An error should have been caught!")
            }
            catch(error: any){
              expect(error.message).to.eql("Operations array invalid")
            }          
          })
        })

        context('modExp', function () {
          it('Does not accept non-number values', async function () {
            const modifyByPath = exp.modifyByPath(exp.binMap('floatMap'), exp.type.LIST, null as any, exp.pathModifyFlags.DEFAULT, addAllChildren)

            try{
              await verifyModifyByPath('floatMap', modifyByPath, null)
              assert.fail("An error should have been caught!")
            }
            catch(error: any){
              expect(error.message).to.eql("Operations array invalid")
            }          
          })
        })

        context('pathModifyFlags', function () {
          it('Does not accept non-number values', async function () {

            try{
              const modifyByPath = exp.modifyByPath(exp.binMap('floatMap'), exp.type.LIST, exp.float(14.0), null as any, addAllChildren)
              assert.fail("An error should have been caught!")
            }
            catch(error: any){
              expect(error.message).to.eql("flags must be a number")
            }          
          })
        })
        context('context', function () {
          it('Does not accept non-number values', async function () {

            try{
              const modifyByPath = exp.modifyByPath(exp.binMap('floatMap'), exp.type.LIST, exp.float(14.0), exp.pathModifyFlags.DEFAULT, null as any)
              assert.fail("An error should have been caught!")
            }
            catch(error: any){
              expect(error.message).to.eql("ctx must be a CDT Context")
            }          
          })
        })




      })
    })
  })

  context('Typescript', function () {
    it('selectByPath', function () {
      const selectByPath: AerospikeExp = exp.selectByPath(exp.binMap('floatMap'), exp.type.LIST, exp.pathSelectFlags.MATCHING_TREE, addAllChildren)
    })

    it('modifyByPath', function () {
      const modifyByPath: AerospikeExp = exp.modifyByPath(exp.binMap('floatMap'), exp.type.LIST, exp.float(14.0), exp.pathModifyFlags.DEFAULT, addAllChildren)
    })
  })

  beforeEach(async () => { /* setup */ 
    await client.put(key, record)
  })


  afterEach(async () => { /* setup */ 

    await client.remove(key)
  })

})
