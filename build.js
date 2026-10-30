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
    'build.js',
    '.gitignore',
    // 개발용/잔여 파일은 앱(APK)에 포함하지 않음
    'scratch.js',
    'test_api.js',
    'package',
    'team-lepisode-capacitor-kakao-login-8.0.0.tgz',
    'config.example.js',
    'supabase'   // 서버 설정 SQL은 앱에 포함하지 않음
];

// API 키 설정 파일이 없으면 키 없는 앱이 만들어지므로 빌드를 중단합니다.
if (!fs.existsSync(path.join(__dirname, 'js', 'config.js'))) {
    console.error('❌ js/config.js 파일이 없습니다. js/config.example.js를 복사해 js/config.js를 만들고 키를 입력하세요.');
    process.exit(1);
}

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
