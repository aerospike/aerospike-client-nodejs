/*******************************************************************************
 * Copyright 2013-2014 Aerospike, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ******************************************************************************/

#include <node.h>

using namespace v8;

/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

/**
 *  Setup an asynchronous invocation of a function.
 */
Handle<Value> async_invoke(
    const Arguments& args, 
    void *  (* prepare)(const Arguments& args), 
    void    (* execute)(uv_work_t * req),
    void    (* respond)(uv_work_t * req, int status)
    )
{
    // Create an async work token, and add AsyncData to it.
    uv_work_t * req = new uv_work_t;
    req->data = prepare(args);

    // Pass the work token to libuv to be run when a 
    // worker-thread is available to process it.
    uv_queue_work(
        uv_default_loop(),  // event loop
        req,                // work token
        execute,            // execute work
        respond             // respond to callback
    );

    // Return value for the function. Because we are async, we will
    // return an `undefined`.
    return Undefined();
}

void async_init( uv_async_t * async, void (*async_callback)(uv_async_t * handle, int status))
{
	uv_async_init( uv_default_loop(), async, async_callback);
}

void async_send( uv_async_t * async)
{
	uv_async_send( async);
}

void async_close(uv_async_t * async)
{
	uv_close((uv_handle_t*) async, NULL);
}


