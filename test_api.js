const APP_KEY = 'aBQaawS7Sy5wtEfvogEbb8syJzjxNNFA4cr55qBO';
const keyword = '맛집';
const lng = 126.978;
const lat = 37.566;
const radius = 3;

const searchUrl = `https://apis.openapi.sk.com/tmap/pois?version=1&searchKeyword=${encodeURIComponent(keyword)}&centerLon=${lng}&centerLat=${lat}&radius=${radius}&resCoordType=WGS84GEO&reqCoordType=WGS84GEO&count=5&appKey=${APP_KEY}`;

fetch(searchUrl)
  .then(r => r.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error(err));
