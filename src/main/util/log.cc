/*******************************************************************************
 * Copyright 2013-2017 Aerospike, Inc.
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

extern "C" {
    #include <aerospike/aerospike.h>
    #include <aerospike/as_log.h>
}

#include <errno.h>
#include <unistd.h>
#include <libgen.h>
#include<fcntl.h>

#include "log.h"
#include "enums.h"

const char log_severity_strings[7][10] = {
    "OFF", "ERROR", "WARN", "INFO", "DEBUG", "TRACE", {0}
};

bool v8_logging_callback(as_log_level level, const char* func, const char * file, uint32_t line, const char* fmt, ...)
{
    char msg[1024] = {0};

    va_list ap;
    va_start(ap, fmt);
    vsnprintf(msg, 1024-1, fmt, ap);
    msg[1024-1] = '\0';
    va_end(ap);

    fprintf(stderr, "[%s:%u][%s] %s\n", basename((char*) file), line, func, msg);

    return true;
}

void as_v8_log_function(const LogInfo* log, as_log_level level, const char* func, const char* file, uint32_t line, const char* fmt, ...)
{
    if ( NULL == log) {
        return;
    }

    /* sometimes this part gets executed after the client object is closed.
     * This is due to the asynchronous execution nature of node.js
     * So check the validity of FD before forming the log message
     */
     if( fcntl(log->fd, F_GETFD) == -1 || errno == EBADF)
     {
         return;
     }
    /* Make sure there's always enough space for the \n\0. */
    char msg[1024] = {0};

    size_t limit = sizeof(msg)-2;
    size_t pos = 0;

    //to log the timestamp
    time_t now;
    struct tm nowtm;

    /* Set the timestamp */
    now = time(NULL);
    gmtime_r(&now, &nowtm);
    pos += strftime(msg, limit, "%b %d %Y %T %Z: ", &nowtm);
    pos += snprintf(msg+pos, limit-pos, "%-5s(%d) [%s:%u] [%s] - ", log_severity_strings[level+1], getpid(), basename((char*) file), line, func);

    va_list ap;
    va_start(ap, fmt);
    pos += vsnprintf(msg+pos, limit-pos, fmt, ap);
    va_end(ap);

    if (pos > limit) {
        pos = limit;
    }

    msg[pos] = '\n';
    pos++;

    msg[pos] = '\0';

    if( 0 >= write(log->fd, msg, pos)) {
        //fprintf(stderr, "Internal failure in log message write :%d \n", errno);
    }
}
