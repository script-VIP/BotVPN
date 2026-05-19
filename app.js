const { Telegraf, Markup } = require('telegraf');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Import modul kustom yang baru dibuat
const templates = require('./modules/templates');
const helpers = require('./modules/helpers');

// Load konfigurasi .vars.json yang diisi saat instalasi
const varsPath = path.join(__dirname, '.vars.json');
let vars = {};
if (fs.existsSync(varsPath)) {
  vars = JSON.parse(fs.readFileSync(varsPath, 'utf8'));
}

const bot = new Telegraf(vars.BOT_TOKEN);
const db = new sqlite3.Database(path.join(__dirname, 'ressel.db'));

// Lokasi penyimpanan konfigurasi batas aktif oleh admin
const adminConfigPath = path.join(__dirname, 'modules/admin_config.json');
function getAdminConfig() {
  if (!fs.existsSync(adminConfigPath)) {
    fs.writeFileSync(adminConfigPath, JSON.stringify({ min_days: 30, max_days: 365 }, null, 2));
  }
  return JSON.parse(fs.readFileSync(adminConfigPath, 'utf8'));
}

// HANDLER COMMAND /START
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name || 'User';

  // Ambil data saldo dan status reseller dari database sqlite
  db.get('SELECT saldo, is_reseller FROM users WHERE user_id = ?', [userId], async (err, row) => {
    if (err) console.error(err);
    
    const saldo = row ? row.saldo : 0;
    const statusReseller = row && row.is_reseller === 1 ? '✨ Reseller Premium' : 'Pelanggan Biasa';

    // Panggil template menu utama
    const textText = templates.menuUtama(userName, userId, saldo, statusReseller, vars);

    await ctx.replyWithHTML(textText, Markup.inlineKeyboard([
      [Markup.button.callback('➕ Buat Akun VPN', 'pilih_metode_bayar')],
      [Markup.button.callback('🤝 Join Reseller', 'hubungi_admin')],
      [Markup.button.callback('⚙️ Menu Admin Panel', 'menu_admin_utama', userId.toString() === vars.USER_ID.toString())]
    ].filter(Boolean)));
  });
});

// HANDLER PILIHAN METODE PEMBAYARAN SAAT BUAT AKUN
bot.action('pilih_metode_bayar', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.replyWithHTML(templates.menuPembayaran(), Markup.inlineKeyboard([
    [Markup.button.callback('⭐️ QRIS (Rekomendasi)', 'bayar_qris_langsung')],
    [Markup.button.callback('💰 Potong Saldo', 'bayar_pakai_saldo')],
    [Markup.button.callback('🔙 Kembali', 'kembali_ke_utama')]
  ]));
});

// HANDLER QRIS LANGSUNG + BIAYA LAYANAN OTOMATIS (250-700)
bot.action('bayar_qris_langsung', async (ctx) => {
  await ctx.answerCbQuery();
  
  const hargaDasar = 5000; // Contoh nilai default harga akun
  const biayaLayanan = helpers.generateBiayaLayanan();
  const totalWajibBayar = hargaDasar + biayaLayanan;

  await ctx.replyWithHTML(
    templates.detailQris(hargaDasar, biayaLayanan, totalWajibBayar),
    Markup.inlineKeyboard([
      [Markup.button.callback('🖼️ Tampilkan QR CODE', 'generate_qr_code')],
      [Markup.button.callback('🔙 Kembali', 'pilih_metode_bayar')]
    ])
  );
});

// HANDLER JOIN RESELLER (HUBUNGI ADMIN)
bot.action('hubungi_admin', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.replyWithHTML(templates.menuReseller(vars), Markup.inlineKeyboard([
    [Markup.button.url('💬 Chat WhatsApp', `https://wa.me/${vars.ADMIN_WHATSAPP || ''}`)],
    [Markup.button.url('✈️ Chat Telegram', `https://t.me/${(vars.ADMIN_TELEGRAM || '').replace('@', '')}`)],
    [Markup.button.callback('🔙 Kembali', 'kembali_ke_utama')]
  ]));
});

// HANDLER PROSES MENERIMA INPUT USERNAME (CONTOH VALIDASI)
bot.on('text', async (ctx) => {
  // Contoh implementasi pengecekan saat user memasukkan nama untuk akun baru
  const inputUser = ctx.message.text;
  
  // Jika sedang dalam state membuat akun, lakukan pengecekan format username:
  if (ctx.session?.waitingForUsername) {
    const isValid = helpers.validateUsername(inputUser);
    if (!isValid) {
      return ctx.replyWithHTML('❌ <b>Format Salah!</b>\nUsername akun harus terdiri dari kombinasi <b>minimal 3 huruf</b> dan <b>minimal 3 angka</b>.');
    }
    // Lanjutkan proses pembuatan akun vpn jika valid...
  }
});

// SETTING MASA AKTIF MIN/MAX OLEH ADMIN VIA COMMAND
bot.command('setmin', (ctx) => {
  if (ctx.from.id.toString() !== vars.USER_ID.toString()) return;
  const days = parseInt(ctx.message.text.split(' ')[1]);
  if (!days) return ctx.reply('Gunakan format: /setmin <jumlah_hari>');
  
  const config = getAdminConfig();
  config.min_days = days;
  fs.writeFileSync(adminConfigPath, JSON.stringify(config, null, 2));
  ctx.reply(`✅ Batas minimal masa aktif berhasil diubah menjadi: ${days} hari.`);
});

bot.command('setmax', (ctx) => {
  if (ctx.from.id.toString() !== vars.USER_ID.toString()) return;
  const days = parseInt(ctx.message.text.split(' ')[1]);
  if (!days) return ctx.reply('Gunakan format: /setmax <jumlah_hari>');
  
  const config = getAdminConfig();
  config.max_days = days;
  fs.writeFileSync(adminConfigPath, JSON.stringify(config, null, 2));
  ctx.reply(`✅ Batas maksimal masa aktif berhasil diubah menjadi: ${days} hari.`);
});

// RE-ROUTE BUTTON KEMBALI
bot.action('kembali_ke_utama', async (ctx) => {
  await ctx.answerCbQuery();
  // Jalankan ulang fungsi start untuk menampilkan menu awal
  ctx.deleteMessage().catch(() => {});
  return bot.handleUpdate(ctx.update); 
});

// Run bot aman dengan penanganan crash
bot.launch().then(() => console.log('🚀 Bot VPN Express Running on Ubuntu/Debian!')).catch((err) => console.error(err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
