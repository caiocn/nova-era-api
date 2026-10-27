## Summary

<!-- Explain the user/problem outcome, not only code changes. -->

## Compatibility and migration impact

<!-- Routes, payloads, events, environment variables, database providers, existing sessions, or "None". -->

## Validation

- [ ] `npm test`
- [ ] `npm run lint:check`
- [ ] `npm run build`
- [ ] Docker/Compose validation when infrastructure changed
- [ ] Authorized external integration testing when claimed

<!-- List exact commands/results and explicitly state what was not tested. -->

## Security and data handling

- [ ] No secrets, session credentials, phone numbers or customer data were added to the diff.
- [ ] Authorization and instance isolation impacts were reviewed.
- [ ] New/changed external input has validation.

## Documentation

- [ ] Documentation/changelog updated where behavior, compatibility or operations changed.
- [ ] No unsupported feature is presented as validated.
