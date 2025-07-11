const http = require('http');
const fs = require('fs');
const path = require('path');

const wsdlPath = path.join(__dirname, 'calculator.wsdl');
const wsdl = fs.readFileSync(wsdlPath, 'utf8');

const parseSOAPRequest = (body) => {
  // Match operation with optional namespace (e.g., tns:Add or Add)
  const operationMatch = body.match(/<(?:tns:)?(\w+?)>/);
  const operation = operationMatch ? operationMatch[1] : null;
  const aMatch = body.match(/<a>([\d.]+?)<\/a>/);
  const bMatch = body.match(/<b>([\d.]+?)<\/b>/);
  const a = aMatch ? parseFloat(aMatch[1]) : null;
  const b = bMatch ? parseFloat(bMatch[1]) : null;
  console.log('Parsed SOAP:', { operation, a, b }); // Debug log
  return { operation, a, b };
};

const createSOAPResponse = (operation, result, error = null) => {
  if (error) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Server</faultcode>
      <faultstring>${error}</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://example.com/calculator">
  <soap:Body>
    <tns:${operation}Response>
      <result>${result}</result>
    </tns:${operation}Response>
  </soap:Body>
</soap:Envelope>`;
};

const server = http.createServer((req, res) => {
  if (req.url === '/calculator?wsdl' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(wsdl);
    return;
  }

  if (req.url === '/calculator' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      console.log('Received SOAP Request:', body); // Debug log
      const { operation, a, b } = parseSOAPRequest(body);
      let result, error;

      if (!operation || a === null || b === null) {
        error = 'Invalid SOAP request';
      } else {
        switch (operation) {
          case 'Add':
            result = a + b;
            break;
          case 'Subtract':
            result = a - b;
            break;
          case 'Multiply':
            result = a * b;
            break;
          case 'Divide':
            if (b === 0) {
              error = 'Division by zero';
            } else {
              result = a / b;
            }
            break;
          default:
            error = 'Unknown operation';
        }
      }

      res.writeHead(200, { 'Content-Type': 'text/xml' });
      res.end(createSOAPResponse(operation, result, error));
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(5000, () => {
  console.log('SOAP server running at http://localhost:5000/calculator?wsdl');
});