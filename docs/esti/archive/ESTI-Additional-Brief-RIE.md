> **ARCHIVED** — Snapshot / superseded. Do not use as implementation authority.
> Current status: [ROADMAP](../ROADMAP.md). Original path: ESTI- Additional Brief.md.

# **AOMS Regulatory Intelligence Engine (RIE)**

## **Purpose**

The Regulatory Intelligence Engine (RIE) automates development control calculations based on Bangalore Building Bye-Laws.

The engine assists architects during:

* Feasibility Studies  
* Concept Design  
* Development Potential Analysis  
* Approval Drawings  
* Compliance Reviews

The objective is to eliminate manual byelaw calculations and provide real-time compliance feedback.

---

# **Module Architecture**

Regulatory Intelligence

│

├── Site Input Engine

├── Development Control Engine

├── FAR Calculator

├── Coverage Calculator

├── Setback Calculator

├── Parking Calculator

├── Sustainability Compliance

├── Approval Readiness Engine

└── Feasibility Dashboard

---

# **Site Input Engine**

## **Required Inputs**

### **Site Information**

{

  "plot\_area": 1200,

  "road\_width": 12,

  "category": "B",

  "occupancy": "Residential",

  "site\_width": 24,

  "site\_depth": 50,

  "building\_height": 15

}

---

# **Development Control Engine**

## **Purpose**

Determine applicable byelaw controls.

### **Inputs**

* Plot Area  
* Road Width  
* Occupancy Type  
* Development Category

### **Outputs**

{

  "permissible\_far": 1.5,

  "permissible\_coverage": 60,

  "required\_setbacks": {},

  "parking\_requirements": {}

}

---

# **FAR Engine**

## **Formula**

FAR \= Total Covered Area / Plot Area

---

## **Excluded Areas**

The following are excluded automatically:

* Parking  
* Staircase Rooms  
* Lift Rooms  
* Ramps  
* Escalators  
* Machine Rooms  
* Open Balconies  
* Ducts  
* Water Tanks

---

## **Calculation Output**

{

  "plot\_area": 1200,

  "allowed\_far": 1.5,

  "permissible\_builtup": 1800,

  "proposed\_builtup": 1750,

  "status": "COMPLIANT"

}

---

# **Plot Coverage Engine**

## **Formula**

Coverage (%) \=  
(Built-up Area at Plinth Level / Plot Area) × 100

---

## **Excluded Areas**

* Courtyards  
* Gardens  
* Open Pools  
* Compound Walls  
* Gates  
* Watchman Booths

---

## **Output**

{

  "allowed\_coverage": 60,

  "proposed\_coverage": 58,

  "status": "COMPLIANT"

}

---

# **Setback Engine**

## **Purpose**

Calculate mandatory setbacks.

---

## **Buildings ≤ 9.5m Height**

Use dimension-based calculations.

Inputs:

* Site Width  
* Site Depth

Outputs:

{

  "front": 3,

  "rear": 1.5,

  "left": 1.5,

  "right": 3

}

---

## **Buildings \> 9.5m Height**

Use height-based calculations.

Example:

{

  "height": 15,

  "required\_setback": 5

}

Applied uniformly.

---

# **Parking Engine**

## **Standard Car Space**

18 sq.m

3m × 6m

---

## **Residential**

### **Apartment Units**

50–150 sq.m

1 Car Space Per Unit

---

Above 150 sq.m

1 Car Space

\+

1 Additional Space

Per Additional 100 sq.m

---

## **Commercial**

1 Car Space Per 50 sq.m

---

## **Output**

{

  "required\_spaces": 24,

  "provided\_spaces": 26,

  "status": "COMPLIANT"

}

---

# **Basement Compliance Engine**

## **Inputs**

* Basement Height  
* Projection Above Ground  
* Usage

---

## **Rules**

### **Allowed Usage**

* Parking  
* Utilities  
* Services  
* Machine Rooms

---

### **Height**

Minimum

2.4m

Maximum

2.75m

Exception

3.6m

For mechanical parking.

---

### **Projection**

Maximum

1.0m Above Ground

---

# **Sustainability Compliance Engine**

## **Rainwater Harvesting**

Required If:

Plinth Area \> 100 sq.m

AND

Site Area ≥ 200 sq.m

---

## **Solar Water Heating**

### **Apartments**

500 LPD

Per 5 Units

---

### **Hospitals**

100 LPD

Per 4 Beds

---

## **Tree Planting**

Required If:

Site Area \> 200 sq.m

Minimum Requirement:

2 Trees

---

# **Approval Readiness Engine**

## **Purpose**

Generate compliance score.

---

## **Evaluation Parameters**

### **FAR**

Pass / Fail

### **Coverage**

Pass / Fail

### **Setbacks**

Pass / Fail

### **Parking**

Pass / Fail

### **Basement**

Pass / Fail

### **Sustainability**

Pass / Fail

---

## **Output**

{

  "compliance\_score": 94,

  "approval\_readiness": "READY",

  "violations": \[\]

}

---

# **Feasibility Dashboard**

## **Purpose**

Provide instant site development potential.

---

## **Key Metrics**

### **Plot Area**

1200 sq.m

---

### **Permissible FAR**

1.50

---

### **Maximum Built-Up Area**

1800 sq.m

---

### **Coverage**

60%

---

### **Maximum Ground Coverage**

720 sq.m

---

### **Parking Requirement**

24 Cars

---

### **Compliance Score**

94%

---

# **AI Features**

## **Feasibility Assistant**

User asks:

Can I build a G+4 apartment

on a 1200 sq.m site

with 12m road width?

System calculates automatically.

---

## **Violation Detection**

Example:

Coverage exceeds limit by 3%.

Required setback: 5m.

Provided setback: 4m.

---

## **Optimization Suggestions**

Example:

Reduce ground coverage by 36 sq.m.

Move staircase core by 1m.

Add 2 parking spaces.

---

# **Future Expansion**

The engine should support:

* BBMP Bye-Laws  
* BDA Regulations  
* RERA Compliance  
* Fire NOC Rules  
* Airport Height Restrictions  
* TOD Regulations  
* Master Plan Zoning Rules

through a pluggable rules architecture.

Each regulation should be represented as an independent rule engine rather than hardcoded logic.

# **AOMS Dashboard Information Architecture & Module Hierarchy**

## **Purpose**

This document defines the Dashboard Information Architecture, Module Hierarchy, Navigation Structure, and Text Hierarchy for AOMS (Architecture Office Management System).

The objective is to create a dashboard that provides immediate visibility into:

* Revenue  
* Billing Opportunities  
* Project Progress  
* Client Decisions  
* Team Performance  
* Revision Risks  
* Technical Quality

The dashboard should answer the following questions within 10 seconds:

1. What can be billed today?  
2. Who owes money?  
3. Which projects require attention?  
4. Which clients are delaying progress?  
5. Which team members need support?

---

# **Dashboard Design Philosophy**

Traditional ERP dashboards focus on:

Tasks

Documents

Reports

Modules

AOMS should focus on:

Cash Flow

Projects

Clients

Team

Risk

The dashboard is designed for:

* Principal Architects  
* Studio Heads  
* Project Architects  
* Operations Managers

---

# **Dashboard Hierarchy**

The dashboard follows the following hierarchy:

Dashboard

│

├── Global KPI Bar

├── Action Center

├── Financial Health

├── Project Health

├── Client Intelligence

├── Team Intelligence

├── Revision Intelligence

├── Technical Intelligence

└── Activity Feed

Priority decreases from top to bottom.

---

# **Global KPI Bar**

## **Purpose**

Provide a studio-wide snapshot.

## **Placement**

Top section.

Visible immediately upon login.

## **Components**

### **Revenue Due**

Amount currently eligible for billing.

Example:

₹4.5L

---

### **Ready For Billing**

Projects that have achieved billing milestones.

Example:

₹2.3L

---

### **Outstanding Collections**

Invoices not yet paid.

Example:

₹8.1L

---

### **Active Projects**

Current project count.

Example:

12

---

### **Team Utilization**

Average studio utilization.

Example:

78%

---

### **Revision Risk**

Average studio revision risk.

Example:

Medium

---

# **Action Center**

## **Purpose**

Surface urgent actions.

This is the highest-value section of the dashboard.

Users should not search for problems.

Problems should appear automatically.

---

## **Components**

### **Projects Ready For Billing**

Example:

5 Projects

---

### **Client Approvals Pending**

Example:

3 Approvals

---

### **Overdue Collections**

Example:

2 Invoices

---

### **High Revision Risk Projects**

Example:

1 Project

---

### **Team Capacity Alerts**

Example:

2 Overloaded Members

---

# **Financial Health Module**

## **Purpose**

Track cash flow and collections.

---

## **Module Structure**

Financial Health

│

├── Revenue Pipeline

├── Ready For Billing

├── Outstanding Collections

├── Overdue Payments

└── Collection Forecast

---

## **Revenue Pipeline**

Shows:

* Expected Revenue  
* Billed Revenue  
* Collected Revenue

---

## **Ready For Billing**

Shows projects with completed billing milestones.

---

## **Outstanding Collections**

Shows unpaid invoices.

---

## **Overdue Payments**

Shows invoices beyond due date.

---

## **Collection Forecast**

Displays expected collections.

---

# **Project Health Module**

## **Purpose**

Provide project visibility.

---

## **Module Structure**

Project Health

│

├── Active Projects

├── Phase Tracking

├── Project Risks

├── Billing Readiness

└── Project Health Score

---

## **Project Card Structure**

Each project card contains:

Project Name

Current Phase

Current Status

Progress Percentage

Revision Risk

Billing Status

Project Health

---

Example

Villa Residence

Phase

Working Drawings

Status

Ready For Billing

Progress

82%

Revision Risk

Low

Project Health

Healthy

---

# **Client Intelligence Module**

## **Purpose**

Monitor client decision behavior.

---

## **Module Structure**

Client Intelligence

│

├── Pending Decisions

├── Approval Delays

├── Revision Behavior

├── Client Risk

└── Communication Status

---

## **Metrics**

### **Pending Decisions**

Number of decisions awaiting client action.

---

### **Approval Delay**

Average response time.

---

### **Revision Frequency**

Number of revisions raised.

---

### **Client Risk Score**

Generated by Revision Intelligence Engine.

Range:

Low

Medium

High

---

# **Team Intelligence Module**

## **Purpose**

Monitor performance, capacity, and wellbeing.

---

## **Module Structure**

Team Intelligence

│

├── Capacity

├── Performance

├── Wellbeing

├── Rewards

└── Skills

---

## **Capacity**

Displays:

* Available Capacity  
* Allocated Capacity  
* Overloaded Resources

---

## **Performance**

Displays:

* Reliability  
* Quality  
* Collaboration  
* Learning

---

## **Wellbeing**

Displays:

* Burnout Risk  
* Workload Health  
* Capacity Stress

---

## **Example Employee Card**

Arjun

Performance

91%

Capacity

85%

Burnout Risk

Low

Reward Points

320

---

# **Revision Intelligence Module**

## **Purpose**

Monitor project revisions.

Core USP of AOMS.

---

## **Module Structure**

Revision Intelligence

│

├── Client Revisions

├── Internal Revisions

├── Site Queries

├── Scope Creep

└── Revision Risk

---

## **Metrics**

### **Client Revision Count**

Client-driven changes.

---

### **Internal Revision Count**

Office errors.

---

### **Site Query Count**

Contractor clarification requests.

---

### **Scope Drift**

Deviation from approved scope.

---

### **Revision Health Score**

Overall revision health.

Range:

0-100

---

# **Technical Intelligence Module**

## **Purpose**

Measure technical quality.

---

## **Module Structure**

Technical Intelligence

│

├── Drawing Accuracy

├── Drawing Clarity

├── Site Query Trends

├── QA Performance

└── Coordination Issues

---

## **Drawing Accuracy**

Measures internal drawing errors.

---

## **Drawing Clarity**

Measures site understanding.

---

## **Site Query Trend**

Tracks recurring issues.

---

## **QA Performance**

Measures review quality.

---

# **Activity Feed**

## **Purpose**

Provide timeline visibility.

Lowest dashboard priority.

---

## **Activity Types**

### **Client Activities**

* Approval Received  
* Revision Requested  
* Decision Closed

---

### **Project Activities**

* Phase Completed  
* Deliverable Issued  
* Billing Trigger Achieved

---

### **Team Activities**

* Task Completed  
* Drawing Issued  
* QA Review Completed

---

### **Financial Activities**

* Invoice Generated  
* Payment Received  
* Collection Reminder Sent

---

# **Navigation Structure**

## **Main Navigation**

Dashboard

Projects

Clients

Team

Billing

Approvals

Revisions

Reports

Settings

---

# **Project Module Hierarchy**

Projects

│

├── Overview

├── Decisions

├── Revisions

├── Drawings

├── Tasks

├── Team

├── Billing

├── Site Queries

└── Timeline

---

# **Client Module Hierarchy**

Clients

│

├── Overview

├── Projects

├── Decisions

├── Revisions

├── Approvals

├── Billing

└── Communication

---

# **Team Module Hierarchy**

Team

│

├── Capacity

├── Performance

├── Wellbeing

├── Rewards

├── Skills

└── Activity

---

# **Billing Module Hierarchy**

Billing

│

├── Ready For Billing

├── Draft Invoices

├── Sent Invoices

├── Collections

├── Overdue

└── Forecast

---

# **Text Hierarchy**

## **Level 1 (Page Titles)**

Examples:

Dashboard

Projects

Clients

Billing

Team

---

## **Level 2 (Section Titles)**

Examples:

Financial Health

Project Health

Client Intelligence

Revision Intelligence

Team Intelligence

---

## **Level 3 (Subsections)**

Examples:

Ready For Billing

Outstanding Collections

Approval Delays

Drawing Accuracy

Burnout Risk

---

## **KPI Values**

Use highest visual emphasis.

Examples:

₹8.2L

78%

12

5 Days

92

---

## **KPI Labels**

Use supporting text.

Examples:

Outstanding

Utilization

Projects

Approval Delay

Health Score

---

# **Carbon Design System Mapping**

## **KPI Tiles**

Used for:

* Revenue  
* Collections  
* Utilization  
* Risks

---

## **Data Tables**

Used for:

* Projects  
* Clients  
* Invoices  
* Revisions

---

## **Status Tags**

Examples:

Healthy

At Risk

Ready For Billing

Pending Approval

Overdue

High Risk

---

## **Side Panels**

Used for:

* Project Details  
* Client Details  
* Revision Details  
* Invoice Details

---

# **Success Criteria**

The dashboard is successful if a Principal Architect can answer:

* What can be billed today?  
* Which invoices are overdue?  
* Which projects need attention?  
* Which clients are blocking progress?  
* Which team members are overloaded?

within 10 seconds of opening AOMS.

This principle should drive all future dashboard design decisions.

# **Architecture Project Phase & Billing Framework (APBF)**

## **Purpose**

The Architecture Project Phase & Billing Framework (APBF) is designed to simplify project tracking while aligning with Council of Architecture (COA) service stages and improving billing visibility.

The framework has two objectives:

1. Provide a simple project progress system.  
2. Ensure billable milestones are visible and actionable.

This framework is intended for:

* Solo Architects  
* Small Studios (2–20 People)  
* Mid-Sized Architecture Firms

---

# **Design Principles**

## **Principle 1**

Project phases should reflect actual architectural workflow.

## **Principle 2**

Billing milestones should be clearly visible.

## **Principle 3**

Project managers should update status within seconds.

## **Principle 4**

Work completion and billing completion are different events.

---

# **Phase Architecture**

The framework consists of:

## **Layer 1**

Contract / COA Phases

Used for:

* Client contracts  
* Fee schedules  
* COA alignment  
* Progress reports

---

## **Layer 2**

Live Progress Stages

Used for:

* Internal tracking  
* Daily project updates  
* Billing readiness  
* Cash flow monitoring

---

# **Project Lifecycle**

---

## **Phase 0**

Appointment

Purpose:

Project initiation.

Activities:

* Proposal approval  
* Scope finalization  
* Agreement signing  
* Advance payment collection

Billing Milestone:

Advance Payment Received

Typical Fee Allocation:

10% – 20%

Completion Trigger:

Agreement Signed

---

## **Phase 1**

Concept Design

COA Stage:

Concept Design

Purpose:

Establish design direction.

Live Stages:

* Client Briefing  
* Site Analysis  
* Concept Development  
* Concept Presentation  
* Concept Approval

Billing Trigger:

Concept Approved

Typical Fee Allocation:

15%

Completion Trigger:

Client Approval Received

---

## **Phase 2**

Preliminary Design

COA Stage:

Preliminary Design

Purpose:

Develop approved concept.

Live Stages:

* Layout Development  
* Elevation Development  
* Design Refinement  
* Client Review  
* Design Freeze

Billing Trigger:

Design Freeze

Typical Fee Allocation:

15%

Completion Trigger:

Design Freeze Approved

---

## **Phase 3**

Statutory Approval

COA Stage:

Statutory Submission

Purpose:

Obtain regulatory approvals.

Live Stages:

* Authority Drawings  
* Submission Package  
* Submission  
* Approval Follow-Up  
* Approval Received

Billing Trigger:

Submission Complete

Alternative Trigger:

Approval Received

Typical Fee Allocation:

10%

Completion Trigger:

Authority Submission Completed

---

## **Phase 4**

Detailed Design

COA Stage:

Detailed Design

Purpose:

Finalize design intent.

Live Stages:

* Interior Design  
* Material Selection  
* Design Coordination  
* Design Review  
* Detailed Design Freeze

Billing Trigger:

Detailed Design Freeze

Typical Fee Allocation:

15%

Completion Trigger:

Detailed Design Approved

---

## **Phase 5**

Working Drawings

COA Stage:

Working Drawings

Purpose:

Prepare construction documentation.

Live Stages:

* Architectural Drawings  
* Structural Coordination  
* MEP Coordination  
* Detail Drawings  
* GFC Package  
* Drawing Issue Complete

Billing Trigger:

Drawing Package Issued

Typical Fee Allocation:

20%

Completion Trigger:

Issued For Construction

---

## **Phase 6**

Tender & Contractor Appointment

COA Stage:

Tendering

Purpose:

Select contractor.

Live Stages:

* Tender Documentation  
* Bid Evaluation  
* Negotiation  
* Contractor Appointment

Billing Trigger:

Contractor Appointed

Typical Fee Allocation:

5%

Completion Trigger:

Contractor Finalized

---

## **Phase 7**

Construction Support

COA Stage:

Construction

Purpose:

Support project execution.

Live Stages:

* Site Kick-Off  
* Construction Monitoring  
* Site Queries  
* Material Approvals  
* Snag Review

Billing Trigger:

Monthly Billing

or

Construction Stage Billing

Typical Fee Allocation:

15%

Completion Trigger:

Construction Complete

---

## **Phase 8**

Completion & Handover

COA Stage:

Completion

Purpose:

Project closure.

Live Stages:

* Final Inspection  
* Snag Closure  
* As-Built Documentation  
* Handover  
* Project Closure

Billing Trigger:

Project Handover

Typical Fee Allocation:

5%

Completion Trigger:

Handover Completed

---

# **Project Status Model**

Every phase uses only four statuses.

---

## **Status 1**

Not Started

Meaning:

Phase not yet initiated.

---

## **Status 2**

In Progress

Meaning:

Work currently underway.

---

## **Status 3**

Ready For Billing

Meaning:

Billable milestone achieved.

Invoice should be generated.

---

## **Status 4**

Billed

Meaning:

Invoice generated.

Billing milestone completed.

---

# **Collection Status Model**

Billing and collection are separate processes.

Every invoice receives a collection status.

---

## **Draft**

Invoice not generated.

---

## **Generated**

Invoice prepared.

---

## **Sent**

Invoice shared with client.

---

## **Due**

Payment pending.

---

## **Partially Paid**

Partial collection received.

---

## **Paid**

Full collection received.

---

## **Overdue**

Payment beyond due date.

---

# **Billing Intelligence Engine**

Purpose:

Prevent missed billing opportunities.

---

## **Rules**

When a phase reaches its billing trigger:

System automatically marks:

Ready For Billing

---

Examples

Concept Approved

↓

Ready For Billing

---

Working Drawings Issued

↓

Ready For Billing

---

Contractor Appointed

↓

Ready For Billing

---

# **AI Billing Assistant**

The AI Assistant monitors billing readiness.

---

## **Example Alerts**

Concept Approved 5 Days Ago

Invoice Not Raised

---

Working Drawings Issued

₹1,50,000 Pending Billing

---

Invoice Sent

Payment Due In 3 Days

---

Invoice Overdue By 15 Days

Follow-Up Recommended

---

# **Project Dashboard**

Every project displays:

Project Name

Current Phase

Current Status

Progress %

Billing Status

Collection Status

Pending Decisions

Revision Risk

Team Capacity

---

Example

Villa Residence

Phase

Working Drawings

Status

Ready For Billing

Invoice Value

₹1,20,000

Collection Status

Pending

Revision Risk

Medium

Project Health

Healthy

---

# **Principal Architect Dashboard**

Displays:

Projects Ready For Billing

Outstanding Invoices

Overdue Collections

Collection Forecast

Revenue Pipeline

Pending Client Approvals

Projects At Risk

---

# **Key Business KPIs**

## **Billing KPIs**

Revenue Billed

Revenue Collected

Collection Efficiency

Average Billing Delay

Average Collection Delay

Overdue Amount

---

## **Project KPIs**

Project Progress

Revision Risk

Approval Efficiency

Drawing Completion

Project Health Score

---

## **Cash Flow KPIs**

Expected Revenue

Collected Revenue

Outstanding Receivables

Collection Forecast

Monthly Cash Flow

---

# **Recommended Implementation**

For software simplicity:

Use:

9 Project Phases

4 Project Statuses

6 Collection Statuses

Automated Billing Triggers

AI Billing Notifications

No manual percentage tracking.

Progress should be calculated automatically using:

* Tasks  
* Deliverables  
* Approvals  
* Drawing Packages  
* Project Milestones

This minimizes data entry while maximizing billing visibility and collection efficiency.

# **Architecture Project Lifecycle Framework**

## **Purpose**

This framework simplifies Council of Architecture project stages into a practical workflow suitable for architecture offices ranging from solo practitioners to 50-person studios.

The framework separates:

1. Professional Service Stages  
2. Daily Operational Tracking

This reduces project update complexity while maintaining COA compliance.

---

# **Phase 1: Concept Design**

Objective:

Understand client requirements and establish project direction.

Deliverables:

* Client Brief  
* Site Analysis  
* Concept Options  
* Initial Cost Estimate

Exit Criteria:

Client approves concept direction.

---

# **Phase 2: Preliminary Design**

Objective:

Develop approved concept into a workable design.

Deliverables:

* Floor Plans  
* Elevations  
* Massing Studies  
* Material Direction

Exit Criteria:

Client approves preliminary design.

---

# **Phase 3: Statutory Approval**

Objective:

Obtain required approvals.

Deliverables:

* Authority Submission Drawings  
* Compliance Documentation

Exit Criteria:

Authority approvals received.

---

# **Phase 4: Detailed Design**

Objective:

Develop coordinated design package.

Deliverables:

* Detailed Plans  
* Sections  
* Elevations  
* Design Specifications

Exit Criteria:

Design frozen for technical production.

---

# **Phase 5: Working Drawings**

Objective:

Prepare construction documentation.

Deliverables:

* GFC Drawings  
* Construction Details  
* Coordination Drawings  
* BOQ Inputs

Exit Criteria:

Issue for tender or construction.

---

# **Phase 6: Tender & Contractor Appointment**

Objective:

Select construction partners.

Deliverables:

* Tender Package  
* Bid Analysis  
* Contractor Recommendation

Exit Criteria:

Contractor appointed.

---

# **Phase 7: Construction**

Objective:

Support project execution.

Deliverables:

* Site Instructions  
* RFI Responses  
* Shop Drawing Reviews  
* Site Reports

Exit Criteria:

Construction substantially complete.

---

# **Phase 8: Completion & Handover**

Objective:

Close project and hand over documentation.

Deliverables:

* Snag Reports  
* Completion Drawings  
* As-Built Drawings  
* Occupancy Support

Exit Criteria:

Project handed over.

---

# **Operational Status System**

Every phase uses only five statuses.

Not Started

In Progress

Under Review

Awaiting Approval

Completed

---

# **Work Streams**

Each phase contains work streams.

## **Design**

* Layout  
* Elevation  
* Interior  
* Materials

## **Technical**

* Architectural  
* Structural  
* MEP  
* BOQ

## **Construction**

* RFIs  
* Site Queries  
* Material Approvals  
* Snags

---

# **Project Health Indicators**

Automatically generated.

## **Project Health**

Green  
Yellow  
Red

## **Revision Risk**

Low  
Medium  
High

## **Team Capacity**

Healthy  
Busy  
Overloaded

## **Client Response**

Fast  
Moderate  
Delayed

---

# **KPI Sources**

Project KPIs are generated from:

* Tasks  
* Approvals  
* Revisions  
* Site Queries  
* Drawing Errors  
* Team Utilization

Users should never manually enter KPI values.

The system computes them automatically.

# **Architecture Studio Performance & Rewards Framework (ASPRF)**

## **Purpose**

The Architecture Studio Performance & Rewards Framework (ASPRF) is a KPI-driven performance intelligence system designed specifically for architecture firms.

The framework converts operational data from:

* Tasks  
* Design reviews  
* Client revisions  
* Technical drawings  
* Site queries  
* QA reviews  
* Team collaboration

into measurable performance indicators and rewards.

The objective is to:

* Improve accountability  
* Improve delivery predictability  
* Reduce internal errors  
* Improve drawing quality  
* Encourage collaboration  
* Protect employee wellbeing  
* Create a merit-based reward culture

The framework is NOT intended for employee surveillance.

The framework is designed to create:

Visibility

→ Accountability

→ Improvement

→ Recognition

→ Retention

---

# **Performance Architecture**

## **KPI Categories**

Employee performance is evaluated across five dimensions.

### **Reliability**

Measures commitment and delivery consistency.

Weight:

30%

---

### **Quality**

Measures accuracy and reduction of rework.

Weight:

25%

---

### **Client Impact**

Measures effectiveness in reducing revisions and improving approvals.

Weight:

15%

---

### **Collaboration**

Measures contribution to team success.

Weight:

15%

---

### **Learning & Growth**

Measures professional development.

Weight:

10%

---

### **Wellbeing**

Measures sustainable workload.

Weight:

5%

---

# **Task Classification Framework**

Every task must belong to a task category.

This classification determines KPI calculations.

---

## **Category A**

Design Communication

Purpose:

Client interaction and decision making.

Examples:

* Client meetings  
* Design presentations  
* Material discussions  
* Approval sessions

Outputs:

Decision

Approval

Feedback

Revision Request

---

## **Category B**

Design Development

Purpose:

Design creation.

Examples:

* Concept design  
* Schematic design  
* Design development

Outputs:

Drawings

3D Models

Renderings

Design Options

---

## **Category C**

Technical Production

Purpose:

Construction documentation.

Examples:

* Working drawings  
* Detail drawings  
* BOQ preparation  
* GFC packages

Outputs:

Issued Drawings

Drawing Revisions

Technical Packages

---

## **Category D**

Construction Support

Purpose:

Execution assistance.

Examples:

* Site queries  
* RFIs  
* Contractor clarifications  
* Material approvals

Outputs:

Responses

Clarifications

Approvals

---

# **Reliability KPI Engine**

## **Commitment Score**

Measures ability to meet committed deadlines.

Formula:

Completed On Time

/

Assigned Tasks

Range:

0 \- 100

---

## **Delivery Predictability**

Measures difference between estimated and actual completion dates.

Formula:

Estimated Duration

vs

Actual Duration

Output:

Predictability Score

---

## **Deadline Reliability**

Formula:

Tasks Delivered On Time

/

Tasks Completed

---

# **Quality KPI Engine**

## **Rework Rate**

Measures redesign effort.

Formula:

Rework Hours

/

Total Project Hours

Lower is better.

---

## **Internal Error Rate**

Applicable to technical teams.

Formula:

Internal Revisions

/

Issued Drawings

---

## **Drawing Accuracy Score**

Formula:

100

\-

Error Penalty

---

## **QA Review Score**

Measures quality of issued packages.

Inputs:

* Missing details  
* Coordination issues  
* Annotation issues

Range:

0 \- 100

---

# **Client Impact KPI Engine**

## **First Pass Approval Rate**

Formula:

Approved Deliverables

Without Revision

/

Total Deliverables

---

## **Revision Contribution Index**

Measures revisions attributable to employee work.

Excludes:

Client preference changes

Includes:

Design issues

Documentation issues

Coordination issues

---

## **Decision Closure Efficiency**

Formula:

Approvals Generated

/

Client Meetings

---

# **Collaboration KPI Engine**

## **Review Participation Score**

Measures contribution to design reviews.

Formula:

Reviews Conducted

/

Project Participation

---

## **Mentorship Score**

Based on:

* Review comments  
* Junior support  
* Knowledge sharing

---

## **Dependency Impact Score**

Measures tasks that blocked others.

Formula:

Blocked Tasks Created

/

Dependent Tasks

Lower is better.

---

# **Learning KPI Engine**

## **Learning Points**

Earned through:

* Training  
* Workshops  
* Certifications  
* Internal presentations  
* Standard creation

---

## **Knowledge Contribution Index**

Activities:

* Templates  
* Design standards  
* BIM libraries  
* Checklists

---

# **Wellbeing KPI Engine**

## **Workload Health Score**

Inputs:

* Active tasks  
* Open projects  
* Utilization  
* Deadline density

Formula:

Healthy Capacity Ratio

Range:

0 \- 100

---

## **Burnout Risk Score**

Inputs:

* Consecutive high-load weeks  
* Excessive utilization  
* Increasing rework  
* Missed deadlines

Output:

LOW

MEDIUM

HIGH

---

# **Site & Drawing Intelligence**

---

## **Site Query Rate**

Formula:

Site Queries

/

Issued Drawings

Measures drawing clarity.

---

## **Repeat Query Rate**

Formula:

Repeated Queries

/

Total Queries

Measures communication effectiveness.

---

## **Drawing Clarity Score**

Formula:

100

\-

(Query Penalty)

\-

(Repeat Query Penalty)

\-

(Critical Query Penalty)

---

# **Employee Performance Score**

## **Formula**

Performance Score

\=

Reliability × 0.30

\+

Quality × 0.25

\+

Client Impact × 0.15

\+

Collaboration × 0.15

\+

Learning × 0.10

\+

Wellbeing × 0.05

Range:

0 \- 100

---

# **Performance Bands**

## **Bronze**

70 \- 80

---

## **Silver**

81 \- 90

---

## **Gold**

91 \- 95

---

## **Platinum**

96+

---

# **Recognition System**

Purpose:

Promote positive behaviors.

Avoid ranking employees.

Use recognition-based achievements.

---

## **Reliability Champion**

Highest delivery reliability.

---

## **Quality Champion**

Lowest rework percentage.

---

## **Drawing Excellence Award**

Highest drawing clarity score.

---

## **Site Hero Award**

Fastest query resolution.

---

## **Design Excellence Award**

Highest approval success rate.

---

## **Mentor Award**

Highest mentorship contribution.

---

## **Knowledge Builder Award**

Highest knowledge contribution score.

---

# **Reward Point Engine**

Employees earn points.

---

## **Point Sources**

### **On-Time Delivery**

\+10 Points

---

### **Zero-Rework Deliverable**

\+15 Points

---

### **First Pass Approval**

\+20 Points

---

### **Knowledge Contribution**

\+25 Points

---

### **Mentorship Contribution**

\+15 Points

---

### **Training Completion**

\+10 Points

---

# **Reward Marketplace**

Employees can redeem points.

Examples:

* Learning courses  
* Books  
* Conference tickets  
* Software licenses  
* Gift vouchers  
* Additional leave days

---

# **Team Rewards**

Purpose:

Prevent unhealthy competition.

---

## **Project Success Bonus**

Conditions:

Delivered On Time

Client Satisfaction \> Threshold

Revision Budget Maintained

Error Rate Below Threshold

Reward entire project team.

---

# **Anti-Gaming Framework**

## **Task Inflation Prevention**

Task scores weighted by:

Effort

Complexity

Business Impact

---

## **Easy Task Selection Prevention**

Each task receives:

Difficulty Coefficient

Range:

1-5

Higher complexity generates higher contribution value.

---

## **Review Avoidance Prevention**

Review participation is mandatory in collaboration scoring.

---

# **AI Agents**

---

## **Performance Intelligence Agent**

Responsibilities:

* Generate employee scores  
* Generate team scores  
* Generate recognition recommendations

---

## **Burnout Detection Agent**

Responsibilities:

* Detect overload  
* Predict burnout  
* Recommend workload redistribution

---

## **Quality Intelligence Agent**

Responsibilities:

* Detect recurring errors  
* Identify training opportunities  
* Generate QA insights

---

## **Reward Recommendation Agent**

Responsibilities:

* Allocate achievement badges  
* Recommend point awards  
* Recommend quarterly bonuses

---

# **Carbon Design System UI**

## **Employee Dashboard**

Displays:

* Performance Score  
* Reliability  
* Quality  
* Collaboration  
* Learning  
* Wellbeing

---

## **Manager Dashboard**

Displays:

* Team Capacity  
* Burnout Risks  
* Top Contributors  
* Skill Gaps  
* Reward Recommendations

---

## **Studio Dashboard**

Displays:

* Utilization  
* Drawing Quality  
* Revision Trends  
* Site Query Trends  
* Project Delivery Performance

---

# **Success Metrics**

## **Employee Metrics**

* Retention Rate  
* Burnout Reduction  
* Learning Participation  
* Internal Promotion Rate

---

## **Project Metrics**

* Rework Reduction  
* Drawing Accuracy  
* Approval Efficiency  
* Site Query Reduction

---

## **Business Metrics**

* Margin Improvement  
* Profit Leakage Reduction  
* Utilization Optimization  
* Project Delivery Accuracy

---

# **Product Positioning**

ASPRF is not an employee monitoring system.

ASPRF is a Studio Performance Intelligence Platform.

Its purpose is to help architecture firms:

* Deliver better projects  
* Build stronger teams  
* Reward meaningful contributions  
* Reduce burnout  
* Improve profitability

while creating a transparent, fair, and growth-oriented workplace culture.

# **Client Revision Intelligence Framework (CRIF)**

## **Purpose**

The Client Revision Intelligence Framework (CRIF) is a project-level decision management system designed specifically for architecture firms.

Unlike traditional comment-based review systems, CRIF transforms design reviews into structured decision workflows that reduce revision cycles, improve client communication, prevent scope creep, and protect project profitability.

The framework introduces decision accountability, revision intelligence, feedback quality analysis, and behavioral analytics into the architecture review process.

---

# **Core Objectives**

## **Business Objectives**

* Reduce project redesign effort  
* Reduce unnecessary revisions  
* Improve approval turnaround time  
* Improve project profitability  
* Increase architect utilization  
* Reduce communication ambiguity  
* Create auditable decision records

## **User Objectives**

### **Client**

* Understand exactly what requires approval  
* Provide structured feedback  
* Understand revision consequences  
* Track project decisions  
* View design evolution

### **Architect**

* Understand client behavior  
* Detect revision risk early  
* Estimate redesign effort  
* Protect project margins  
* Maintain decision accountability

---

# **Design Review Workspace**

## **Layout Structure**

The Design Review Workspace is the primary interaction surface.

┌──────────────────────────────────────────────────────┐

│ Header                                               │

├──────────────────────────────────────────────────────┤

│                                                      │

│               Design Canvas                          │

│            (PDF / Drawing Viewer)                    │

│                                                      │

├───────────────────┬──────────────────────────────────┤

│ Comment Layer     │ Intelligence Sidebar            │

│                   │                                  │

│ Pins              │ Revision Analysis               │

│ Markups           │ Impact Assessment               │

│ Selections        │ Decision Actions                │

└───────────────────┴──────────────────────────────────┘

The drawing remains the primary focus.

All intelligence appears in contextual side panels.

---

# **User Segmentation**

The platform uses a dual-view architecture.

## **Client View**

Displays decision-support information.

## **Architect View**

Displays business intelligence and risk information.

Both views operate from the same underlying data model.

---

# **Client View**

## **Visible Components**

### **Revision Budget**

Displays:

* Revisions used  
* Revisions remaining

Example:

Concept Stage

3 / 5 Revisions Used

---

### **Timeline Impact**

Displays:

Estimated Timeline Impact

\+3 Days

---

### **Decision Status**

Displays:

Awaiting Decision

Approve

Request Changes

Reject

---

### **Structured Feedback Form**

Questions:

#### **What would you like to modify?**

Options:

* Layout  
* Space Planning  
* Elevation  
* Materials  
* Lighting  
* Furniture  
* Landscape  
* Other

#### **Why is this change required?**

Options:

* Functional Requirement  
* Aesthetic Preference  
* Budget Concern  
* Construction Concern  
* Other

#### **Describe your expected outcome**

Text Input

---

### **Feedback Completeness**

Displays:

Feedback Completeness

82%

Purpose:

Guide users toward actionable feedback.

Never expose internal quality scoring terminology.

---

### **Design Decision Timeline**

Displays:

* Submitted  
* Approved  
* Revised  
* Locked

Chronological view.

---

# **Architect View**

Architect View contains additional intelligence modules.

---

## **Revision Intelligence Panel**

### **Revision Health Score**

Range:

0-100

Factors:

* Revision count  
* Scope drift  
* Decision reversals  
* Approval delays

Example:

Revision Health

42 / 100

High Risk

---

## **Client Risk Score**

Range:

0-100

Purpose:

Measure likelihood of future revisions.

Inputs:

* Historical revision frequency  
* Approval delays  
* Reopened approvals  
* Scope changes  
* Feedback quality

Classification:

0-30 Low

31-70 Medium

71-100 High

---

## **Feedback Clarity Analysis**

Metrics:

* Specificity  
* Actionability  
* Completeness  
* Design Relevance

Example:

Specificity      92%

Actionability    84%

Completeness     76%

---

## **Scope Drift Analysis**

Displays:

Current Scope Expansion

18%

Calculated from approved baseline.

---

## **Profit Leakage Analysis**

Displays:

Estimated Rework Hours

16 Hours

Margin Impact

₹24,000

Visible only to internal users.

---

## **Revision Probability Engine**

Predicts likelihood of another revision.

Example:

Revision Probability

78%

Contributing Factors:

* Revision history  
* Approval delay  
* Feedback quality  
* Decision reversals

---

# **Decision Management System**

Every review item becomes a decision object.

---

## **Decision States**

DRAFT

PENDING\_REVIEW

APPROVED

MODIFICATION\_REQUESTED

REJECTED

LOCKED

---

## **Locked State**

Locked decisions require formal change requests.

Clients cannot directly modify approved items.

---

# **Decision Ledger**

Every action becomes immutable history.

Example:

12 May

Layout Presented

14 May

Layout Approved

20 May

Revision Requested

25 May

Revision Approved

30 May

Decision Locked

Purpose:

Prevent approval disputes.

Create project accountability.

---

# **Revision Impact Engine**

Before a revision is submitted, the system calculates:

## **Metrics**

* Estimated effort hours  
* Timeline delay  
* Drawings affected  
* Areas affected  
* Revision budget consumption

---

## **Client Display**

Impact Assessment

Affected Areas

4

Estimated Effort

12 Hours

Timeline Impact

\+3 Days

---

## **Architect Display**

Impact Assessment

Affected Areas

4

Estimated Effort

12 Hours

Timeline Impact

\+3 Days

Estimated Cost

₹18,000

Profit Impact

Moderate

---

# **Cooling-Off Mechanism**

Purpose:

Reduce emotional revision requests.

---

## **Trigger Conditions**

* Revision count \> threshold  
* Estimated effort \> threshold  
* Major design changes detected  
* Scope expansion \> threshold

---

## **Client Prompt**

Major Change Detected

Estimated Impact

\+28 Hours

\+5 Days

Would you like to:

Submit Now

Review Tomorrow

---

# **AI Agents**

## **Agent 1**

Feedback Intelligence Agent

Responsibilities:

* Analyze feedback  
* Generate clarity scores  
* Suggest clarification questions

---

## **Agent 2**

Revision Impact Agent

Responsibilities:

* Estimate effort  
* Estimate delay  
* Estimate affected scope

---

## **Agent 3**

Decision Intelligence Agent

Responsibilities:

* Detect stalled decisions  
* Detect reopened approvals  
* Detect approval bottlenecks

---

## **Agent 4**

Client Behaviour Agent

Responsibilities:

* Generate risk scores  
* Detect revision patterns  
* Predict future revisions

---

## **Agent 5**

Project Risk Agent

Responsibilities:

* Detect projects at risk  
* Detect profit leakage  
* Alert principal architect

---

# **Carbon Design System Mapping**

## **Components**

### **PDF Canvas**

Custom Component

Primary workspace.

---

### **Side Panel**

Carbon SidePanel

Used for:

* Decision details  
* Revision intelligence  
* Impact analysis

---

### **Data Table**

Used for:

* Decision Ledger  
* Revision History  
* Client Analytics

---

### **Progress Indicator**

Used for:

* Revision Budget  
* Project Stage Completion

---

### **Status Tags**

Examples:

* Approved  
* Pending  
* Locked  
* Low Risk  
* Medium Risk  
* High Risk

---

# **Success Metrics**

## **Project Metrics**

* Average revisions per project  
* Approval turnaround time  
* Rework hours  
* Scope creep percentage  
* Revision cost

## **Client Metrics**

* Feedback completeness  
* Revision frequency  
* Approval delay  
* Decision reversal rate

## **Business Metrics**

* Profit leakage prevented  
* Margin improvement  
* Architect utilization  
* Project delivery accuracy

---

# **Product Positioning**

CRIF is not a revision tracker.

CRIF is a Decision Intelligence System for Architecture Firms.

The primary outcome is not project management.

The primary outcome is reducing redesign effort, controlling scope creep, improving client decision quality, and protecting project profitability.

