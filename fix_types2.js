const fs = require('fs');
let code = fs.readFileSync('src/app/(dashboard)/automations/automations-client.tsx', 'utf8');
code = code.replace(/setNewTriggerType\(v\)/g, "setNewTriggerType(v as string)");
code = code.replace(/setNewActionType\(v\)/g, "setNewActionType(v as string)");
fs.writeFileSync('src/app/(dashboard)/automations/automations-client.tsx', code);
