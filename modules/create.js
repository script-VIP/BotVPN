const axios = require('axios');
const { exec } = require('child_process');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./sellvpn.db');

function normalizeApiBase(rawDomain) {
  const value = String(rawDomain || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value.replace(/\/+$/, '');
  return `http://${value}`.replace(/\/+$/, '');
}

function normalizeAuthToken(rawAuth) {
  const value = String(rawAuth || '').trim();
  if (!value) return '';
  return value.replace(/^Bearer\s+/i, '').trim();
}

function parseJsonFromCurlOutput(stdout) {
  const raw = String(stdout || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}

function splitCurlOutput(rawOut) {
  const raw = String(rawOut || '');
  const marker = '__HTTP_STATUS__:';
  const idx = raw.lastIndexOf(marker);
  if (idx < 0) return { body: raw.trim(), statusCode: 0 };
  const body = raw.slice(0, idx).trim();
  const codeRaw = raw.slice(idx + marker.length).trim();
  const statusCode = Number.parseInt(codeRaw, 10);
  return { body, statusCode: Number.isFinite(statusCode) ? statusCode : 0 };
}

function isHttp2xx(statusCode) {
  return Number(statusCode) >= 200 && Number(statusCode) < 300;
}
async function createssh(username, password, exp, iplimit, serverId, telegramUserId = '', telegramChatId = '') {
  console.log(`Creating SSH account for ${username} with expiry ${exp} days, IP limit ${iplimit}, and password ${password}`);

  // Validasi username
  if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) {
    return 'Ã¢ÂÅ’ Username tidak valid. Mohon gunakan hanya huruf dan angka tanpa spasi.';
  }

  return new Promise((resolve) => {
    db.get('SELECT * FROM Server WHERE id = ?', [serverId], (err, server) => {
      if (err || !server) {
        console.error('Ã¢ÂÅ’ Error fetching server:', err?.message || 'server null');
        return resolve('Ã¢ÂÅ’ Server tidak ditemukan. Silakan coba lagi.');
      }

      const domain = normalizeApiBase(server.domain);
      const param = `/vps/sshvpn`;
      const web_URL = `${domain}${param}`; // misalnya: http://idnusastb.domain.web.id/vps/sshvpn
      const AUTH_TOKEN = normalizeAuthToken(server.auth);
      if (!AUTH_TOKEN) {
        return resolve('Auth token server kosong/tidak valid.');
      }
      const days = exp;
      const KUOTA = "0"; // jika perlu di-hardcode, bisa diubah jadi parameter juga
      const LIMIT_IP = iplimit;

      const curlCommand = `curl -k -sS -L --connect-timeout 10 --max-time 30 -X POST "${web_URL}" \
-H "Authorization: ${AUTH_TOKEN}" \
-H "X-Telegram-User-Id: ${telegramUserId}" \
-H "X-Telegram-Chat-Id: ${telegramChatId}" \
-H "Content-Type: application/json" \
-H "Accept: application/json" \
-d '{"expired":${days},"kuota":"${KUOTA}","limitip":"${LIMIT_IP}","password":"${password}","username":"${username}","telegram_user_id":"${telegramUserId}","telegram_chat_id":"${telegramChatId}"}' \
-w "\\n__HTTP_STATUS__:%{http_code}"`;

      exec(curlCommand, (errExec, stdout, stderr) => {
        const { body, statusCode } = splitCurlOutput(stdout);
        const d = parseJsonFromCurlOutput(body);
        if (!d) {
          if (isHttp2xx(statusCode)) {
            return resolve(`✅ Akun SSH berhasil dibuat\nUsername: \`${username}\`\nExpired: \`${days} hari\`\nIP Limit: \`${LIMIT_IP}\``);
          }
          if (errExec) console.error('Curl request gagal:', errExec.message);
          if (stderr) console.error('Curl stderr:', stderr);
          console.error('Output:', body);
          return resolve('Ã¢ÂÅ’ Format respon dari server tidak valid.');
        }

        if (d?.meta?.code !== 200 || !d.data) {
          console.error('Ã¢ÂÅ’ Respons error:', d);
          const errMsg = d?.message || d?.meta?.message || JSON.stringify(d, null, 2);
          return resolve(`Ã¢ÂÅ’ Respons error:\n${errMsg}`);
        }

        const s = d.data;

        const msg = `
=============================
 *SSH ACCOUNT CREATED*
=============================

*[ SSH PREMIUM DETAILS ]*
-----------------------------
*SSH WS*       : \`${s.hostname}:80@${s.username}:${s.password}\`
*SSH SSL*      : \`${s.hostname}:443@${s.username}:${s.password}\`
*DNS SELOW*    : \`${s.hostname}:5300@${s.username}:${s.password}\`

*[ HOST INFORMATION ]*
-----------------------------
*Hostname*     : \`${s.hostname}\`
*Username*     : \`${s.username}\`
*Password*     : \`${s.password}\`
*Expiry Date*  : \`${s.exp}\`
*Expiry Time*  : \`${s.time}\`
*IP Limit*     : \`${LIMIT_IP === "0" ? "Unlimited" : LIMIT_IP}\`

*[ PORTS ]*
------------------------------
*TLS*          : \`${s.port.tls}\`
*Non-TLS*      : \`${s.port.none}\`
*OVPN TCP*     : \`${s.port.ovpntcp}\`
*OVPN UDP*     : \`${s.port.ovpnudp}\`
*SSH OHP*      : \`${s.port.sshohp}\`
*UDP Custom*   : \`${s.port.udpcustom}\`

*[ PAYLOAD WS ]*
------------------------------
\`GET wss://[host_port]/ HTTP/1.1[crlf]Host: [host_port][crlf]Upgrade: Websocket[crlf]Connection: Keep-Alive[crlf][crlf]\`

*[ PAYLOAD ENHANCED + SPLIT ]*
------------------------------
\`PATCH /ssh-ws HTTP/1.1[crlf]Host: [host][crlf]Host: www.google.com[crlf]Upgrade: websocket[crlf]Connection:
Upgrade[crlf]User-Agent: [ua][crlf][crlf][split]HTTP/1.1 200 OK[crlf][crlf]\`
------------------------------
*Telegram Bots 1forcr - 2026*
*Terima kasih telah menggunakan layanan kami.*
`;

        return resolve(msg);
      });
    });
  });
}

async function createudphttp(username, password, exp, iplimit, serverId, telegramUserId = '', telegramChatId = '') {
  console.log(`Creating UDP HTTP Custom account for ${username} with expiry ${exp} days, IP limit ${iplimit}, and password ${password}`);

  if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) {
    return 'Ã¢ÂÅ’ Username tidak valid. Mohon gunakan hanya huruf dan angka tanpa spasi.';
  }

  return new Promise((resolve) => {
    db.get('SELECT * FROM Server WHERE id = ?', [serverId], (err, server) => {
      if (err || !server) {
        console.error('Ã¢ÂÅ’ Error fetching server:', err?.message || 'server null');
        return resolve('Ã¢ÂÅ’ Server tidak ditemukan. Silakan coba lagi.');
      }

      const domain = normalizeApiBase(server.domain);
      const param = `/vps/sshvpn`;
      const web_URL = `${domain}${param}`;
      const AUTH_TOKEN = normalizeAuthToken(server.auth);
      if (!AUTH_TOKEN) {
        return resolve('Auth token server kosong/tidak valid.');
      }
      const days = exp;
      const KUOTA = "0";
      const LIMIT_IP = iplimit;

      const curlCommand = `curl -k -sS -L --connect-timeout 10 --max-time 30 -X POST "${web_URL}" \
-H "Authorization: ${AUTH_TOKEN}" \
-H "X-Telegram-User-Id: ${telegramUserId}" \
-H "X-Telegram-Chat-Id: ${telegramChatId}" \
-H "Content-Type: application/json" \
-H "Accept: application/json" \
-d '{"expired":${days},"kuota":"${KUOTA}","limitip":"${LIMIT_IP}","password":"${password}","username":"${username}","telegram_user_id":"${telegramUserId}","telegram_chat_id":"${telegramChatId}"}' \
-w "\\n__HTTP_STATUS__:%{http_code}"`;

      exec(curlCommand, (errExec, stdout, stderr) => {
        const { body, statusCode } = splitCurlOutput(stdout);
        const d = parseJsonFromCurlOutput(body);
        if (!d) {
          if (isHttp2xx(statusCode)) {
            return resolve(`✅ Akun UDP HTTP berhasil dibuat\nUsername: \`${username}\`\nExpired: \`${days} hari\`\nIP Limit: \`${LIMIT_IP}\``);
          }
          if (errExec) console.error('Curl request gagal:', errExec.message);
          if (stderr) console.error('Curl stderr:', stderr);
          console.error('Output:', body);
          return resolve('Ã¢ÂÅ’ Format respon dari server tidak valid.');
        }

        if (d?.meta?.code !== 200 || !d.data) {
          console.error('Ã¢ÂÅ’ Respons error:', d);
          const errMsg = d?.message || d?.meta?.message || JSON.stringify(d, null, 2);
          return resolve(`Ã¢ÂÅ’ Respons error:\n${errMsg}`);
        }

        const s = d.data;
        const port = '1-65535';
        const expired = s.exp || s.expired || s.to || 'N/A';
        const ipLimitText = LIMIT_IP === "0" ? "Unlimited" : LIMIT_IP;
        const copy = `${s.hostname}:${port}@${s.username}:${s.password}`;

        const msg = `*UDP HTTP CUSTOM ACCOUNT*

*Hostname*   : \`${s.hostname}\`
*Username*   : \`${s.username}\`
*Password*   : \`${s.password}\`
*Port*       : \`${port}\`
*Expired*    : \`${expired}\`
*IP Limit*   : \`${ipLimitText}\`

*Copy*:
\`${copy}\``;

        return resolve(msg);
      });
    });
  });
}
async function createvmess(username, exp, quota, limitip, serverId, telegramUserId = '', telegramChatId = '') {
  console.log(`Creating VMess account for ${username} with expiry ${exp} days, quota ${quota} GB, IP limit ${limitip}`);

  // Validasi username
  if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) {
    return 'Username tidak valid. Mohon gunakan hanya huruf dan angka tanpa spasi.';
  }

  return new Promise((resolve) => {
    db.get('SELECT * FROM Server WHERE id = ?', [serverId], (err, server) => {
      if (err || !server) {
        console.error('Error fetching server:', err?.message || 'server null');
        return resolve('Server tidak ditemukan. Silakan coba lagi.');
      }

      const domain = normalizeApiBase(server.domain);
      const param = `/vps/vmessall`;
      const web_URL = `${domain}${param}`;
      const AUTH_TOKEN = normalizeAuthToken(server.auth);
      if (!AUTH_TOKEN) {
        return resolve('Auth token server kosong/tidak valid.');
      }
      const days = exp;
      const KUOTA = quota;
      const LIMIT_IP = limitip;

      const curlCommand = `curl -k -sS -L --connect-timeout 10 --max-time 30 -X POST "${web_URL}" \
-H "Authorization: ${AUTH_TOKEN}" \
-H "X-Telegram-User-Id: ${telegramUserId}" \
-H "X-Telegram-Chat-Id: ${telegramChatId}" \
-H "Content-Type: application/json" \
-H "Accept: application/json" \
-d '{"expired":${days},"kuota":"${KUOTA}","limitip":"${LIMIT_IP}","username":"${username}","telegram_user_id":"${telegramUserId}","telegram_chat_id":"${telegramChatId}"}' \
-w "\\n__HTTP_STATUS__:%{http_code}"`;

      exec(curlCommand, (errExec, stdout, stderr) => {
        const { body, statusCode } = splitCurlOutput(stdout);
        const d = parseJsonFromCurlOutput(body);
        if (!d) {
          if (isHttp2xx(statusCode)) {
            return resolve(`✅ Akun VMESS berhasil dibuat\nUsername: \`${username}\`\nExpired: \`${days} hari\`\nQuota: \`${KUOTA} GB\`\nIP Limit: \`${LIMIT_IP}\``);
          }
          if (errExec) console.error('Curl request failed:', errExec.message);
          if (stderr) console.error('Curl stderr:', stderr);
          console.error('Output:', body);
          return resolve('Format respon dari server tidak valid.');
        }

        if (d?.meta?.code !== 200 || !d.data) {
          console.error('Response error:', d);
          const errMsg = d?.message || d?.meta?.message || JSON.stringify(d, null, 2);
          return resolve(`Respons error:\n${errMsg}`);
        }

        const s = d.data;

        const remarks = s.remark || s.remarks || s.username || username;
        const city = s.city || s.kota || s.location || '-';
        const isp = s.isp || s.org || s.organization || '-';
        const pathWs = (s.path && (s.path.ws || s.path.stn)) || s.path || '/vmess';
        const serviceName = s.serviceName || 'vmess';
        const pathUpgrade = s.path && (s.path.upgrade || s.path.up || s.path.upws)
          ? (s.path.upgrade || s.path.up || s.path.upws)
          : '/upvmess';
        const portTls = s.port?.tls || '-';
        const portNone = s.port?.none || '-';
        const portAny = s.port?.any || '-';
        const portGrpc = s.port?.grpc || '-';
        const linkTls = s.link?.tls || '-';
        const linkNone = s.link?.none || '-';
        const linkGrpc = s.link?.grpc || '-';
        const linkUpTls = s.link?.uptls || s.link?.upgrade_tls || s.link?.upgrade || '-';
        const linkUpNone = s.link?.upntls || s.link?.upgrade_none || s.link?.upgrade_ntls || '-';

        const msg = `
=============================
        *VMESS ACCOUNT*
=============================

*[ VMESS DETAILS ]*
-----------------------------
*REMARKS*     : \`${remarks}\`
*HOST*        : \`${s.hostname}\`
*PORT TLS*    : \`${portTls}\`
*PORT NTLS*   : \`${portNone}\`
*PORT GRPC*   : \`${portGrpc}\`
*PORT ANY*    : \`${portAny}\`
*UUID*        : \`${s.uuid}\`
*ALTER ID*    : \`0\`
*SECURITY*    : \`auto\`
*NETWORK*     : \`ws, grpc, upgrade\`
*PATH WS*     : \`${pathWs}\`
*SERVICE*     : \`${serviceName}\`
*PATH UPGRADE*: \`${pathUpgrade}\`
*EXPIRED*     : \`${s.expired || '-'}\` - \`${s.time || '-'}\`
*QUOTA*       : \`${KUOTA === "0" ? "Unlimited" : KUOTA} GB\`
*IP LIMIT*    : \`${LIMIT_IP === "0" ? "Unlimited" : LIMIT_IP} pengguna\`

*[ VMESS URL ]*
-----------------------------
TLS:
\`${linkTls}\`

Non-TLS:
\`${linkNone}\`

gRPC:
\`${linkGrpc}\`

Up TLS:
\`${linkUpTls}\`

Up Non-TLS:
\`${linkUpNone}\`

*[ HOST INFORMATION ]*
-----------------------------
*Domain*      : \`${s.hostname}\`
*SNI*         : \`${s.hostname}\`
*City*        : \`${city}\`
*ISP*         : \`${isp}\`

*[ PORTS ]*
-----------------------------
*WS TLS*      : \`${portTls}\`
*WS NTLS*     : \`${portNone}\`
*GRPC TLS*    : \`${portGrpc}\`
*ANY PORT*    : \`${portAny}\`
-----------------------------
*Telegram Bots 1forcr - 2026*
*Terima kasih telah menggunakan layanan kami.*
`;

        return resolve(msg);
      });
    });
  });
}

async function createvless(username, exp, quota, limitip, serverId, telegramUserId = '', telegramChatId = '') {
  console.log(`Creating VLESS account for ${username} with expiry ${exp} days, quota ${quota} GB, limit IP ${limitip}`);

  // Validasi username
  if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) {
    return 'Ã¢ÂÅ’ Username tidak valid. Mohon gunakan hanya huruf dan angka tanpa spasi.';
  }

  return new Promise((resolve) => {
    db.get('SELECT * FROM Server WHERE id = ?', [serverId], (err, server) => {
      if (err || !server) {
        console.error('Ã¢ÂÅ’ Error fetching server:', err?.message || 'server null');
        return resolve('Ã¢ÂÅ’ Server tidak ditemukan. Silakan coba lagi.');
      }

      const domain = normalizeApiBase(server.domain);
      const param = `/vps/vlessall`;
      const web_URL = `${domain}${param}`; // Contoh: http://domainmu.com/vps/vless
      const AUTH_TOKEN = normalizeAuthToken(server.auth);
      if (!AUTH_TOKEN) {
        return resolve('Auth token server kosong/tidak valid.');
      }
      const days = exp;
      const KUOTA = quota;
      const LIMIT_IP = limitip;

      const curlCommand = `curl -k -sS -L --connect-timeout 10 --max-time 30 -X POST "${web_URL}" \
-H "Authorization: ${AUTH_TOKEN}" \
-H "X-Telegram-User-Id: ${telegramUserId}" \
-H "X-Telegram-Chat-Id: ${telegramChatId}" \
-H "Content-Type: application/json" \
-H "Accept: application/json" \
-d '{"expired":${days},"kuota":"${KUOTA}","limitip":"${LIMIT_IP}","username":"${username}","telegram_user_id":"${telegramUserId}","telegram_chat_id":"${telegramChatId}"}' \
-w "\\n__HTTP_STATUS__:%{http_code}"`;

      exec(curlCommand, (errExec, stdout, stderr) => {
        const { body, statusCode } = splitCurlOutput(stdout);
        const d = parseJsonFromCurlOutput(body);
        if (!d) {
          if (isHttp2xx(statusCode)) {
            return resolve(`✅ Akun VLESS berhasil dibuat\nUsername: \`${username}\`\nExpired: \`${days} hari\`\nQuota: \`${KUOTA} GB\`\nIP Limit: \`${LIMIT_IP}\``);
          }
          if (errExec) console.error('Curl request gagal:', errExec.message);
          if (stderr) console.error('Curl stderr:', stderr);
          console.error('Output:', body);
          return resolve('Ã¢ÂÅ’ Format respon dari server tidak valid.');
        }

        if (d?.meta?.code !== 200 || !d.data) {
          console.error('Ã¢ÂÅ’ Respons error:', d);
          const errMsg = d?.message || d?.meta?.message || JSON.stringify(d, null, 2);
          return resolve(`Ã¢ÂÅ’ Respons error:\n${errMsg}`);
        }

        const s = d.data;

        const msg = `
=============================
        *VLESS ACCOUNT*
=============================

*[ VLESS DETAILS ]*
-----------------------------
*HOST*        : \`${s.hostname}\`
*PORT TLS*    : \`${s.port.tls}\`
*PORT NTLS*   : \`${s.port.none}\`
*UUID*        : \`${s.uuid}\`
*NETWORK*     : \`ws, grpc, upgrade\`
*PATH*        : \`${s.path.stn}\`
*EXPIRED*     : \`${s.expired}\` - \`${s.time}\`
*QUOTA*       : \`${KUOTA === "0" ? "Unlimited" : KUOTA} GB\`
*IP LIMIT*    : \`${LIMIT_IP === "0" ? "Unlimited" : LIMIT_IP} pengguna\`

*[ VLESS URL ]*
-----------------------------
TLS:
\`${s.link.tls}\`

Non-TLS:
\`${s.link.none}\`

gRPC:
\`${s.link.grpc}\`

Up TLS:
\`${s.link.uptls}\`

Up Non-TLS:
\`${s.link.upntls}\`

*[ HOST INFORMATION ]*
-----------------------------
*Domain*      : \`${s.hostname}\`
*SNI*         : \`${s.hostname}\`

*[ PORTS ]*
-----------------------------
*WS TLS*      : \`${s.port.tls}\`
*WS NTLS*     : \`${s.port.none}\`
*ANY PORT*    : \`${s.port.any}\`
-----------------------------
*Telegram Bots 1forcr - 2026*
*Terima kasih telah menggunakan layanan kami.*
`;

        return resolve(msg);
      });
    });
  });
}
async function createtrojan(username, exp, quota, limitip, serverId, telegramUserId = '', telegramChatId = '') {
  console.log(`Creating Trojan account for ${username} with expiry ${exp} days, quota ${quota} GB, limit IP ${limitip}`);

  // Validasi username
  if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) {
    return 'Ã¢ÂÅ’ Username tidak valid. Mohon gunakan hanya huruf dan angka tanpa spasi.';
  }

  return new Promise((resolve) => {
    db.get('SELECT * FROM Server WHERE id = ?', [serverId], (err, server) => {
      if (err || !server) {
        console.error('Ã¢ÂÅ’ Error fetching server:', err?.message || 'server null');
        return resolve('Ã¢ÂÅ’ Server tidak ditemukan. Silakan coba lagi.');
      }

      const domain = normalizeApiBase(server.domain);
      const param = `/vps/trojanall`;
      const web_URL = `${domain}${param}`; // contoh: http://domainmu.com/vps/trojan
      const AUTH_TOKEN = normalizeAuthToken(server.auth);
      if (!AUTH_TOKEN) {
        return resolve('Auth token server kosong/tidak valid.');
      }
      const days = exp;
      const KUOTA = quota;
      const LIMIT_IP = limitip;

      const curlCommand = `curl -k -sS -L --connect-timeout 10 --max-time 30 -X POST "${web_URL}" \
-H "Authorization: ${AUTH_TOKEN}" \
-H "X-Telegram-User-Id: ${telegramUserId}" \
-H "X-Telegram-Chat-Id: ${telegramChatId}" \
-H "Content-Type: application/json" \
-H "Accept: application/json" \
-d '{"expired":${days},"kuota":"${KUOTA}","limitip":"${LIMIT_IP}","username":"${username}","telegram_user_id":"${telegramUserId}","telegram_chat_id":"${telegramChatId}"}' \
-w "\\n__HTTP_STATUS__:%{http_code}"`;

      exec(curlCommand, (errExec, stdout, stderr) => {
        const { body, statusCode } = splitCurlOutput(stdout);
        const d = parseJsonFromCurlOutput(body);
        if (!d) {
          if (isHttp2xx(statusCode)) {
            return resolve(`✅ Akun TROJAN berhasil dibuat\nUsername: \`${username}\`\nExpired: \`${days} hari\`\nQuota: \`${KUOTA} GB\`\nIP Limit: \`${LIMIT_IP}\``);
          }
          if (errExec) console.error('Curl request gagal:', errExec.message);
          if (stderr) console.error('Curl stderr:', stderr);
          console.error('Output:', body);
          return resolve('Ã¢ÂÅ’ Format respon dari server tidak valid.');
        }

        if (d?.meta?.code !== 200 || !d.data) {
          console.error('Ã¢ÂÅ’ Respons error:', d);
          const errMsg = d?.message || d?.meta?.message || JSON.stringify(d, null, 2);
          return resolve(`Ã¢ÂÅ’ Respons error:\n${errMsg}`);
        }

        const s = d.data;

        const msg = `
=============================
        *TROJAN ACCOUNT*
=============================

*[ TROJAN DETAILS ]*
-----------------------------
*HOST*        : \`${s.hostname}\`
*PORT TLS*    : \`${s.port.tls}\`
*PORT NTLS*   : \`${s.port.none}\`
*KEY*         : \`${s.uuid}\`
*NETWORK*     : \`ws, grpc, upgrade\`
*PATH*        : \`${s.path.stn}\`
*EXPIRED*     : \`${s.expired}\` - \`${s.time}\`
*QUOTA*       : \`${KUOTA === "0" ? "Unlimited" : KUOTA} GB\`
*IP LIMIT*    : \`${LIMIT_IP === "0" ? "Unlimited" : LIMIT_IP} pengguna\`

*[ TROJAN LINK ]*
-----------------------------
TLS:
\`${s.link.tls}\`

gRPC:
\`${s.link.grpc}\`

Up TLS:
\`${s.link.uptls}\`

*[ HOST INFORMATION ]*
-----------------------------
*Domain*      : \`${s.hostname}\`
*SNI*         : \`${s.hostname}\`

*[ PORTS ]*
-----------------------------
*WS TLS*      : \`${s.port.tls}\`
*WS NTLS*     : \`${s.port.none}\`
*ANY PORT*    : \`${s.port.any}\`
*GRPC TLS*    : \`${s.port.grpc}\`
-----------------------------
*Telegram Bots 1forcr - 2026*
*Terima kasih telah menggunakan layanan kami.*
`;

        return resolve(msg);
      });
    });
  });
}


//create shadowsocks ga ada di potato
async function createshadowsocks(username, exp, quota, limitip, serverId) {
  console.log(`Creating Shadowsocks account for ${username} with expiry ${exp} days, quota ${quota} GB, limit IP ${limitip} on server ${serverId}`);

  // Validasi username
  if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) {
    return 'Ã¢ÂÅ’ Username tidak valid. Mohon gunakan hanya huruf dan angka tanpa spasi.';
  }

  // Ambil domain dari database
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM Server WHERE id = ?', [serverId], (err, server) => {
      if (err) {
        console.error('Error fetching server:', err.message);
        return resolve('Ã¢ÂÅ’ Server tidak ditemukan. Silakan coba lagi.');
      }

      if (!server) return resolve('Ã¢ÂÅ’ Server tidak ditemukan. Silakan coba lagi.');

      const domain = normalizeApiBase(server.domain);
      const auth = normalizeAuthToken(server.auth);
      if (!auth) return resolve('Ã¢ÂÅ’ Auth token server kosong/tidak valid.');
      const param = `:5888/createshadowsocks?user=${username}&exp=${exp}&quota=${quota}&iplimit=${limitip}&auth=${auth}`;
      const url = `${domain}${param}`;
      axios.get(url)
        .then(response => {
          if (response.data.status === "success") {
            const shadowsocksData = response.data.data;
            const msg = `
Ã°Å¸Å’Å¸ *AKUN SHADOWSOCKS PREMIUM* Ã°Å¸Å’Å¸

Ã°Å¸â€Â¹ *Informasi Akun*
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
Ã¢â€â€š *Username* : \`${shadowsocksData.username}\`
Ã¢â€â€š *Domain*   : \`${shadowsocksData.domain}\`
Ã¢â€â€š *NS*       : \`${shadowsocksData.ns_domain}\`
Ã¢â€â€š *Port TLS* : \`443\`
Ã¢â€â€š *Port HTTP*: \`80\`
Ã¢â€â€š *Alter ID* : \`0\`
Ã¢â€â€š *Security* : \`Auto\`
Ã¢â€â€š *Network*  : \`Websocket (WS)\`
Ã¢â€â€š *Path*     : \`/shadowsocks\`
Ã¢â€â€š *Path GRPC*: \`shadowsocks-grpc\`
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
Ã°Å¸â€Â *URL SHADOWSOCKS TLS*
\`\`\`
${shadowsocksData.ss_link_ws}
\`\`\`
Ã°Å¸â€â€™ *URL SHADOWSOCKS GRPC*
\`\`\`
${shadowsocksData.ss_link_grpc}
\`\`\`
Ã°Å¸â€â€™ *PUBKEY*
\`\`\`
${shadowsocksData.pubkey}
\`\`\`
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
Ã¢â€â€š Expiry: \`${shadowsocksData.expired}\`
Ã¢â€â€š Quota: \`${shadowsocksData.quota === '0 GB' ? 'Unlimited' : shadowsocksData.quota}\`
Ã¢â€â€š IP Limit: \`${shadowsocksData.ip_limit === '0' ? 'Unlimited' : shadowsocksData.ip_limit} IP\`
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
Save Account Link: [Save Account](https://${shadowsocksData.domain}:81/shadowsocks-${shadowsocksData.username}.txt)
Ã¢Å“Â¨ Selamat menggunakan layanan kami! Ã¢Å“Â¨
`;
            console.log('Shadowsocks account created successfully');
            return resolve(msg);
          } else {
            console.log('Error creating Shadowsocks account');
            return resolve(`Ã¢ÂÅ’ Terjadi kesalahan: ${response.data.message}`);
          }
        })
        .catch(error => {
          console.error('Error saat membuat Shadowsocks:', error);
          return resolve('Ã¢ÂÅ’ Terjadi kesalahan saat membuat Shadowsocks. Silakan coba lagi nanti.');
        });
    });
  });
}

module.exports = { createssh, createudphttp, createvmess, createvless, createtrojan, createshadowsocks };
