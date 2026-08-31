const fs = require('fs');
let code = fs.readFileSync('src/components/kanban/edit-task-dialog.tsx', 'utf8');
code = code.replace(/onValueChange=\{setNewLinkRelation\}/g, "onValueChange={(v) => setNewLinkRelation(v as string)}");
fs.writeFileSync('src/components/kanban/edit-task-dialog.tsx', code);
