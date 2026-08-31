const fs = require('fs');
let code = fs.readFileSync('src/components/layout/notifications-dropdown.tsx', 'utf8');

code = code.replace(
  /<PopoverTrigger asChild>\s*<Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-700">/g,
  '<PopoverTrigger className="relative inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 h-9 w-9 text-slate-500 hover:text-slate-700">'
);
code = code.replace(
  /<\/span>\s*<\/div>\s*\)\}\s*<\/Button>\s*<\/PopoverTrigger>/g,
  '</span></div>)}\n      </PopoverTrigger>'
);

fs.writeFileSync('src/components/layout/notifications-dropdown.tsx', code);
