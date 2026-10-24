# ProofBridge — Product Requirements Document (PRD)

**Document status:** Draft for hackathon MVP  
**Product name:** ProofBridge  
**Tagline:** From reported problems to verified outcomes.  
**Initial target market:** College campuses, hostels, and small facility-management teams  
**Primary use case:** Reporting maintenance issues, recording corrective actions, and reviewing whether the reported issue has been resolved  
**Build constraint:** Development workflow for the Hacker House Goa Wispr Flow challenge should be voice-driven with Wispr Flow, following the event's current rules.

---

## 1. Executive Summary

ProofBridge is an evidence-first issue-resolution platform for organizations such as colleges, hostels, and facilities teams. It helps users report a problem, helps responsible staff document corrective action, and gives an authorized reviewer a clear way to accept the evidence, dispute the claimed resolution, or request more information.

The central product distinction is that **“repair claimed” and “resolution verified” are separate states**. ProofBridge preserves an activity history and helps organizations identify potentially recurring issues at the same location.

ProofBridge is not a replacement for government grievance systems, emergency services, or a full enterprise facility-management suite. The initial MVP will focus on a small, testable maintenance workflow.

## 2. Problem Statement

In small organizations, maintenance issues may be reported through informal messages, calls, paper forms, or disconnected tools. This can make it difficult to:

- Keep a consistent record of the original issue and supporting evidence.
- See who is responsible for the next action.
- Distinguish a claimed repair from a reviewed outcome.
- Handle a disputed or incomplete repair.
- Find earlier incidents when a similar problem returns.
- Understand which issues remain open or overdue.

These are **problem hypotheses to validate** through interviews with students, maintenance staff, and administrators. ProofBridge must not claim that all existing systems have these shortcomings.

## 3. Product Vision

Make it easier for an organization to answer:

1. What problem was reported?
2. Who is responsible for addressing it?
3. What action was taken?
4. What evidence supports the claimed repair?
5. Was the outcome reviewed?
6. Has a similar problem occurred before?

## 4. Goals and Non-Goals

### 4.1 MVP goals

- Allow a reporter to submit a structured issue with a description and optional photograph.
- Generate a unique report ID.
- Store the issue and its activity history persistently.
- Let authorized staff accept and update assigned work.
- Allow staff to submit repair notes and completion evidence.
- Require an authorized reviewer to verify, dispute, or request more evidence before a report reaches `Verified Resolved`.
- Display reports in a searchable, filterable workspace.
- Identify potential recurring issues based on location and category, with human confirmation.
- Demonstrate a complete end-to-end workflow with clearly labelled sample data.

### 4.2 Non-goals for the hackathon MVP

- Replacing government grievance portals or official reporting channels.
- Automatically contacting authorities or dispatching emergency services.
- Automatically proving that a photograph is genuine or that a physical repair succeeded.
- Using blockchain as a core dependency.
- Building a general-purpose enterprise asset-management system.
- Training a custom AI model.
- Claiming measured real-world impact before a pilot provides evidence.
- Making all reports public by default.

## 5. Target Users and Roles

### 5.1 Reporter
A student, resident, or staff member who submits an issue and follows its progress.

### 5.2 Maintenance staff
A person assigned to investigate or repair an issue. They can update work status and attach completion notes and evidence.

### 5.3 Administrator / reviewer
A designated person who manages assignments, oversees reports, reviews evidence, disputes insufficient repairs, and views organization-level analytics.

For the MVP, use a simple role selector or seeded demo accounts if needed, but label any simulated authentication clearly. A production deployment must use real authentication and server-enforced permissions.

## 6. Core User Journeys

### Journey A — Report an issue
1. Reporter opens **Report an Issue**.
2. Enters a short title and description.
3. Selects a category, location, and urgency.
4. Optionally attaches a photograph.
5. Submits the report.
6. The system validates the form, creates a unique report ID, saves the report, and shows a confirmation screen.
7. The report appears in the issue list and the reporter's reports.

### Journey B — Address an issue
1. Maintenance staff opens assigned work.
2. Reviews the original description and evidence.
3. Updates the work status.
4. Records the action taken.
5. Uploads completion evidence, where available.
6. Submits the repair for review.
7. The report changes to `Awaiting Verification`, not `Verified Resolved`.

### Journey C — Verify or dispute a repair
1. Reviewer opens the Verification Center.
2. Compares the original issue with the completion notes and evidence.
3. Selects one of:
   - `Verified Resolved`
   - `Resolution Disputed`
   - `More Evidence Required`
4. If disputed or more evidence is required, the reviewer must enter a reason.
5. The system records the decision, reviewer, timestamp, and reason in the activity history.
6. A disputed issue returns to an actionable state and remains visible to the assigned team.

### Journey D — Identify a recurring issue
1. A new issue is submitted for a location.
2. The system checks for earlier reports with the same or similar location and category.
3. It displays possible related incidents.
4. An authorized user confirms or dismisses the suggested relationship.
5. Confirmed related reports appear in a recurring-issue view.

## 7. Functional Requirements

Priority labels:
- **P0:** Required for the MVP.
- **P1:** Important if time allows.
- **P2:** Later enhancement.

### FR-01 — Issue submission (P0)
- Provide fields for title, description, category, location, urgency, and optional image.
- Required fields must be validated.
- Generate a unique, human-readable report ID, such as `PB-1042`.
- Record creation time and reporter identity or demo identity.
- Show clear success and validation messages.
- Prevent accidental duplicate submissions caused by repeated clicks where practical.

### FR-02 — Evidence upload and display (P0)
- Support an image preview before submission.
- Validate allowed file types and size on the client.
- Store image metadata and a reference to the stored file.
- Display original and completion evidence separately.
- Show whether evidence is user-submitted, staff-submitted, or reviewer-verified.
- Do not label an image as authentic merely because it has a timestamp or hash.

### FR-03 — Issue list and search (P0)
- List reports with ID, title, category, location, urgency, status, and last-updated time.
- Search by report ID, title, or description.
- Filter by category, status, urgency, and location.
- Include empty states and useful error states.
- Make the list responsive on mobile and desktop.

### FR-04 — Issue details and activity timeline (P0)
- Display the original report and evidence.
- Show current status, assignment, repair notes, and verification outcome.
- Record status changes and key actions with actor and timestamp.
- Preserve the original report and prior decisions in the history.
- For production, historical events should be append-only or otherwise protected against unauthorized alteration.

### FR-05 — Assignment and work updates (P0)
- Allow an administrator to assign an issue to a maintenance user.
- Allow assigned staff to update work status and add notes.
- Record who changed the status and when.
- Prevent unauthorized roles from performing restricted actions.

### FR-06 — Resolution verification (P0; core differentiator)
- A staff member's completion action moves the report to `Awaiting Verification`.
- Only an authorized reviewer can set `Verified Resolved`.
- Reviewer can accept, dispute, or request additional evidence.
- A reason is required for dispute and additional-evidence decisions.
- A disputed report must return to an actionable status.
- The UI must clearly distinguish `Repair Claimed` from `Verified Resolved`.

### FR-07 — Role-based permissions (P0)
- Reporter: submit reports and view reports permitted by organization policy.
- Maintenance staff: view assigned work, update permitted work states, submit repair notes and evidence.
- Administrator/reviewer: assign work, review evidence, manage categories and view organization analytics.
- Production authorization must be enforced on the server, not only hidden in the frontend.

### FR-08 — Recurring issue suggestions (P1)
- Suggest potentially related issues using location and category, with optional text similarity.
- Show the earlier report IDs and dates that led to the suggestion.
- Require a human to confirm or dismiss the relationship.
- Do not automatically claim that two reports share the same root cause.

### FR-09 — Dashboard and analytics (P1)
Display:
- Total reports.
- Open issues.
- Issues awaiting action.
- Repairs awaiting verification.
- Verified resolutions.
- Disputed resolutions.
- Overdue issues, if a due-date policy is configured.
- Potentially recurring issues.

Possible charts:
- Issues by category.
- Issues by location.
- Time to first response.
- Time from submission to claimed repair.
- Time from submission to verified resolution.
- Dispute rate.

All metrics must have documented definitions. Use clearly labelled sample data in a demo.

### FR-10 — Voice-friendly reporting (P1)
- Make text fields work well with operating-system or Wispr Flow dictation.
- Use clear labels and keyboard accessibility.
- Voice input is an input method, not a claim that ProofBridge is an emergency-response service.
- A dedicated in-app speech-recognition integration is optional and should not block the MVP.

### FR-11 — Demo data (P0)
- Provide clearly labelled sample reports so judges can explore the application immediately.
- Separate sample data from real user submissions.
- Provide a reliable way to reset the demo state.
- Never present fabricated reports or results as real-world impact.

## 8. Proposed Status Model

Use a clear, controlled status model:

1. `Submitted`
2. `Under Review`
3. `Assigned`
4. `In Progress`
5. `Awaiting Verification`
6. `Resolution Disputed`
7. `More Evidence Required`
8. `Verified Resolved`

Expected transitions:
- `Submitted` → `Under Review`
- `Under Review` → `Assigned`
- `Assigned` → `In Progress`
- `In Progress` → `Awaiting Verification`
- `Awaiting Verification` → `Verified Resolved`
- `Awaiting Verification` → `Resolution Disputed`
- `Awaiting Verification` → `More Evidence Required`
- `Resolution Disputed` → `In Progress` or `Assigned`
- `More Evidence Required` → `In Progress` or `Awaiting Verification`

An administrator may need a documented exception path for reports submitted in error. Any cancellation or closure should be recorded in the timeline with a reason. Do not allow a direct status edit to bypass verification.

## 9. Main Application Pages

1. **Landing page** — Product purpose, how it works, and a clear call to report an issue.
2. **Report an Issue** — Submission form and image preview.
3. **Issues Explorer** — Searchable and filterable list.
4. **Issue Details** — Evidence, assignment, activity timeline, and verification outcome.
5. **My Reports** — Reports submitted by the current user.
6. **Maintenance Workspace** — Assigned work, updates, and repair evidence submission.
7. **Verification Center** — Reports awaiting review and disputed resolutions.
8. **Analytics Dashboard** — Issue and resolution metrics.
9. **Organization Settings** — Users, roles, categories, locations, and workflow settings; basic settings can be deferred.

## 10. Non-Functional Requirements

### Usability
- Responsive desktop and mobile layouts.
- Clear status labels and simple forms.
- Accessible contrast, focus states, labels, and keyboard navigation.
- Important actions must provide confirmation and useful error messages.

### Performance
- Common list and detail views should feel responsive on ordinary devices.
- Image previews should be appropriately sized.
- Large datasets and images should not be loaded unnecessarily.

### Reliability
- Submitted reports must persist after refresh.
- Failed submissions must show an error and not falsely claim success.
- The UI should handle missing images, empty lists, and unavailable records.

### Security and privacy
- Collect only the information needed to resolve an issue.
- Do not expose private reports, personal details, or sensitive location information publicly by default.
- Use server-enforced role permissions in a production build.
- Validate uploads and restrict allowed file types and sizes.
- Store secrets in environment variables, never in client-side code.
- Use secure storage and access policies for evidence files.
- Record important actions for accountability.
- Provide a way to correct or remove personal information where required by applicable policy and law.

### Integrity
- Keep original evidence separate from later evidence.
- Record who uploaded evidence and when it was submitted.
- A content hash may help detect whether a stored file has changed, but it does not establish that the file is genuine or that a repair succeeded.
- Describe the history as tamper-evident only to the extent the implementation actually supports that claim.

## 11. Recommended Technical Approach

### Hackathon prototype
- Frontend: React + Vite.
- Styling: Tailwind CSS.
- Icons: Lucide React.
- Prototype storage: browser local storage only if the demo runs in one browser and is explicitly labelled as a local prototype.

### Multi-user MVP
- Frontend: React + Vite.
- Database and authentication: Supabase/PostgreSQL or an equivalent managed service.
- Evidence: private object storage with access policies.
- Authorization: server/database-enforced policies for each role.
- Deployment: a suitable frontend host and managed backend.

Do not rely on local storage for a real multi-user workflow: it does not synchronize records across users or provide adequate access control.

## 12. AI Use

AI is optional in the initial core workflow. Add it only where it reduces effort without weakening trust.

Potential additions:
- Suggested issue category.
- Short summary of a long report.
- Potential duplicate suggestions.
- Suggested maintenance team.

Requirements:
- Show suggestions as suggestions.
- Let users correct them.
- Do not allow AI to verify a repair automatically.
- Do not use an AI-generated urgency score as the sole basis for safety-critical decisions.
- Avoid sending sensitive information to external AI services without appropriate consent and safeguards.

## 13. Success Metrics

### MVP usability metrics
- A user can submit a report without assistance.
- A report can be assigned and updated end to end.
- A reviewer can verify, dispute, or request more evidence.
- The complete activity history remains visible after refresh.
- Search and filters return the expected reports.
- Potential recurring reports can be linked by a human reviewer.

### Pilot metrics
Measure these only after a real pilot:
- Median time to first response.
- Median time to claimed repair.
- Median time to verified resolution.
- Percentage of claimed repairs disputed.
- Percentage of reports with complete evidence.
- Number of recurring incidents identified.
- Staff time required to process a report.
- User and staff satisfaction.

Do not claim that ProofBridge improves these metrics until baseline and post-pilot measurements support the claim.

## 14. MVP Acceptance Criteria

The MVP is ready for a live demonstration when:

- [ ] A reporter can submit a valid issue with an optional image.
- [ ] Each issue receives a unique report ID.
- [ ] The issue persists after the page is refreshed.
- [ ] The issue appears in the list and can be searched and filtered.
- [ ] A staff member can be assigned and can submit repair notes and evidence.
- [ ] The report moves to `Awaiting Verification` after completion is claimed.
- [ ] A reviewer can verify, dispute, or request more evidence.
- [ ] Dispute and additional-evidence decisions require a reason.
- [ ] Every major action appears in the activity timeline.
- [ ] A potentially recurring issue can be surfaced without falsely asserting a shared root cause.
- [ ] Sample records are labelled as demo data.
- [ ] The application has no dead core-action buttons or misleading success messages.
- [ ] The demo works at desktop and mobile viewport sizes.
- [ ] The development process is recorded in accordance with the current event rules.

## 15. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Existing products already offer similar workflows | Validate the specific target segment and workflow before claiming novelty. |
| Reviewers rubber-stamp repairs | Show the original issue beside completion evidence and record review reasons. |
| Fake or misleading photos | Label evidence by source; do not claim a hash proves authenticity. |
| Duplicate detection incorrectly merges incidents | Suggest matches and require human confirmation. |
| Sensitive information is exposed | Default reports to appropriate access controls; minimize personal data. |
| Scope becomes too large | Complete the P0 workflow before optional AI and analytics. |
| Demo data is mistaken for real impact | Clearly label sample records and explain that pilot outcomes are not yet measured. |
| Wispr Flow build process is not demonstrated clearly | Record genuine voice-driven development and testing in line with event rules. |

## 16. Suggested Build Plan

### Phase 1 — Core interface
- Landing page.
- Navigation and responsive layout.
- Issue list and issue details using labelled sample data.

### Phase 2 — Reporting
- Submission form.
- Image preview.
- Unique report ID.
- Persistent storage.

### Phase 3 — Resolution workflow
- Assignment.
- Staff notes and completion evidence.
- Verification Center.
- Dispute and additional-evidence paths.
- Activity timeline.

### Phase 4 — Differentiation
- Potential recurring-issue suggestions.
- Dashboard metrics with clear definitions.
- Role-based permissions appropriate to the selected backend.

### Phase 5 — Quality and demo
- Test the full workflow.
- Test invalid inputs and failure states.
- Check responsive layouts and accessibility.
- Remove dead buttons and misleading claims.
- Prepare a concise scenario demonstrating a disputed repair followed by a verified resolution.

## 17. Demo Script

Use clearly labelled sample data.

1. Submit a broken-light report with a photograph.
2. Show the unique report ID and the report in the issue list.
3. Assign it to maintenance.
4. Submit completion evidence.
5. Show that the status becomes `Awaiting Verification`.
6. As the reviewer, dispute the evidence and explain why.
7. Show the decision and reason in the activity timeline.
8. Submit better evidence after further work.
9. Verify the resolution.
10. Show a related earlier report and the recurring-issue suggestion.

The demo should show the product's central distinction: a claimed repair is not the same as a verified outcome.

## 18. Open Questions to Validate

Before treating the product direction as final, interview prospective users and determine:

- How are maintenance issues reported today?
- How are repairs assigned and documented?
- Who decides whether a repair is satisfactory?
- How often are completed repairs disputed or repeated?
- What systems are already in use?
- Who would own and pay for this workflow?
- What privacy or operational constraints apply?
- Would a pilot organization agree to test the product?

## 19. Product Positioning

**ProofBridge is an evidence-first maintenance resolution platform that helps organizations track reported problems, document corrective action, review claimed repairs, and identify recurring incidents.**

Its core promise is not that it guarantees every issue is fixed. Its promise is that the process from report to claimed repair to reviewed outcome is easier to follow and audit.

---

**End of PRD**
