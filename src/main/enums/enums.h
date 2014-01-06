#pragma once

#include <node.h>

using namespace v8;

Handle<Object> status_codes();

Handle<Object> key_policy_values();

Handle<Object> retry_policy_values();

Handle<Object> generation_policy_values();

Handle<Object> policy_values();

Handle<Object> operators();

Handle<Object> log_levels();
