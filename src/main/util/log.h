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

#pragma once

extern "C" {
#include <aerospike/aerospike.h>
#include <aerospike/aerospike_key.h>
#include <aerospike/as_config.h>
#include <aerospike/as_key.h>
#include <aerospike/as_record.h>
#include <aerospike/as_record_iterator.h>
#include <aerospike/as_log.h>
}

#include <errno.h>
#include <unistd.h>

/*******************************************************************************
 *  TYPES
 *******************************************************************************/

typedef struct LogInfo {
    int fd;
    as_log_level severity;
}LogInfo;

//static const char * log_severity_strings[]= { "ERROR", "WARN", "INFO", "DEBUG", "DETAIL"};

/*******************************************************************************
 *  MACROS
 ******************************************************************************/

#define META "metadata"
#define BINS "bins"
#define _KEY "key"
#define ERROR "error"
#define MAX_STR_SIZE 1024

#define as_v8_detail( __log, __fmt, ...) \
    if ( (__log) && AS_LOG_LEVEL_TRACE <= (__log)->severity ) {\
        as_v8_log_function( __log, AS_LOG_LEVEL_TRACE,__func__, __FILE__, __LINE__, __fmt, ##__VA_ARGS__); \
    }

#define as_v8_debug( __log, __fmt, ...) \
    if ( (__log) && AS_LOG_LEVEL_DEBUG <= (__log)->severity ) {\
        as_v8_log_function( __log, AS_LOG_LEVEL_DEBUG, __func__, __FILE__, __LINE__, __fmt, ##__VA_ARGS__);\
    }

#define as_v8_info( __log, __fmt, ...)  \
    if ( (__log) && AS_LOG_LEVEL_INFO <= (__log)->severity ) {\
        as_v8_log_function( __log, AS_LOG_LEVEL_INFO, __func__, __FILE__, __LINE__, __fmt, ##__VA_ARGS__);\
    }

#define as_v8_error( __log, __fmt, ...) \
    if ( (__log) && AS_LOG_LEVEL_ERROR <= (__log)->severity ) {\
        as_v8_log_function( __log, AS_LOG_LEVEL_ERROR, __func__, __FILE__, __LINE__, __fmt, ##__VA_ARGS__);\
    }

#define debug(__fmt, ... ) _log(__func__, __FILE__, __LINE__, __fmt, ##__VA_ARGS__)

#define debug_record(__log, __rec) _log_record( __log, __func__, __FILE__, __LINE__, __rec)

#define DETAIL(__log, __data_type, __data) \
    if( (log) && AS_LOG_LEVEL_TRACE <= (log)->severity) {\
        char res_str[MAX_STR_SIZE]; \
        stringify((char*)res_str, __data,(char*) __data_type); \
        as_v8_debug(__log, "%s : %s", __data_type, res_str);\
    }

#define DEBUG(__log, __data_type, __data) \
    if( (log) && AS_LOG_LEVEL_DEBUG <= (log)->severity) {\
        char res_str[MAX_STR_SIZE]; \
        stringify((char*)res_str, __data,(char*) __data_type); \
        as_v8_debug(__log, "%s : %s", __data_type, res_str);\
    }

#define INFO(__log, __data_type, __data) \
    if( (log) && AS_LOG_LEVEL_INFO <= (log)->severity) {\
        char res_str[MAX_STR_SIZE]; \
        stringify((char*)res_str, __data,(char*) __data_type); \
        as_v8_info(__log, "%s : %s", __data_type, res_str);\
    }



/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

void stringify(char * key_str, const as_key * key, const char* data_type = NULL);
void stringify(char * res_str, const as_record * rec, const char* data_type );
void stringify(char* err_str, const as_error * err, const char* data_type = NULL);


/**
 *	Simple logging function
 */
static inline void _log(const char * func, const char * file, uint32_t line, const char * fmt, ...)
{
    char msg[1024] = {0};

    va_list ap;
    va_start(ap, fmt);
    vsnprintf(msg, 1024-1, fmt, ap);
    va_end(ap);

    fprintf(stderr, "[%s:%d][%s] %s\n", file, line, func, msg);
}

/**
 *	Log a record's content.
 */
static inline void _log_record(LogInfo * log, const char * func, const char * file, uint32_t line, const as_record * record)
{
    char msg[1024] = {0};

    size_t limit = sizeof(msg)-2;
    size_t pos = 0;

    pos += snprintf(msg+pos, limit-pos, "[%s:%d] Record has \n", file, line);

    as_record_iterator it;
    as_record_iterator_init(&it, record);

    while ( as_record_iterator_has_next(&it) ) {
        as_bin * bin = as_record_iterator_next(&it);
        char * name = as_bin_get_name(bin);
        as_val * val = (as_val *) as_bin_get_value(bin);
        char * str = as_val_tostring(val);
        pos += snprintf(msg+pos, limit-pos, "[%s:%d]%s = %s\n", file, line, name, str);
        free(str);
    }

    pos += snprintf(msg+pos, 2, "\n");

    if( 0 >= write(log->fd, msg, limit )) {
        fprintf(stderr, "Internal failure in log message write :%d \n", errno);
    }


}

bool v8_logging_callback(as_log_level level, const char* func, const char * file, uint32_t line, const char* fmt, ...);


void as_v8_log_function( LogInfo * log, as_log_level  level, const char* func, const char * file, uint32_t line, const char* fmt, ...);


