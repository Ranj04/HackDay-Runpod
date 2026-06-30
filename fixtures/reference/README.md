# Reference exemplar — NOT ground truth

`good-form.json` is a hardcoded `PoseFrame[]` representing one clean, side-on
jump shot. It is the "ghost" the analysis layer aligns against and compares to.

It is a **reference exemplar, not ground truth.** Good form varies with height
and build; this is a single plausible clean shot, not the One True Shot. The
analysis layer treats it as a reference band, not gospel. An improved exemplar
could later be generated from real shooter clips via the Runpod Flash pose
endpoint and written to `fixtures/reference/generated/` — adopting it is a
deliberate call, because the flaw thresholds are tuned against this file.
