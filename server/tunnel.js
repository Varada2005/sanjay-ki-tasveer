// Mode B: run the server locally and expose it over HTTPS with Cloudflare Tunnel
// (default) or ngrok:  npm run tunnel        |   npm run tunnel -- ngrok
'use strict';
const { spawn } = require('child_process');
const qrcode = require('qrcode-terminal');
const { start } = require('./index');

const useNgrok = process.argv.includes('ngrok') || process.env.TUNNEL === 'ngrok';

(async () => {
  const port = Number(process.env.PORT || 3000);
  const srv = await start({ port });
  console.log(`Local server on http://localhost:${srv.port}`);

  const found = (url) => {
    srv.config.publicUrl = url;
    console.log('\n==============================================');
    console.log(' Public HTTPS URL: ' + url);
    console.log(' Host screen (open on the laptop): ' + url + '/host');
    console.log('==============================================\n');
    qrcode.generate(url + '/host', { small: true });
    console.log('Scan the QR above to open the host screen; the host screen shows the room QR for the phones.');
  };

  let child;
  if (useNgrok) {
    child = spawn('ngrok', ['http', String(srv.port), '--log', 'stdout', '--log-format', 'logfmt'], { shell: process.platform === 'win32' });
  } else {
    // Prefer a portable copy in tools/bin (no install needed), else cloudflared on the PATH.
    const local = require('path').join(__dirname, '..', 'tools', 'bin', process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
    const exe = require('fs').existsSync(local) ? local : 'cloudflared';
    // http2 (TCP 443) works on office/school Wi-Fi that blocks QUIC (UDP 7844).
    child = spawn(exe, ['tunnel', '--no-autoupdate', '--protocol', 'http2', '--url', `http://localhost:${srv.port}`], { shell: exe === 'cloudflared' && process.platform === 'win32' });
  }
  let done = false;
  const scan = (buf) => {
    const s = buf.toString();
    const m = useNgrok ? s.match(/url=(https:\/\/[^\s]+)/) : s.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m && !done) { done = true; found(useNgrok ? m[1] : m[0]); }
  };
  child.stdout.on('data', scan);
  child.stderr.on('data', scan);
  child.on('error', (e) => {
    console.error(`\nCould not start ${useNgrok ? 'ngrok' : 'cloudflared'}: ${e.message}`);
    console.error('Install it first (see README, mode B). The local server keeps running on http://localhost:' + srv.port);
  });
  child.on('exit', (code) => { if (!done) console.error(`${useNgrok ? 'ngrok' : 'cloudflared'} exited (${code}) before giving a URL. See README mode B.`); });
  const stop = async () => { try { child.kill(); } catch (e) {} await srv.close(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
})();
