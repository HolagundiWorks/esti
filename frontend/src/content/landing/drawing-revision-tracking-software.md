---
title: The Drawing Register, Controlled
metaTitle: Drawing Revision Tracking Software for Architects
metaDescription: Drawing revision tracking software with a live drawing register — current vs superseded versions, approval state and a transmittal log of every issue.
keyword: drawing revision tracking software
category: moat
updated: 2026-06-24
intro: A live drawing register where every sheet carries its current version, its superseded history, its approval state, and the transmittal log of who received which revision and when.
---

The most dangerous drawing on a project is the one someone is building from
without knowing it has been superseded. A contractor pours to Rev B while the
office has already issued Rev C; the consultant coordinates against a sheet that
was withdrawn last week. **Drawing revision tracking software** exists to make
that impossible — to hold a single register where every drawing's current
version, its superseded history, and its approval state are unambiguous, and
where you can prove who received which revision and when.

AORMS treats the drawing register as document control, not file storage. The
question is never "where is the file" but "which version is current, who is
working from it, and has it been approved."

## What a drawing register actually has to do

A folder of PDFs named `Plan_FINAL_v3_revised.pdf` is not a register. A real
register answers four questions for every sheet, at any moment:

- Which revision is **current** — the one in force right now?
- Which revisions are **superseded** — visible for history, but no longer valid?
- What is the **approval state** of this drawing?
- Who has it — the **transmittal log** of every recipient and the date each
  revision was issued to them?

AORMS holds all four on the drawing record itself. When a new revision is
created, the previous one is not deleted or overwritten; it becomes superseded
and stays in the history. The current version is always the single sheet in
force, and the superseded ones remain readable so anyone can trace what changed
and when.

## Current vs superseded — version control built for drawings

Generic file versioning gives you "v1, v2, v3" with no meaning. Drawing version
control has to carry intent. In AORMS each revision sits on the same record as
the [revision intelligence](/architecture-revision-tracking) that classifies
*why* the change happened — its category (Minor, Major, Critical) and its source
(client-driven, internal error, technical query, scope change). So the register
does not just say "Rev C replaced Rev B"; it ties that supersession to the reason
the drawing changed, and Major or Critical revisions require explicit sign-off
before they can be issued.

That link matters for document control: the technical history of a sheet and the
commercial history of the change are the same record. You never have to
reconcile a drawing log against a separate change log — there is only one.

## The transmittal log — proof of issue

A transmittal is not an email. In AORMS, transmittals are first-class document
issues, recorded against the drawing. Every time a revision goes out, the
register captures the recipient and the date. Months later, when someone asks
"did the structural consultant ever get Rev C of the foundation plan," the answer
is on the record, not in a search through inboxes.

This is the part most offices run on memory and good faith, and it is exactly the
part that fails under dispute. A clean transmittal log lets you state, from
evidence, precisely which party held which version on which date. Combined with
the immutable audit log and activity timeline, the chain of issue is complete and
tamper-evident.

## Approval state on the sheet itself

A drawing's approval state belongs on the drawing, not in a separate tracker.
Each sheet in the register carries where it stands — awaiting decision, approved,
or superseded by a later revision. When a drawing is issued to a recipient for a
decision, it ages while it waits, so a sheet stuck unapproved does not quietly
disappear. The full approval mechanics — internal chains and client sign-offs —
are covered on the
[approval workflow](/architecture-approval-workflow-software) page; here the
point is simply that the register and the approval state are one and the same
object.

## Measurement sheets and drawing takeoff

The register is not only design drawings. Measurement sheets live alongside them,
so quantities are part of the same controlled record. And because takeoff feeds
estimates, AORMS includes **in-browser estimation** that handles drawing
takeoff against a takeoff catalog and links quantities back to the register.
Takeoff stops being a loose spreadsheet on one engineer's machine and becomes
linked, traceable data against the drawing it was measured from.

## Who sees what — controlled distribution

A drawing being in the register does not mean everyone can see it. AORMS runs
separate read-only portals for clients, consultants/collaborators, and
contractors, so outsiders see only the drawings shared with them. Distribution is
deliberate: you issue a revision to a recipient through a transmittal, and that —
not blanket access — is what puts the sheet in their hands. The register stays
the office's controlled source of truth, and the portal is the controlled window
onto it.

For Indian practices specifically, this sits inside a system that already knows
the FY runs April–March, that statutory and permit context must stay visible, and
that the same drawing whose revision you are tracking may need formal project evidence.
The register is one part of a single office record, not a bolted-on tool. See how
it fits the wider
[architecture office management software](/architecture-office-management-software)
or [book a demo](/demo).

## Frequently asked questions

### What is drawing revision tracking software?

Drawing revision tracking software keeps a live register of every drawing on a
project, showing which revision is current, which are superseded, what each
sheet's approval state is, and who received which revision and when. AORMS holds
all of this on the drawing record itself, so there is one controlled source of
truth rather than a folder of ambiguously named files.

### How do you tell the current version from superseded ones?

When a new revision is created, the previous version is not overwritten — it
becomes superseded and stays in the history. The current version is always the
single sheet in force, while superseded revisions remain readable so anyone can
trace what changed. Major and Critical revisions require explicit sign-off before
they can be issued.

### What does the transmittal log record?

Every time a revision is issued, the register captures the recipient and the date
of that issue. Transmittals are treated as first-class document issues, so you can
prove from the record exactly which party held which version on which date —
backed by an immutable audit log rather than email memory.

### Can drawing takeoff link back to the drawing register?

Yes. In-browser estimation handles takeoff against linked drawings and keeps
quantities on the same project record as the register — no separate desktop app.
Takeoff becomes traceable data against the drawing it was measured from,
rather than a loose spreadsheet.

### Do clients and consultants see the whole register?

No. AORMS runs separate read-only client, consultant, and contractor portals, and
outsiders see only what is shared with them. A revision reaches a recipient
because you issued it through a transmittal — controlled distribution, not blanket
access.
