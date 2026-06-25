# AORMS External Portals Architecture

## Site Supervisor, Client, Consultant & Contractor Portals

**Design System:** Material Design 3 / Material UI  
**Platform Strategy:** Browser-first, mobile-first PWA  
**Core Product:** AORMS — Architecture Office Resource Management System  
**Primary Goal:** Keep the internal office portal powerful, while giving external users simple, role-specific, mobile-friendly portals.

---

# 1. Architecture Decision

AORMS should use two design directions:

```text
Internal Office Portal        → Carbon Design System, desktop-first
External / Field Portals      → Material Design 3 / Material UI, mobile-first
```

This avoids forcing one design system everywhere.

Carbon is strong for internal dashboards, tables, operational control, and desktop-heavy office users.
Material Design 3 is better for site supervisors, clients, contractors, and consultants who mostly use phones.

---

# 2. Portal Separation Strategy

AORMS should not treat all users as one interface with different permissions.  
That becomes messy very fast.

Instead, create separate portals with shared backend services.

```text
AORMS Platform
│
├── Office Portal
│   └── Internal team / architects / admin / accounts / management
│
├── Site Supervisor Portal
│   └── Site progress, photo updates, work status, issue reporting
│
├── Client Portal
│   └── Approvals, revisions, comments, documents, project visibility
│
├── Contractor Portal
│   └── Work orders, measurements, bills, RFIs, execution submissions
│
└── Consultant Portal
    └── Drawing review, technical comments, document coordination
```

Each portal should have:

- Separate route namespace
- Separate UI shell
- Separate permission model
- Shared authentication layer
- Shared project data access layer
- Shared notification system
- Shared document/drawing repository

---

# 3. Recommended URL Structure

```text
app.aorms.in                  → Office Portal
site.aorms.in                 → Site Supervisor Portal
client.aorms.in               → Client Portal
contractor.aorms.in           → Contractor Portal
consultant.aorms.in           → Consultant Portal
```

Alternative monorepo routing:

```text
aorms.in/app                  → Office Portal
aorms.in/site                 → Site Supervisor Portal
aorms.in/client               → Client Portal
aorms.in/contractor           → Contractor Portal
aorms.in/consultant           → Consultant Portal
```

Recommended: use subdomains later for cleaner branding and access control.

---

# 4. Technology Stack

## 4.1 Frontend

```text
Framework        → React / Next.js
UI System        → Material UI with Material Design 3 styling
State            → Zustand / Redux Toolkit / TanStack Query
Forms            → React Hook Form + Zod
Tables           → Material React Table / MUI Data Grid
PWA              → Workbox / next-pwa
Icons            → Material Symbols / MUI Icons
Charts           → Recharts / ECharts
File Upload      → Uppy / custom uploader
Camera Capture   → Browser Media APIs
PDF Viewer       → PDF.js
Drawing Viewer   → DWG/DXF converted viewer or web CAD viewer
```

## 4.2 Backend

```text
API Layer         → Node.js / NestJS / FastAPI
Database          → PostgreSQL
Cache             → Redis
File Storage      → S3-compatible object storage
Queue             → BullMQ / RabbitMQ / Kafka
Search            → OpenSearch / Meilisearch
Vector Search     → Qdrant / pgvector
Notifications     → Email / WhatsApp / Push / In-app
Auth              → JWT + Refresh Tokens / OAuth where needed
```

## 4.3 PWA Features

```text
Install to home screen
Offline draft saving
Background sync
Push notifications
Camera upload
Location tagging
Low-bandwidth mode
Auto-save forms
```

---

# 5. Shared Design Token Layer

Even though Carbon and Material UI are different, AORMS must feel like one product.

Create a shared token package:

```text
@aorms/design-tokens
│
├── colors
├── typography
├── spacing
├── radius
├── elevation
├── status colors
├── icons
├── motion
└── component density rules
```

## 5.1 Common Status Language

Avoid panic-heavy red dashboards. Use calm but clear status language.

```text
On Track        → neutral / positive
Attention       → mild warning
Blocked         → serious issue
Delayed         → timeline risk
Approved        → completed decision
Revision Needed → client/consultant action required
Submitted       → waiting for review
Rejected        → requires correction
```

## 5.2 Mobile UI Principles

```text
One task per screen
Large tap targets
Bottom navigation for primary actions
Floating action button for quick updates
Avoid dense tables on mobile
Use cards instead of grids
Use timeline instead of spreadsheet-like views
Use progressive disclosure
Use photo-first interaction for site updates
```

---

# 6. Site Supervisor Portal Architecture

## 6.1 Purpose

The Site Supervisor Portal is the field execution interface of AORMS.

The supervisor should be able to:

- View assigned projects
- See today’s tasks
- Update work progress
- Upload site photos
- Mark component-wise completion
- Report blockers
- Raise site issues
- Confirm measurements
- Track drawing revisions affecting site work
- Receive alerts when dependent components are missing or outdated

This portal must be extremely simple.  
The supervisor should not feel like he is filling ERP data.  
He should feel like he is updating the site diary.

---

## 6.2 Site Supervisor Navigation

```text
Bottom Navigation
│
├── Today
├── Tasks
├── Drawings
├── Updates
└── More
```

## 6.3 Main Screens

```text
Site Supervisor Portal
│
├── Login / OTP
├── Project Selector
├── Today Dashboard
├── Assigned Tasks
├── Component Progress Update
├── Drawing Revision Alerts
├── Site Photo Upload
├── Daily Site Report
├── Measurement Confirmation
├── Issue / Blocker Reporting
├── Material Received Log
├── Labor Attendance Log
├── Contractor Work Verification
├── Notifications
└── Offline Drafts
```

---

## 6.4 Today Dashboard

The dashboard should show only what matters today.

### Cards

```text
Today's Priority Tasks
Blocked Tasks
Pending Progress Updates
Drawings Recently Revised
Contractor Work To Verify
Measurements Pending
Material Arrival Expected
```

### Example UX

```text
Good morning, Ravi.
3 tasks need update today.
1 drawing revision affects site work.
2 contractor submissions need verification.
```

---

## 6.5 Task Progress Update Flow

```text
Open Task
│
├── View task name
├── View drawing reference
├── View component
├── View dependency status
├── Update progress slider
├── Add photos
├── Add remarks
├── Mark blocker if any
└── Submit update
```

## 6.6 Progress Slider Logic

Use controlled milestones instead of free typing.

```text
0%      → Not Started
25%     → Started
50%     → In Progress
75%     → Nearly Complete
100%    → Complete
```

Optional manual percentage should be available for advanced users.

---

## 6.7 Component-Based Progress

Every site update should map to a project component.

```text
Project
└── Drawing
    └── Component
        └── Execution Task
            └── Progress Update
```

Example:

```text
Project: Residence A
Drawing: Ground Floor Interior Layout
Component: TV Unit Wall
Task: Electrical chasing for TV unit
Progress: 50%
Photos: 3
Remarks: Conduits laid, box fixing pending
```

---

## 6.8 Dependency Alert Logic

If a drawing is revised and related dependency progress is missing, the supervisor must be alerted.

Example:

```text
TV Unit drawing revised
│
├── Wall status missing
├── Electrical conduit not updated
├── Flooring status unknown
└── Painting status not confirmed
```

System action:

```text
Notify supervisor:
"Drawing revision affects TV Unit Wall. Please update wall, electrical, flooring, and painting status."
```

---

## 6.9 Site Photo Capture

Every photo should store:

```text
Photo ID
Project ID
Task ID
Component ID
Uploaded by
Timestamp
GPS location if allowed
Drawing reference
Progress percentage
Remarks
Before / During / After tag
```

Photo types:

```text
Progress Photo
Issue Photo
Material Photo
Measurement Photo
Completion Photo
Damage Photo
Safety Photo
```

---

## 6.10 Daily Site Report

Auto-generate daily report from supervisor activity.

```text
Daily Site Report
│
├── Date
├── Project
├── Weather optional
├── Work completed
├── Work in progress
├── Labor count
├── Material received
├── Contractor activity
├── Issues raised
├── Photos uploaded
└── Pending actions
```

Supervisor should not write full reports manually.  
The system should compile it from structured updates.

---

## 6.11 Offline Mode

Site areas may have poor connectivity.

Support:

```text
Offline task view
Offline photo capture
Offline progress draft
Offline issue draft
Auto sync when internet returns
Conflict warning if drawing changed while offline
```

---

# 7. Client Portal Architecture

## 7.1 Purpose

The Client Portal is not an ERP screen.  
It is a clean project visibility and approval space.

Client should be able to:

- View project status
- Review drawings/documents
- Approve or request changes
- See revision history
- Track pending decisions
- See bills/payment milestones if enabled
- Comment on specific drawings/documents
- Upload reference images/documents

---

## 7.2 Client Navigation

```text
Bottom Navigation
│
├── Home
├── Approvals
├── Documents
├── Updates
└── More
```

---

## 7.3 Main Screens

```text
Client Portal
│
├── Login / OTP
├── Project Overview
├── Pending Approvals
├── Drawing Viewer
├── Document Viewer
├── Revision Requests
├── Comments
├── Project Timeline
├── Billing / Payment Milestones optional
├── Uploaded References
├── Notifications
└── Profile
```

---

## 7.4 Client Project Overview

Show simple status, not internal chaos.

```text
Project Health
Current Stage
Pending Client Decisions
Recently Issued Drawings
Upcoming Milestones
Open Revision Requests
Payment Milestones optional
```

Avoid showing internal team pressure, HR, workload, or sensitive cost intelligence.

---

## 7.5 Approval Flow

```text
Client opens drawing/document
│
├── View latest version
├── Compare previous version optional
├── Add comment
├── Attach reference if needed
├── Choose action
│   ├── Approve
│   ├── Approve with minor comments
│   └── Request revision
└── Submit
```

---

## 7.6 Revision Request Data Model

```text
Revision Request
│
├── Project ID
├── Drawing / Document ID
├── Version ID
├── Client ID
├── Comment
├── Attachment
├── Category
│   ├── Design Change
│   ├── Functional Change
│   ├── Budget Concern
│   ├── Material Preference
│   ├── Technical Clarification
│   └── Other
├── Billable flag visible only if enabled
├── Timeline impact visible only after internal review
└── Status
```

---

## 7.7 Client-Facing Revision Dashboard

Simple charts:

```text
Revision Requests
│
├── Requested by Client
├── Changes by Architect
├── Technical Issues
├── Budget / Cost Changes
└── Other
```

The goal is transparency without blaming anyone.

---

# 8. Contractor Portal Architecture

## 8.1 Purpose

Contractor Portal should standardize contractor submissions.

Contractors should be able to:

- View assigned work orders
- View drawings issued for work
- Submit measurements
- Submit running bills
- Upload site photos
- Raise RFIs
- Track bill status
- Receive rejection comments
- Submit revised bills

---

## 8.2 Contractor Navigation

```text
Bottom Navigation
│
├── Work Orders
├── Bills
├── Measurements
├── RFIs
└── More
```

---

## 8.3 Main Screens

```text
Contractor Portal
│
├── Login / OTP
├── Work Order List
├── Work Order Detail
├── Drawing Access
├── Measurement Submission
├── Running Bill Submission
├── Bill Status Tracker
├── RFI Submission
├── Material / Work Photo Upload
├── Rejection / Correction Comments
├── Payment Status optional
└── Notifications
```

---

## 8.4 Work Order Detail

```text
Work Order
│
├── Scope of work
├── BOQ items
├── Rates
├── UOM
├── Quantity
├── Drawings linked
├── Start date
├── Target completion date
├── Terms
└── Submission requirements
```

---

## 8.5 Measurement Submission

```text
Measurement Entry
│
├── Work order
├── BOQ item
├── Location
├── Drawing reference
├── Length
├── Breadth
├── Height / Depth
├── Number
├── Quantity auto-calculated
├── Photo evidence
├── Remarks
└── Submit
```

System must prevent duplicate billing.

```text
Same BOQ item + same location + same component + same measurement range
→ Flag as possible duplicate
```

---

## 8.6 Running Bill Flow

```text
Contractor submits bill
│
├── Select approved measurements
├── System calculates amount
├── Contractor uploads invoice optional
├── Submit bill
├── Site supervisor verifies
├── Architect / QS reviews
├── Accounts approves
└── Payment status updated
```

---

## 8.7 RFI Flow

```text
Raise RFI
│
├── Select project
├── Select drawing/component
├── Ask question
├── Attach photo/document
├── Mark urgency
└── Submit
```

RFI should route to:

```text
Architect
Consultant
Project Manager
Site Supervisor
```

based on category.

---

# 9. Consultant Portal Architecture

## 9.1 Purpose

Consultants need controlled access to drawings, documents, review comments, and technical coordination.

Consultants should be able to:

- View assigned projects
- Access relevant drawings/documents
- Comment on drawings
- Upload consultant drawings/reports
- Respond to RFIs
- Review coordination issues
- Track pending actions

---

## 9.2 Consultant Navigation

```text
Bottom Navigation / Responsive Sidebar
│
├── Projects
├── Reviews
├── RFIs
├── Documents
└── More
```

---

## 9.3 Main Screens

```text
Consultant Portal
│
├── Login
├── Assigned Projects
├── Pending Reviews
├── Drawing Viewer
├── Document Upload
├── Technical Comments
├── RFI Response
├── Coordination Issues
├── Version History
└── Notifications
```

---

## 9.4 Review Flow

```text
Consultant opens drawing/document
│
├── View latest issued version
├── Add technical comments
├── Mark status
│   ├── Reviewed
│   ├── Reviewed with comments
│   ├── Revise and resubmit
│   └── Not applicable
├── Attach marked-up PDF/DWG if needed
└── Submit response
```

---

# 10. Shared Backend Services

All portals should consume the same backend services.

```text
Shared AORMS Services
│
├── Auth Service
├── User & Role Service
├── Project Service
├── Drawing Service
├── Document Service
├── Task Service
├── Component Service
├── Progress Service
├── Revision Service
├── Notification Service
├── Billing Service
├── Measurement Service
├── RFI Service
├── Audit Log Service
└── AI Assistance Service
```

---

# 11. Role-Based Access Control

## 11.1 Role Types

```text
Internal Roles
├── Owner
├── Admin
├── Architect
├── Project Manager
├── QS / Estimator
├── Accountant
├── Site Supervisor
└── Junior Team Member

External Roles
├── Client
├── Contractor
├── Consultant
└── Vendor optional
```

## 11.2 Permission Model

Use project-scoped permissions.

```text
User can access only:
- Assigned projects
- Assigned drawings
- Assigned documents
- Assigned tasks
- Assigned work orders
```

Do not expose office-wide information to external users.

---

# 12. Notification Architecture

## 12.1 Channels

```text
In-app notification
Email
WhatsApp optional
Push notification for PWA
SMS optional
```

## 12.2 Events That Trigger Notifications

```text
Drawing revised
Task blocked
Progress update missing
Client approval pending
Contractor bill submitted
Measurement rejected
Consultant comment received
RFI raised
RFI answered
Payment milestone due
Site issue reported
```

## 12.3 Notification Routing Example

```text
Drawing revision uploaded
│
├── Notify internal project team
├── Notify site supervisor if drawing affects active site work
├── Notify client if issued for approval
├── Notify consultant if technical review needed
└── Notify contractor if work order drawing changed
```

---

# 13. AI Layer For External Portals

AI should assist quietly.  
Do not make the user feel they are talking to a robot at every step.

## 13.1 Site Supervisor AI

```text
Suggest today's priority updates
Detect missing progress
Flag dependency mismatch
Summarize daily site report
Identify delayed components
Compare photo progress over time
```

## 13.2 Client AI

```text
Explain drawing revision in simple language
Summarize pending approvals
Explain timeline impact
Summarize cost impact after internal approval
```

## 13.3 Contractor AI

```text
Help classify measurement item
Detect duplicate measurement
Suggest BOQ item mapping
Summarize rejection comments
Assist RFI drafting
```

## 13.4 Consultant AI

```text
Summarize coordination conflicts
Extract technical comments
Detect unresolved RFIs
Compare drawing versions
```

---

# 14. Database Entities

## 14.1 Core Entities

```text
User
Organization
Project
Role
Permission
Drawing
Document
Version
Component
Task
Dependency
ProgressUpdate
Photo
Issue
RFI
Comment
Approval
WorkOrder
BOQItem
Measurement
RunningBill
Invoice
Notification
AuditLog
```

---

## 14.2 Site Progress Entity

```json
{
  "id": "progress_001",
  "project_id": "project_001",
  "drawing_id": "drawing_001",
  "component_id": "component_001",
  "task_id": "task_001",
  "updated_by": "user_site_supervisor_001",
  "progress_percent": 50,
  "status": "in_progress",
  "remarks": "Electrical conduit completed. Box fixing pending.",
  "photos": ["photo_001", "photo_002"],
  "created_at": "2026-06-25T10:00:00+05:30"
}
```

---

## 14.3 Client Approval Entity

```json
{
  "id": "approval_001",
  "project_id": "project_001",
  "document_id": "drawing_001",
  "version_id": "v03",
  "client_id": "client_001",
  "status": "revision_requested",
  "comment": "Please increase wardrobe storage in master bedroom.",
  "category": "design_change",
  "submitted_at": "2026-06-25T10:00:00+05:30"
}
```

---

## 14.4 Contractor Measurement Entity

```json
{
  "id": "measurement_001",
  "project_id": "project_001",
  "work_order_id": "wo_001",
  "boq_item_id": "boq_001",
  "component_id": "component_001",
  "location": "Ground Floor Living Room",
  "length": 12.5,
  "breadth": 3.2,
  "height": null,
  "number": 1,
  "quantity": 40.0,
  "uom": "sqm",
  "status": "submitted",
  "submitted_by": "contractor_001"
}
```

---

# 15. API Structure

## 15.1 Site Supervisor APIs

```text
GET    /site/projects
GET    /site/projects/:id/today
GET    /site/tasks
GET    /site/tasks/:id
POST   /site/tasks/:id/progress
POST   /site/photos
POST   /site/issues
POST   /site/daily-report
GET    /site/drawings/revisions
GET    /site/offline-sync
POST   /site/offline-sync
```

## 15.2 Client APIs

```text
GET    /client/projects
GET    /client/projects/:id/overview
GET    /client/approvals/pending
POST   /client/approvals/:id/respond
POST   /client/revision-requests
GET    /client/documents
GET    /client/drawings
POST   /client/comments
```

## 15.3 Contractor APIs

```text
GET    /contractor/work-orders
GET    /contractor/work-orders/:id
POST   /contractor/measurements
GET    /contractor/measurements
POST   /contractor/running-bills
GET    /contractor/running-bills/:id/status
POST   /contractor/rfi
POST   /contractor/photos
```

## 15.4 Consultant APIs

```text
GET    /consultant/projects
GET    /consultant/reviews/pending
POST   /consultant/reviews/:id/respond
GET    /consultant/rfis
POST   /consultant/rfis/:id/respond
POST   /consultant/documents
POST   /consultant/comments
```

---

# 16. Frontend Component Architecture

```text
src/
│
├── portals/
│   ├── site/
│   ├── client/
│   ├── contractor/
│   └── consultant/
│
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── api/
│   ├── auth/
│   ├── forms/
│   ├── upload/
│   ├── notifications/
│   └── theme/
│
├── design-system/
│   ├── material-theme.ts
│   ├── tokens.ts
│   ├── status-colors.ts
│   └── typography.ts
│
└── pwa/
    ├── service-worker.ts
    ├── offline-db.ts
    └── sync-manager.ts
```

---

# 17. Material UI Implementation Rules

## 17.1 Use These Components Heavily

```text
AppBar
BottomNavigation
NavigationRail for tablets
Cards
Chips
Tabs
Stepper
Dialog
Drawer
Snackbar
Progress indicators
Date picker
File upload cards
FAB
Timeline
Accordion
```

## 17.2 Avoid These On Mobile

```text
Large data grids
Dense tables
Multi-column forms
Tiny icons without labels
Hidden actions
Complex nested menus
Large dashboard charts
```

---

# 18. Mobile Screen Patterns

## 18.1 Site Task Card

```text
[Task Name]
Component: TV Unit Wall
Status: In Progress
Progress: 50%
Drawing: GF-INT-203 Rev 04

[Update Progress] [Add Photo]
```

## 18.2 Client Approval Card

```text
[Drawing Name]
Version: Rev 03
Issued On: 25 Jun 2026
Status: Approval Pending

[View] [Approve] [Request Change]
```

## 18.3 Contractor Bill Card

```text
[Running Bill #03]
Work Order: Interior Civil Works
Amount: ₹2,45,000
Status: Under Review

[View Details]
```

## 18.4 Consultant Review Card

```text
[Structural Layout Review]
Project: Residence A
Due: 28 Jun 2026
Status: Pending Review

[Review Now]
```

---

# 19. Security Rules

## 19.1 External Users

External users must never access:

```text
Internal financial dashboards
Staff workload
Internal comments
Internal cost intelligence
Other client projects
Other contractor submissions
Private office documents
AI internal risk scoring
```

## 19.2 Audit Logging

Log every critical action:

```text
Login
Drawing viewed
Drawing downloaded
Approval submitted
Revision requested
Measurement submitted
Bill submitted
Comment added
RFI raised
RFI answered
Progress updated
Photo uploaded
```

---

# 20. File & Drawing Access Control

Every drawing/document should have access scope.

```text
Internal Only
Client Visible
Contractor Visible
Consultant Visible
Site Visible
Issued For Approval
Issued For Construction
Archived
Superseded
```

Do not show superseded drawings by default.  
Show warning when a user opens an old version.

```text
This drawing is superseded by Rev 04 issued on 25 Jun 2026.
```

---

# 21. Drawing Revision Impact Engine

When drawing is revised:

```text
Drawing Revision Created
│
├── Detect affected components
├── Detect linked tasks
├── Detect active work orders
├── Detect pending site progress
├── Detect client approval state
├── Detect consultant review need
└── Trigger notifications
```

Example:

```text
Drawing: GF Interior Layout Rev 04
Affected components:
- TV Unit Wall
- False Ceiling
- Electrical Points
- Flooring Pattern

Notify:
- Site supervisor
- Electrical contractor
- Interior contractor
- Client if approval needed
```

---

# 22. Implementation Phasing

## Phase 1 — Foundation

```text
Shared auth
Role-based access
Project assignment
Material UI theme
PWA shell
Notification base
File/drawing viewer
```

## Phase 2 — Site Supervisor Portal

```text
Today dashboard
Task list
Progress update
Photo upload
Issue reporting
Drawing revision alert
Offline drafts
```

## Phase 3 — Client Portal

```text
Project overview
Drawing/document viewing
Approval flow
Revision request flow
Commenting
Simple timeline
```

## Phase 4 — Contractor Portal

```text
Work orders
Measurement submission
Running bill submission
RFI
Bill status tracking
Duplicate billing checks
```

## Phase 5 — Consultant Portal

```text
Assigned projects
Drawing review
Document upload
Technical comments
RFI response
Coordination dashboard
```

## Phase 6 — AI Enhancement

```text
Drawing revision impact suggestions
Auto daily site report
Duplicate measurement detection
RFI classification
Client-friendly revision summaries
Delay prediction
Dependency alerts
```

---

# 23. Recommended First Build Order

Build in this order:

```text
1. Site Supervisor Portal
2. Client Portal
3. Contractor Portal
4. Consultant Portal
```

Reason:

The Site Supervisor Portal gives the most operational value because it feeds real site progress data into AORMS.
Without site data, dashboards become theory.  
With site data, AORMS becomes alive.

---

# 24. Final Product Principle

The office portal is for control.  
The external portals are for action.

```text
Office Portal        → Think, manage, decide
Site Portal          → Update, verify, report
Client Portal        → Approve, comment, understand
Contractor Portal    → Submit, measure, bill
Consultant Portal    → Review, clarify, coordinate
```

Keep every portal focused.  
Do not give users more than they need.  
That is how AORMS stays powerful without becoming painful.

