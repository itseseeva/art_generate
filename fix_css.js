const fs = require('fs');
const path = 'c:\\project_A\\frontend\\src\\components\\MessageInput.tsx';
let txt = fs.readFileSync(path, 'utf8');

txt = txt.replace(/([a-z])\s+-\s+([a-z])/ig, '$1-$2');
txt = txt.replace(/([0-9])\s+%\s+/g, '$1% ');
txt = txt.replace(/100\s+%/g, '100%');

fs.writeFileSync(path, txt);
console.log('Fixed css properties');
