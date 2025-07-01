/*******************************************************************************
 * Copyright 2013-2023 Aerospike, Inc.
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

#pragma once

extern "C" {
#include <aerospike/aerospike.h>
#include <aerospike/as_log.h>
}

/*******************************************************************************
 *  TYPES
 *******************************************************************************/

typedef struct LogInfo {
	FILE *fd;
	as_log_level level;
} LogInfo;

extern LogInfo g_log_info;

/*******************************************************************************
 *  MACROS
 ******************************************************************************/

#define as_v8_detail_enabled(__log)                                            \
	((__log) && AS_LOG_LEVEL_TRACE <= (__log)->level)

#define as_v8_detail(__log, __fmt, ...)                                        \
	if (as_v8_detail_enabled(__log)) {                                         \
		as_v8_log_function(__log, AS_LOG_LEVEL_TRACE, __func__, __FILE__,      \
						   __LINE__, __fmt, ##__VA_ARGS__);                    \
	}

#define as_v8_debug_enabled(__log)                                             \
	((__log) && AS_LOG_LEVEL_DEBUG <= (__log)->level)

#define as_v8_debug(__log, __fmt, ...)                                         \
	if (as_v8_debug_enabled(__log)) {                                          \
		as_v8_log_function(__log, AS_LOG_LEVEL_DEBUG, __func__, __FILE__,      \
						   __LINE__, __fmt, ##__VA_ARGS__);                    \
	}

#define as_v8_info(__log, __fmt, ...)                                          \
	if ((__log) && AS_LOG_LEVEL_INFO <= (__log)->level) {                      \
		as_v8_log_function(__log, AS_LOG_LEVEL_INFO, __func__, __FILE__,       \
						   __LINE__, __fmt, ##__VA_ARGS__);                    \
	}

#define as_v8_error(__log, __fmt, ...)                                         \
	if ((__log) && AS_LOG_LEVEL_ERROR <= (__log)->level) {                     \
		as_v8_log_function(__log, AS_LOG_LEVEL_ERROR, __func__, __FILE__,      \
						   __LINE__, __fmt, ##__VA_ARGS__);                    \
	}

#define as_v8_warn(__log, __fmt, ...)                                         \
	if ((__log) && AS_LOG_LEVEL_WARN <= (__log)->level) {                     \
		as_v8_log_function(__log, AS_LOG_LEVEL_WARN, __func__, __FILE__,      \
						   __LINE__, __fmt, ##__VA_ARGS__);                    \
	}

/*******************************************************************************
 *  FUNCTIONS
 ******************************************************************************/

bool as_log_callback_fnct(as_log_level level, const char *func,
						  const char *file, uint32_t line, const char *fmt,
						  ...);

void as_v8_log_function(const LogInfo *log, as_log_level level,
						const char *func, const char *file, uint32_t line,
						const char *fmt, ...);
