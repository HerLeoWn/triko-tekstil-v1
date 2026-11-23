// Kullanıcı rollerinin Türkçe adları ve açıklamaları.
// Rol anahtarları sunucuyla aynıdır, yalnızca görünen ad değişir.
export const ROL_ADI = {
  yonetici: 'Depo sorumlusu',
  calisan: 'Çalışan',
  izleyici: 'İzleyici',
  muhasebe: 'Muhasebe',
};

export const ROL_ACIKLAMA = {
  yonetici: 'Depo sorumlusu: her şey. Kullanıcı yönetimi, yedek, ürün grubu silme.',
  calisan: 'Çuval ve giden girişi, düzenleme, çuval silme.',
  izleyici: 'Sadece görüntüleme. Giriş ve silme yapamaz.',
  muhasebe: 'Giden malları görür, PNG indirir, giden kayıtlarını düzenler, mesajlaşır.',
};