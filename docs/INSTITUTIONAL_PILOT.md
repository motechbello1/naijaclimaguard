# NaijaClimaGuard Institutional Pilot

## Purpose

The institutional pilot is the controlled adoption path for government agencies, emergency-management teams, banks, insurers, reinsurers, telecom operators and other organisations that want to evaluate NaijaClimaGuard in a real workflow before any broader operational commitment.

The pilot does not require an institution to replace its existing warning, response, underwriting, communications or statutory process. NaijaClimaGuard is run beside the existing workflow so usefulness, limitations and integration requirements can be measured directly.

## Current evidence boundary

Riverine Watch v1 is a frozen 14-day riverine flood-onset WATCH model for Lokoja and Makurdi.

The current defensible historical result is:

**4 of 5 eligible historical flood-onset events detected in retrospective testing for Lokoja and Makurdi, equivalent to 80% event detection.**

This must not be presented as 80% accuracy, national validation or prospective public-warning performance.

The current general public risk engine remains `derived-v2`.

## Pilot sequence

1. Scope
   - define locations and users;
   - document the institution's current decision process;
   - identify approved delivery channels;
   - agree the decision or evidence gap the pilot must test;
   - define success and stop criteria before operational review begins.

2. Shadow operation
   - run NaijaClimaGuard beside the existing process;
   - preserve source freshness, model outputs, warnings, actions and evidence;
   - keep statutory warning authority unchanged;
   - do not attach the Riverine Watch 80% result to unsupported locations.

3. Measurement
   - source coverage and freshness;
   - user understanding and workflow usefulness;
   - Riverine Watch event detection and false-warning burden where the supported model is applicable;
   - alert delivery and acknowledgement where a real channel is integrated;
   - reporting, evidence and audit usefulness;
   - operational friction and integration requirements.

4. Close-out
   - promote a proven component;
   - extend the pilot;
   - change the scope;
   - identify engineering or data work required before promotion;
   - or stop the pilot if the evidence does not justify continuation.

## Institution-specific tracks

### Government and emergency agencies

Possible pilot components include shadow early-warning support, command/action workflows, incident evidence, reports and after-action review. NaijaClimaGuard does not replace statutory warning authority.

### Banks, insurers and reinsurers

Possible pilot components include selected-location portfolio screening, API evaluation, reporting and physical-risk context. The pilot does not claim automated underwriting or loss decisions.

### Telecom and delivery partners

Possible pilot components include delivery integration planning, multilingual message workflows, delivery receipt and acknowledgement evidence. SMS, voice, WhatsApp or USSD must not be described as live until the relevant channel is actually integrated, enabled and verified.

## Commercial approach

Institutional pricing is scoped after the number of locations, users, channels, integration requirements, reporting needs and support expectations are known. There is no universal enterprise price or unsupported SLA promise.

## Lead intake

The public application form is available at `/institutional-pilot#apply`.

Applications are saved in the `InstitutionalLead` table. The table has row-level security enabled and no public read policy. The intake API accepts POST requests only and validates the minimum fields required for pilot scoping.

## Scientific protection

The institutional adoption layer must never change the frozen Riverine Watch evidence to make a sales claim stronger. Prospective evidence is accumulated separately. Any future promotion decision should be based on prospective performance and independent review, not on rewriting the retrospective 80% result.
