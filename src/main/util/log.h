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
}

/*******************************************************************************
 *  MACROS
 ******************************************************************************/

#define debug(__fmt, ... ) _log(__func__, __FILE__, __LINE__, __fmt, ##__VA_ARGS__)

#define debug_record(__rec) _log_record(__func__, __FILE__, __LINE__, __rec)

/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

/**
 *	Simple logging function
 */
static inline void _log(const char * func, const char * file, uint32_t line, const char * fmt, ...)
{
	char msg[1024] = {0};

	va_list ap;
	va_start(ap, fmt);
	vsnprintf(msg, 1024-1, fmt, ap);
	msg[1024] = '\0';
	va_end(ap);

	fprintf(stderr, "[%s:%d][%s] %s\n", file, line, func, msg);
}

/**
 *	Log a record's content.
 */
static inline void _log_record(const char * func, const char * file, uint32_t line, const as_record * record)
{
	fprintf(stderr, "[%s:%d][%s] record := {\n", file, line, func);

	as_record_iterator it;
	as_record_iterator_init(&it, record);

	while ( as_record_iterator_has_next(&it) ) {
		as_bin * bin = as_record_iterator_next(&it);
		char * name = as_bin_get_name(bin);
		as_val * val = (as_val *) as_bin_get_value(bin);
		char * str = as_val_tostring(val);
		fprintf(stderr, "[%s:%d][%s]     %s = %s\n", file, line, func, name, str);
		free(str);
	}

	fprintf(stderr, "[%s:%d][%s] }\n", file, line, func);
}
