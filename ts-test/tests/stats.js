// *****************************************************************************
// Copyright 2018-2023 Aerospike, Inc.
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
/* eslint-env mocha */
/* global expect */
/* eslint-disable no-unused-expressions */
var chai_1 = require("chai");
var helper = require("./test_helper");
var client = helper.client;
describe('Client#stats', function () {
    before(function (done) {
        // Send an async command to each node ensure we have at least 1 async
        // connection open. At least 1 sync connection has been opened to send some
        // info commands.
        client.scan(helper.namespace, 'noSuchSet').foreach().on('end', done);
    });
    it('returns command queue stats', function () {
        var stats = client.stats();
        (0, chai_1.expect)(stats.commands).to.not.be.empty;
        (0, chai_1.expect)(stats.commands.inFlight).to.be.at.least(0);
        (0, chai_1.expect)(stats.commands.queued).to.be.at.least(0);
    });
    it('returns cluster node stats', function () {
        var stats = client.stats();
        (0, chai_1.expect)(stats.nodes).to.be.an('array').that.is.not.empty;
        var node = stats.nodes.pop();
        (0, chai_1.expect)(node.name).to.be.a('string');
        //const config: ConfigOptions = {
        //  hosts: helper.config.hosts,
        //}
        //const dummyClient = await Aerospike.connect(config)
        for (var _i = 0, _a = [node.syncConnections, node.asyncConnections]; _i < _a.length; _i++) {
            var connStats = _a[_i];
            (0, chai_1.expect)(connStats.inPool).to.be.at.least(0);
            (0, chai_1.expect)(connStats.inUse).to.be.at.least(0);
            (0, chai_1.expect)(connStats.opened).to.be.at.least(1);
            (0, chai_1.expect)(connStats.closed).to.be.at.least(0);
        }
    });
});
