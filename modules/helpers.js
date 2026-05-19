// modules/helpers.js

module.exports = {
  // Validasi: Minimal 3 huruf dan Minimal 3 angka
  validateUsername: (username) => {
    if (!username || username.length < 6) return false;
    
    const countLetters = (username.match(/[a-zA-Z]/g) || []).length;
    const countNumbers = (username.match(/[0-9]/g) || []).length;
    
    return countLetters >= 3 && countNumbers >= 3;
  },

  // Generate biaya layanan bot otomatis antara 250 - 700
  generateBiayaLayanan: () => {
    return Math.floor(Math.random() * (700 - 250 + 1)) + 250;
  }
};
