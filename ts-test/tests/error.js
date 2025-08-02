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
/* eslint-disable no-unused-expressions */
var aerospike_1 = require("aerospike");
var chai_1 = require("chai");
var ASError = aerospike_1.default.AerospikeError;
var status = aerospike_1.default.status;
require('./test_helper.js');
describe('AerospikeError #noserver', function () {
    describe('constructor', function () {
        it('creates a new AerospikeError instance', function () {
            (0, chai_1.expect)(new ASError()).to.be.instanceof(ASError);
        });
        it('inherits from the Error class', function () {
            (0, chai_1.expect)(new ASError()).to.be.instanceof(Error);
        });
        it('initializes the error with default values', function () {
            var subject = new ASError();
            (0, chai_1.expect)(subject).to.have.property('message', '');
            (0, chai_1.expect)(subject).to.have.property('code', status.ERR_CLIENT);
            (0, chai_1.expect)(subject).to.have.property('command', null);
            (0, chai_1.expect)(subject).to.have.property('func', null);
            (0, chai_1.expect)(subject).to.have.property('file', null);
            (0, chai_1.expect)(subject).to.have.property('line', null);
            (0, chai_1.expect)(subject).to.have.property('inDoubt', false);
        });
        it('sets an error message', function () {
            var subject = new ASError('Dooh!');
            (0, chai_1.expect)(subject).to.have.property('message', 'Dooh!');
        });
        it('keeps a reference to the command', function () {
            var cmd = {};
            var subject = new ASError('Dooh!', cmd);
            (0, chai_1.expect)(subject).to.have.property('command', cmd);
        });
        it('captures a stacktrace', function () {
            var subject = new ASError('Dooh!');
            (0, chai_1.expect)(subject).to.have.property('stack')
                .that.is.a('string')
                .that.includes('AerospikeError: Dooh!');
        });
        it('copies the stacktrace of the command', function () {
            var cmd = { name: 'AerospikeError', message: 'Dooh!' };
            Error.captureStackTrace(cmd);
            var subject = new ASError('Dooh!', cmd);
            (0, chai_1.expect)(subject).to.have.property('stack')
                .that.is.a('string')
                .that.equals(cmd.stack);
        });
    });
    describe('.fromASError', function () {
        it('copies the info from a AerospikeClient error instance', function () {
            var error = {
                code: -11,
                message: 'Dooh!',
                func: 'connect',
                file: 'lib/client.js',
                line: 101,
                inDoubt: true
            };
            var subject = ASError.fromASError(error);
            (0, chai_1.expect)(subject).to.have.property('code', -11);
            (0, chai_1.expect)(subject).to.have.property('message', 'Dooh!');
            (0, chai_1.expect)(subject).to.have.property('func', 'connect');
            (0, chai_1.expect)(subject).to.have.property('file', 'lib/client.js');
            (0, chai_1.expect)(subject).to.have.property('line', 101);
            (0, chai_1.expect)(subject).to.have.property('inDoubt', true);
        });
        it('replaces error codes with descriptive messages', function () {
            var error = {
                code: status.ERR_RECORD_NOT_FOUND,
                message: '127.0.0.1:3000 AEROSPIKE_ERR_RECORD_NOT_FOUND'
            };
            var subject = ASError.fromASError(error);
            (0, chai_1.expect)(subject.message).to.equal('127.0.0.1:3000 Record does not exist in database. May be returned by read, or write with policy Aerospike.policy.exists.UPDATE.');
        });
        it('returns an AerospikeError instance unmodified', function () {
            var error = new aerospike_1.AerospikeError('Dooh!');
            (0, chai_1.expect)(ASError.fromASError(error)).to.equal(error);
        });
        it('returns null if the status code is OK', function () {
            var error = { code: status.OK };
            (0, chai_1.expect)(ASError.fromASError(error)).to.be.null;
        });
        it('returns null if no error is passed', function () {
            (0, chai_1.expect)(ASError.fromASError(null)).to.be.null;
        });
    });
    describe('#isServerError()', function () {
        it('returns true if the error code indicates a server error', function () {
            var error = { code: status.ERR_RECORD_NOT_FOUND };
            var subject = ASError.fromASError(error);
            (0, chai_1.expect)(subject.isServerError()).to.be.true;
        });
        it('returns false if the error code indicates a client error', function () {
            var error = { code: status.ERR_PARAM };
            var subject = ASError.fromASError(error);
            (0, chai_1.expect)(subject.isServerError()).to.be.false;
        });
    });
    describe('#toString()', function () {
        it('sets an informative error message', function () {
            var subject = new ASError('Dooh!');
            (0, chai_1.expect)(subject.toString()).to.eql('AerospikeError: Dooh!');
        });
    });
});
