# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.2.1](https://github.com/yutotnh/yutodo/compare/v0.2.0...v0.2.1) (2025-07-01)


### Bug Fixes

* add contents write permission to Docker publish job ([e51ef7a](https://github.com/yutotnh/yutodo/commit/e51ef7afd1c69ba64e8a352f7d15e95dad186aec))
* sync Tauri app version to 0.2.0 and improve Release Please configuration ([cf550eb](https://github.com/yutotnh/yutodo/commit/cf550eb3e1e2c7fe3400ccd04fe3740cb76aa4b4))

## [0.2.0](https://github.com/yutotnh/yutodo/compare/v0.1.1...v0.2.0) (2025-07-01)


### Features

* add GUI setting for startup view preference ([1febbef](https://github.com/yutotnh/yutodo/commit/1febbef7235e24f07a24d6ae5780ef5218560fe7))
* implement ultra-compact 1-row view for slim mode ([3a78d9e](https://github.com/yutotnh/yutodo/commit/3a78d9ee3e0bc9cd83c85a1a61ad40669144f7d2))


### Bug Fixes

* add clipboard fallback for file opening when opener permissions fail ([c63d8be](https://github.com/yutotnh/yutodo/commit/c63d8be808183a6e9ed43b3695daacf29695e75c))
* correct Docker image tag references in documentation ([7eb8fa0](https://github.com/yutotnh/yutodo/commit/7eb8fa04dfb9d88e5bc47d8a2cc96f1a470e93c1))
* prevent startupView changes when using view shortcuts ([588cd5a](https://github.com/yutotnh/yutodo/commit/588cd5afda14bd532c4718f4ed6a0ec776166608))

## [0.1.1](https://github.com/yutotnh/yutodo/compare/v0.1.0...v0.1.1) (2025-07-01)


### Bug Fixes

* add last-release-sha to force Release Please to use correct base commit ([5b18400](https://github.com/yutotnh/yutodo/commit/5b184007389c62199f4f339f76dfa2dedf6fda81))
* add push trigger to Release Please workflow for automatic releases ([025ec38](https://github.com/yutotnh/yutodo/commit/025ec386ea15bb6a3a61a3808e83d0e3e31579c8))
* configure Release Please to match existing tag format (yutodo-v0.1.0) ([f632b48](https://github.com/yutotnh/yutodo/commit/f632b48d7f16494f1b961fb96c6bd0bc5938dfc8))
* correct Release Please configuration with package-name for yutodo-v tags ([d2c4d86](https://github.com/yutotnh/yutodo/commit/d2c4d869b254d1d1e5eefc25938d125be9d2a9a7))
* correct Release Please release-type parameter ([4d404e2](https://github.com/yutotnh/yutodo/commit/4d404e258e9296a6a04c5229b64a0d6fad0ec1da))
* correct Release Please tag format to match existing yutodo-v0.1.0 tag ([dfed474](https://github.com/yutotnh/yutodo/commit/dfed474193e1c1e0eeb1f4ae1cb29f5223367d65))
* remove orphaned 0.1.1 CHANGELOG entry causing Release Please confusion ([5577cca](https://github.com/yutotnh/yutodo/commit/5577cca117e8f153b78765a5f3f23f3c18ae7be6))
* resolve E2E test dependencies and configuration issues ([ead1fed](https://github.com/yutotnh/yutodo/commit/ead1fedcc94647061c433e3cef2cf4f38db8fefb))
* resolve production build white screen issue ([45fe38b](https://github.com/yutotnh/yutodo/commit/45fe38bd6cfca2080a313bf09295f9e1ed6e1f94))
* resolve Release Please workflow double version update issue ([d88a113](https://github.com/yutotnh/yutodo/commit/d88a11375304a2338a0b43787a4fbfdecb0b0a34))
* resolve Release Please workflow errors for push triggers ([0b425dd](https://github.com/yutotnh/yutodo/commit/0b425dd1eada8adc58ca1bcaecbc4fe0cb34153f))
* update Node.js Docker base image to resolve build failures ([20c5349](https://github.com/yutotnh/yutodo/commit/20c534992c133fc6f1514a87b2295d603baaaa40))
* use tag-prefix for Release Please to match yutodo-v format ([fb13571](https://github.com/yutotnh/yutodo/commit/fb135718ad5aa904330b6af15b8ea6d4f402b882))

## [Unreleased]

### Added
- Initial release of YuToDo desktop application
- Task management with real-time synchronization
- Schedule management with recurring tasks
- Multi-language support (English/Japanese)
- Dark/Light theme support
- Keyboard shortcuts for efficient workflow
- Import/Export functionality
- Cross-platform support (Windows, macOS, Linux)
