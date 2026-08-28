const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = '/app';
const PORT = process.env.PORT || 3000;
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2'
};

// Explicit allowlist of public static assets. Nothing else in /app is ever served
// (protects backend/, .env, source, memory/, dotfiles, etc.).
const ALLOWED = new Set([
  'index.html', 'admin.js', 'admin.css',
  'favicon.svg', 'favicon.png', 'favicon.ico', 'apple-touch-icon.png',
  'og-image.jpg'
]);

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  // Flatten to a single basename — no directory traversal possible.
  let name = path.basename(urlPath);
  if (urlPath === '/' || name === '' ) name = 'index.html';

  const secHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };

  // Only serve allowlisted assets; every other path falls back to index.html.
  const serveName = ALLOWED.has(name) ? name : 'index.html';
  const ext = path.extname(serveName);
  secHeaders['Cache-Control'] = (ext && ext !== '.html')
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=300';

  fs.readFile(path.join(ROOT, serveName), (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, Object.assign({ 'Content-Type': MIME[ext] || 'application/octet-stream' }, secHeaders));
    res.end(data);
  });
}).listen(PORT, '0.0.0.0');
