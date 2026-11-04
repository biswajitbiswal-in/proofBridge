# Problem Statement — ProofBridge

## Title
**ProofBridge: Evidence-First Issue Reporting and Resolution**

## Problem
In colleges, hostels, and other shared facilities, people regularly report problems such as broken lights, leaking taps, damaged equipment, sanitation issues, or unsafe walkways. These reports may be scattered across phone calls, messaging groups, paper registers, or informal conversations.

This creates several practical problems:
- Reports can be lost, duplicated, or overlooked.
- Reporters may not know who is responsible or whether work has started.
- Maintenance teams may lack one clear queue of assigned and overdue issues.
- An issue can be marked “completed” without enough evidence that it was actually resolved.
- Repeated problems in the same location may go unnoticed because earlier reports are difficult to find.
- Managers may struggle to understand resolution times, recurring issues, and unresolved work.

The central problem is not only how to report an issue. It is how to make the full journey—from reporting to repair to verification—visible and accountable.

## Proposed Solution
**ProofBridge** is a shared issue-management platform that records each issue, tracks its progress, and separates a repair claim from a verified resolution.

A reporter submits an issue with a description, location, category, and optional photo. A coordinator assigns it to a maintenance worker. The worker records the action taken and submits completion evidence. An authorized reviewer can then:

- **Verify Resolved** — the submitted evidence is sufficient for the reviewer.
- **Request More Evidence** — additional information is needed.
- **Dispute Resolution** — the issue appears unresolved or the evidence is insufficient.

Every status change, note, and evidence submission is shown in an issue timeline. The platform can also flag similar reports from the same location as possible recurring issues for a human to review.

## Target Users
- **Reporters:** students, hostel residents, staff, or facility users.
- **Maintenance staff:** people responsible for investigating and fixing reported issues.
- **Coordinators/reviewers:** authorized people who assign work and review completion evidence.
- **Facility managers:** people who monitor outstanding work and recurring problems.

## Primary Use Case
A hostel resident reports a broken corridor light and attaches a photo. The issue is assigned to maintenance. A worker marks it as fixed but provides unclear evidence. Instead of automatically treating the job as resolved, ProofBridge allows the reviewer to request better evidence or dispute the completion. The worker submits updated evidence, and the reviewer records the final decision. The complete history remains visible to authorized users.

## Expected Benefits
- More transparent issue status and ownership.
- A consistent record of reports, actions, and review decisions.
- Fewer issues silently disappearing between reporting and maintenance.
- Better visibility into overdue work and repeated problems.
- More accountable completion workflows.

These are intended benefits, not proven results. They should be evaluated through user interviews and a small pilot.

## Scope for the Hackathon MVP
The first version will focus on a single campus or hostel workflow and include:
1. Create an issue with a title, description, category, location, and optional image.
2. Generate a unique issue ID and timestamp.
3. Browse, search, and filter issues by status, category, location, and urgency.
4. Assign an issue to a maintenance worker.
5. Record work notes and submit completion evidence.
6. Allow an authorized reviewer to verify, dispute, or request more evidence.
7. Show a chronological activity timeline.
8. Display a dashboard of open, assigned, awaiting verification, verified, disputed, and overdue issues.

AI-based summaries, duplicate suggestions, and recurring-issue detection are optional enhancements. AI must not independently declare that a physical repair has been completed; a human reviewer makes the verification decision.

## What Makes the Approach Useful
ProofBridge focuses on the gap between **“work marked complete”** and **“resolution reviewed.”** Rather than treating a worker's completion update as automatic proof, it provides an explicit evidence-review step and keeps the decision and its context in the issue history.

This is a product hypothesis, not a claim that no existing platform offers similar features. Existing maintenance and complaint-management tools should be researched, and the workflow should be validated with students, facility staff, and campus administrators.

## Success Measures
During a pilot, evaluate:
- Percentage of reports that receive an owner.
- Time from report creation to first response.
- Time from assignment to review.
- Percentage of completion submissions accepted on the first review.
- Number of issues reopened or disputed.
- Number of recurring issues identified and confirmed by staff.
- User satisfaction among reporters and maintenance teams.

Define each metric consistently before collecting results. Do not present demo data as real-world impact.

## One-Sentence Summary
**ProofBridge helps campuses track facility problems from the first report to evidence-reviewed resolution, making responsibility, progress, and unresolved issues easier to see.**
