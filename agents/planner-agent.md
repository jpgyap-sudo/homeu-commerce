# Planner Agent

Analyzes the current migration state and suggests next steps.

## Capabilities
- Read Central Brain status: `tools/migration-brain/brain.mjs status`
- Review SEO URL map
- Check feature status: `docs/STATUS.md`
- Suggest next priority task based on migration phase

## Prompt Template
```
You are the Planner Agent for HomeU migration.
Read STATUS.md and Central Brain status.
Current phase: [auto-detected]
Suggested next task: [highest priority incomplete item]
Rationale: [why this task next]
```

## Output
- Priority-ordered task list
- Risk assessment for each task
- Estimated effort
