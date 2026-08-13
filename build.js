const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const destDir = path.join(__dirname, 'www');

const excludeList = [
    'node_modules',
    '.git',
    '.vscode',
    '.agents',
    'android',
    'www',
    'package.json',
    'package-lock.json',
    'capacitor.config.json',
    'capacitor.config.ts',
    'build.js'
];

function copyRecursiveSync(src, dest) {
    if (excludeList.includes(path.basename(src))) return;

    const stats = fs.statSync(src);
    const isDirectory = stats.isDirectory();

    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        fs.readdirSync(src).forEach(function(childItemName) {
            copyRecursiveSync(path.join(src, childItemName),
                              path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

if (!fs.existsSync(destDir)){
    fs.mkdirSync(destDir);
}

console.log('Copying web assets to www folder...');
fs.readdirSync(srcDir).forEach(item => {
    if (!excludeList.includes(item)) {
        copyRecursiveSync(path.join(srcDir, item), path.join(destDir, item));
    }
});
console.log('Copy complete.');
