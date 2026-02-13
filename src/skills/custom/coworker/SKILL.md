---
name: coworker
version: 1.0.0
description: An autonomous AI coworker that can execute complex tasks using a persistent computer environment.
triggers:
  - type: keyword
    value: coworker
    description: Trigger the coworker agent
  - type: command
    value: /cowork
    description: Explicitly invoke the coworker
parameters:
  - name: task
    type: string
    required: true
    description: The task instructions for the coworker.
  - name: context
    type: string
    required: false
    description: Additional context or background information.
permissions:
  - llm
  - docker
examples:
  - coworker "Clone the repository X and run the tests"
  - /cowork task="Analyze the logs in /var/log/app.log"
  - coworker "Set up a new React project in /workspace/frontend"
---
# Coworker Agent

This skill spins up a persistent Docker container and uses an LLM to autonomously execute tasks within it.
It creates a "virtual computer" for the agent to work on.

## Tools Available to Agent
1. `run_command`: Execute shell commands (e.g. ls, git, npm, cat).
2. `write_file`: Create or update files.
3. `read_file`: Read file contents.
