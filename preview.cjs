// Private Wi-Fi preview of the standalone file. Requires only Node.js.
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const file = path.join(__dirname, 'Forest-Nightwatch.html');
if (!fs.existsSync(file)) throw Error('Place Forest-Nightwatch.html next to preview.cjs');
const key = crypto.randomBytes(16).toString('hex');
const trusted = Object.values(os.networkInterfaces()).flat().filter(ip =>
  ip && ip.family === 'IPv4' && !ip.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip.address));
const bits = ip => ip.split('.').reduce((n,p) => (n<<8) | Number(p), 0);
for (const ip of trusted) {
  const server = http.createServer((req,res) => {
    const remote = req.socket.remoteAddress || '';
    if ((bits(remote) & bits(ip.netmask)) !== (bits(ip.address) & bits(ip.netmask)) ||
        !['GET','HEAD'].includes(req.method) || req.url !== '/play/' + key) {
      res.writeHead(404).end();return;
    }
    res.writeHead(200, {'Content-Type':'text/html; charset=UTF-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
    if(req.method==='HEAD')res.end();else fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  });
  server.on('error',err=>console.error(ip.address,err.message));
  server.listen(0,ip.address,()=>console.log('Safari: http://'+ip.address+':'+server.address().port+'/play/'+key));
}
if(!trusted.length)console.log('Connect this computer and your phone to the same Wi-Fi first.');
