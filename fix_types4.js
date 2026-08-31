const fs = require('fs');
let code = fs.readFileSync('src/app/(dashboard)/dashboard/actions.ts', 'utf8');
code = code.replace(/let teamMembers = \[\]/g, "let teamMembers: any[] = []");
fs.writeFileSync('src/app/(dashboard)/dashboard/actions.ts', code);
