const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
const PORT = 3001;

// Veritabanı ve yedekler kullanıcının AppData klasöründe tutulur,
// böylece uygulama güncellense de veriler kaybolmaz.
const veriKlasoru = path.join(app.getPath('userData'), 'veri');
fs.mkdirSync(veriKlasoru, { recursive: true });
process.env.TRIKO_VERI = veriKlasoru;

let pencere = null;

function sunucuBaslat() {
  // Sunucu kodu paketlenmiş uygulamada app.asar içinde, geliştirmede proje klasöründe
  const sunucuGiris = isDev
    ? path.join(__dirname, '..', 'server', 'src', 'index.js')
    : path.join(process.resourcesPath, 'app.asar', 'server', 'src', 'index.js');

  // Sunucuyu aynı süreçte başlatıyoruz (ayrı bir node işlemi gerekmez)
  import(require('url').pathToFileURL(sunucuGiris).href).catch((err) => {
    dialog.showErrorBox('Sunucu hatası', err.message);
    app.quit();
  });
}

function pencereAc() {
  pencere = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 360,
    minHeight: 600,
    title: 'Triko Çuval Takibi',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Geliştirmede Vite sunucusu, paketlenmişte derlenmiş arayüz kullanılır
  if (isDev) {
    pencere.loadURL('http://localhost:5173');
  } else {
    pencere.loadFile(path.join(process.resourcesPath, 'app.asar', 'client', 'dist', 'index.html'));
  }

  pencere.on('closed', () => { pencere = null; });
}

app.whenReady().then(() => {
  sunucuBaslat();
  // Sunucunun ayağa kalkması için kısa bir bekleme
  setTimeout(pencereAc, 800);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) pencereAc();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});