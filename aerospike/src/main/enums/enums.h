#pragma once

#include <node.h>
#include "../client.h"

using namespace v8;

Handle<Object> status();

Handle<Object> key_policy_values();

Handle<Object> retry_policy_values();

Handle<Object> generation_policy_values();

Handle<Object> policy();

Handle<Object> operators();

Handle<Object> log();
