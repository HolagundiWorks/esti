\# Office Financial Dashboard Access Hierarchy



\*\*Role-Based Access Control (RBAC) Structure\*\*



\---



\# Overview



This dashboard access structure is designed based on:



\* Role responsibility

\* Financial authority

\* Department access

\* Project assignment

\* Data confidentiality



The system follows a \*\*4-Level Hierarchy\*\* to ensure financial and operational data is visible only to authorized personnel.



\---



\# Hierarchy Structure



| Level | Users                                                          | Access Scope                                              |

| ----- | -------------------------------------------------------------- | --------------------------------------------------------- |

| L1    | Owners, Stakeholders, Senior Management                        | Full company access                                       |

| L2    | Accountants, HR Managers, Finance Team                         | Department financial operations                           |

| L3    | Architects, Engineers, Senior Supervisors, Project Managers    | Assigned project operational and limited financial access |

| L4    | Interns, Junior Engineers, Junior Architects, Site Supervisors | Assigned project only                                     |



\---



\# L1 — Executive Level



\*\*Full Strategic \& Financial Access\*\*



\## Users



\* Owners

\* Stakeholders

\* Directors

\* Senior Management

\* Executive Team



\## Purpose



Business control, financial oversight, strategic decision making.



\## Dashboard Modules



\### Company Financial Overview



\* Total Revenue

\* Net Profit / Loss

\* Cash Flow Summary

\* Company Budget vs Actual

\* Bank Balance

\* Tax Liability

\* Accounts Receivable

\* Accounts Payable



\### Project Financial Overview



\* All Projects Access

\* Project Profitability

\* Budget Allocation

\* Expense Tracking

\* Payment Milestones

\* Client Payment Status

\* Vendor Payment Status



\### HR Financials



\* Payroll Cost

\* Department Salary Reports

\* Hiring Cost Analysis

\* Bonus \& Incentives

\* Employee Cost Distribution



\### Procurement Dashboard



\* Purchase Orders

\* Vendor Payments

\* Material Cost Analysis

\* Procurement Trends

\* Vendor Performance Reports



\### Strategic Reports



\* Forecasting Reports

\* Growth Reports

\* Annual Financial Reports

\* Investment Reports

\* Audit Reports



\## Restrictions



\* No restrictions

\* Full access across company



\---



\# L2 — Administrative \& Financial Operations



\*\*Department Restricted Access\*\*



\## Users



\* Accountants

\* HR Managers

\* Finance Managers

\* Payroll Managers



\---



\# L2A — Accountant Access



\## Finance Dashboard



\* Invoice Generation

\* Client Payment Collection

\* Vendor Payment Processing

\* Expense Entry

\* Tax Calculation

\* GST/VAT Filing

\* Accounts Payable

\* Accounts Receivable

\* Purchase Orders



\## Project Financial Access



\* Budget Usage per Project

\* Expense Logs

\* Procurement Cost

\* Payment Approval Workflow



\## Restricted Information



Cannot access:



\* Company Profit Margin

\* Stakeholder Investment Data

\* Strategic Reports

\* Executive Forecasting

\* Confidential Board Reports



\---



\# L2B — HR Access



\## HR Dashboard



\* Payroll Management

\* Attendance Reports

\* Leave Management

\* Employee Contracts

\* Recruitment Costs

\* Salary Structure

\* Employee Reimbursements

\* Employee Performance Reports



\## Restricted Information



Cannot access:



\* Company Profit Reports

\* Vendor Payment Data

\* Procurement Costs

\* Bank Account Information

\* Tax Reports

\* Financial Forecast Reports



\---



\# L3 — Technical Management Level



\*\*Project Execution + Limited Financial Visibility\*\*



\## Users



\* Architects

\* Engineers

\* Senior Supervisors

\* Project Managers



\## Purpose



Project execution, budget tracking, resource monitoring.



\## Dashboard Modules



\### Project Dashboard



\* Assigned Project Access

\* Project Budget Allocation

\* Budget Consumption Percentage

\* Material Usage Cost

\* BOQ (Bill of Quantity)

\* Labor Cost Summary

\* Resource Allocation

\* Work Progress Tracking



\### Technical Dashboard



\* Drawings Approval

\* Site Progress Reports

\* Task Assignment

\* Project Timeline

\* Equipment Usage Reports

\* Milestone Tracking



\### Financial Visibility



Can view:



\* Approved Budget

\* Budget Remaining

\* Cost Consumption Rate

\* Labor Cost for Assigned Project



Cannot view:



\* Company Revenue

\* Profit Margins

\* Bank Balance

\* Payroll Reports

\* Tax Reports

\* Vendor Contracts Full Value



\---



\# L4 — Execution Level



\*\*Strict Restricted Access\*\*



\## Users



\* Interns

\* Site Supervisors

\* Junior Engineers

\* Junior Architects



\## Purpose



Assigned work execution only.



\## Core Rule



Users can access \*\*ONLY assigned projects\*\*



No access to company-wide project list.



No visibility into other projects.



\---



\## Dashboard Modules



\### Task Dashboard



\* Assigned Tasks

\* Daily Checklist

\* Progress Submission

\* Attendance

\* Work Log Submission

\* Daily Reporting



\### Assigned Project Information



\* Assigned Drawings

\* Assigned Documents

\* Material Request Form

\* Assigned Milestones

\* Deadline Tracking



\### Limited Budget Visibility



Can see only budget related to assigned task.



Example:



\* Electrical Budget = ₹1,20,000

\* Interior Budget = ₹4,00,000



Cannot see:



\* Total Project Cost

\* Client Payment Data

\* Vendor Contracts

\* Company Financial Reports

\* Other Department Expenses

\* Payroll Information

\* Other Projects



\---



\# Permission Matrix



| Module            | L1  | L2 Finance | L2 HR   | L3        | L4            |

| ----------------- | --- | ---------- | ------- | --------- | ------------- |

| Company Revenue   | YES | NO         | NO      | NO        | NO            |

| Company Profit    | YES | NO         | NO      | NO        | NO            |

| Bank Balance      | YES | NO         | NO      | NO        | NO            |

| All Projects      | YES | YES        | LIMITED | ASSIGNED  | ASSIGNED ONLY |

| Project Budget    | YES | YES        | NO      | LIMITED   | TASK ONLY     |

| Payroll           | YES | LIMITED    | YES     | NO        | NO            |

| Vendor Payments   | YES | YES        | NO      | LIMITED   | NO            |

| Procurement       | YES | YES        | NO      | LIMITED   | REQUEST ONLY  |

| Tax Reports       | YES | YES        | NO      | NO        | NO            |

| Strategic Reports | YES | NO         | NO      | NO        | NO            |

| Attendance        | ALL | ALL        | ALL     | TEAM ONLY | SELF ONLY     |

| Documents         | ALL | RELATED    | RELATED | ASSIGNED  | ASSIGNED ONLY |



\---



\# Security Restrictions



\---



\## L4 Restrictions



\* Cannot search company database

\* Cannot view employee data

\* Cannot export reports

\* Cannot access other projects

\* Cannot download financial documents

\* Cannot view company-wide dashboard



\---



\## L3 Restrictions



\* Export allowed only for assigned project reports

\* Cannot modify financial records

\* Cannot access company financial analytics

\* Cannot access confidential payroll data



\---



\## L2 Restrictions



\### HR Restrictions



Cannot access:



\* Accounting records

\* Vendor payments

\* Procurement financial reports



\### Accountant Restrictions



Cannot access:



\* Confidential HR records

\* Salary negotiations

\* Recruitment decision documents



\---



\## L1 Privileges



\* Full company access

\* Permission override authority

\* Audit trail access

\* Multi-level approval authority

\* Company-wide analytics



\---



\# Recommended Access Logic



Instead of only role-based access, combine:



\* Role

\* Department

\* Project Assignment

\* Approval Level



\---



\## Example Access Logic



\### Junior Engineer



Role = L4

Department = Engineering

Project = Project Alpha

Access Scope = Assigned tasks only



Can View:



\* Assigned tasks

\* Project documents

\* Budget for assigned work



Cannot View:



\* Other projects

\* Company financial reports

\* Profit margins

\* Payroll data

\* Client payment information



\---



\# Access Formula



```text

Permission = Role + Department + Assigned Project + Approval Authority

```



\---



\# System Principles



The dashboard should always follow:



\* Least Privilege Access

\* Department Isolation

\* Project Isolation

\* Financial Confidentiality

\* Audit Logging

\* Secure Data Segmentation

\* Role-Based Access Control (RBAC)



\---



\# Final Security Rule



\*\*Lower hierarchy users must never access information that is not directly relevant to their role, department, or assigned project.\*\*



L4 users can only access:



\* Their assigned tasks

\* Their assigned project

\* Their assigned documents

\* Their own reporting system



No exceptions.



