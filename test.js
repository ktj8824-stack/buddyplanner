const fs = require('fs');
const capCode = fs.readFileSync('www/js/plugins/capacitor.js', 'utf8');
const lnCode = fs.readFileSync('www/js/plugins/local-notifications.js', 'utf8');
eval(capCode);
console.log("capacitorExports keys:", Object.keys(capacitorExports));
eval(lnCode);
console.log("capacitorLocalNotifications keys:", Object.keys(capacitorLocalNotifications));
