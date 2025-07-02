# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.2.3](https://github.com/yutotnh/yutodo/compare/v0.2.2...v0.2.3) (2025-07-02)


### Features

* add cargo-workspace plugin to handle Cargo.lock updates ([ed1f1ca](https://github.com/yutotnh/yutodo/commit/ed1f1ca15a0fbc7f5a6900860392f16230894983))
* implement hover-based action button expansion in slim mode ([a61728c](https://github.com/yutotnh/yutodo/commit/a61728c173ee7efc318bf2514c783739c67acf43))
* implement left border + gradient priority display system ([66e42d7](https://github.com/yutotnh/yutodo/commit/66e42d70fb1d0591feeebbf6fba88edf024d7ecb))
* implement Portal-based dropdown menu for slim mode action buttons ([89a12b0](https://github.com/yutotnh/yutodo/commit/89a12b0a8a74192df8a43803bba1438cf8417cf1))
* integrate description indicator inline with task titles ([c9e9736](https://github.com/yutotnh/yutodo/commit/c9e9736a304fa13e04d67880ed58ef12fa274eb3))
* optimize add todo form sizing in slim mode for consistency ([798cfc2](https://github.com/yutotnh/yutodo/commit/798cfc29e38085fa78224cff53aea4da674d684c))
* optimize spacing in slim mode for ultra-compact display ([8a13164](https://github.com/yutotnh/yutodo/commit/8a131644c26ac88a716d8b02e64fabbeb48cf47e))
* remove clock icons from slim mode for extreme space optimization ([d815d92](https://github.com/yutotnh/yutodo/commit/d815d92a6e2f4d02bf4552577572f09b089595eb))


### Bug Fixes

* implement independent scrolling for task list to prevent form overlay ([e082ff1](https://github.com/yutotnh/yutodo/commit/e082ff1b93a5b587cb502bc7a54292a9e22e3d75))
* reduce header auto-show threshold for improved top task editing ([02af929](https://github.com/yutotnh/yutodo/commit/02af92961deb1b82ade461af2ee135cce3e5cba7))
* resolve all Vite bundling warnings by optimizing import strategies ([7d6b5f1](https://github.com/yutotnh/yutodo/commit/7d6b5f14b6f6ca4fb2517326c23cb35420a54cd2))
* resolve GitHub release notes generation issue in Release Please workflow ([64ae656](https://github.com/yutotnh/yutodo/commit/64ae65612c39794af19f6fb125561dd5573518bd))
* resolve ShortcutHelp test failure by targeting specific close button ([782724a](https://github.com/yutotnh/yutodo/commit/782724ad8bad60ae98ef51ce1a71b8b64b2d32ad))
* restrict description indicator to slim mode only ([8d145a9](https://github.com/yutotnh/yutodo/commit/8d145a979cc30172e4ba019898026ac61af44cab))
* restructure release-please config for mixed Node.js/Rust project ([d06c2cf](https://github.com/yutotnh/yutodo/commit/d06c2cf5f6662d5e6264ae3b13007469d19f18ca))

## [0.2.2](https://github.com/yutotnh/yutodo/compare/v0.2.1...v0.2.2) (2025-07-01)


### Features

* add clipboard copy notifications for keybindings and shortcuts ([b1fed0f](https://github.com/yutotnh/yutodo/commit/b1fed0f478918b7a5c14cc4294a7602ae6f8c769))
* add workflow optimization emphasis to application description ([a99a094](https://github.com/yutotnh/yutodo/commit/a99a0942271b76fe422f4d93c19a74460db86020))
* enhance productivity focus in application description ([eeb71d5](https://github.com/yutotnh/yutodo/commit/eeb71d54f4767a8392fc8627467b74ce99d3e61f))
* implement staged urgency display for overdue tasks ([78e8951](https://github.com/yutotnh/yutodo/commit/78e8951a2d742f1c4772dacbffb291d5c80f030b))


### Bug Fixes

* add bootstrap-sha to resolve release-please initialization ([6a76549](https://github.com/yutotnh/yutodo/commit/6a765493e19b9b3e85e90a5314d6437b16c3299c))
* add Cargo.lock to release-please extra-files ([9f9296c](https://github.com/yutotnh/yutodo/commit/9f9296c4418aaacfdaf1bd82c7309f9dda568a2c))
* add include-component-in-tag config to resolve release-please tag detection ([ec9f2c8](https://github.com/yutotnh/yutodo/commit/ec9f2c8b5723499a98fec8a2b75ff1e1881f6602))
* add JSONPath for Cargo.lock version update ([3e757b1](https://github.com/yutotnh/yutodo/commit/3e757b1a10c2951e8043de7d76cb0931c3619848))
* add packages configuration for release-please v4 ([5c8589c](https://github.com/yutotnh/yutodo/commit/5c8589c0b641ab93b43f8f27f7e8116b06a5858c))
* align schedule badges consistently in slim mode ([dc2e908](https://github.com/yutotnh/yutodo/commit/dc2e908c690660d2c07f4ee5b7c91219d104f6e7))
* correct Docker image section formatting in GitHub release notes ([8b95e8d](https://github.com/yutotnh/yutodo/commit/8b95e8da5dc46885e39b0ca4865375d6a160bf7d))
* correct Release Please configuration for automatic version synchronization ([8099a73](https://github.com/yutotnh/yutodo/commit/8099a73f9977c619af5c1c6f6c49783063764876))
* remove duplicate release-please config files from .github directory ([890af3f](https://github.com/yutotnh/yutodo/commit/890af3f1701d61588ff5f5a8d5ed168f420f297e))
* standardize all version numbers to 0.2.1 ([c6f364d](https://github.com/yutotnh/yutodo/commit/c6f364df857399be33d17fc6b39dd7650901dafa))
* use generic updater for Cargo.lock ([ce93b1c](https://github.com/yutotnh/yutodo/commit/ce93b1c033211fff96eead8d1937682a3cbb44e6))

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
