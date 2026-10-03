# Benchmarks

`npm run benchmark` generates a 1,000-file/10,000-import fixture and measures cold/cached ESLint and architecture checks. Results include wall time, CPU time, and peak resident memory. CI compares them with `baseline.json` using the recorded 20% tolerance plus small absolute noise floors for sub-50 ms checks and memory sampling; update the baseline only after reviewing an intentional performance change on the benchmark runner.
