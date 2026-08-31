const fs = require('fs');
let code = fs.readFileSync('src/app/(dashboard)/kanban/actions.ts', 'utf8');
code = code.replace(/recurring_type: recurringType,/g, "recurring_type: recurringType as any,");
fs.writeFileSync('src/app/(dashboard)/kanban/actions.ts', code);
