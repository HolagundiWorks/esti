# ESTI DSR/SOR Module

`esti_dsrsor` is a supporting ESTI reference/costing module for the ESTI
Architect Platform. It stores Indian public-work and construction schedule
libraries such as CPWD DSR, State PWD SOR, Irrigation, NHAI, and MES schedules
for BOQ, tender, and drawing takeoff support.

## Current Scope

- Module descriptor and permissions.
- DSR/SOR master, version, and item tables.
- Year-wise schedule item creation.
- Searchable DSR/SOR item library.
- Automatic master/version creation from schedule type, authority, department,
  and year.
- XLSX, XLS, ODS, and CSV import with validation preview.
- Duplicate schedule items update by schedule type, authority, department, year,
  and item code.
- Import batch tracking for committed uploads.
- Item audit trail for create, update, delete, and import-driven changes.

## Next Scope

- Year-wise item comparison.
- BOQ item linking.
- Rate analysis template linking.
