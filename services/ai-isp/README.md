AI-ISP Service (Design Notes)

Purpose: provide AI-assisted ISP capabilities such as dynamic routing suggestions, local edge inference for content prioritization, and human-in-the-loop support.

Components:
- Inference edge workers (containerized) running on PoPs.
- Control plane coordinating policies for throttling/prioritization.
- Billing and metering for paid plans.

Privacy: prioritize user opt-in for traffic analysis; anonymize metrics; provide on/off toggles.

For now this is a design doc and placeholder; implementation requires clear legal/billing decisions.
