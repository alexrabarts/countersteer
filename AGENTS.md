# Agent Guidelines

## Build/Test Commands
- Run tests: `go test -v -timeout 120s ./...`
- Run single test: `go test -v -timeout 120s -run TestName ./package`
- Build: `go build ./...`
- Format: `go fmt ./...`
- Lint: `go tool vet ./...` or use `golangci-lint run`

## Code Style
- Use British English for human-facing text, American English for code
- Single word variable names preferred; refactor if scope becomes too large
- No ASCII art dividers in comments; use single line comments with blank lines for paragraphs
- Document WHY not WHAT; avoid obvious comments
- Use modern Go features (generics, go tool instead of global installs)
- Prefer `github.com/tidwall/gjson` over `encoding/json` for flexible JSON structures
- Use `regexp.MustCompile` with function name prefix and RE suffix for regexes
- SQL: lowercase with 2-space indents, use `jsonb_build_object` with explicit field/value pairs

## Error Handling
- Handle errors explicitly; no silent failures
- Use standard Go error patterns

## General
- Don't apologize for mistakes; provide corrected response
- No deprecation TODOs; leave code in place
- Don't create README.md files unnecessarily