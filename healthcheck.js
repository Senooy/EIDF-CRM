const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3001,
  path: '/health',
  timeout: 2000
};

const request = http.request(options, (response) => {
  console.log(`STATUS: ${response.statusCode}`);
  if (response.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', function(err) {
  console.log('ERROR', err);
  process.exit(1);
});

request.end();