const fs = require('fs');
let c = fs.readFileSync('./main.js', 'utf8');
c = c.replace(/The Buzzkill/g, 'Terminator')
     .replace(/THE BUZZKILL/g, 'TERMINATOR')
     .replace(/roll the dice/gi, 'spin the wheel')
     .replace(/it's time to roll/gi, "it's time to spin")
     .replace(/🎲/g, '🎡');
fs.writeFileSync('./main.js', c);
