---
name: deep_research
version: 1.0.0
description: Conducts deep, multi-step research on a topic, reading multiple sources and synthesizing a report.
author: Alpicia
triggers:
  - type: keyword
    value: research
  - type: command
    value: /research
parameters:
  - name: topic
    type: string
    required: true
    description: The topic to research
  - name: depth
    type: number
    required: false
    description: Depth of research (number of sources to analyze, default 3)
    default: 3
permissions:
  - browser
  - llm
examples:
  - research quantum computing trends
  - /research "latest AI models" --depth 5
