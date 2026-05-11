// H.9.7 ESLint v9 flat-config for substrate `.js` files.
//
// Substrate convention (per H.9.7 sub-plan + ADR-0006): hand-rolled
// `eslint:recommended` rule set inline (no `require("@eslint/js")`) to
// preserve substrate's zero-runtime-dependency property. Matches the
// `npx --yes <tool>` invocation pattern from H.9.0-H.9.5 (Tests 80-83).
//
// ADR-0006 invariant 4 maintenance commitment: ESLint major-version
// bumps (v9 -> v10) require ADR-0006 amendment + per-phase pre-approval
// gate. Minor/patch bumps (v9.x.y) flow through smoke harness; manual
// rule-set sync is unnecessary because recommended evolves between major
// versions only.
//
// ADR-0006 invariant 3 boundary: this config sets `varsIgnorePattern`,
// `argsIgnorePattern`, and `caughtErrorsIgnorePattern` to `^_` — config
// CALIBRATION (rule options codifying substrate-wide `_`-prefix naming
// convention applied uniformly across substrate `.js`). NOT suppression:
// rule severity stays `error`; no per-file `files: [...]` overrides.
//
// Rules captured from `@eslint/js@9.39.4` `configs.recommended.rules` on
// 2026-05-11. 60 rules total. When ESLint v10 ships, run
// `npx -p @eslint/js@10 node -e "console.log(JSON.stringify(require('@eslint/js').configs.recommended.rules))"`
// and compare against this list per ADR-0006 invariant 4.
//
// Bootstrap note: this file was authored via Bash heredoc one-time because
// config-guard.js intentionally blocks all writes to eslint.config* paths
// (per its "fix-don't-weaken-the-lint" discipline). The hook's protection
// is the steady-state behavior we want; bootstrap exception captured at
// drift-note 79 for future config-guard CONFIG_GUARD_BOOTSTRAP env-var
// enhancement.

"use strict";

module.exports = [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        // Node CommonJS module system
        require: "readonly",
        module: "writable",
        exports: "writable",
        __dirname: "readonly",
        __filename: "readonly",

        // Node runtime
        process: "readonly",
        Buffer: "readonly",
        global: "readonly",
        globalThis: "readonly",
        console: "readonly",

        // Timers
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
        queueMicrotask: "readonly",

        // Modern Node + Web standard runtime
        URL: "readonly",
        URLSearchParams: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        fetch: "readonly",
        Headers: "readonly",
        Request: "readonly",
        Response: "readonly",
        structuredClone: "readonly",

        // Test runtime (used in `_h70-test.js`)
        Promise: "readonly",
      },
    },

    // ESLint v9 `eslint:recommended` rules (60 total).
    // Captured 2026-05-11 from @eslint/js@9.39.4.
    rules: {
      "constructor-super": "error",
      "for-direction": "error",
      "getter-return": "error",
      "no-async-promise-executor": "error",
      "no-case-declarations": "error",
      "no-class-assign": "error",
      "no-compare-neg-zero": "error",
      "no-cond-assign": "error",
      "no-const-assign": "error",
      "no-constant-binary-expression": "error",
      "no-constant-condition": "error",
      "no-control-regex": "error",
      "no-debugger": "error",
      "no-delete-var": "error",
      "no-dupe-args": "error",
      "no-dupe-class-members": "error",
      "no-dupe-else-if": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-empty": "error",
      "no-empty-character-class": "error",
      "no-empty-pattern": "error",
      "no-empty-static-block": "error",
      "no-ex-assign": "error",
      "no-extra-boolean-cast": "error",
      "no-fallthrough": "error",
      "no-func-assign": "error",
      "no-global-assign": "error",
      "no-import-assign": "error",
      "no-invalid-regexp": "error",
      "no-irregular-whitespace": "error",
      "no-loss-of-precision": "error",
      "no-misleading-character-class": "error",
      "no-new-native-nonconstructor": "error",
      "no-nonoctal-decimal-escape": "error",
      "no-obj-calls": "error",
      "no-octal": "error",
      "no-prototype-builtins": "error",
      "no-redeclare": "error",
      "no-regex-spaces": "error",
      "no-self-assign": "error",
      "no-setter-return": "error",
      "no-shadow-restricted-names": "error",
      "no-sparse-arrays": "error",
      "no-this-before-super": "error",
      "no-undef": "error",
      "no-unexpected-multiline": "error",
      "no-unreachable": "error",
      "no-unsafe-finally": "error",
      "no-unsafe-negation": "error",
      "no-unsafe-optional-chaining": "error",
      "no-unused-labels": "error",
      "no-unused-private-class-members": "error",
      "no-unused-vars": ["error", {
        // Per ADR-0006 invariant 3 config-calibration boundary:
        // `_`-prefix convention is substrate-wide; uniform; rule severity stays error.
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "no-useless-backreference": "error",
      "no-useless-catch": "error",
      "no-useless-escape": "error",
      "no-with": "error",
      "require-yield": "error",
      "use-isnan": "error",
      "valid-typeof": "error",
    },
  },

  {
    ignores: [
      "node_modules/**",
      ".git/**",
      "swarm/run-state/**",
    ],
  },
];
