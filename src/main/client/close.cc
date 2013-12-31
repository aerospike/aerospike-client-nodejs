/*******************************************************************************
 * Copyright 2013 Aerospike Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy 
 * of this software and associated documentation files (the "Software"), to 
 * deal in the Software without restriction, including without limitation the 
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or 
 * sell copies of the Software, and to permit persons to whom the Software is 
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in 
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 ******************************************************************************/

extern "C" {
#include <aerospike/aerospike.h>
#include <aerospike/aerospike_key.h>
#include <aerospike/as_config.h>
#include <aerospike/as_key.h>
#include <aerospike/as_record.h>
}

#include <node.h>
#include <cstdlib>
#include <unistd.h>

#include "../client.h"
#include "../util/log.h"

using namespace v8;

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *  Close the connections to the Aeropsike cluster.
 */
Handle<Value> AerospikeClient::Close(const Arguments& args)
{
    //should call aerospike_close and aerospike_destroy
    HandleScope scope;

    AerospikeClient * client = ObjectWrap::Unwrap<AerospikeClient>(args.This());
    as_error err;
    as_v8_debug(&client->log, "Closing the connection to aerospike cluster");
    aerospike_close( &client->as, &err);
    as_v8_debug(&client->log, "Destroying aeropsike object");
    aerospike_destroy( &client->as);
    as_v8_debug(&client->log,"Tata bbye from Node.js API");

    return scope.Close(Undefined());
}
