---
name: lang-rust
description: >-
  Coding standards and idiom profile for Rust. Enforces memory safety, explicit
  ownership and borrowing, zero-cost abstractions, robust Result/Option error handling,
  Clippy lint hygiene, and Cargo workspace layout.
kind: profile
triggers:
  - rust
  - cargo
  - rs
  - clippy
  - ownership
  - borrow checker
depends-on: []
tools:
  - read
  - write
disable-model-invocation: false
---
# Profile: Rust Language Coding Standards

This profile defines strict quality, memory safety, and architectural standards for Rust codebases.

## Core Directives

1. **Ownership & Borrowing**:
   - Prefer immutable references (`&T`) by default.
   - Limit mutable references (`&mut T`) to isolated scopes.
   - Avoid unnecessary cloning (`.clone()`) on hot paths; prefer borrowing or lifetimes (`'a`) when lifetime semantics remain clean and readable.

2. **Error Handling**:
   - Use `Result<T, E>` for recoverable errors and `Option<T>` for missing values.
   - Do NOT use `.unwrap()` or `.expect()` in production application code. Use `?` operator propagation or explicit pattern matching (`match`, `if let`).
   - Define custom error types using `thiserror` for library boundaries and `anyhow` for top-level application binaries.

3. **Type Safety & Zero-Cost Abstractions**:
   - Leverage the Newtype pattern (`struct UserId(Uuid);`) to prevent primitive obsession.
   - Express domain state transitions through the type system (e.g. Typestate pattern).
   - Prefer iterator chains (`map`, `filter`, `fold`) over explicit index loops when intent is clearer.

4. **Code Structure & Architecture**:
   - Organize domain entities, value objects, and ports inside domain modules (`src/domain/`).
   - Keep unsafe code (`unsafe { ... }`) strictly isolated, minimal, and fully documented with `# Safety` contracts.

5. **Linting & Tooling**:
   - Zero Clippy warnings (`cargo clippy -- -D warnings`).
   - Code formatted using standard `rustfmt` (`cargo fmt`).
