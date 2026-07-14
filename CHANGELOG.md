# 0.1.0 (2026-07-14)


### Bug Fixes

* add @t3-oss/env-core dep and move release config to .releaserc.json ([1185929](https://github.com/tuliof/kuma-mcp/commit/1185929c51b4515ec04b05ff588b89d4d8b8f85a))
* add @types/bun as a dev dependency ([6be03c9](https://github.com/tuliof/kuma-mcp/commit/6be03c90df3b193e1d4d1ee016dd56d3df77d1cc))
* align monitor field names with Uptime Kuma DB schema ([f2a30f3](https://github.com/tuliof/kuma-mcp/commit/f2a30f35c07bad059df87502b9edeb5bdda3e173))
* change command from 'bun' to 'node' for better compatibility in MCP configuration ([a70520b](https://github.com/tuliof/kuma-mcp/commit/a70520bab84c8e39fcb7216897a87d526c776c61))
* change command from 'bun' to 'node' in example configuration for better compatibility ([ad5538a](https://github.com/tuliof/kuma-mcp/commit/ad5538a5d679558c30a2938e1d7c252f8a432c6f))
* correct tsc declaration emit flag ([5d9c257](https://github.com/tuliof/kuma-mcp/commit/5d9c25789a294c685b0c9e51f7ab1e6fee49e58b))
* fix markdown linting issues in README.md ([1206d2d](https://github.com/tuliof/kuma-mcp/commit/1206d2d0cffd0817af3cb702493915321d1f890b))
* update markdown formatting for better readability and consistency ([baacbd3](https://github.com/tuliof/kuma-mcp/commit/baacbd3b3a337715ef424857cf02c0397110c868))
* update TypeScript configuration according to Bun.sh recommendations ([39ff201](https://github.com/tuliof/kuma-mcp/commit/39ff201e6e75cea1a2ac7ad7825eeb51c6d08d45))
* use PAT for semantic-release to bypass branch protection ([814a668](https://github.com/tuliof/kuma-mcp/commit/814a6688bafbc63785be0202864ab8b4935afa72))
* **version:** add atomic rollback, pre-release support, unit tests, and breaking change detection ([faa9e0c](https://github.com/tuliof/kuma-mcp/commit/faa9e0cf0fb67e51186d2e04b43945590d6fce9b))
* **version:** clean up git staging area and stray empty file on release rollback ([20e4a66](https://github.com/tuliof/kuma-mcp/commit/20e4a66bd0dafe0712fbfa5edfe76ccba987b2a4))


### Features

* add automated changelog generation and version bumping ([092061c](https://github.com/tuliof/kuma-mcp/commit/092061c23e660daad679a7311e67c4250cc3ab90))
* add bulk operations (pause/resume by name, bulk update) ([3a9ef51](https://github.com/tuliof/kuma-mcp/commit/3a9ef51630ddfca137bdd23c3b6dbbf34f160d89))
* add commit-msg hook for semantic commit enforcement ([dd0ae46](https://github.com/tuliof/kuma-mcp/commit/dd0ae46f93936916834ffd0f41219e9b1f9d322d))
* add ProcessEnv interface to declare environment variables ([ce2f18d](https://github.com/tuliof/kuma-mcp/commit/ce2f18dc89640d4b32a5f16c87bc0deadd457fe9))
* add status and health monitoring tools ([9a89d1e](https://github.com/tuliof/kuma-mcp/commit/9a89d1e4793ab5f39cdd6692f2d6b09d48b7f499))
* replace git-cliff with semantic-release for automated versioning and releases ([a09bb3b](https://github.com/tuliof/kuma-mcp/commit/a09bb3bd9c4ebc8d8ea8f86c4159afd665a3d8e9))
