# Contributing to kuma-mcp

Thank you for your interest in contributing to kuma-mcp! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- Node.js v18+ LTS
- Bun
- Docker (for running Uptime Kuma locally)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/tuliof/kuma-mcp.git
cd kuma-mcp
```

2. Install dependencies:
```bash
bun install
```

3. Build the project:
```bash
bun run build
```

## Development Workflow

### Code Style

This project uses [Biome](https://biomejs.dev/) for linting and formatting.

```bash
# Check for issues
bun run lint

# Fix issues automatically
bun run lint:fix

# Format code
bun run format
```

All code should pass linting before being committed.

### Making Changes

1. Create a new branch for your feature or fix:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes in the `src/` directory

3. Build and test your changes:
```bash
bun run build
bun run lint
```

4. Test manually with a local Uptime Kuma instance:
```bash
docker-compose up -d
source .env
bun dist/index.js
```

5. Commit your changes with a descriptive message:
```bash
git commit -m "Add: Description of your changes"
```

### Commit Message Format

Use clear, descriptive commit messages:
- `Add: [feature]` - New features
- `Fix: [issue]` - Bug fixes
- `Update: [component]` - Updates to existing features
- `Docs: [section]` - Documentation changes
- `Refactor: [component]` - Code refactoring

## Adding New Features

### Adding a New Tool

To add a new MCP tool:

1. Add the schema in `src/schemas.ts`:
```typescript
export const YourToolInputSchema = z.object({
  // Define your input schema
});

export type YourToolInput = z.infer<typeof YourToolInputSchema>;
```

2. Add the client method in `src/client.ts`:
```typescript
async yourTool(input: YourToolInput): Promise<ResultType> {
  await this.ensureAuthenticated();
  
  return new Promise((resolve, reject) => {
    // Implement your tool logic
  });
}
```

3. Add the tool definition in `src/index.ts` in `TOOL_DEFINITIONS`:
```typescript
{
  name: "your_tool",
  description: "Description of what your tool does",
  inputSchema: {
    type: "object",
    properties: {
      // Define properties
    },
    required: ["field1", "field2"],
  },
}
```

4. Add the handler in `src/index.ts` in the `CallToolRequestSchema` handler:
```typescript
case "your_tool": {
  const input = YourToolInputSchema.parse(request.params.arguments);
  const result = await this.client.yourTool(input);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
```

5. Update the README with documentation for your new tool

### Adding New Monitor Types

If Uptime Kuma adds support for new monitor types:

1. Update the `MonitorTypeSchema` in `src/schemas.ts`
2. Update the README's "Supported Monitor Types" section
3. Update the tool definition in `src/index.ts` to include the new type

## Testing

Currently, this project does not have automated tests. When making changes:

1. Test manually with a local Uptime Kuma instance
2. Verify all tools work as expected
3. Check error handling with invalid inputs

Consider adding automated tests in the future to improve reliability.

## Documentation

When adding new features:

1. Update the README.md with usage examples
2. Add inline comments for complex logic
3. Update EXAMPLE.md if the feature affects user workflows
4. Keep the JSDoc comments up to date

## Pull Request Process

1. Ensure your code passes linting: `bun run lint`
2. Ensure the project builds: `bun run build`
3. Update documentation as needed
4. Create a pull request with a clear description of changes
5. Reference any related issues in the PR description

## Code Review

All contributions will be reviewed for:

- Code quality and style (must pass Biome checks)
- Functionality and correctness
- Documentation completeness
- TypeScript type safety
- Security considerations

## Questions?

If you have questions about contributing, please:

1. Check existing issues and discussions
2. Open a new issue with the "question" label
3. Be as specific as possible about your question

## License

By contributing to kuma-mcp, you agree that your contributions will be licensed under the MIT License.
