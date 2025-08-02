// *****************************************************************************
// Copyright 2013-2024 Aerospike, Inc.
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
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/* global expect, describe, it */
var aerospike_1 = require("aerospike");
var chai_1 = require("chai");
var helper = require("./test_helper");
var status = aerospike_1.default.status;
var lists = aerospike_1.default.lists;
var maps = aerospike_1.default.maps;
var Context = aerospike_1.default.cdt.Context;
var _a = require('./util/statefulAsyncTest'), assertResultEql = _a.assertResultEql, cleanup = _a.cleanup, createRecord = _a.createRecord, initState = _a.initState, operate = _a.operate, expectError = _a.expectError, assertError = _a.assertError;
describe('Aerospike.cdt.Context', function () {
    helper.skipUnlessVersion('>= 4.6.0', this);
    describe('Context.addListIndex', function () {
        it('sets the context to the nested list/map at the specified list index', function () {
            var context = new Context().addListIndex(1);
            return initState()
                .then(createRecord({ nested: [[1, 2], [5, 6], [3, 4], [5, 6]] }))
                .then(operate(lists.get('nested', 0).withContext(context)))
                .then(assertResultEql({ nested: 5 }))
                .then(cleanup);
        });
        it('Throws an error when index is too large', function () {
            (0, chai_1.expect)(function () { return new Context().addListIndex(2147483648); }).to.throw(Error);
        });
        it('Throws an error when index is too small', function () {
            (0, chai_1.expect)(function () { return new Context().addListIndex(-2147483649); }).to.throw(Error);
        });
    });
    describe('Context.addListIndexCreate', function () {
        it("creates list index at the specified index using order.UNORDERED with padding set to true and sets context\n        to the nested list/map at the newly created index ", function () {
            var context = new Context().addListIndexCreate(4, 0, true);
            return initState()
                .then(createRecord({ nested: [[1, 2], [5, 6], [3, 4], [5, 6]] }))
                .then(operate([lists.set('nested', 0, 150).withContext(context), lists.get('nested', 4)]))
                .then(assertResultEql({ nested: [150] }))
                .then(cleanup);
        });
        it("creates list index at the specified index using order.ORDERED with padding set to true and sets context\n        to the nested list/map at the newly created index ", function () {
            var context = new Context().addListIndexCreate(4, 1, true);
            return initState()
                .then(createRecord({ nested: [[1, 2], [5, 6], [3, 4], [5, 6]] }))
                .then(operate([lists.set('nested', 0, 150).withContext(context), lists.get('nested', 4)]))
                .then(assertResultEql({ nested: [150] }))
                .then(cleanup);
        });
        it("creates list index at the specified index using order.UNORDERED with padding set to false and sets context\n        to the nested list/map at the newly created index ", function () {
            var context = new Context().addListIndexCreate(4, 0, false);
            return initState()
                .then(createRecord({ nested: [[1, 2], [5, 6], [3, 4], [5, 6]] }))
                .then(operate([lists.set('nested', 0, 150).withContext(context), lists.get('nested', 4)]))
                .then(assertResultEql({ nested: [150] }))
                .then(cleanup);
        });
        it("creates list index at the specified index using order.ORDERED with padding set to true and sets context\n        to the nested list/map at the newly created index. Padding necessary for completion  ", function () {
            var context = new Context().addListIndexCreate(4, 1, false);
            return initState()
                .then(createRecord({ nested: [[1, 2], [5, 6], [3, 4], [5, 6]] }))
                .then(operate([lists.set('nested', 0, 150).withContext(context), lists.get('nested', 4)]))
                .then(assertResultEql({ nested: [150] }))
                .then(cleanup);
        });
        it("creates list index at the specified index using order.UNORDERED with padding set to true and sets context\n        to the nested list/map at the newly created index. Padding necessary for completion ", function () {
            var context = new Context().addListIndexCreate(5, 0, true);
            return initState()
                .then(createRecord({ nested: [[1, 2], [5, 6], [3, 4], [5, 6]] }))
                .then(operate([lists.set('nested', 0, 150).withContext(context), lists.get('nested', 5)]))
                .then(assertResultEql({ nested: [150] }))
                .then(cleanup);
        });
        it("creates list index at the specified index using order.ORDERED with padding set to true and sets context\n     to the nested list/map at the newly created index. Padding necessary for completion  ", function () {
            var context = new Context().addListIndexCreate(5, 1, true);
            return initState()
                .then(createRecord({ nested: [[1, 2], [5, 6], [3, 4], [5, 6]] }))
                .then(expectError())
                .then(operate([lists.set('nested', 0, 150).withContext(context), lists.get('nested', 5)]))
                .then(assertError(status.ERR_OP_NOT_APPLICABLE))
                .then(cleanup);
        });
        it("creates list index at the specified index using order.UNORDERED with padding set to false and sets context\n        to the nested list/map at the newly created index. Padding necessary for completion  ", function () {
            var context = new Context().addListIndexCreate(5, 0, false);
            return initState()
                .then(createRecord({ nested: [[1, 2], [5, 6], [3, 4], [5, 6]] }))
                .then(expectError())
                .then(operate([lists.set('nested', 0, 150).withContext(context), lists.get('nested', 5)]))
                .then(assertError(status.ERR_OP_NOT_APPLICABLE))
                .then(cleanup);
        });
        it("creates list index at the specified index using order.ORDERED with padding set to true and sets context\n        to the nested list/map at the newly created index. Padding necessary for completion  ", function () {
            var context = new Context().addListIndexCreate(5, 1, false);
            return initState()
                .then(createRecord({ nested: [[1, 2], [5, 6], [3, 4], [5, 6]] }))
                .then(expectError())
                .then(operate([lists.set('nested', 0, 150).withContext(context), lists.get('nested', 5)]))
                .then(assertError(status.ERR_OP_NOT_APPLICABLE))
                .then(cleanup);
        });
        it('Throws an error when index is too large', function () {
            (0, chai_1.expect)(function () { return new Context().addListIndexCreate(2147483648); }).to.throw(Error);
        });
        it('Throws an error when index is too small', function () {
            (0, chai_1.expect)(function () { return new Context().addListIndexCreate(-2147483649); }).to.throw(Error);
        });
    });
    describe('Context.addListRank', function () {
        it('sets the context to the nested list/map at the specified list rank', function () {
            var context = new Context().addListRank(1);
            return initState()
                .then(createRecord({ nested: [[1, 2], [5, 6], [3, 4], [5, 6]] }))
                .then(operate(lists.get('nested', 0).withContext(context)))
                .then(assertResultEql({ nested: 3 }))
                .then(cleanup);
        });
        it('Throws an error when rank is too large', function () {
            (0, chai_1.expect)(function () { return new Context().addListRank(2147483648); }).to.throw(Error);
        });
        it('Throws an error when rank is too small', function () {
            (0, chai_1.expect)(function () { return new Context().addListRank(-2147483649); }).to.throw(Error);
        });
    });
    describe('Context.addListValue', function () {
        it('sets the context to the specified list value', function () {
            var context = new Context().addListValue([5, 6]);
            return initState()
                .then(createRecord({ nested: [[1, 2], [5, 6], [3, 4], [5, 6]] }))
                .then(operate(lists.get('nested', 0).withContext(context)))
                .then(assertResultEql({ nested: 5 }))
                .then(cleanup);
        });
    });
    describe('Context.addMapIndex', function () {
        it('sets the context to the nested list/map at the specified map index', function () {
            var context = new Context().addMapIndex(1);
            return initState()
                .then(createRecord({ nested: { a: [1, 2], c: [5, 6], b: [3, 4], d: [5, 6] } }))
                .then(operate(lists.get('nested', 0).withContext(context)))
                .then(assertResultEql({ nested: 3 }))
                .then(cleanup);
        });
        it('Throws an error when index is too large', function () {
            (0, chai_1.expect)(function () { return new Context().addMapIndex(2147483648); }).to.throw(Error);
        });
        it('Throws an error when index is too small', function () {
            (0, chai_1.expect)(function () { return new Context().addMapIndex(-2147483649); }).to.throw(Error);
        });
    });
    describe('Context.addMapRank', function () {
        it('sets the context to the nested list/map at the specified map index', function () {
            var context = new Context().addMapRank(1);
            return initState()
                .then(createRecord({ nested: { a: [1, 2], c: [5, 6], b: [3, 4], d: [5, 6] } }))
                .then(operate(lists.get('nested', 0).withContext(context)))
                .then(assertResultEql({ nested: 3 }))
                .then(cleanup);
        });
        it('Throws an error when rank is too large', function () {
            (0, chai_1.expect)(function () { return new Context().addMapRank(2147483648); }).to.throw(Error);
        });
        it('Throws an error when rank is too small', function () {
            (0, chai_1.expect)(function () { return new Context().addMapRank(-2147483649); }).to.throw(Error);
        });
    });
    describe('Context.addMapKey', function () {
        it('sets the context to the nested list/map with the specified map key', function () {
            var context = new Context().addMapKey('d');
            return initState()
                .then(createRecord({ nested: { a: [1, 2], c: [5, 6], b: [3, 4], d: [5, 6] } }))
                .then(operate(lists.get('nested', 0).withContext(context)))
                .then(assertResultEql({ nested: 5 }))
                .then(cleanup);
        });
    });
    describe('Context.addMapKeyCreate', function () {
        it("Create a map key at the specified location using order.UNORDERED and sets the context\n     to the nested list/map at the newly created index.", function () {
            var context = new Context().addMapKeyCreate('e', 0);
            return initState()
                .then(createRecord({ nested: { a: [1, 2], c: [5, 6], b: [3, 4], d: [5, 6] } }))
                .then(operate([lists.set('nested', 0, 150).withContext(context), maps.getByKey('nested', 'e').andReturn(maps.returnType.VALUE)]))
                .then(assertResultEql({ nested: [150] }))
                .then(cleanup);
        });
        it("Create a map key at the specified location using order.KEY_ORDERED and sets the context\n     to the nested list/map at the newly created index. ", function () {
            var context = new Context().addMapKeyCreate('e', 1);
            return initState()
                .then(createRecord({ nested: { a: [1, 2], c: [5, 6], b: [3, 4], d: [5, 6] } }))
                .then(operate([lists.set('nested', 0, 150).withContext(context), maps.getByKey('nested', 'e').andReturn(maps.returnType.VALUE)]))
                .then(assertResultEql({ nested: [150] }))
                .then(cleanup);
        });
        it("Create a map key at the specified location using order.KEY_VALUE_ORDERED and sets the context\n     to the nested list/map at the newly created index.", function () {
            var context = new Context().addMapKeyCreate('e', 3);
            return initState()
                .then(createRecord({ nested: { a: [1, 2], c: [5, 6], b: [3, 4], d: [5, 6] } }))
                .then(operate([lists.set('nested', 0, 150).withContext(context), maps.getByKey('nested', 'e').andReturn(maps.returnType.VALUE)]))
                .then(assertResultEql({ nested: [150] }))
                .then(cleanup);
        });
    });
    describe('Context.addMapValue', function () {
        it('sets the context to the nested list/map value', function () {
            var context = new Context().addMapValue([5, 6]);
            return initState()
                .then(createRecord({ nested: { a: [1, 2], c: [5, 6], b: [3, 4], d: [5, 6] } }))
                .then(operate(lists.get('nested', 0).withContext(context)))
                .then(assertResultEql({ nested: 5 }))
                .then(cleanup);
        });
    });
});
