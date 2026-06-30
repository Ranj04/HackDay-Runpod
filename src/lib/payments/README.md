# Kite form-battle settlement

Current mode: **labeled simulation on `kite-testnet`**.

The battle validates two distinct demo agent identities, enforces each agent's
user-set spending limit, scores both sample captures through the same
`AnalyzeShot` implementation, and probes Kite's live x402 testnet challenge.

No funded Kite Passport account, registered agent, or passkey-approved spending
session is configured in this workspace. Consequently:

- no authorization signature is fabricated;
- `/v2/settle` is not called;
- `txHash` is always `null`;
- the UI says `SIMULATED — NO ON-CHAIN TX`.

A real settlement requires `kpass` authentication, faucet-funded testnet USDC,
agent registration, and a user-approved `x402_http` spending session.
