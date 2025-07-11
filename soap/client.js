const http = require('http');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const createSOAPRequest = (operation, a, b) => `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://example.com/calculator">
  <soap:Body>
    <tns:${operation}>
      <a>${a}</a>
      <b>${b}</b>
    </tns:${operation}>
  </soap:Body>
</soap:Envelope>`;

const parseSOAPResponse = (body) => {
  const faultMatch = body.match(/<faultstring>(.+?)<\/faultstring>/);
  if (faultMatch) {
    return { error: faultMatch[1] };
  }
  const resultMatch = body.match(/<result>([\d.]+?)<\/result>/);
  return { result: resultMatch ? parseFloat(resultMatch[1]) : null };
};

const sendSOAPRequest = (operation, a, b, callback) => {
  const postData = createSOAPRequest(operation, a, b);
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/calculator',
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const { result, error } = parseSOAPResponse(data);
      callback(error, result);
    });
  });

  req.on('error', err => callback(err.message));
  req.write(postData);
  req.end();
};

console.log('Calculator SOAP Client');
console.log('1. Add');
console.log('2. Subtract');
console.log('3. Multiply');
console.log('4. Divide');

rl.question('Select operation (1-4): ', choice => {
  rl.question('Enter first number: ', a => {
    rl.question('Enter second number: ', b => {
      const operations = {
        '1': { method: 'Add', symbol: '+' },
        '2': { method: 'Subtract', symbol: '-' },
        '3': { method: 'Multiply', symbol: '*' },
        '4': { method: 'Divide', symbol: '/' }
      };

      const op = operations[choice];
      if (!op) {
        console.log('Invalid choice');
        rl.close();
        return;
      }

      sendSOAPRequest(op.method, parseFloat(a), parseFloat(b), (error, result) => {
        if (error) {
          console.error('Error:', error);
        } else {
          console.log(`Result: ${a} ${op.symbol} ${b} = ${result}`);
        }
        rl.close();
      });
    });
  });
});