---
title: RFIs, Answered on the Record
metaTitle: RFI Management Software for Architects — AORMS
metaDescription: RFI management software for architects — raise, track and answer RFIs across structural and MEP consultants, tied to the drawing register and transmittals.
keyword: rfi management software for architects
category: solution
updated: 2026-07-04
intro: Raise, track and respond to RFIs across your structural and MEP consultants, each query tied to the drawing it concerns — with AORMS drafting the response for you to review.
---

An RFI is a small thing that decides big things. A structural consultant asks
which grid the transfer beam lands on; an MEP consultant asks for the ceiling
void above the lobby; the office answers, and a drawing changes because of it.
What is hard is remembering, three months later, who asked it, against which
revision, what you answered, and whether the answer ever reached the person who
needed it. **RFI management software for architects** is about holding that
chain — query, drawing, answer, proof of issue — as one record instead of a
scatter of emails and WhatsApp messages nobody can reconstruct.

AORMS treats an RFI as a coordination event between the office and its external
consultants: raised, tracked, answered and closed against the drawing it was
really about. It is deliberately kept separate from
[change management](/architecture-change-management-software) — an RFI is a
question seeking information, not a contract event. Only when the answer forces a
scope change does it become a decision the practice records and, where relevant,
bills.

## RFIs across structural, MEP and other consultants

RFIs go missing because they cross a boundary — they start with an outside party,
a structural, MEP or façade consultant, and land on your team, or the reverse.
AORMS keeps that cast on the project record. Each external consultant sits
in the consultant directory with a scoped **engagement**, and gets a read-only
collaborator portal showing only their part of the job, where they exchange
queries and submittals and respond to approvals without access to the rest of the
office.

So an RFI is not an email in one person's inbox. It is a query logged against the
engagement, visible to the office and to the consultant who raised it, tracked to
a response rather than left to good faith. When a principal asks "what is still
open with the structural consultant," the answer is on the record. This is the
coordination spine described on the
[consultancy management](/architecture-consultancy-management-software) page, seen
from the angle of the queries that flow across it.

## Tied to the drawing register and transmittals

An RFI almost always concerns a specific sheet at a specific revision. "Which slab
level?" only means something against a particular plan. AORMS keeps RFIs next to
the [drawing register](/drawing-revision-tracking-software), where every sheet
already carries its current version, superseded history and approval state. An RFI
raised about a foundation plan is a query about *that* revision — not a floating
question drifted loose from the drawing it belongs to.

When the answer means a sheet has to be re-issued, the transmittal log does the
proving. Transmittals in AORMS are first-class document issues, not emails: every
time a revision goes out, the register captures the recipient and the date. The
loop closes cleanly — RFI raised against Rev B, office answered, Rev C issued, and
the log shows the structural consultant received it. Re-issued sheets follow the
same
[approval workflow](/architecture-approval-workflow-software) as any other
drawing, so nothing is answered informally and then forgotten.

## AORMS drafts the response — you review and send

Answering an RFI well takes context: what the sheet says, what the last few
revisions changed, what the office decided earlier. AORMS, the assistant embedded
in AORMS, can **draft an RFI or consultant response** from that context, so you
edit a considered reply rather than starting from a blank box.

AORMS never sends on its own. It runs on-server by default, or on your own
OpenAI-compatible API key on Pro, and every run is logged — who invoked it, what
it produced. You read the draft, correct anything the design does not support, and
send it under your own name — the judgement stays with the architect. See the
[minutes of meeting software](/minutes-of-meeting-software-for-architects) for how the same discipline
handles minutes, revision requests and consultant replies.

## How RFI management works in AORMS

1. Add the external consultant to the directory and open a scoped **engagement**;
   they get a read-only collaborator portal for their part only.
2. An RFI is raised against that engagement — by the consultant or the office —
   concerning a specific drawing at its current revision in the register.
3. The office drafts the answer, optionally with AORMS producing the first draft
   from the drawing and decision context; you review and edit before it is sent.
4. If the answer changes a sheet, a revision is created (the previous one becomes
   superseded), re-issued through a **transmittal** that records recipient and
   date, and taken through the normal approval workflow.
5. If the answer widens scope, it is recorded as a decision with its revision
   category and source, so a query that became billable change is not lost. The
   whole chain — query, answer, drawing, transmittal, approval — sits on one
   project record, backed by an immutable audit log and activity timeline.

## Frequently asked questions

### What is an RFI in an architecture project?

An RFI (request for information) is a formal question raised to clarify something
on the design or documents — typically between the architect's office and a
structural, MEP or other external consultant. In AORMS it is logged against the
consultant's engagement and tied to the drawing and revision it concerns, so it is
tracked to a response rather than lost in email.

### How is an RFI different from a change request?

An RFI is a question seeking information; a change request is a contract event that
may move scope, fee or timeline. AORMS keeps them separate. An RFI only becomes a
change when its answer widens the scope — at which point it is a decision with a
revision category and source, handled through
[change management](/architecture-change-management-software).

### Can external consultants raise RFIs themselves?

Yes. Each external consultant gets a scoped read-only collaborator portal for their
engagement, where they exchange queries and submittals and respond to approvals —
without seeing the rest of the office. An RFI they raise is visible to the office
on the same project record.

### Does AORMS send RFI responses automatically?

No. AORMS can draft an RFI or consultant response from the drawing and decision
context, but it never sends on its own. Every run is logged, and you review, edit
and send the reply under your own name. AORMS runs on-server by default, or on your
own API key on Pro.

### How do I prove a consultant received the answer?

When an RFI answer means a drawing is re-issued, the transmittal log records the
recipient and date of issue. Combined with the register's current and superseded
versions and the immutable audit log, you can show exactly which consultant held
which revision, and when.

Create your AORMS account at [/account?mode=create](/account?mode=create) or write to hi@aorms.in.
