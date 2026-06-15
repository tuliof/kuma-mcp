# Changelog

All notable changes to this project will be documented in this file.
## [Unreleased]

### Added

- Add ProcessEnv interface to declare environment variables
- Add commit-msg hook for semantic commit enforcement
- Add bulk operations (pause/resume by name, bulk update)
- Add status and health monitoring tools

### Changed

- Update @modelcontextprotocol/sdk dependency version to 1.21.0
- Update zod dependency version to ^4.1.12
- Upgrade biome to v2
- Initial plan for pre-commit hook
- Update documentation with semantic commit guidelines
- Improve CONTRIBUTING.md formatting
- Update CONTRIBUTING.md
- Replace hooks script with husky
- Add PR template form
- Extract client logic into modular src/api/ directory
- Add integration tests for bulk operations
- Add dev setup scripts and husky pre-commit hook
- Lint fixes and housekeeping
- Add integration tests for status and health tools
- Update AGENTS.md with cleanup rule and add kuma:start script
- Add commit group rules to AGENTS.md

### Fixed

- Add @types/bun as a dev dependency
- Change command from 'bun' to 'node' in example configuration for better compatibility
- Update markdown formatting for better readability and consistency
- Change command from 'bun' to 'node' for better compatibility in MCP configuration
- Fix markdown linting issues in README.md
- Update TypeScript configuration according to Bun.sh recommendations
- Schemas so websocket calls work

