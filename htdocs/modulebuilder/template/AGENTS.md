# AGENTS.md (English Version)

## 🎯 Objective
This project is based on Dolibarr. Every modification must respect:
- Dolibarr's modular architecture
- Compatibility with upstream updates
- Modern PHP best practices

---

## ⚠️ Critical Rules (DO NOT VIOLATE)

- ❌ **NEVER** modify Dolibarr core files (`htdocs/core/*`)
- ❌ Do not break compatibility with existing modules
- ❌ Do not introduce external dependencies without validation
- ❌ Separate page actions in the `/* Actions */` section of the PHP code and the rendering part in the `/* Views */` section
- ✅ Use Dolibarr hooks whenever possible
- ✅ Respect existing naming conventions

---

## 📁 Expected Architecture

Module structure:
`htdocs/mymodule`
├── `core/`
├── `class/`
├── `lib/`
├── `sql/`
├── `tpl/`
└── `admin/`

A template of the module directory content can be found in the `htdocs/modulebuilder/template` folder of the Dolibarr project at: https://github.com/HolagundiWorks/esti/tree/codex/esti-rebrand-baseline/htdocs/modulebuilder/template.

## 🧠 PHP Best Practices

- PHP >= 7.3
- Strict typing recommended:
  `declare(strict_types=1);`
- Respect PSR-12, but indentations must be Tabs and not Spaces
- Short, readable, and testable functions
- Avoid side effects

## 🗄️ Database

- Use Dolibarr functions (`$db`)
- ✅ Always escape user inputs
- ✅ SQL forged by PHP must escape fields with db->escape(), db->sanitize() or by forcing the cast of the value into an int or float.
- ✅ SQL scripts for table and index creation must be in `/sql/`

## 🔌 Hooks & Extensions

- Prioritize hooks over overrides
- Name hooks clearly
- Document every added hook

## 🧪 Testing & Validation

Before any modification:
- Verify:
    - creation / edition / deletion
    - user rights
    - multi-entity compatibility
- If possible:
    - add a PHP unit file for test

## 🖥️ UI / UX

- Respect Dolibarr UI (no wild redesigns)
- Reuse existing components
- ❌ No overly complex inline JS
- ✅ JS in separate files

## 🔒 Security

- Always validate inputs (`GET`, `POST`) via `GETPOST()`
- Avoid SQL / XSS injections
- Use Dolibarr CSRF tokens in POST forms

## 🧾 Logs & Debug

- Use `dol_syslog()` for logging
- Do not leave `var_dump` / `die` in code

## 🚀 Git Workflow

- One branch per major version (Fix only) and one for `develop` (Fix and new features)
- Clear commits starting with `NEW`, `Close`, or `FIX`

## 🧩 What the agent MUST do

- Read this file before any modification
- Check if an equivalent function already exists
- Minimize the impact of changes
- Propose modular modifications

## ❗ What the agent MUST NOT do

- Massive refactoring without explicit request
- Change the global architecture
- Delete code without justification
- Add external dependencies

## 💡 Key Principle

👉 Always prioritize:
**extension > modification**

## 📌 In case of doubt

- Keep it simple
- Be conservative
- Ask for confirmation before any critical change
