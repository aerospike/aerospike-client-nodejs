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

#include <node.h>
#include "enums.h"
#include <aerospike/as_query.h>

using namespace v8;

#define set(__obj, __name, __value) __obj->Set(NanNew(__name), NanNew(__value))

Handle<Object> predicates()
{
	NanEscapableScope();
	Handle<Object> obj = NanNew<Object>();
	set(obj, "EQUAL", AS_PREDICATE_EQUAL);
	set(obj, "RANGE", AS_PREDICATE_RANGE);
	return NanEscapeScope(obj);
}
