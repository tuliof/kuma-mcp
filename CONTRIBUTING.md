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

1. Install dependencies:

    ```bash
    bun install
    ```

1. Build the project:

    ```bash
    bun run build
    ```

1. Install git hooks (recommended):

    ```bash
    ./scripts/install-hooks.sh
    ```

This installs a pre-commit hook that enforces semantic commit messages.

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

1. Make your changes in the `src/` directory

1. Build and test your changes:

    ```bash
    bun run build
    bun run lint
    ```

1. Test manually with a local Uptime Kuma instance:

    ```bash
    docker-compose up -d
    source .env
    bun dist/index.js
    ```

1. Commit your changes with a descriptive message:

    ```bash
    git commit -m "Add: Description of your changes"
    ```

### Commit Message Format

This project enforces [Semantic Commit Messages](https://www.conventionalcommits.org/) to maintain a clear and consistent commit history.

#### Format

```text
<type>(<scope>): <subject>
```

- `<type>`: The type of change (required)
- `<scope>`: The area of the codebase affected (optional)
- `<subject>`: A brief description in present tense (required)

#### Allowed Types

- `feat`: New feature for the user
- `fix`: Bug fix for the user
- `docs`: Documentation changes
- `style`: Formatting, missing semicolons, etc. (no production code change)
- `refactor`: Refactoring production code (e.g., renaming a variable)
- `test`: Adding or updating tests (no production code change)
- `chore`: Updating build tasks, package manager configs, etc. (no production code change)

#### Examples

```bash
feat: add hat wobble
feat(api): add new endpoint for monitors
fix(ui): resolve button styling issue
docs: update installation instructions
style: format code with biome
refactor(client): simplify authentication logic
test: add unit tests for monitor validation
chore: update dependencies
```

#### Installing the Git Hook

To automatically enforce this format, install the git hooks:

```bash
./scripts/install-hooks.sh
```

This will install a `commit-msg` hook that validates your commit messages before they are created.

#### Manual Validation

If you prefer not to use the git hook, ensure your commit messages follow the format above.

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

1. Add the client method in `src/client.ts`:

    ```typescript
    async yourTool(input: YourToolInput): Promise<ResultType> {
      await this.ensureAuthenticated();

      return new Promise((resolve, reject) => {
        // Implement your tool logic
      });
    }
    ```

1. Add the tool definition in `src/index.ts` in `TOOL_DEFINITIONS`:

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

1. Add the handler in `src/index.ts` in the `CallToolRequestSchema` handler:

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

1. Update the README with documentation for your new tool

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
