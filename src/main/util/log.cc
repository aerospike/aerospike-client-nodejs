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

//==========================================================
// Includes.
//

#include "time.h"

extern "C" {
#include <aerospike/aerospike.h>
#include <aerospike/as_log.h>
#include <aerospike/as_string.h>
}

#include "log.h"
#include "enums.h"

#if !defined(_MSC_VER)
#include <unistd.h>
#define as_gmtime(ts, tm) gmtime_r(ts, tm)
#define as_getpid() getpid()
#else
#include <process.h>
#define as_gmtime(ts, tm) gmtime_s(tm, ts)
#define as_getpid() _getpid()
#endif


//==========================================================
// Typedefs & constants.
//

const char log_level_names[7][10] = {
	"OFF", "ERROR", "WARN", "INFO", "DEBUG", "TRACE", {0}
};


//==========================================================
// Forward declarations.
//

void _as_v8_log_function(const LogInfo* log, as_log_level level, const char* func, const char* file, uint32_t line, const char* fmt, va_list args);


//==========================================================
// Globals.
//

LogInfo g_log_info = { stderr, AS_LOG_LEVEL_ERROR };

//==========================================================
// Inlines and macros.
//


//==========================================================
// Public API.
//

bool
as_log_callback_fnct(as_log_level level, const char* func, const char * file,
		uint32_t line, const char* fmt, ...)
{
	va_list args;
	va_start(args, fmt);
	_as_v8_log_function(&g_log_info, level, func, file, line, fmt, args);
	va_end(args);
	return true;
}

void
as_v8_log_function(const LogInfo* log, as_log_level level, const char* func,
		const char* file, uint32_t line, const char* fmt, ...)
{
	va_list args;
	va_start(args, fmt);
	_as_v8_log_function(log, level, func, file, line, fmt, args);
	va_end(args);
}

//==========================================================
// Local helpers.
//

const char*
log_level_name(as_log_level level)
{
	return log_level_names[level + 1];
}

void
_as_v8_log_function(const LogInfo* log, as_log_level level, const char* func,
		const char* file, uint32_t line, const char* fmt, va_list args)
{
	if (NULL == log) {
		return;
	}

	char ts[64];
	struct tm nowtm;
	time_t now = time(NULL);
	as_gmtime(&now, &nowtm);
	strftime(ts, 64, "%b %d %Y %T %Z", &nowtm);

	as_string file_string;
	const char* filename = as_basename(&file_string, file);

	char msg[1024];
	vsnprintf(msg, 1024, fmt, args);

	fprintf(log->fd, "%s: %-5s(%d) [%s:%u] [%s] - %s\n", ts,
			log_level_name(level), as_getpid(), filename, line, func, msg);
	fflush(log->fd);
}
