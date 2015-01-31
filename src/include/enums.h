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

#pragma once

#include <node.h>
#include "client.h"

using namespace v8;

Handle<Object> status();

Handle<Object> key_policy_values();

Handle<Object> retry_policy_values();

Handle<Object> generation_policy_values();

Handle<Object> policy();

Handle<Object> operators();

Handle<Object> log();

Handle<Object> languages();

Handle<Object> scanPriority();

Handle<Object> filter();

Handle<Object> indexType();

Handle<Object> scanStatus();

Handle<Object> scanQueryAPI();
