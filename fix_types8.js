const fs = require('fs');
let code = fs.readFileSync('src/components/layout/notifications-dropdown.tsx', 'utf8');
code = code.replace(
  /<PopoverTrigger className="/g,
  '<Popover>\n      <PopoverTrigger className="'
);
fs.writeFileSync('src/components/layout/notifications-dropdown.tsx', code);
