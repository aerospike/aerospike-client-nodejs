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

extern "C" {
    #include <aerospike/aerospike.h>
    #include <aerospike/as_log.h>
}

#include <errno.h>
#include <unistd.h>
#include <libgen.h>
#include<fcntl.h>

#include "log.h"
#include "../enums/enums.h"

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

    fprintf(stderr, "[%s:%d][%s] %s\n", basename((char*) file), line, func, msg);

    return true;
}

void as_v8_log_function( LogInfo * log, as_log_level level, const char* func, const char * file, uint32_t line, const char* fmt, ...)
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
		 fprintf(stderr, "Invalid file descriptor for logging \n");
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
    pos += snprintf(msg+pos, limit-pos, "%-5s(%d) [%s:%d] [%s] - ", log_severity_strings[level+1], getpid(), basename((char*) file), line, func);
    
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
        fprintf(stderr, "Internal failure in log message write :%d \n", errno);
    }
}


void stringify(char * key_str, const as_key * key, const char* data_type)
{
    sprintf(key_str,"[ ns:%s , set:%s, key:%s ]", key->ns, key->set, as_val_tostring((as_val*)&key->value));
}

void stringify(char * res_str, const as_record * rec, const char * data_type)
{
    if (strcmp(data_type, BINS) == 0) {
        int pos = 0;
        pos += sprintf(res_str+pos, "[");
        as_record_iterator it; 
        as_record_iterator_init(&it, rec);
        while ( as_record_iterator_has_next(&it) ) { 
            as_bin * bin = as_record_iterator_next(&it);
            char * name = as_bin_get_name(bin);
            pos += sprintf(res_str+pos, "%s :", name );
            as_val * val = (as_val *) as_bin_get_value(bin);
            char * str = as_val_tostring(val);
            pos += sprintf(res_str+pos, " %s, ", str); 
            free(str);
        }   
        pos += sprintf( res_str+pos, "]");
        return;
    }
    else if (strcmp(data_type, META) == 0) {
        sprintf(res_str, "[ttl: %u, gen: %u ]", rec->ttl, rec->gen);
    }
}


void stringify(char* err_str, const as_error *err, const char* data_type)
{
    if ( err->code != AEROSPIKE_OK) {
        sprintf(err_str, " [ message : %s, func : %s, file %s, line : %d] ", err->message, err->func, err->file, err->line);
    }
    else {
        if ( err->message != '\0') {
            sprintf(err_str, "[ message : %s ]", err->message);
        }
        else {
            sprintf(err_str, "[ message : AEROSPIKE_OK ]");
        }
    }
}

