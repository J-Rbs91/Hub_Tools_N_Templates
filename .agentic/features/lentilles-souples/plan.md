# Plan -- Module Lentilles souples : moteurs optiques, catalogue fabricant local et interface Hub

<!--
  Phase 3. Turn the design into execution units.
  Each task lives in a ```yaml agentic:task block; the plan gate parses them.
  Tasks with no dependency between them may run in parallel; tasks touching
  the same area must be sequenced through `dependencies`.
-->

## Approach

<!-- One paragraph on how the work is cut up and in which order. -->

## Tasks

```yaml agentic:task
id: TASK-01
objective: <what this task achieves, in one line>
status: pending           # pending | in_progress | done | blocked | dropped
dependencies: []
likely_files:
  - src/...
acceptance_criteria:
  - <observable outcome, not "code written">
tests:
  - unit
ux_requirements: []
security_requirements:
  securix_rules: []
evidence_required:
  - test execution
risks: []
```

## Parallelisation

<!-- Which tasks are independent, which must be serialised, and why.
     For large changes, note whether git worktrees are worth the isolation. -->

## Out of scope

<!-- What this plan deliberately does not do. -->
