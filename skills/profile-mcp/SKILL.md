---
name: profile-mcp
description: >-
  Technical domain profile for Model Context Protocol (MCP) server design and agent tool integration.
  Enforces clear JSON Schema tool signatures, stdio/SSE transports, error handling, prompt templates, and security sanitization.
kind: profile
triggers:
  - mcp
  - model context protocol
  - mcp server
  - mcp tool
  - mcp transport
  - modelcontextprotocol
depends-on:
  - profile-api
tools:
  - read
  - write
disable-model-invocation: false
---
# Profile: Model Context Protocol (MCP) Integration Standards

This profile defines technical standards for building and operating Model Context Protocol (MCP) servers, tools, resources, and prompts.

## Core Directives

1. **Tool Schema Design**:
   - Provide strict JSON Schema definitions for every tool's parameters.
   - Set descriptive `description` fields on tools and every parameter so LLMs select tools accurately.
   - Use required parameter lists explicitly to prevent ambiguity.

2. **Transport & Server Lifecycle**:
   - Support standard `stdio` transport for CLI/IDE integrations and `SSE` (Server-Sent Events) for remote network services.
   - Ensure clean process lifecycle management—handle `SIGINT` / `SIGTERM` signals and clean up child processes or connections gracefully.

3. **Response Formatting & Error Handling**:
   - Format successful tool responses using structured content blocks (`{ type: "text", text: "..." }`).
   - Treat tool execution errors gracefully: return informative error messages in the tool output instead of crashing the server process.

4. **Security & Input Sanitization**:
   - Validate and sanitize all parameters inside tool handlers before executing filesystem or shell actions.
   - Restrict file paths to explicitly allowed root workspace directories; prevent path traversal (`../`).
   - Never log or return secret environment variables (API keys, credentials) in tool output.
