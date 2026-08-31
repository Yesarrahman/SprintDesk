const fs = require('fs');
let code = fs.readFileSync('src/app/(dashboard)/automations/automations-client.tsx', 'utf8');
code = code.replace(/onValueChange=\{setNewTriggerValue\}/g, "onValueChange={(v) => setNewTriggerValue(v as string)}");
code = code.replace(/onValueChange=\{setNewActionValue\}/g, "onValueChange={(v) => setNewActionValue(v as string)}");
fs.writeFileSync('src/app/(dashboard)/automations/automations-client.tsx', code);
