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

import Aerospike, { maps as Maps, AerospikeBins, RecordMetadata, Key, AerospikeRecord, AerospikeExp, operations, exp as expModule, cdt, GeoJSON} from 'aerospike';

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


describe('Path Operations', async function () {
  const client = helper.client

  helper.skipUnlessVersion('>= 5.0.0', this)

  const key: Key = new Aerospike.Key(helper.namespace, helper.set, 1)

  const addAllChildren: cdt.Context = new Context().addAllChildren()
  const doubleAddAllChildren: cdt.Context = new Context().addAllChildren().addAllChildren()

  async function verifySelectByPath(bin: string, context: cdt.Context, flags: number, expected: any) {
  
    const ops: operations.Operation[] = [
      op.selectByPath(bin, flags, context)
    ]
  
    const result: any = await client.operate(key, ops)
    
    expect(result.bins[bin]).to.eql(expected)
  
  }

  async function verifyModifyByPath(bin: string, context: cdt.Context, expression: AerospikeExp, flags: number, expected: any) {

    const ops: operations.Operation[] = [
      op.modifyByPath(bin, expression, flags, context),
    ]


    await client.operate(key, ops)

    const result: any = await client.get(key)

    expect(expected).to.eql(result.bins[bin])

  }

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

  }

  context('Positive tests', function () {


    context('modifyByPath', function () {
      context('arguments', function () {

        context('bin', function () {

          it('accepts exp.mapBin', async function () {

            const modExpression = exp.float(14.0)

            await verifyModifyByPath('c_example', addAllChildren, modExpression, pathModifyFlags.DEFAULT, {book: 14})

          })
        })

        context('valueTypes', function () {

          it('accepts exp.type.MAP', async function () {

            const modExpression = exp.float(14.0)
            
            await verifyModifyByPath('floatMap', addAllChildren, modExpression, pathModifyFlags.DEFAULT, {a: 14, b: 14, c: 14})

          })

          it('accepts exp.type.LIST', async function () {

            const modExpression = exp.float(14.0)
            
            await verifyModifyByPath('floatList', addAllChildren, modExpression, pathModifyFlags.DEFAULT, [14, 14, 14])

          })

        })

        context('flags', function () {


          context('pathSelectFlags', function () {

            context('MATCHING_TREE', function () {

              const flags = pathModifyFlags.DEFAULT
              const noFailFlags = pathModifyFlags.DEFAULT | pathModifyFlags.NO_FAIL

              it('equals the correct numeric value', async function () {
                expect(flags).to.eql(0)
                expect(noFailFlags).to.eql(16)
              })

              it('returns the correct value when used with operate', async function () {
                const modExpression = exp.float(14.0)

  
                await verifyModifyByPath('floatMap', addAllChildren, modExpression, flags, {a: 14, b: 14, c: 14})
              })

              it('returns the correct value when used with operate and NO_FAIL', async function () {
                const modExpression = exp.float(14.0)

  
                await verifyModifyByPath('floatMap', addAllChildren, modExpression, flags, {a: 14, b: 14, c: 14})
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
            
            await verifyModifyByPath('c_example', addAllChildren, modExpression, pathModifyFlags.DEFAULT, {book: 14})
  
          })

          it('modifies with result remove expression', async function () {

            const modExpression = exp.removeResult()
            
            await verifyModifyByPath('c_example', addAllChildren, modExpression, pathModifyFlags.DEFAULT, {})
  
          })

          it('modifies with standard loop variable expression', async function () {

            const modExpression = exp.mul(exp.loopVarFloat(exp.loopVarPart.VALUE), exp.float(3.7))

            
            await verifyModifyByPath('floatList', addAllChildren, modExpression, pathModifyFlags.DEFAULT, [ 8.88, 17.76, 26.64 ])

          })

          it('modifies with nested loop variable expression', async function () {

            const modExpression = exp.mul(exp.loopVarFloat(exp.loopVarPart.VALUE), exp.float(3.7))

            
            await verifyModifyByPath('nFloatList', doubleAddAllChildren, modExpression, pathModifyFlags.DEFAULT, [[ 8.88, 17.76, 26.64 ]])

          })

          it('modifies with double nested loop variable expression', async function () {

            const ctx: cdt.Context = new Context().addListIndex(0).addAllChildren().addAllChildren()

            const modExpression = exp.mul(exp.loopVarFloat(exp.loopVarPart.VALUE), exp.float(3.7))

            
            await verifyModifyByPath('dnFloatList', ctx, modExpression, pathModifyFlags.DEFAULT, [[[ 8.88, 17.76, 26.64 ]]]  )

          })

          context('loopVar', function () {

            it('use loopVarFloat Expression', async function () {
              const modExpression = exp.cond(exp.gt(exp.loopVarFloat(exp.loopVarPart.VALUE), exp.float(3.6)), exp.float(1.0), exp.float(0.0))

              
              await verifyModifyByPath('floatList', addAllChildren, modExpression, pathModifyFlags.DEFAULT, [ 0.0, 1.0, 1.0 ]  )

            })

            it('use loopVarInt Expression', async function () {
              const modExpression = exp.cond(exp.gt(exp.loopVarInt(exp.loopVarPart.VALUE), exp.int(2)), exp.int(1), exp.int(0))

              
              await verifyModifyByPath('intList', addAllChildren, modExpression, pathModifyFlags.DEFAULT, [ 0, 1, 1 ]  )

            })

            it('use loopVarStr Expression', async function () {
              const modExpression = exp.cond(exp.eq(exp.loopVarStr(exp.loopVarPart.VALUE), exp.str("bob")), exp.str("pass"), exp.str("fail"))

              
              await verifyModifyByPath('strList', addAllChildren, modExpression, pathModifyFlags.DEFAULT, [ "pass", "fail", "fail" ]  )

            })

            it('use loopVarBlob Expression', async function () {
              const modExpression = exp.cond(exp.eq(exp.loopVarBlob(exp.loopVarPart.VALUE), exp.bytes(Buffer.from('bob'))), exp.bytes(Buffer.from('pass')), exp.bytes(Buffer.from('fail')))

              await verifyModifyByPath('blobList', addAllChildren, modExpression, pathModifyFlags.DEFAULT, [ Buffer.from('pass'), Buffer.from('fail'), Buffer.from('fail') ]  )

            })

            it('use loopVarBool Expression', async function () {
              const modExpression = exp.cond(exp.eq(exp.loopVarBool(exp.loopVarPart.VALUE), exp.bool(true)), exp.bool(false), exp.bool(true))

              
              await verifyModifyByPath('boolList', addAllChildren, modExpression, pathModifyFlags.DEFAULT, [ true, false, true ]  )

            })

            it('use loopVarNil Expression', async function () {
              const expression = exp.eq(exp.loopVarNil(exp.loopVarPart.VALUE), exp.nil())

              const ctx: cdt.Context = new Context().addAllChildrenWithFilter(expression)
              expect(expression[2].intVal).to.eql(exp.type.NIL)

              await verifySelectByPath('nilList', ctx, pathSelectFlags.MAP_VALUE, [ null, null, null ]  )
            })

            it('use loopVarGeo Expression', async function () {
              const modExpression = exp.cond(exp.cmpGeo(exp.geo(new GeoJSON.Circle(50.913, 50.308, 4)), exp.loopVarGeoJSON(exp.loopVarPart.VALUE)), exp.bool(true), exp.bool(false))

              
              await verifyModifyByPath('geoList', addAllChildren, modExpression, pathModifyFlags.DEFAULT, [ true, false, false ]  )


            })


            it('use loopVarMap Expression', async function () {
              const modExpression = exp.cond(exp.eq(exp.loopVarMap(exp.loopVarPart.VALUE), exp.map({b: 2})), exp.bool(false), exp.bool(true))

              
              await verifyModifyByPath('mapList', addAllChildren, modExpression, pathModifyFlags.DEFAULT, [ true, false, true ]  )


            })

            it('use loopVarList Expression', async function () {
              const modExpression = exp.cond(exp.eq(exp.loopVarList(exp.loopVarPart.VALUE), exp.list([1])), exp.bool(false), exp.bool(true))


              
              await verifyModifyByPath('listList', addAllChildren, modExpression, pathModifyFlags.DEFAULT, [ false, true, true ]  )


            })
            it('loopVarPart', async function () {

              it('use loopVarStr Expression with loopVarPart.VALUE', async function () {
                const modExpression = exp.cond(exp.eq(exp.loopVarStr(exp.loopVarPart.VALUE), exp.str("bob")), exp.str("pass"), exp.str("fail"))

                
                await verifyModifyByPath('strList', addAllChildren, modExpression, pathModifyFlags.DEFAULT, [ "pass", "fail", "fail" ]  )

              })

              it('use loopVarStr Expression with loopVarPart.KEY', async function () {
                const loopVar = exp.loopVarStr(exp.loopVarPart.KEY)

                expect(loopVar[2].intVal).to.eql(0)

                const modExpression = exp.cond(exp.eq(loopVar, exp.str('a')), exp.str('pass'), exp.str('fail'))

                
                await verifyModifyByPath('floatMap', addAllChildren, modExpression, pathModifyFlags.DEFAULT, { a: 'pass', b: 'fail', c: 'fail' }  )


              })

              it('use loopVarInt Expression with loopVarPart.INDEX', async function () {
                const loopVar = exp.loopVarInt(exp.loopVarPart.INDEX)

                const modExpression = exp.cond(exp.eq(loopVar, exp.int(1)), exp.bool(true), exp.bool(false))
                expect(loopVar[2].intVal).to.eql(2)

                await verifyModifyByPath('floatMap', addAllChildren, modExpression, pathModifyFlags.DEFAULT,  [ false, true, false ]  )


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

            await verifySelectByPath('c_example', ctx, pathSelectFlags.MAP_VALUE, [1.48, 2.78])
          })
        })

        context('context', function () {
          it('Adds addAllChildren', async function () {
  
            await verifySelectByPath('floatList', addAllChildren, pathSelectFlags.VALUE, record.floatList)

          })

          it('Adds addAllChildren twice', async function () {

  
            await verifySelectByPath('nFloatList', doubleAddAllChildren, pathSelectFlags.VALUE, record.nFloatList[0])
          })

          it('Adds addAllChildren with nested value', async function () {
            const ctx: cdt.Context = new Context().addListIndex(0).addAllChildren()

  
            await verifySelectByPath('dnFloatList', ctx, pathSelectFlags.VALUE, record.dnFloatList[0])
          })

        })

        context('valueTypes', function () {
          it('accepts exp.type.LIST', async function () {
  
            await verifySelectByPath('floatList', addAllChildren, pathSelectFlags.VALUE, record.floatList)
          })

          it('accepts exp.type.MAP', async function () {
  
            await verifySelectByPath('floatMap', addAllChildren, pathSelectFlags.MATCHING_TREE, record.floatMap)
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
  
                await verifySelectByPath('floatMap', addAllChildren, flags, record.floatMap)             
              })

              it('returns the correct value when used with operate and NO_FAIL', async function () {
  
                await verifySelectByPath('floatMap', addAllChildren, noFailFlags, record.floatMap)
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
  
                await verifySelectByPath('floatMap', addAllChildren, flags, Object.values(record.floatMap))             
              })

              it('returns the correct value when used with operate and NO_FAIL', async function () {
  
                await verifySelectByPath('floatMap', addAllChildren, noFailFlags, Object.values(record.floatMap))
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
  
                await verifySelectByPath('nFloatList', addAllChildren, flags, record.nFloatList)             
              })

              it('returns the correct value when used with operate and NO_FAIL', async function () {
  
                await verifySelectByPath('nFloatList', addAllChildren, noFailFlags, record.nFloatList)
              })

            })

            context('MAP_VALUE', function () {
              const flags = pathSelectFlags.MAP_VALUE
              const noFailFlags = pathSelectFlags.MAP_VALUE | pathSelectFlags.NO_FAIL

              it('returns the correct value when used with operate', async function () {
  
                await verifySelectByPath('floatMap', addAllChildren, flags, Object.values(record.floatMap))             
              })

              it('returns the correct value when used with operate and NO_FAIL', async function () {
  
                await verifySelectByPath('floatMap', addAllChildren, noFailFlags, Object.values(record.floatMap))
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
  
                await verifySelectByPath('floatMap', addAllChildren, flags, Object.keys(record.floatMap))          
              })

              it('returns the correct value when used with operate and NO_FAIL', async function () {
  
                await verifySelectByPath('floatMap', addAllChildren, noFailFlags, Object.keys(record.floatMap))
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
  
                await verifySelectByPath('floatMap', addAllChildren, flags, Object.entries(record.floatMap).flat())          
              })

              it('returns the correct value when used with operate and NO_FAIL', async function () {
  
                await verifySelectByPath('floatMap', addAllChildren, noFailFlags, Object.entries(record.floatMap).flat())
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

          it('Does not accept non-string values', async function () {
            const ops: operations.Operation[] = [
              op.selectByPath(2 as any, exp.pathSelectFlags.MATCHING_TREE, addAllChildren)
            ]
          
            try{
              const result: any = await client.operate(key, ops)

              assert.fail("An error should have been caught!")
            }
            catch(error: any){
              expect(error.message).to.eql("Operations array invalid")
            }          
          })
        })

        context('context', function () {
          it('Does not accept non-context values', async function () {
            try{
              const ops: operations.Operation[] = [
                op.selectByPath('floatMap',  exp.pathSelectFlags.MATCHING_TREE, null as any)
                
              ]
            }
            catch(error: any){
              expect(error.message).to.eql("ctx must be a CDT Context")
            }          
          })
        })

        context('pathSelectFlags', function () {
          it('Does not accept non-number values', async function () {
            const ops: operations.Operation[] = [
              op.selectByPath('floatMap', 'invalid' as any,  addAllChildren)
            ]

            try{
              const result: any = await client.operate(key, ops)
              assert.fail("An error should have been caught!")
            }
            catch(error: any){
              expect(error.message).to.eql("Operations array invalid")
            }          
          })
        })




      })
    })

    context('modifyByPath', function () {
      context('arguments', function () {
        context('bin', function () {

          it('Does not accept non-string values', async function () {
            const ops: operations.Operation[] = [
              op.modifyByPath(2 as any, exp.float(14.0), exp.pathModifyFlags.DEFAULT, addAllChildren),
            ]

            try{
              await client.operate(key, ops)
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
              const ops: operations.Operation[] = [
                op.modifyByPath('floatMap', exp.float(14.0), exp.pathModifyFlags.DEFAULT, null as any),
              ]

              assert.fail("An error should have been caught!")
            }
            catch(error: any){
              expect(error.message).to.eql("ctx must be a CDT Context")
            }          
          })
        })

        context('modExp', function () {
          it('Does not accept non-expression values', async function () {
            const ops: operations.Operation[] = [
              op.modifyByPath('floatMap', null as any, exp.pathModifyFlags.DEFAULT, addAllChildren),
            ]

            try{
              await client.operate(key, ops)
              assert.fail("An error should have been caught!")
            }
            catch(error: any){
              expect(error.message).to.eql("Operations array invalid")
            }          
          })
        })

        context('pathModifyFlags', function () {
          it('Does not accept non-number values', async function () {
            const ops: operations.Operation[] = [
              op.modifyByPath('floatMap', exp.float(14.0), null as any, addAllChildren),
            ]

            try{
              await client.operate(key, ops)
              assert.fail("An error should have been caught!")
            }
            catch(error: any){
              expect(error.message).to.eql("Operations array invalid")
            }          
          })
        })





      })
    })
  })


  context('Typescript', function () {
    it('selectByPath', function () {
      const ops: operations.Operation[] = [
        op.selectByPath('floatMap', pathSelectFlags.VALUE, addAllChildren)
      ]
    })

    it('modifyByPath', function () {
      const ops: operations.Operation[] = [
        op.modifyByPath('floatMap', exp.float(14.0), exp.pathModifyFlags.DEFAULT, addAllChildren),
      ]
    })
  })

  beforeEach(async () => { /* setup */ 
    await client.put(key, record)
  })


  afterEach(async () => { /* setup */ 

    await client.remove(key)
  })

})
