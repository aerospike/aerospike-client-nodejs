/*******************************************************************************
 * Copyright 2013-2018 Aerospike, Inc.
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

#include "client.h"
#include "async.h"
#include "conversions.h"
#include "policy.h"
#include "log.h"

extern "C" {
    #include <aerospike/aerospike.h>
    #include <aerospike/aerospike_udf.h>
    #include <aerospike/as_udf.h>
    #include <aerospike/as_config.h>
    #include <aerospike/as_string.h>
}

#define FILESIZE 255

using namespace v8;

/*******************************************************************************
 *  TYPES
 ******************************************************************************/

/**
 *  UdfRegisterCmd — Data to be used in async calls.
 *
 *  libuv allows us to pass around a pointer to an arbitraty object when
 *  running asynchronous functions. We create a data structure to hold the
 *  data we need during and after async work.
 */
typedef struct UdfRegisterCmd {
    aerospike * as;
    int param_err;
    as_error err;
    as_policy_info* policy;
    char filename[FILESIZE];
    as_bytes content;
    as_udf_type type;
    LogInfo * log;
    Nan::Persistent<Function> callback;
} UdfRegisterCmd;


/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

/**
 *  prepare() — Function to prepare UdfRegisterCmd, for use in `execute()` and `respond()`.
 *
 *  This should only keep references to V8 or V8 structures for use in
 *  `respond()`, because it is unsafe for use in `execute()`.
 */
static void* prepare(const Nan::FunctionCallbackInfo<v8::Value> &info)
{

    Nan::HandleScope scope;

    AerospikeClient* client = Nan::ObjectWrap::Unwrap<AerospikeClient>(info.This());

    UdfRegisterCmd* cmd = new UdfRegisterCmd();
    cmd->as = client->as;
    cmd->param_err = 0;
    cmd->policy = NULL;
    LogInfo* log = cmd->log = client->log;

    memset(cmd->filename, 0, FILESIZE);

    char* filepath              = NULL;

    Local<Value> maybe_filename = info[0];
    Local<Value> maybe_type = info[1];
    Local<Value> maybe_policy = info[2];
    Local<Value> maybe_callback = info[3];

    if (maybe_callback->IsFunction()) {
        cmd->callback.Reset(maybe_callback.As<Function>());
        as_v8_detail(log, "Node.js Callback Registered");
    } else {
        as_v8_error(log, "No callback to register");
        COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
        cmd->param_err = 1;
        return cmd;
    }

    if (maybe_filename->IsString()) {
        int length = maybe_filename->ToString()->Length() + 1;
        filepath = (char*) cf_malloc( sizeof(char) * length);
        strcpy(filepath, *String::Utf8Value(maybe_filename->ToString()));
        filepath[length-1] = '\0';
    } else {
        as_v8_error(log, "UDF file name should be string");
        COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
        cmd->param_err = 1;
        return cmd;
    }

    FILE * file = fopen(filepath, "r");
    if (!file) {
        as_v8_debug(log, "Cannot open file %s", filepath);
        COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR);
        cmd->param_err = 1;
        if (filepath != NULL) {
            cf_free(filepath);
        }
        return cmd;
    }

    // Determine the file size.
    int rv = fseek(file, 0, SEEK_END);
    if (rv != 0) {
        as_v8_error(log, "file-seek operation failed with error : %d", rv);
        COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR);
        cmd->param_err = 1;
        if (filepath != NULL) {
            cf_free(filepath);
        }
        fclose(file);
        return cmd;
    }

    int file_size = ftell(file);
    if (file_size == -1L) {
        as_v8_error(log, "ftell operation failed with error %d ",file_size);
        COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR);
        cmd->param_err = 1;
        if(filepath != NULL) {
            cf_free(filepath);
        }
        fclose(file);
        return cmd;
    }

    //Read the file's content into local buffer.
    rewind(file);
    uint8_t * file_content = (uint8_t*)cf_malloc(sizeof(uint8_t) * file_size);
    if (file_content == NULL) {
        as_v8_error(log, "UDF buffer - memory allocation failed ");
        COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR);
        cmd->param_err = 1;
        fclose(file);
        return cmd;
    }

    uint8_t* p_write = file_content;
    int read = fread(p_write, 1, 512, file);
    int size = 0;

    while (read) {
        size += read;
        p_write += read;
        read = fread( p_write, 1, 512, file);
    }
    fclose(file);

    as_string filename;
    as_basename(&filename, filepath);
    size_t filesize = as_string_len(&filename);
    if (as_string_get(&filename) == NULL) {
        as_v8_error(log, "Filename could not be parsed from path");
        COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
        cmd->param_err = 1;
        if(filepath != NULL) {
            cf_free(filepath);
        }
        return cmd;
    } else if (filesize > FILESIZE) {
        as_v8_error(log, "Filename length is greater than allowed size(255)");
        COPY_ERR_MESSAGE( cmd->err, AEROSPIKE_ERR_PARAM);
        cmd->param_err = 1;
        if (filepath != NULL) {
            cf_free(filepath);
        }
        return cmd;
    }

    strncpy(cmd->filename, as_string_get(&filename), filesize);
    cmd->filename[filesize+1] = '\0';
    //Wrap the local buffer as an as_bytes object.
    as_bytes_init_wrap(&cmd->content, file_content, size, true);

    if (maybe_type->IsNumber()) {
        cmd->type = (as_udf_type) maybe_type->IntegerValue();
    } else {
        cmd->type = AS_UDF_TYPE_LUA;
        as_v8_detail(log, "UDF type not an argument using default value(LUA)");
    }

    if (maybe_policy->IsObject()) {
        cmd->policy = (as_policy_info*) cf_malloc(sizeof(as_policy_info));
        if (infopolicy_from_jsobject(cmd->policy, maybe_policy->ToObject(), log) != AS_NODE_PARAM_OK) {
            as_v8_error(log, "infopolicy shoule be an object");
            COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
            cmd->param_err = 1;
            if (filepath != NULL) {
                cf_free(filepath);
            }
            return cmd;
        }
    }

    if (filepath != NULL) {
        cf_free(filepath);
    }

    return cmd;
}

/**
 *  execute() — Function to execute inside the worker-thread.
 *
 *  It is not safe to access V8 or V8 data structures here, so everything
 *  we need for input and output should be in the UdfRegisterCmd structure.
 */
static void execute(uv_work_t * req)
{
    // Fetch the UdfRegisterCmd structure
    UdfRegisterCmd* cmd = reinterpret_cast<UdfRegisterCmd*>(req->data);
    aerospike* as = cmd->as;
    as_error* err = &cmd->err;
    as_policy_info* policy = cmd->policy;
    LogInfo* log = cmd->log;

    // Invoke the blocking call.
    // The error is handled in the calling JS code.
    if (as->cluster == NULL) {
        cmd->param_err = 1;
        COPY_ERR_MESSAGE(cmd->err, AEROSPIKE_ERR_PARAM);
        as_v8_error(log, "Not connected to cluster to put record");
    }

    if (cmd->param_err == 0) {
        as_v8_debug(log, "Invoking aerospike udf register ");
        aerospike_udf_put(as, err, policy, cmd->filename, cmd->type, &cmd->content);
    } else {
        return;
    }
}

/**
 *  AfterWork — Function to execute when the Work is complete
 *
 *  This function will be run inside the main event loop so it is safe to use
 *  V8 again. This is where you will convert the results into V8 types, and
 *  call the callback function with those results.
 */
static void respond(uv_work_t * req, int status)
{

    Nan::HandleScope scope;
    // Fetch the UdfRegisterCmd structure
    UdfRegisterCmd* cmd = reinterpret_cast<UdfRegisterCmd*>(req->data);
    as_error* err = &cmd->err;
    LogInfo* log = cmd->log;
    as_v8_debug(log, "UDF register operation : response is");

    Local<Value> argv[1];
    // Build the arguments array for the callback
    if (cmd->param_err == 0) {
        argv[0] = error_to_jsobject(err, log);
    } else {
        err->func = NULL;
        as_v8_debug(log, "Parameter error for put operation");
        argv[0] = error_to_jsobject(err, log);
    }

    // Surround the callback in a try/catch for safety
    Nan::TryCatch try_catch;

    Local<Function> cb = Nan::New<Function>(cmd->callback);

    // Execute the callback.
    if (!cb->IsNull()) {
        Nan::MakeCallback(Nan::GetCurrentContext()->Global(), cb, 1, argv);
        as_v8_debug(log, "Invoked Put callback");
    }

    // Process the exception, if any
    if (try_catch.HasCaught()) {
        Nan::FatalException(try_catch);
    }

    // Dispose the Persistent handle so the callback
    // function can be garbage-collected
    cmd->callback.Reset();

    // clean up any memory we allocated

    if (cmd->param_err == 0) {
        as_bytes_destroy( &cmd->content);
        if(cmd->policy != NULL) {
            cf_free(cmd->policy);
        }
        as_v8_debug(log, "Cleaned up all the structures");
    }

    delete cmd;
    delete req;
}

/*******************************************************************************
 *  OPERATION
 ******************************************************************************/

/**
 *  The 'put()' Operation
 */
NAN_METHOD(AerospikeClient::Register)
{
    async_invoke(info, prepare, execute, respond);
}
