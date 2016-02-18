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

/* global describe, it, before, after */

// we want to test the built aerospike module
const Aerospike = require('../lib/aerospike')
const helper = require('./test_helper')
const expect = require('expect.js')

const valgen = helper.valgen

const status = Aerospike.status
const policy = Aerospike.policy

// A single Large List is created. All Large List operations are done in this single list to demonstrate the
// usage of LargeList API. The operations include adding an element,
// udpating an element, searching for an element and removing an element.

describe('client.LargeList()', function (done) {
  var client = helper.client

  var listkey = {ns: helper.namespace, set: helper.set, key: 'ldt_list_key'}
  var writepolicy = {timeout: 1000, key: policy.key.SEND, commitLevel: policy.commitLevel.ALL}
  var llist = client.LargeList(listkey, 'ldt_list_bin', writepolicy)
  var ldtEnabled = true

  before(function (done) {
    ldtEnabled = helper.cluster.ldt_enabled()
    done()
  })

  after(function (done) {
    if (ldtEnabled) {
      llist.destroy(function (err) {
        if (err) { throw new Error(err.message) }
        done()
      })
    } else {
      done()
    }
  })

  it('should add an element of type integer to the llist ', function (done) {
    if (!ldtEnabled) { this.skip() }
    var igen = valgen.integer()
    var listval = igen()
    var intval = {'key': 'intvalue', 'value': listval}
    // insert an integer value into the list.
    llist.add(intval, function (err, retVal) {
      expect(err).not.to.be.ok()
      // verify the inserted element in the list.
      llist.find({'key': 'intvalue'}, function (err, val) {
        expect(err).not.to.be.ok()
        expect(val[0].value).to.equal(listval)
        done()
      })
    })
  })

  it('should add an element of type string to the llist ', function (done) {
    if (!ldtEnabled) { this.skip() }
    var sgen = valgen.string()
    var listval = sgen()
    var strval = {'key': 'stringvalue', 'value': listval}
    // insert an string value into the list.
    llist.add(strval, function (err, retVal) {
      expect(err).not.to.be.ok()
      // verify the inserted element in the list.
      llist.find({'key': 'stringvalue'}, function (err, val) {
        expect(err).not.to.be.ok()
        expect(val[0].value).to.equal(listval)
        done()
      })
    })
  })

  it('should add an element of type bytes to the llist ', function (done) {
    if (!ldtEnabled) { this.skip() }
    var bgen = valgen.bytes()
    var listval = bgen()
    var bytesval = {'key': 'bytesvalue', 'value': listval}
    // insert a byte value into the list.
    llist.add(bytesval, function (err, retVal) {
      expect(err).not.to.be.ok()
      // verify the inserted element in the list.
      llist.find({'key': 'bytesvalue'}, function (err, val) {
        expect(err).not.to.be.ok()
        expect(val[0].value).to.eql(listval)
        done()
      })
    })
  })

  it('should add an element of type array to the llist ', function (done) {
    if (!ldtEnabled) { this.skip() }
    var agen = valgen.array()
    var listval = agen()
    var bytesval = {'key': 'arrayvalue', 'value': listval}
    // insert an array element into the list.
    llist.add(bytesval, function (err, retVal) {
      expect(err).not.to.be.ok()
      // verify the inserted element in the list.
      llist.find({'key': 'arrayvalue'}, function (err, val) {
        expect(err).not.to.be.ok()
        expect(val[0].value).to.eql(listval)
        done()
      })
    })
  })

  it('should add an element of type map to the llist ', function (done) {
    if (!ldtEnabled) { this.skip() }
    var mgen = valgen.map()
    var listval = mgen()
    var mapval = {'key': 'mapvalue', 'value': listval}
    // insert a map element into the list.
    llist.add(mapval, function (err, retVal) {
      expect(err).not.to.be.ok()
      // verify the inserted element in the list.
      llist.find({'key': 'mapvalue'}, function (err, val) {
        expect(err).not.to.be.ok()
        expect(val[0].value).to.eql(listval)
        done()
      })
    })
  })

  it('should add an array of values to llist ', function (done) {
    if (!ldtEnabled) { this.skip() }
    var mgen = valgen.map()
    var agen = valgen.array()
    var igen = valgen.integer()
    var sgen = valgen.string()
    var bgen = valgen.bytes()

    // array of values to be inserted into the llist.
    var valList = [bgen(), igen(), agen(), mgen(), sgen()]

    var bytesval = {key: 'arraybytesvalue', value: valList[0]}
    var integerval = {key: 'arrayintvalue', value: valList[1]}
    var arrayval = {key: 'arraylistvalue', value: valList[2]}
    var mapval = {key: 'arraymapvalue', value: valList[3]}
    var stringval = {key: 'arraystrvalue', value: valList[4]}

    // array of values with key to be inserted into the llist.
    var arrayList = [mapval, arrayval, bytesval, stringval, integerval]
    llist.add(arrayList, function (err, retVal) {
      expect(err).not.to.be.ok()
      // verify the inserted element in the list.
      llist.findRange('arraybytesvalue', 'arraystrvalue', function (err, val) {
        expect(err).not.to.be.ok()
        expect(val[0].value).to.eql(valList[0])
        expect(val[1].value).to.equal(valList[1])
        expect(val[2].value).to.eql(valList[2])
        expect(val[3].value).to.eql(valList[3])
        expect(val[4].value).to.equal(valList[4])
        done()
      })
    })
  })

  it('should verify that passing wrong number of arguments to add API fails gracefully', function (done) {
    if (!ldtEnabled) { this.skip() }
    var igen = valgen.integer()
    var listval = igen()
    var intval = {'key': 'intvalue', 'value': listval}
    llist.add(intval, undefined, function (err, retVal) {
      expect(err).to.be.ok()
      expect(err.func).to.equal('add')
      done()
    })
  })

  it('should update an element in the llist ', function (done) {
    if (!ldtEnabled) { this.skip() }
    var igen = valgen.integer()
    var listval = igen()
    var intval = {'key': 'intvalue', 'value': listval}
    // update an integer value in the list.
    llist.update(intval, function (err, retVal) {
      expect(err).not.to.be.ok()
      // verify the updated element in the list.
      llist.find({'key': 'intvalue'}, function (err, val) {
        expect(err).not.to.be.ok()
        expect(val[0].value).to.equal(listval)
        done()
      })
    })
  })

  it('should update an array of values in the llist ', function (done) {
    if (!ldtEnabled) { this.skip() }
    var mgen = valgen.map()
    var agen = valgen.array()
    var igen = valgen.integer()
    var sgen = valgen.string()
    var bgen = valgen.bytes()
    var valList = [bgen(), igen(), agen(), mgen(), sgen()]

    var bytesval = {key: 'arraybytesvalue', value: valList[0]}
    var integerval = {key: 'arrayintvalue', value: valList[1]}
    var arrayval = {key: 'arraylistvalue', value: valList[2]}
    var mapval = {key: 'arraymapvalue', value: valList[3]}
    var stringval = {key: 'arraystrvalue', value: valList[4]}

    var arrayList = [mapval, arrayval, bytesval, stringval, integerval]

    // update an array of elements in the list.
    llist.update(arrayList, function (err, retVal) {
      expect(err).not.to.be.ok()
      // verify the updated elements in the list.
      llist.findRange('arraybytesvalue', 'arraystrvalue', function (err, val) {
        expect(err).not.to.be.ok()
        expect(val[0].value).to.eql(valList[0])
        expect(val[1].value).to.equal(valList[1])
        expect(val[2].value).to.eql(valList[2])
        expect(val[3].value).to.eql(valList[3])
        expect(val[4].value).to.equal(valList[4])
        done()
      })
    })
  })

  it('should verify that passing wrong number of arguments to update API fails gracefully', function (done) {
    if (!ldtEnabled) { this.skip() }
    var igen = valgen.integer()
    var listval = igen()
    var intval = {'key': 'intvalue', 'value': listval}
    llist.update(intval, undefined, function (err, retVal) {
      expect(err).to.be.ok()
      expect(err.func).to.equal('update')
      done()
    })
  })

  it('should verify the find API of llist -finds an existing element', function (done) {
    if (!ldtEnabled) { this.skip() }
    // find an element in the list.
    llist.find({'key': 'intvalue'}, function (err, val) {
      expect(err).not.to.be.ok()
      expect(val[0]).to.have.property('value')
      done()
    })
  })

  it('should verify the find API of llist -finds a non-existing element and fails', function (done) {
    if (!ldtEnabled) { this.skip() }
    // find an element in the list.
    llist.find({'key': 'novalue'}, function (err, val) {
      expect(err).to.be.ok()
      expect(err.code).to.equal(status.AEROSPIKE_ERR_LARGE_ITEM_NOT_FOUND)
      done()
    })
  })

  it('should verify the range API of llist- expected to find existing elements', function (done) {
    if (!ldtEnabled) { this.skip() }
    llist.findRange('arraybytesvalue', 'arraystrvalue', function (err, val) {
      expect(err).not.to.be.ok()
      expect(val.length).to.equal(5)
      done()
    })
  })

  it('should verify the range API of llist- expected to not find any elements', function (done) {
    if (!ldtEnabled) { this.skip() }
    llist.findRange('zbytesvalue', 'zstrvalue', function (err, val) {
      expect(err).not.to.be.ok()
      expect(val.length).to.eql(0)
      done()
    })
  })

  it('should verify the size API of llist ', function (done) {
    if (!ldtEnabled) { this.skip() }
    llist.size(function (err, val) {
      expect(err).not.to.be.ok()
      expect(val).to.equal(10)
      done()
    })
  })

  it('should verify that size API fails gracefully when passing wrong number of arguments', function (done) {
    if (!ldtEnabled) { this.skip() }
    llist.size(2, function (err, val) {
      expect(err).to.be.ok()
      expect(err.func).to.equal('size')
      done()
    })
  })

  it('should verify the scan API of llist ', function (done) {
    if (!ldtEnabled) { this.skip() }
    llist.scan(function (err, val) {
      expect(err).not.to.be.ok()
      expect(val.length).to.equal(10)
      done()
    })
  })

  it('should verify the scan API fails gracefully when wrong number of arguments are passed', function (done) {
    if (!ldtEnabled) { this.skip() }
    llist.scan('scan', function (err, val) {
      expect(err).to.be.ok()
      expect(err.func).to.equal('scan')
      done()
    })
  })

  it('should remove an element from the llist ', function (done) {
    if (!ldtEnabled) { this.skip() }
    var intval = {'key': 'intvalue'}
    // remove the integer value into the list.
    llist.remove(intval, function (err, retVal) {
      expect(err).not.to.be.ok()
      // verify the removed element in the list.
      llist.find({'key': 'intvalue'}, function (err, val) {
        expect(err).to.be.ok()
        expect(err.code).to.equal(status.AEROSPIKE_ERR_LARGE_ITEM_NOT_FOUND)
        llist.size(function (err, val) {
          expect(err).not.to.be.ok()
          expect(val).to.equal(9)
          done()
        })
      })
    })
  })

  it('should remove an array of elements from llist ', function (done) {
    if (!ldtEnabled) { this.skip() }
    var bytesval = {key: 'bytesvalue'}
    var stringval = {key: 'stringvalue'}
    var arrayval = {key: 'arrayvalue'}
    var mapval = {key: 'mapvalue'}

    // remove an array of elements from the list.
    var arrayList = [ mapval, arrayval, bytesval, stringval ]
    llist.remove(arrayList, function (err, retVal) {
      expect(err).not.to.be.ok()
      llist.size(function (err, val) {
        expect(err).not.to.be.ok()
        expect(val).to.equal(5)
        done()
      })
    })
  })

  it('should verify remove API fails when invalid number of arguments are passed', function (done) {
    if (!ldtEnabled) { this.skip() }
    // remove an array of elements from the list.
    llist.remove('list', 123, function (err, retVal) {
      expect(err).to.be.ok()
      expect(err.func).to.equal('remove')
      done()
    })
  })

  it('should verify removing a range of values in llist ', function (done) {
    if (!ldtEnabled) { this.skip() }
    llist.removeRange('arraybytesvalue', 'arraystrvalue', function (err, retVal) {
      expect(err).not.to.be.ok()
      llist.findRange('arraybytesvalue', 'arraystrvalue', function (err, val) {
        expect(err).not.to.be.ok()
        expect(val.length).to.equal(0)
        llist.size(function (err, val) {
          expect(err).not.to.be.ok()
          expect(val).to.equal(0)
          done()
        })
      })
    })
  })

  it('should verify removeRange API fails when invalid number of arguments are passed', function (done) {
    if (!ldtEnabled) { this.skip() }
    llist.removeRange('list', 123, 345, function (err, retVal) {
      expect(err).to.be.ok()
      expect(err.func).to.equal('removeRange')
      done()
    })
  })
})
