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

#include <node.h>
#include "log.h"
#include "client.h"

extern "C" {
#include <aerospike/as_policy.h>
}

int config_from_jsobject(as_config *config, v8::Local<v8::Object> obj, AerospikeClient *client,
						 const LogInfo *log);

// Registers on config the discovery provider that obj.discovery describes, as
// for a client, for the L1 conformance runner (conformance.cc).
int config_discovery_from_jsobject(as_config *config, v8::Local<v8::Object> obj,
								   const LogInfo *log);

// Frees an ip_map array the client allocated, with its strings.
void free_ip_map(as_addr_map *map, uint32_t size);

// Frees the ip_map the client set on a config it hasn't handed to
// aerospike_init(), and clears the field.
void config_free_ip_map(as_config *config);
