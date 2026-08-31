const fs = require('fs');
let code = fs.readFileSync('src/app/(dashboard)/automations/automations-client.tsx', 'utf8');
code = code.replace(/handleUpdateRule\(rule\.id, 'trigger_type', val\)/g, "handleUpdateRule(rule.id, 'trigger_type', val as string)");
code = code.replace(/handleUpdateRule\(rule\.id, 'trigger_value', val\)/g, "handleUpdateRule(rule.id, 'trigger_value', val as string)");
code = code.replace(/handleUpdateRule\(rule\.id, 'action_type', val\)/g, "handleUpdateRule(rule.id, 'action_type', val as string)");
code = code.replace(/handleUpdateRule\(rule\.id, 'action_value', val\)/g, "handleUpdateRule(rule.id, 'action_value', val as string)");
fs.writeFileSync('src/app/(dashboard)/automations/automations-client.tsx', code);
