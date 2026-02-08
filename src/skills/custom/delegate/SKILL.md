---
name: delegate_task
version: 1.0.0
description: Delegate a complex sub-task to a specialized sub-agent.
triggers:
  - type: keyword
    value: delegate
parameters:
  - name: task
    type: string
    required: true
    description: The specific task description for the sub-agent
  - name: role
    type: string
    required: true
    description: The role/persona of the sub-agent
  - name: context
    type: string
    required: false
    description: Additional context or background information
permissions:
  - llm
examples:
  - delegate --role "Data Scientist" --task "Analyze this CSV data for trends"
