# Coding Fundamentals

## Immutability (CRITICAL)

ALWAYS create new objects. NEVER mutate existing ones. Immutable data prevents hidden side effects and enables safe concurrency.

## Core Principles

- **KISS**: Prefer the simplest solution that works. Optimize for clarity over cleverness.
- **DRY**: Extract shared logic when repetition is real, not speculative.
- **YAGNI**: Do not build features or abstractions before they are needed.

## File Organization

Many small files over few large files:
- 200–400 lines typical, 800 max
- Organize by feature/domain, not by type
- High cohesion, low coupling

## Error Handling

- Handle errors explicitly at every level
- User-friendly messages in UI code, detailed logging server-side
- Never silently swallow errors or use empty catch blocks

## Input Validation

- Validate at system boundaries (user input, API responses, file content)
- Use schema-based validation (Zod, Joi, etc.)
- Fail fast with clear messages
- Never trust external data

## Naming

- Variables/functions: `camelCase`
- Booleans: `is`, `has`, `should`, `can` prefixes
- Types/components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

## Pre-Completion Checklist

- [ ] Code is readable and well-named
- [ ] Functions < 50 lines
- [ ] Files < 800 lines
- [ ] No nesting > 4 levels (use early returns)
- [ ] No hardcoded values (use constants/config)
- [ ] No mutation (spread/map/filter instead)
- [ ] Proper error handling at every level
