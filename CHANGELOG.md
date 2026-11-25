## [1.0.4](https://github.com/jwu/pi-ask/compare/fork-v1.0.3...fork-v1.0.4) (2026-11-25)


### Bug Fixes

* **config:** use pi-ask.json as the default config file ([5a63eb8](https://github.com/jwu/pi-ask/commit/5a63eb8d5c56347884690cecbf0987817e4b2e56))

## [1.0.3](https://github.com/jwu/pi-ask/compare/fork-v1.0.2...fork-v1.0.3) (2026-11-21)


### Bug Fixes

* **deps:** 对齐 pi 1.6.0 依赖范围 ([61abb62](https://github.com/jwu/pi-ask/commit/61abb629e50429cb9a25e55b14f170ed66f04473))

## [1.0.2](https://github.com/jwu/pi-ask/compare/fork-v1.0.1...fork-v1.0.2) (2026-11-19)


### Bug Fixes

* **ask:** preserve Chinese freeform questions in answer extraction ([12e43be](https://github.com/jwu/pi-ask/commit/12e43be8d4589eabefd5a0f3a664b3905ed9ef54))
* **ask:** stop cancelled runs and reinforce recommendations ([1074b43](https://github.com/jwu/pi-ask/commit/1074b43cce5340f91420092683f727f5830c172f))
* **ask:** use the current chat model for answer extraction ([a045602](https://github.com/jwu/pi-ask/commit/a0456023e29e942acbabade86c4995d33aa743ae))

## [1.0.1](https://github.com/jwu/pi-ask/compare/fork-v1.0.0...fork-v1.0.1) (2026-11-19)


### Bug Fixes

* **ask:** simplify the transcript call title ([e063e47](https://github.com/jwu/pi-ask/commit/e063e47f4bdb5d866ce17a1fdeeca1e54d1e6186))

# [1.0.0](https://github.com/jwu/pi-ask/compare/fork-v0.5.0...fork-v1.0.0) (2026-11-19)


* feat(ask)!: simplify questionnaire inputs and render Markdown previews ([871614b](https://github.com/jwu/pi-ask/commit/871614bf898c89c0f9f184b45b0c1d650c41b7f7))


### Features

* **ask:** streamline review to submit and cancel ([9828430](https://github.com/jwu/pi-ask/commit/9828430137a591d6c87fec99c0f43c2a791ac6b5))


### BREAKING CHANGES

* ask_user takes header, question, and labeled options. Forms saved by earlier versions must be asked again.

# [0.5.0](https://github.com/jwu/pi-ask/compare/fork-v0.4.1...fork-v0.5.0) (2026-11-10)


### Features

* paste clipboard images into ask editors ([028a628](https://github.com/jwu/pi-ask/commit/028a628717c1a800adf597de97cd0e2ae2cf69c2))

## [0.4.1](https://github.com/jwu/pi-ask/compare/fork-v0.4.0...fork-v0.4.1) (2026-11-10)


### Bug Fixes

* paste clipboard text into ask editors ([9f4a348](https://github.com/jwu/pi-ask/commit/9f4a348704cfd59bf88872b2c8cb492b22059ef2))

# [0.4.0](https://github.com/jwu/pi-ask/compare/fork-v0.3.2...fork-v0.4.0) (2026-11-10)


### Features

* **ask:** report blocked program status while the form waits ([31f2366](https://github.com/jwu/pi-ask/commit/31f2366e9c00536bad7f16f29d597ddb6a5284f6))

## [0.3.2](https://github.com/jwu/pi-ask/compare/fork-v0.3.1...fork-v0.3.2) (2026-11-04)


### Bug Fixes

* **schema:** validate question fields at runtime so degraded payloads reach the tool ([cdd48a9](https://github.com/jwu/pi-ask/commit/cdd48a9792db9370949aebb9bd8fba26af58e2db))

## [0.3.1](https://github.com/jwu/pi-ask/compare/fork-v0.3.0...fork-v0.3.1) (2026-11-03)


### Bug Fixes

* **changelog:** guard the package changelog against newer headings ([71e8063](https://github.com/jwu/pi-ask/commit/71e8063d3a012a807549a2c670ff0938d858eda7))

# [0.3.0](https://github.com/jwu/pi-ask/compare/fork-v0.2.1...fork-v0.3.0) (2026-10-26)


### Features

* report blocked pane state to herdr while ask prompts are open ([c1d1f5f](https://github.com/jwu/pi-ask/commit/c1d1f5ffd3461e8bd0ee749d2a93846eefe97056))

## [0.2.1](https://github.com/jwu/pi-ask/compare/fork-v0.2.0...fork-v0.2.1) (2026-09-29)


### Bug Fixes

* keep printable visibility bindings from swallowing editor input ([4540ee3](https://github.com/jwu/pi-ask/commit/4540ee35f3c16c78c0a9b1fd533148920f44e978))

# [0.2.0](https://github.com/jwu/pi-ask/compare/fork-v0.1.0...fork-v0.2.0) (2026-09-29)


### Bug Fixes

* match shortcuts when a CJK input method commits full-width keys ([7331b9b](https://github.com/jwu/pi-ask/commit/7331b9ba95797405b3fd0704f63b4516a7c73ce8))


### Features

* publish the fork under its own fork-v release line ([a41ebb9](https://github.com/jwu/pi-ask/commit/a41ebb9206d500e275f7773c9e26edec81c0c8da))

---

上游 `eko24ive/pi-ask` 的历史条目（v0.1.0 – v1.2.0，fork 之前）已归档到
[`CHANGELOG-upstream.md`](./CHANGELOG-upstream.md)，不参与本包的发布线。
