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
#include <aerospike/as_log.h>
}

#include <errno.h>
#include <unistd.h>
#include <libgen.h>

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
    va_end(ap);

    fprintf(stderr, "[%s:%d][%s] %s\n", basename((char*) file), line, func, msg);

    return true;

}

void as_v8_log_function( LogInfo * log, as_log_level level, const char* func, const char * file, uint32_t line, const char* fmt, ...)
{
    if ( NULL == log) {
        return;
    }
    char msg[1024] = {0};

    size_t limit = sizeof(msg)-2;
    size_t pos = 0;

    pos += snprintf(msg+pos, limit-pos, "%-5s [%s:%d] - ", log_severity_strings[level+1], basename((char*) file), line);
    va_list ap;
    va_start(ap, fmt);
    pos += vsnprintf(msg+pos, limit-pos, fmt, ap);
    va_end(ap);

    if (pos > limit) {
        pos = limit;
    }


    pos += snprintf(msg+pos, 2, "\n");

    if( 0 >= write(log->fd, msg, limit )) {
        fprintf(stderr, "Internal failure in log message write :%d \n", errno);
    }

    return ;

}


void stringify(char * key_str, const as_key * key, const char* data_type)
{
    sprintf(key_str,"[ ns:%s , set:%s, key:%s ]", key->ns, key->set, as_val_tostring((as_val*)&key->value));

}

void  stringify( char * res_str, const as_record * rec, const char * data_type)
{
    int pos = 0;
    if (strcmp(data_type, BINS) == 0) {
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
    }else if (strcmp(data_type, META) == 0) {
        sprintf(res_str, "[ttl: %u, gen: %u ]", rec->ttl, rec->gen);
    }

}


void stringify( char* err_str, const as_error *err, const char* data_type)
{
    int pos = 0;
    if ( err->code != AEROSPIKE_OK) {
        pos += sprintf(err_str, " [ message : %s, func : %s, file %s, line : %d] ", err->message, err->func, err->file, err->line);
    }
    else {
        if ( err->message != '\0') {
            pos += sprintf(err_str, "[ message : %s ]", err->message);
        } else {
            pos += sprintf(err_str, "[ message : AEROSPIKE_OK ]");
        }
    }
}

