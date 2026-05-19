// modules/templates.js

module.exports = {
  // Tampilan Utama /start
  menuUtama: (userName, userId, saldo, statusReseller, vars) => {
    const namaStore = vars.NAMA_STORE || "Premium VPN Store";
    const waPenjual = vars.ADMIN_WHATSAPP || "-";
    const telePenjual = vars.ADMIN_TELEGRAM || "-";

    return `
┏──────────────────────────────────────┓
    🏪 <b>${namaStore.toUpperCase()}</b>
┗──────────────────────────────────────┛
Selamat Datang di Bot Layanan VPN Premium Otomatis!
Layanan instan, aman, dan aktif 24 jam nonstop.

👑 <b>INFORMASI PELANGGAN</b>
  ├── <b>Nama Akun</b> : ${userName}
  ├── <b>ID User</b>   : <code>${userId}</code>
  ├── <b>Saldo Bot</b> : <code>Rp ${Number(saldo).toLocaleString('id-ID')}</code>
  └── <b>Status</b>    : <b>${statusReseller}</b>

🤖 <b>SPESIFIKASI & INFRASTRUKTUR</b>
  ├── <b>Platform</b>  : High-Speed VPN Core
  ├── <b>OS Server</b> : Ubuntu / Debian Server
  └── <b>Sistem</b>    : QRIS Realtime & Auto-Billing

📞 <b>KONTAK RESMI PENJUAL</b>
  ├── <b>Telegram</b>  : @${telePenjual.replace('@', '')}
  └── <b>WhatsApp</b>  : https://wa.me/${waPenjual}

────────────────────────────────────────
💡 <i>Gunakan tombol di bawah ini untuk melakukan transaksi atau bantuan admin.</i>
`;
  },

  // Tampilan Pilihan Pembayaran Akun
  menuPembayaran: () => {
    return `
┏──────────────────────────────────────┓
    🛒 <b>METODE PEMBAYARAN AKUN</b>
┗──────────────────────────────────────┛
Silakan pilih metode pembayaran yang ingin Anda gunakan untuk membuat akun baru:

⭐️ <b>1. QRIS (Rekomendasi Otomatis)</b>
• Proses instan tanpa perlu konfirmasi manual.
• Otomatis aktif setelah pembayaran sukses.

💰 <b>2. Potong Saldo</b>
• Menggunakan sisa saldo akun bot Anda.
`;
  },

  // Tampilan Detail Pembayaran QRIS
  detailQris: (hargaDasar, biayaLayanan, total) => {
    return `
┏──────────────────────────────────────┓
    💳 <b>Rincian Pembayaran QRIS</b>
┗──────────────────────────────────────┛
• Harga Akun    : Rp ${hargaDasar.toLocaleString('id-ID')}
• Biaya Sistem  : Rp ${biayaLayanan} (Biaya Layanan Bot)
────────────────────────────────────────
💵 <b>TOTAL TRANSFER : Rp ${total.toLocaleString('id-ID')}</b>

⚠️ <i>Mohon transfer sesuai dengan angka di atas agar sistem bot dapat melakukan verifikasi otomatis tanpa kendala.</i>
`;
  },

  // Tampilan Kontak Hubungi Admin / Reseller
  menuReseller: (vars) => {
    return `
┏──────────────────────────────────────┓
    🤝 <b>KEMITRAAN & JOIN RESELLER</b>
┗──────────────────────────────────────┛
Untuk mendaftar menjadi reseller resmi dan mendapatkan harga khusus, Anda cukup menghubungi Admin Utama kami melalui kontak di bawah ini.
`;
  }
};
