// Vercel 등 웹 배포에서 js/config.js 만들기
// 키는 저장소에 올리지 않고, 배포 서비스의 환경변수 WEB_CONFIG_JS(파일 내용 전체)에서 받습니다.
const fs = require('fs');
const path = require('path');
const content = process.env.WEB_CONFIG_JS;
if (!content || !content.trim()) {
  console.error('❌ 환경변수 WEB_CONFIG_JS가 없습니다. 배포 서비스 설정 > Environment Variables에 웹용 config.js 내용을 넣어 주세요.');
  process.exit(1);
}
fs.writeFileSync(path.join(__dirname, '..', 'js', 'config.js'), content.trim() + '\n');
console.log('✅ js/config.js 생성');
