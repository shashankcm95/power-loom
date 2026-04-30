# Development Workflow

## Git Conventions

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Branch naming: `feat/short-description`, `fix/short-description`
- PRs should be reviewable in one sitting (< 400 lines changed when possible)
- Never force-push to shared branches without explicit confirmation

## Testing Expectations

- Test new code paths — untested code is unfinished code
- 80%+ coverage for critical paths (auth, payments, data mutations)
- Integration tests for data flows crossing boundaries (API → DB → response)
- Run the full test suite before marking work complete

## Code Review Standards

- No self-merge on shared repositories
- Review checklist: security → correctness → performance → readability
- Only flag issues you are > 80% confident about
- Consolidate similar findings (not 5 separate "missing error handling" notes)

## Deploy Checklist

- [ ] All tests pass
- [ ] DB migrations tested and reversible
- [ ] Environment variables set in target environment
- [ ] No console.log / debugger statements
- [ ] Bundle size checked for regressions
- [ ] Rollback plan documented
- [ ] Monitoring and alerting verified
