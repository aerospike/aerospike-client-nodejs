'use strict'

/* eslint-env mocha */
/* global expect */
/* eslint-disable no-unused-expressions */

import { setTimeout as sleep } from 'timers/promises';
import {Query} from '../lib/aerospike.js'; 
import type { Scan, Client, Key, ScanOptions, QueryOptions, AerospikeRecord, AerospikeBins} from '../lib/aerospike.js';
import {AerospikeError} from '../lib/aerospike.js';

import {expect} from 'chai'; 
import * as chai from 'chai'; 

import * as helper from './test_helper.ts';
import * as Aerospike from '../lib/aerospike.js'; 

import * as keygen from './generators/key.ts'
import * as recgen from './generators/record.ts'

import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
chai.should()


// Bin projection is in its own test file because in test/query.ts, some records will return null
// if bin projection tries to read a nested element in a bin that doesn't exist
// in those records.
// Also because we need to test both query and scan, and query.ts is only focused towards
// queries.
describe('bin projection', function () {
  helper.skipUnlessVersion('>= 8.1.2', this)

  const client: Client = helper.client
  const gen_key = keygen.string(helper.namespace, helper.set)
  const key: Key = gen_key()
  const bins: AerospikeBins = {'a': 1, 'nested': {'value': 10}};

  before(function () {
    client.truncate(helper.namespace, helper.set, 0)
    client.put(key, bins)
  })

  after(function () {
    client.remove(key)
  })

  describe('bin projection can read root-level elements', function () {
    const args: QueryOptions = {
      ops: [Aerospike.operations.read('a')]
    }

    it('works with query.foreach()', function (){
      const query: Query = client.query(helper.namespace, helper.set, args)
      const stream = query.foreach()
      stream.on('data', (record: AerospikeRecord) => {
        expect(record.bins).to.have.property('a', 1)
      })
    })

    it('works with query.results()', async function (){
      const query: Query = client.query(helper.namespace, helper.set, args)
      let results = await query.results()
      for (const record of results) {
        expect(record.bins).to.have.property('a', 1)
      }
    })

    const scan_args: ScanOptions = {
      ops: [Aerospike.operations.read('a')]
    }

    it.skip('works with scan.foreach(). TODO this fails possibly because of a client bug. CLIENT-4648', function (){
      const scan: Scan = client.scan(helper.namespace, helper.set, scan_args)
      const stream = scan.foreach()
      stream.on('data', (record: AerospikeRecord) => {
        expect(record.bins).to.have.property('a', 1)
      })
    })

    it('works with scan.results()', async function (){
      // TODO this fails possibly because of a client bug. CLIENT-4648
      this.skip()
      const scan: Scan = client.scan(helper.namespace, helper.set, scan_args)
      let results = await scan.results()
      for (const record of results) {
        expect(record.bins).to.have.property('a', 1)
      }
    })
  })

  describe('bin projection can read nested-level elements', function () {
    const args: QueryOptions = {
        ops: [Aerospike.maps.getByKey('nested', 'value', Aerospike.maps.returnType.VALUE)]
    }

    it('works with query.foreach()', function (){
      const query: Query = client.query(helper.namespace, helper.set, args)
      const stream = query.foreach()
      stream.on('data', (record: AerospikeRecord) => {
          expect(record.bins).to.have.property('nested', 10)
      })
    })

    it('works with query.results()', async function (){
      const query: Query = client.query(helper.namespace, helper.set, args)
      let results = await query.results()
      for (const record of results) {
          expect(record.bins).to.have.property('nested', 10)
      }
    })

    const scan_args: ScanOptions = {
        ops: [Aerospike.maps.getByKey('nested', 'value', Aerospike.maps.returnType.VALUE)]
    }

    it.skip('works with scan.foreach(). TODO this fails possibly because of a client bug. CLIENT-4648', function (){
      const scan: Scan = client.scan(helper.namespace, helper.set, scan_args)
      const stream = scan.foreach()
      stream.on('data', (record: AerospikeRecord) => {
          expect(record.bins).to.have.property('nested', 10)
      })
    })

    it.skip('works.with scan.results(). TODO this fails possibly because of a client bug. CLIENT-4648', async function (){
      const scan: Scan = client.scan(helper.namespace, helper.set, scan_args)
      let results = await scan.results()
      for (const record of results) {
          expect(record.bins).to.have.property('nested', 10)
      }
    })
  })

  // Negative tests

  describe('selected bins and ops are mutually exclusive', function() {
      let warnings = [];
      const warningHandler = (warning: any) => {
        warnings.push(warning);
      };

      beforeEach(() => {
        // Listen for warnings
        process.on('warning', warningHandler);
      });

      afterEach(() => {
        process.removeListener('warning', warningHandler);
        warnings = [];
      });

    it('raises a warning for queries', async function () {
      const args: QueryOptions = {
        ops: [Aerospike.operations.read('a')],
        select: ["nonexistent_bin"]
      }
      const query: Query = client.query(helper.namespace, helper.set, args)
      await sleep(1000)

      expect(warnings.length).to.equal(1)

      // Bin named "a" should still be returned by ops
      // i.e it is not filtered out
      let results = await query.results()
      for (const record of results) {
        expect(record.bins).to.have.property('a', 1)
      }
    })

    it('raises a warning for scans', async function () {
      // TODO this fails possibly because of a client bug. CLIENT-4648
      this.skip()
      const args: ScanOptions = {
        ops: [Aerospike.operations.read('a')],
        select: ["nonexistent_bin"]
      }
      const scan: Scan = client.scan(helper.namespace, helper.set, args)
      await sleep(1000)

      expect(warnings.length).to.equal(1)

      // Bin named "a" should still be returned by ops
      // i.e it is not filtered out
      let results = await scan.results()
      for (const record of results) {
        expect(record.bins).to.have.property('a', 1)
      }
    })
  })

  it('foreground query should reject write operations', async function (){
    const args: QueryOptions = {
      ops: [Aerospike.operations.write('name', 'filter1')]
    }
    const query: Query = client.query(helper.namespace, helper.set, args)
    let promise = query.results()
    return promise.should.be.rejectedWith(AerospikeError)
  })

  it.skip('foreground scan should reject write operations. TODO this fails possibly because of a client bug. CLIENT-4648', async function (){
    const args: ScanOptions = {
      ops: [Aerospike.operations.write('name', 'filter1')]
    }
    const scan: Scan = client.scan(helper.namespace, helper.set, args)
    let promise = scan.results()
    return promise.should.be.rejectedWith(AerospikeError)
  })
})
