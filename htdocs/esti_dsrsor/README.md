# ESTI DSR/SOR Module

`esti_dsrsor` is the first ESTI construction module. It stores Indian
construction schedule libraries such as CPWD DSR, State PWD SOR, Irrigation,
NHAI, and MES schedules.

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

## Next Scope

- Year-wise item comparison.
- Historical rate audit log.
- BOQ item linking.
- Rate analysis template linking.
