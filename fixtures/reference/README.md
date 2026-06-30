# Reference exemplar — NOT ground truth

`good-form.json` is a hardcoded `PoseFrame[]` representing one clean, side-on
jump shot. It is the "ghost" the analysis layer aligns against and compares to.

It is a **reference exemplar, not ground truth.** Good form varies with height
and build; this is a single plausible clean shot, not the One True Shot. The
analysis layer treats it as a reference band, not gospel. Person B's optional
Nebius reference-builder may later write an improved exemplar to
`fixtures/reference/generated/` — adopting it is a joint call, because Person A's
flaw thresholds are tuned against this file.
