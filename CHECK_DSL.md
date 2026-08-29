# Check DSL grammar

```ebnf
check       = name, trust_level, target, step, step, { step } ;
trust_level = "readonly" | "probe" ;
step        = http_request | status_assertion | json_path_assertion
            | latency_budget | replay_comparison ;
http_request = method, relative_path, headers?, json_body? ;
method      = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" ;
status_assertion = integer_100_to_599 ;
json_path_assertion = restricted_json_path, comparator, expected? ;
comparator  = "equals" | "exists" | "matches" ;
latency_budget = positive_integer_ms_le_30000 ;
replay_comparison = repetitions_2_to_3, comparison_surface ;
comparison_surface = "status" | "body" | "side_effect_count" ;
```

The executable contract is `apps/runner/verity_runner/contracts.py`; the only evaluator entry point is `evaluate(check, transport)`. The transport can make HTTP requests. It cannot access a shell, filesystem, database, import mechanism, or arbitrary network target.
