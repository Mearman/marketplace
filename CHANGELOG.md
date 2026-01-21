## <small>1.17.4 (2026-01-21)</small>

* chore(ci): allow empty scopes for ci/chore/docs commits ([565972c](https://github.com/Mearman/marketplace/commit/565972c))
* ci: add Dependabot and allow empty scopes for ci/chore commits ([43d7073](https://github.com/Mearman/marketplace/commit/43d7073))

## <small>1.17.3 (2026-01-21)</small>

* chore: add git commit --no-verify ban to permissions ([72d0f3b](https://github.com/Mearman/marketplace/commit/72d0f3b))
* chore: remove unused vitest config ([fd091f6](https://github.com/Mearman/marketplace/commit/fd091f6))
* chore(deps): add c8 for coverage and remove vite-tsconfig-paths ([071285a](https://github.com/Mearman/marketplace/commit/071285a))
* chore(deps): migrate from vitest to Node.js native test runner ([59bf197](https://github.com/Mearman/marketplace/commit/59bf197))
* chore(deps): update lockfile after vitest removal ([616610d](https://github.com/Mearman/marketplace/commit/616610d))
* fix(bib): correct mock assertions for Node.js test runner ([0f41e39](https://github.com/Mearman/marketplace/commit/0f41e39))
* fix(gravatar): migrate tests from Vitest to Node.js test runner ([07d028d](https://github.com/Mearman/marketplace/commit/07d028d))
* fix(pypi-json): correct mock assertions for Node.js test runner ([a96142e](https://github.com/Mearman/marketplace/commit/a96142e))
* fix(tex): correct mock assertions for Node.js test runner ([157ca13](https://github.com/Mearman/marketplace/commit/157ca13))
* fix(wayback): migrate tests from Vitest to Node.js test runner ([20010b4](https://github.com/Mearman/marketplace/commit/20010b4))
* test: add global test setup utilities for Node.js test runner ([6603fdb](https://github.com/Mearman/marketplace/commit/6603fdb))
* test(bib): migrate bib tests to Node.js native test runner ([7283711](https://github.com/Mearman/marketplace/commit/7283711))
* test(bib): migrate integration tests and remove vitest ([418e89a](https://github.com/Mearman/marketplace/commit/418e89a))
* test(github-api): migrate tests to Node.js native test runner ([bfab693](https://github.com/Mearman/marketplace/commit/bfab693))
* test(gravatar): migrate tests to Node.js native test runner ([d65c150](https://github.com/Mearman/marketplace/commit/d65c150))
* test(lib): migrate lib tests to Node.js native test runner ([6a7bf07](https://github.com/Mearman/marketplace/commit/6a7bf07))
* test(npm-registry): migrate tests to Node.js native test runner ([5b1f2c1](https://github.com/Mearman/marketplace/commit/5b1f2c1))
* test(npms-io): migrate tests to Node.js native test runner ([eb64d42](https://github.com/Mearman/marketplace/commit/eb64d42))
* test(pypi-json): migrate tests to Node.js native test runner ([756d6d6](https://github.com/Mearman/marketplace/commit/756d6d6))
* test(scripts): migrate generate-readme-plugins tests ([b11cd69](https://github.com/Mearman/marketplace/commit/b11cd69))
* test(tex): migrate tests to Node.js native test runner ([90360a2](https://github.com/Mearman/marketplace/commit/90360a2))
* test(wayback): migrate tests to Node.js native test runner ([9191d5c](https://github.com/Mearman/marketplace/commit/9191d5c))
* refactor(bib): add dependency injection to converter ([a8c5d88](https://github.com/Mearman/marketplace/commit/a8c5d88))

## <small>1.17.2 (2026-01-20)</small>

* test(lib): add unit tests for README generator ([bd5de36](https://github.com/Mearman/marketplace/commit/bd5de36))
* refactor(lib): export pure functions from generator for testing ([17034b6](https://github.com/Mearman/marketplace/commit/17034b6))
* chore(ci): include scripts directory in test patterns ([3bf39d4](https://github.com/Mearman/marketplace/commit/3bf39d4))

## <small>1.17.1 (2026-01-20)</small>

* chore(ci): stage plugin READMEs in pre-commit hook ([3c67f3d](https://github.com/Mearman/marketplace/commit/3c67f3d))
* refactor(lib): implement component-type-agnostic README generator architecture ([31acb27](https://github.com/Mearman/marketplace/commit/31acb27))

## 1.17.0 (2026-01-20)

* chore(wayback): bump version to 0.9.0 ([100f5bc](https://github.com/Mearman/marketplace/commit/100f5bc))
* feat(wayback): add capture frequency analysis script ([581616d](https://github.com/Mearman/marketplace/commit/581616d))
* feat(wayback): add oldest and newest capture lookup script ([2c7897f](https://github.com/Mearman/marketplace/commit/2c7897f))
* feat(wayback): add skill for capture frequency analysis ([1cb62a7](https://github.com/Mearman/marketplace/commit/1cb62a7))
* feat(wayback): add skills for oldest, newest, and range capture lookup ([eb8fbb7](https://github.com/Mearman/marketplace/commit/eb8fbb7))
* style(bib): fix generators linting issues ([39191fd](https://github.com/Mearman/marketplace/commit/39191fd))
* style(github-api): remove unused Dependencies type import ([e2e7077](https://github.com/Mearman/marketplace/commit/e2e7077))
* refactor(bib): eliminate type coercion with type guards ([6296ff4](https://github.com/Mearman/marketplace/commit/6296ff4))
* refactor(bib): fix parsers type safety and remove coercion ([4d17183](https://github.com/Mearman/marketplace/commit/4d17183))

## <small>1.16.2 (2026-01-19)</small>

* style(lib): rename test files to follow naming convention ([064f951](https://github.com/Mearman/marketplace/commit/064f951))
* style(lint): auto-fix eslint violations ([ea85328](https://github.com/Mearman/marketplace/commit/ea85328))

## <small>1.16.1 (2026-01-19)</small>

* chore(ci): add sync-versions and validate to pre-commit ([d0dd6d7](https://github.com/Mearman/marketplace/commit/d0dd6d7))

## 1.16.0 (2026-01-19)

* chore(ci): add vitest configuration ([dbbdbc0](https://github.com/Mearman/marketplace/commit/dbbdbc0))
* chore(ci): disable ban-ts-comment rule in test files ([4769239](https://github.com/Mearman/marketplace/commit/4769239))
* chore(ci): enforce unit/integration test naming convention ([9d05981](https://github.com/Mearman/marketplace/commit/9d05981))
* chore(lib): allow any types in test files for mocks ([ec3ef9f](https://github.com/Mearman/marketplace/commit/ec3ef9f))
* chore(lib): exclude coverage directory from type checking ([2f1d7bd](https://github.com/Mearman/marketplace/commit/2f1d7bd))
* chore(marketplace): register bib plugin ([3f836b1](https://github.com/Mearman/marketplace/commit/3f836b1))
* chore(marketplace): register tex plugin ([328d55d](https://github.com/Mearman/marketplace/commit/328d55d))
* chore(marketplace): sync plugin descriptions ([0e136ab](https://github.com/Mearman/marketplace/commit/0e136ab))
* test(bib): add unit tests for bibliography generators ([07a61de](https://github.com/Mearman/marketplace/commit/07a61de))
* test(bib): add unit tests for converter and biblatex parser ([3566e4c](https://github.com/Mearman/marketplace/commit/3566e4c))
* test(bib): add unit tests for converter and biblatex parser ([91de8f2](https://github.com/Mearman/marketplace/commit/91de8f2))
* test(bib): add unit tests for endnote parser ([4759cd4](https://github.com/Mearman/marketplace/commit/4759cd4))
* test(bib): add unit tests for endnote parser ([bf4afcb](https://github.com/Mearman/marketplace/commit/bf4afcb))
* test(bib): fix and improve endnote parser tests ([1085dac](https://github.com/Mearman/marketplace/commit/1085dac))
* test(bib): fix endnote parser test type assertion ([6503786](https://github.com/Mearman/marketplace/commit/6503786))
* test(bib): rewrite latex parser tests for correct file ([402c28d](https://github.com/Mearman/marketplace/commit/402c28d))
* test(bib): use ts-expect-error for private property access ([2ec807a](https://github.com/Mearman/marketplace/commit/2ec807a))
* test(github-api): add comprehensive unit tests for all scripts ([159b817](https://github.com/Mearman/marketplace/commit/159b817))
* test(gravatar): add unit tests for check, download, url scripts ([c0c064f](https://github.com/Mearman/marketplace/commit/c0c064f))
* test(gravatar): add unit tests for utils script ([9eced3b](https://github.com/Mearman/marketplace/commit/9eced3b))
* test(lib): add comprehensive tests for parseArgs utility ([f05ea98](https://github.com/Mearman/marketplace/commit/f05ea98))
* test(lib): add comprehensive tests for parseArgs utility ([4f2a4cd](https://github.com/Mearman/marketplace/commit/4f2a4cd))
* test(lib): add comprehensive tests for parseArgs utility ([6967c2a](https://github.com/Mearman/marketplace/commit/6967c2a))
* test(npm-registry): add unit tests for downloads, exists, info, search, utils ([dc90997](https://github.com/Mearman/marketplace/commit/dc90997))
* test(npm-registry): add unit tests for downloads, exists, info, search, utils ([7db2a30](https://github.com/Mearman/marketplace/commit/7db2a30))
* test(npms-io): add unit tests for analyze, compare, suggest ([1f052f6](https://github.com/Mearman/marketplace/commit/1f052f6))
* test(npms-io): add unit tests for analyze, compare, suggest ([76ef4f9](https://github.com/Mearman/marketplace/commit/76ef4f9))
* test(pypi-json): add unit tests for info script ([918295d](https://github.com/Mearman/marketplace/commit/918295d))
* test(tex): add tests for latex-to-md script main function ([0c8dab5](https://github.com/Mearman/marketplace/commit/0c8dab5))
* test(tex): add tests for md-to-latex script main function ([e8857db](https://github.com/Mearman/marketplace/commit/e8857db))
* test(tex): add unit tests for markdown/LaTeX conversion ([c471577](https://github.com/Mearman/marketplace/commit/c471577))
* test(wayback): add coverage tests for cache script ([8d10cc1](https://github.com/Mearman/marketplace/commit/8d10cc1))
* test(wayback): add coverage tests for screenshot script ([d43406a](https://github.com/Mearman/marketplace/commit/d43406a))
* test(wayback): add coverage tests for submit script ([bb19503](https://github.com/Mearman/marketplace/commit/bb19503))
* test(wayback): add unit tests for cache, check, list, screenshot, submit ([f6419c8](https://github.com/Mearman/marketplace/commit/f6419c8))
* test(wayback): add unit tests for cache, check, list, screenshot, submit ([a4aebdb](https://github.com/Mearman/marketplace/commit/a4aebdb))
* refactor(bib): use shared lib/latex utilities ([5126af3](https://github.com/Mearman/marketplace/commit/5126af3))
* refactor(github-api): migrate to shared fetchWithCache pattern ([fcd117c](https://github.com/Mearman/marketplace/commit/fcd117c))
* refactor(gravatar): refactor scripts for testability with dependency injection ([2dfea1a](https://github.com/Mearman/marketplace/commit/2dfea1a))
* refactor(lib): rename test file to follow unit test convention ([81ef167](https://github.com/Mearman/marketplace/commit/81ef167))
* refactor(npm-registry): migrate to shared fetchWithCache pattern ([bd80a56](https://github.com/Mearman/marketplace/commit/bd80a56))
* refactor(npms-io): migrate to shared fetchWithCache pattern ([7615c61](https://github.com/Mearman/marketplace/commit/7615c61))
* refactor(pypi-json): add ParsedArgs type export to utils ([5241903](https://github.com/Mearman/marketplace/commit/5241903))
* refactor(pypi-json): refactor info script for testability with dependency injection ([308389c](https://github.com/Mearman/marketplace/commit/308389c))
* refactor(tex): add dependency injection to latex-to-md script ([d863de9](https://github.com/Mearman/marketplace/commit/d863de9))
* refactor(tex): add dependency injection to md-to-latex script ([59aa3dc](https://github.com/Mearman/marketplace/commit/59aa3dc))
* refactor(wayback): refactor scripts for testability with dependency injection ([fd5a57c](https://github.com/Mearman/marketplace/commit/fd5a57c))
* feat(bib): add bibliography manipulation plugin ([8ecc470](https://github.com/Mearman/marketplace/commit/8ecc470))
* feat(bib): add web page citation with Wayback Machine integration ([ae7a92c](https://github.com/Mearman/marketplace/commit/ae7a92c))
* feat(lib): add shared LaTeX encoding/decoding utilities ([7a6cf2f](https://github.com/Mearman/marketplace/commit/7a6cf2f))
* feat(tex): add LaTeX manipulation plugin ([0e1ffda](https://github.com/Mearman/marketplace/commit/0e1ffda))
* feat(tex): add markdown ↔ LaTeX bidirectional conversion ([016ce3d](https://github.com/Mearman/marketplace/commit/016ce3d))
* refactor(github-api,wayback): rename test files to follow convention ([ba3dd00](https://github.com/Mearman/marketplace/commit/ba3dd00))

## 1.15.0 (2026-01-18)

* chore(ci): remove test plugin directory ([7e51fb3](https://github.com/Mearman/marketplace/commit/7e51fb3))
* chore(deps): add remark-lint and type checking dependencies ([48b0eb6](https://github.com/Mearman/marketplace/commit/48b0eb6))
* chore(github-api): remove accidental SILL.md file ([1526316](https://github.com/Mearman/marketplace/commit/1526316))
* chore(lib): enable type checking for JavaScript files ([53f51a7](https://github.com/Mearman/marketplace/commit/53f51a7))
* docs(pypi-json,wayback): add Usage sections to SKILL.md files ([6773d36](https://github.com/Mearman/marketplace/commit/6773d36))
* docs(cve-search): add Usage sections to SKILL.md files ([1949a4a](https://github.com/Mearman/marketplace/commit/1949a4a))
* docs(github-api): add Usage sections to SKILL.md files ([1de635d](https://github.com/Mearman/marketplace/commit/1de635d))
* docs(gravatar): add Usage sections to SKILL.md files ([c0e22a9](https://github.com/Mearman/marketplace/commit/c0e22a9))
* docs(npm-registry): add Usage sections to SKILL.md files ([9408cfb](https://github.com/Mearman/marketplace/commit/9408cfb))
* docs(npms-io): add Usage sections to SKILL.md files ([636b059](https://github.com/Mearman/marketplace/commit/636b059))
* feat(docs): add remark-lint rule to enforce ## Usage sections in SKILL.md ([e68ab0a](https://github.com/Mearman/marketplace/commit/e68ab0a))
* feat(test): add test skill plugin with Usage section ([fbcfbf3](https://github.com/Mearman/marketplace/commit/fbcfbf3))

## <small>1.14.2 (2026-01-18)</small>

* docs(docs): improve marketplace and plugin explanation ([b002182](https://github.com/Mearman/marketplace/commit/b002182))

## <small>1.14.1 (2026-01-18)</small>

* fix(pypi-json): address remaining version parsing edge cases and improve robustness ([dff5991](https://github.com/Mearman/marketplace/commit/dff5991))
* fix(pypi-json): improve version parsing for PEP 440 compliance ([bcf0671](https://github.com/Mearman/marketplace/commit/bcf0671))

## 1.14.0 (2026-01-18)

* chore(cve-search): remove unused variable in pom.xml parser ([af43533](https://github.com/Mearman/marketplace/commit/af43533))
* chore(marketplace): sync cve-search plugin description from plugin.json ([3ed0094](https://github.com/Mearman/marketplace/commit/3ed0094))
* fix(cve-search): address code review feedback from PR #3 ([629c755](https://github.com/Mearman/marketplace/commit/629c755)), closes [#3](https://github.com/Mearman/marketplace/issues/3)
* fix(cve-search): resolve import paths and TypeScript type errors ([ffc5bfa](https://github.com/Mearman/marketplace/commit/ffc5bfa))
* feat(cve-search): add CVE lookup plugin with OpenCVE integration ([0b58334](https://github.com/Mearman/marketplace/commit/0b58334))
* feat(cve-search): add dependency audit skill for scanning vulnerabilities ([481bcd7](https://github.com/Mearman/marketplace/commit/481bcd7))

## <small>1.13.1 (2026-01-18)</small>

* fix(pypi-json): address code review feedback and improve robustness ([8382640](https://github.com/Mearman/marketplace/commit/8382640))
* fix(pypi-json): address remaining review feedback and improve robustness ([e5045a1](https://github.com/Mearman/marketplace/commit/e5045a1))

## 1.13.0 (2026-01-18)

* Merge pull request #2 from Mearman/claude/add-pypi-json-skill-0dHUB ([dddc851](https://github.com/Mearman/marketplace/commit/dddc851)), closes [#2](https://github.com/Mearman/marketplace/issues/2)
* feat(pypi-json): add PyPI JSON API plugin with package information skill ([807847f](https://github.com/Mearman/marketplace/commit/807847f))

## <small>1.12.2 (2026-01-18)</small>

* docs(gravatar): add API Query section to gravatar-check skill ([a6c331e](https://github.com/Mearman/marketplace/commit/a6c331e))
* refactor(docs): remove unused skillName parameter from extractApiDetails ([f5554b8](https://github.com/Mearman/marketplace/commit/f5554b8))
* fix(docs): correct syntax errors in README generator ([7d31f75](https://github.com/Mearman/marketplace/commit/7d31f75))

## <small>1.12.1 (2026-01-18)</small>

* refactor(docs): restructure README with per-skill collapsible details ([555ee94](https://github.com/Mearman/marketplace/commit/555ee94))

## 1.12.0 (2026-01-18)

* docs(github-api): update description to use Title: Description format ([2f361fe](https://github.com/Mearman/marketplace/commit/2f361fe))
* docs(gravatar): update description to use Title: Description format ([8e96d12](https://github.com/Mearman/marketplace/commit/8e96d12))
* docs(marketplace): update descriptions to use Title: Description format ([d33728d](https://github.com/Mearman/marketplace/commit/d33728d))
* refactor(docs): extract plugin titles from description by splitting on colon ([223b616](https://github.com/Mearman/marketplace/commit/223b616))
* feat(ci): sync descriptions from plugin.json to marketplace ([ca12841](https://github.com/Mearman/marketplace/commit/ca12841))

## <small>1.11.6 (2026-01-17)</small>

* chore(docs): backfill missing entries for v1.11.2-v1.11.4 ([7eca343](https://github.com/Mearman/marketplace/commit/7eca343))

## <small>1.11.5 (2026-01-17)</small>

* fix(ci): include all commit types in changelog ([22e072d](https://github.com/Mearman/marketplace/commit/22e072d))

## [1.11.4](https://github.com/Mearman/marketplace/compare/v1.11.3...v1.11.4) (2026-01-17)


### Code Refactoring

* **docs:** change plugins to list format with code fences ([cc1056e](https://github.com/Mearman/marketplace/commit/cc1056ef17498c9bba233779bc6694ea108aadcc))

## [1.11.3](https://github.com/Mearman/marketplace/compare/v1.11.2...v1.11.3) (2026-01-17)


### Documentation

* **docs:** clarify commit scope flexibility and how to add new scopes ([0bf84be](https://github.com/Mearman/marketplace/commit/0bf84be93e650550005a87bbf94f133dff3aea69))

## [1.11.2](https://github.com/Mearman/marketplace/compare/v1.11.1...v1.11.2) (2026-01-17)


### Bug Fixes

* **ci:** stage README after lint-staged to include generated content ([8c52d43](https://github.com/Mearman/marketplace/commit/8c52d43a9d237786d46d6d3ae12411cb060b2597))

## [1.11.1](https://github.com/Mearman/marketplace/compare/v1.11.0...v1.11.1) (2026-01-17)

# [1.11.0](https://github.com/Mearman/marketplace/compare/v1.10.1...v1.11.0) (2026-01-17)


### Features

* **docs:** add README auto-generation with pre-commit hook ([f22e82e](https://github.com/Mearman/marketplace/commit/f22e82e51005262634b473e9ce132911ce8f58e5))

## [1.10.1](https://github.com/Mearman/marketplace/compare/v1.10.0...v1.10.1) (2026-01-17)

# [1.10.0](https://github.com/Mearman/marketplace/compare/v1.9.0...v1.10.0) (2026-01-17)


### Features

* **lib:** add optional TTL with configurable default ([a3ba5bd](https://github.com/Mearman/marketplace/commit/a3ba5bd8cf6c708018d9b9632bd7aba714874bb0))

# [1.9.0](https://github.com/Mearman/marketplace/compare/v1.8.1...v1.9.0) (2026-01-17)


### Features

* **lib:** add fetchWithCache with exponential backoff and retry ([3235dad](https://github.com/Mearman/marketplace/commit/3235dad7d842cb9ff597399ae7658b0c1127cdd9))

## [1.8.1](https://github.com/Mearman/marketplace/compare/v1.8.0...v1.8.1) (2026-01-17)

# [1.8.0](https://github.com/Mearman/marketplace/compare/v1.7.0...v1.8.0) (2026-01-17)


### Features

* **marketplace:** add shared utilities library ([c1948c7](https://github.com/Mearman/marketplace/commit/c1948c7ef12e93d78048713fc335ef821dc2edc0))

# [1.7.0](https://github.com/Mearman/marketplace/compare/v1.6.0...v1.7.0) (2026-01-17)


### Features

* **wayback:** add screenshot availability check and update cache usage ([98c081e](https://github.com/Mearman/marketplace/commit/98c081e5b8ebc70ec0f94c544d5248d35eb5629e))

# [1.6.0](https://github.com/Mearman/marketplace/compare/v1.5.4...v1.6.0) (2026-01-17)


### Features

* **ci:** add eslint and typescript configuration ([ed493c0](https://github.com/Mearman/marketplace/commit/ed493c0c56aca16229d26533926305e1b850dc97))
* **ci:** add pre-commit hook with lint-staged ([9719410](https://github.com/Mearman/marketplace/commit/9719410793d4808f20377cd4ce93fcf7fa7cd588))

## [1.5.4](https://github.com/Mearman/marketplace/compare/v1.5.3...v1.5.4) (2026-01-17)

## [1.5.3](https://github.com/Mearman/marketplace/compare/v1.5.2...v1.5.3) (2026-01-17)

## [1.5.2](https://github.com/Mearman/marketplace/compare/v1.5.1...v1.5.2) (2026-01-17)

## [1.5.1](https://github.com/Mearman/marketplace/compare/v1.5.0...v1.5.1) (2026-01-17)

# [1.5.0](https://github.com/Mearman/marketplace/compare/v1.4.0...v1.5.0) (2026-01-17)


### Features

* **github-api:** add GitHub REST API integration plugin ([c7feecd](https://github.com/Mearman/marketplace/commit/c7feecd3e34ea43a1d10e606673807032191bb66))
* **gravatar:** add Gravatar avatar URL generation plugin ([5041e09](https://github.com/Mearman/marketplace/commit/5041e09af020216c735e89f3cbbb113ed846b838))
* **npm-registry:** add npm registry integration plugin ([1c48189](https://github.com/Mearman/marketplace/commit/1c48189af0d09fd1f7acdb3c19ece3ab450535a4))
* **npms-io:** add NPMS.io package quality analysis plugin ([ccaad22](https://github.com/Mearman/marketplace/commit/ccaad22847d7a54a8cdcbaaca7b98ccb33837417))

# [1.4.0](https://github.com/Mearman/marketplace/compare/v1.3.0...v1.4.0) (2026-01-17)


### Features

* **wayback:** split cache management into separate skill ([3a8a2c6](https://github.com/Mearman/marketplace/commit/3a8a2c6d74c599fa375644154b21827f43f915a2))

# [1.3.0](https://github.com/Mearman/marketplace/compare/v1.2.3...v1.3.0) (2026-01-17)


### Features

* **wayback:** add --clear-cache flag to clear cached data ([1e239aa](https://github.com/Mearman/marketplace/commit/1e239aa66676eb2ebd77bb3644b47099082dd4c5))
* **wayback:** add OS tmpdir-based API response caching ([96478db](https://github.com/Mearman/marketplace/commit/96478dba68526bdec780727fa139010d1456f858))

## [1.2.3](https://github.com/Mearman/marketplace/compare/v1.2.2...v1.2.3) (2026-01-17)


### Bug Fixes

* **ci:** include docs commits in changelog releases ([23b5a0b](https://github.com/Mearman/marketplace/commit/23b5a0bafb98dfb64bc8e0972979939c260e9869))

## [1.2.3](https://github.com/Mearman/marketplace/compare/v1.2.2...v1.2.3) (2026-01-17)


### Documentation

* **docs:** simplify AGENTS.md description ([c14d92a](https://github.com/Mearman/marketplace/commit/c14d92aad3cdf28b9749522029af3398f45ea6b8))
* **docs:** separate commands into individual code fences for easier copying ([cc4c567](https://github.com/Mearman/marketplace/commit/cc4c567b51e7b7fe5ec8a7b540ddd5d151dc9a1b))
* **docs:** show both general and specific update commands ([90f6c78](https://github.com/Mearman/marketplace/commit/90f6c786fb82aae5d09afbe071afbcf3c8315b84))
* **docs:** remove marketplace name from update command ([9f1f324](https://github.com/Mearman/marketplace/commit/9f1f3241f5202afd709781b4de37ef783b8d6b14))
* **docs:** clarify marketplace and plugin update commands ([9201990](https://github.com/Mearman/marketplace/commit/9201990983ed0b0f18904b72e3b46f05191f024e))

### Chores

* **docs:** rename CLAUDE.md to AGENTS.md with symlink ([7353d30](https://github.com/Mearman/marketplace/commit/7353d30b5053150b3b2e01573ee31e7f9a57b879))

## [1.2.2](https://github.com/Mearman/marketplace/compare/v1.2.1...v1.2.2) (2026-01-17)


### Bug Fixes

* **marketplace:** rename marketplace to mearman (avoid reserved name) ([9a6f7eb](https://github.com/Mearman/marketplace/commit/9a6f7eb056304145b2ff903cae93181c20b3243e))

## [1.2.1](https://github.com/Mearman/marketplace/compare/v1.2.0...v1.2.1) (2026-01-17)


### Bug Fixes

* **wayback:** remove $schema from plugin.json for Claude Code compatibility ([a5c2e29](https://github.com/Mearman/marketplace/commit/a5c2e2953403e37d8fed188e330eab99986823fc))

# [1.2.0](https://github.com/Mearman/marketplace/compare/v1.1.0...v1.2.0) (2026-01-17)


### Features

* **wayback:** add error handling guidance to check skill ([8600dc1](https://github.com/Mearman/marketplace/commit/8600dc169f8fea1a28da3eb5b81b043f9ea75fca))

# [1.1.0](https://github.com/Mearman/marketplace/compare/v1.0.1...v1.1.0) (2026-01-17)


### Features

* **ci:** add per-plugin version bumping via semantic-release ([6c7c30b](https://github.com/Mearman/marketplace/commit/6c7c30b911cfa609bd3f30e2f9401edd23b58854))

## [1.0.1](https://github.com/Mearman/marketplace/compare/v1.0.0...v1.0.1) (2026-01-17)


### Bug Fixes

* **ci:** add changelog and git plugins to semantic-release ([3a517a9](https://github.com/Mearman/marketplace/commit/3a517a9888d7cf7ca976595df04f15a7d57ba65c))
* **ci:** allow release scope and long body lines for semantic-release ([e5fe024](https://github.com/Mearman/marketplace/commit/e5fe024d4fe63be75aeafaa13889b48f7a28aead))
