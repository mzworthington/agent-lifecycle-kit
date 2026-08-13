# Figma MCP

Stdio server via `figma-developer-mcp` and a Figma personal access token (`FIGMA_API_KEY`).

Official remote `https://mcp.figma.com/mcp` has a broader toolset; use it when Cursor OAuth for that endpoint is healthy. Desktop Dev Mode MCP (`http://127.0.0.1:3845/mcp`) is an alternative when Figma desktop is running.

## When to use

- [agent-ui](../../../skills/agent-ui/SKILL.md) implementing linked frames
- Spec clarification from design files

## Auth

Create a Figma personal access token; set `FIGMA_API_KEY` in the environment that launches Cursor.
