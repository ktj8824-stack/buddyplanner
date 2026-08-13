const https = require('https');
https.get('https://search.danawa.com/dsearch.php?query=%EA%B3%A8%ED%94%84%EA%B3%B5', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Basic extraction
    const links = data.match(/href="https:\/\/prod\.danawa\.com\/info\/\?pcode=\d+"/g) || [];
    console.log(links.slice(0, 10));
  });
}).on('error', err => console.error(err));
