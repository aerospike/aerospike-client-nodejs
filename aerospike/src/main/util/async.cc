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