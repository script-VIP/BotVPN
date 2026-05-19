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

async function trialzivpn(serverId, telegramUserId = '', telegramChatId = '') {
  return new Promise((resolve) => {
    db.get('SELECT * FROM Server WHERE id = ?', [serverId], (err, server) => {
      if (err || !server) {
        return resolve('Server tidak ditemukan');
      }

      const baseUrl = normalizeApiBase(server.domain);
      const authToken = normalizeAuthToken(server.auth);
      if (!baseUrl) return resolve('Domain server tidak valid');
      if (!authToken) return resolve('Auth token server kosong/tidak valid');

      const url = `${baseUrl}/vps/trialsshvpn`;
      const cmd = `curl -s -X POST "${url}" \
      -H "Authorization: ${authToken}" \
      -H "X-Telegram-User-Id: ${telegramUserId}" \
      -H "X-Telegram-Chat-Id: ${telegramChatId}" \
      -H "Content-Type: application/json" \
      -d '{"timelimit":"1h","telegram_user_id":"${telegramUserId}","telegram_chat_id":"${telegramChatId}"}'`;

      exec(cmd, (_, stdout) => {
        let res;
        try {
          res = JSON.parse(stdout);
        } catch {
          return resolve('Response server tidak valid');
        }

        if (res?.meta?.code !== 200) {
          return resolve('Gagal membuat trial ZIVPN');
        }

        const s = res.data || {};
        const exp = s.exp || s.expired || '1 Hari/Day';
        const limitIp = String(s.limitip || '1');

        const msg = `
*TRIAL ZIVPN*

- udp password : \`${s.username}\`
- Hostname     : \`${s.hostname}\`
- Expired      : \`${exp}\`
- IP Limit     : ${limitIp} device
`;
        resolve(msg);
      });
    });
  });
}

module.exports = { trialzivpn };
