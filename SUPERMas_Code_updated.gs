/**
 * Super Mas — Surat Peminjaman Ruang MPP Alaya Sewagati
 * Backend Google Apps Script untuk frontend GitHub Pages.
 * Setup: jalankan setupDatabase() sekali, lalu deploy sebagai Web App.
 */
const APP = {
  NAME: 'Super Mas — Surat Peminjaman Ruang MPP Alaya Sewagati',
  SHEET_BOOK_ID: 'ISI_ID_GOOGLE_SHEET_DI_SINI',
  TIMEZONE: 'Asia/Jakarta',
  SHEETS: {
    bookings: 'Peminjaman',
    settings: 'Pengaturan',
    logs: 'LogAktivitas'
  }
};
const HEADERS = {
  Peminjaman: ['ID_Peminjaman','Nomor_Surat','Tanggal_Pengajuan','Nama_Peminjam','Instansi','Jabatan','No_WA','Email','Nama_Ruang','Nama_Kegiatan','Tanggal_Kegiatan','Jam_Mulai','Jam_Selesai','Jumlah_Peserta','Jenis_Kegiatan','Keperluan','Perlengkapan','Status','Catatan_Admin','Tanggal_Verifikasi','Petugas_Verifikasi','Dibuat_Pada','Diubah_Pada'],
  Pengaturan: ['Kunci','Nilai','Keterangan'],
  LogAktivitas: ['Waktu','ID_Peminjaman','Aktor','Aktivitas','Detail'],
  Ruang: ['ID_Ruang','Nama_Ruang','Deskripsi','Kapasitas','Fasilitas','Foto_URL','Foto_URL_2','Foto_URL_3','Aktif','Urutan','Dibuat_Pada','Diubah_Pada']
};

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'api') {
    return json_({ ok:true, app:APP.NAME, message:'API aktif', timestamp:new Date().toISOString() });
  }
  return HtmlService.createHtmlOutput('Backend Super Mas aktif. Gunakan frontend GitHub Pages.')
    .setTitle('Super Mas API');
}
function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = String(body.action || '');
    if (action === 'submit') return json_(submitBooking_(body.data || {}));
    if (action === 'list') return json_(listBookings_(body));
    if (action === 'updateStatus') return json_(updateStatus_(body));
    if (action === 'availability') return json_(availability_(body));
    if (action === 'publicSchedule') return json_(publicSchedule_());
    if (action === 'publicRooms') return json_(publicRooms_());
    if (action === 'adminRooms') return json_(adminRooms_(body));
    if (action === 'saveRoom') return json_(saveRoom_(body));
    if (action === 'deleteRoom') return json_(deleteRoom_(body));
    return json_({ok:false,message:'Aksi tidak dikenal.'});
  } catch(err) {
    return json_({ok:false,message:err.message || String(err)});
  }
}
function doOptions(e) {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}
function setupDatabase() {
  const ss = getSS_();
  Object.keys(HEADERS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.appendRow(HEADERS[name]);
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,HEADERS[name].length).setFontWeight('bold').setBackground('#166534').setFontColor('#ffffff');
    sh.autoResizeColumns(1, HEADERS[name].length);
  });
  const sh = ss.getSheetByName('Pengaturan');
  if (sh.getLastRow() < 2) {
    sh.getRange(2,1,7,3).setValues([
      ['NAMA_APLIKASI',APP.NAME,'Nama aplikasi'],
      ['NAMA_MPP','MPP Alaya Sewagati Kota Tegal','Identitas lokasi'],
      ['NAMA_ADMIN','Admin MPP','Nama petugas default'],
      ['WA_ADMIN','','Nomor admin format 628xxxxxxxxxx'],
      ['RUANG_TERSEDIA','Ruang Pertemuan;Ruang Konsultasi;Ruang Serbaguna','Pisahkan dengan titik koma'],
      ['JAM_OPERASIONAL','08:00-16:00','Sesuaikan jam layanan'],
      ['CATATAN_KEBIJAKAN','Permohonan menunggu verifikasi admin.','Kebijakan internal']
    ]);
  }
  let ruangSh = ss.getSheetByName('Ruang');
  if (ruangSh.getLastRow() < 2) {
    ruangSh.getRange(1,1,1,HEADERS.Ruang.length).setValues([HEADERS.Ruang]);
    ruangSh.getRange(2,1,3,HEADERS.Ruang.length).setValues([
      ['R-001','Ruang Pertemuan','Untuk rapat koordinasi, diskusi, dan pertemuan lintas instansi.',30,'Meja, kursi, LCD','',true,1,new Date(),new Date()],
      ['R-002','Ruang Konsultasi','Untuk konsultasi dan pembahasan teknis kelompok kecil.',10,'Meja konsultasi, kursi','',true,2,new Date(),new Date()],
      ['R-003','Ruang Serbaguna','Untuk sosialisasi, pelatihan, dan kegiatan bersama.',80,'Kursi, meja, proyektor','',true,3,new Date(),new Date()]
    ]);
    ruangSh.setFrozenRows(1);
    ruangSh.getRange(1,1,1,HEADERS.Ruang.length).setFontWeight('bold').setBackground('#166534').setFontColor('#ffffff');
    ruangSh.autoResizeColumns(1,HEADERS.Ruang.length);
  }
  return 'Database siap: ' + ss.getUrl();
}
function getSS_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || APP.SHEET_BOOK_ID;
  if (!id || id === 'ISI_ID_GOOGLE_SHEET_DI_SINI') {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
    throw new Error('Isi APP.SHEET_BOOK_ID atau Script Property SPREADSHEET_ID.');
  }
  return SpreadsheetApp.openById(id);
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function getSettings_() {
  const sh = getSS_().getSheetByName(APP.SHEETS.settings);
  const out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2,1,sh.getLastRow()-1,2).getValues().forEach(r => { if (r[0]) out[String(r[0])] = String(r[1] || ''); });
  return out;
}
function submitBooking_(d) {
  const required = ['nama','instansi','noWa','namaRuang','tanggalKegiatan','jamMulai','jamSelesai','jumlahPeserta','jenisKegiatan','keperluan'];
  const missing = required.filter(k => !String(d[k] == null ? '' : d[k]).trim());
  if (missing.length) throw new Error('Mohon lengkapi seluruh kolom wajib.');
  if (!/^62\d{8,15}$/.test(String(d.noWa).replace(/\D/g,''))) throw new Error('Nomor WhatsApp harus format 62xxxxxxxxxx.');
  if (d.jamMulai >= d.jamSelesai) throw new Error('Jam selesai harus setelah jam mulai.');
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const sh = getSS_().getSheetByName(APP.SHEETS.bookings);
    ensureColumns_(sh, ['Nama_Kegiatan']);
    const rows = sh.getDataRange().getValues();
    const headers = rows[0];
    const idx = Object.fromEntries(headers.map((h,i)=>[h,i]));
    // Prevent overlapping approved/pending bookings for same room/date.
    for (let i=1;i<rows.length;i++) {
      const r=rows[i];
      if (String(r[idx.Nama_Ruang]) !== String(d.namaRuang) || dateOnly_(r[idx.Tanggal_Kegiatan]) !== String(d.tanggalKegiatan)) continue;
      if (['Ditolak','Dibatalkan'].includes(String(r[idx.Status]))) continue;
      const a=String(r[idx.Jam_Mulai]), b=String(r[idx.Jam_Selesai]);
      if (String(d.jamMulai) < b && String(d.jamSelesai) > a) throw new Error('Jadwal berbenturan dengan permohonan lain pada ruang dan waktu tersebut. Silakan pilih waktu lain.');
    }
    const now = new Date();
    const id = 'PMJ-' + Utilities.formatDate(now, APP.TIMEZONE, 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random()*90+10);
    const date = Utilities.formatDate(now, APP.TIMEZONE, 'yyyy-MM-dd');
    const vals = {
      ID_Peminjaman:id, Nomor_Surat:'', Tanggal_Pengajuan:date, Nama_Peminjam:String(d.nama).trim(),
      Instansi:String(d.instansi).trim(), Jabatan:String(d.jabatan||''), No_WA:String(d.noWa).replace(/\D/g,''),
      Email:String(d.email||''), Nama_Ruang:String(d.namaRuang), Nama_Kegiatan:String(d.namaKegiatan||'').trim(), Tanggal_Kegiatan:String(d.tanggalKegiatan),
      Jam_Mulai:String(d.jamMulai), Jam_Selesai:String(d.jamSelesai), Jumlah_Peserta:Number(d.jumlahPeserta),
      Jenis_Kegiatan:String(d.jenisKegiatan), Keperluan:String(d.keperluan).trim(),
      Perlengkapan:String(d.perlengkapan||''), Status:'Menunggu Verifikasi', Catatan_Admin:'',
      Tanggal_Verifikasi:'', Petugas_Verifikasi:'', Dibuat_Pada:now, Diubah_Pada:now
    };
    sh.appendRow(headers.map(h => vals[h] === undefined ? '' : vals[h]));
    log_(id, vals.Nama_Peminjam, 'Pengajuan dibuat', 'Permohonan baru');
    notifyFonnte_(vals.No_WA, 'Terima kasih. Permohonan peminjaman ruang MPP Alaya Sewagati telah diterima.\nID: '+id+'\nRuang: '+vals.Nama_Ruang+'\nTanggal: '+vals.Tanggal_Kegiatan+'\nWaktu: '+vals.Jam_Mulai+'–'+vals.Jam_Selesai+'\nStatus: Menunggu Verifikasi.');
    const cfg=getSettings_();
    if (cfg.WA_ADMIN) notifyFonnte_(cfg.WA_ADMIN, 'Permohonan peminjaman ruang baru.\nID: '+id+'\nPemohon: '+vals.Nama_Peminjam+' ('+vals.Instansi+')\nRuang: '+vals.Nama_Ruang+'\nTanggal: '+vals.Tanggal_Kegiatan+' '+vals.Jam_Mulai+'–'+vals.Jam_Selesai);
    return {ok:true,id:id,status:vals.Status,message:'Permohonan berhasil dikirim.'};
  } finally { lock.releaseLock(); }
}
function listBookings_(body) {
  // This endpoint is intended for admin use only; add authentication before production use.
  const sh=getSS_().getSheetByName(APP.SHEETS.bookings), data=sh.getDataRange().getDisplayValues();
  if (data.length<2) return {ok:true,items:[]};
  const headers=data.shift();
  const items=data.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
  const key=PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!key || String(body.adminKey||'') !== key) throw new Error('Akses admin tidak sah.');
  return {ok:true,items:items.reverse()};
}
function updateStatus_(body) {
  const key=PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!key || String(body.adminKey||'') !== key) throw new Error('Akses admin tidak sah.');
  const allowed=['Disetujui','Ditolak','Dibatalkan','Selesai'];
  if (!allowed.includes(body.status)) throw new Error('Status tidak valid.');
  const sh=getSS_().getSheetByName(APP.SHEETS.bookings), data=sh.getDataRange().getValues();
  const headers=data[0], idCol=headers.indexOf('ID_Peminjaman');
  const row=data.findIndex((r,i)=>i>0 && String(r[idCol])===String(body.id));
  if(row<1) throw new Error('Permohonan tidak ditemukan.');
  const statusCol=headers.indexOf('Status')+1, updatedCol=headers.indexOf('Diubah_Pada')+1;
  sh.getRange(row+1,statusCol).setValue(body.status);
  sh.getRange(row+1,updatedCol).setValue(new Date());
  const verifyDateCol=headers.indexOf('Tanggal_Verifikasi')+1;
  const verifierCol=headers.indexOf('Petugas_Verifikasi')+1;
  if (verifyDateCol > 0) sh.getRange(row+1,verifyDateCol).setValue(new Date());
  if (verifierCol > 0) sh.getRange(row+1,verifierCol).setValue(String(body.adminName||'Admin MPP'));
  const noteCol=headers.indexOf('Catatan_Admin')+1;
  if (body.catatan !== undefined) sh.getRange(row+1,noteCol).setValue(String(body.catatan));
  const phone=String(data[row][headers.indexOf('No_WA')]||'');
  const id=String(body.id);
  notifyFonnte_(phone,'Pembaruan permohonan peminjaman ruang MPP Alaya Sewagati.\nID: '+id+'\nStatus: '+body.status+(body.catatan?'\nCatatan: '+body.catatan:''));
  log_(id,String(body.adminName||'Admin'),'Status diubah',body.status);
  return {ok:true,message:'Status berhasil diperbarui.'};
}
function availability_(body) {
  const sh=getSS_().getSheetByName(APP.SHEETS.bookings), data=sh.getDataRange().getValues();
  if(data.length<2) return {ok:true,busy:[]};
  const h=data[0], ix=Object.fromEntries(h.map((v,i)=>[v,i]));
  const busy=data.slice(1).filter(r=>String(r[ix.Nama_Ruang])===String(body.namaRuang) && dateOnly_(r[ix.Tanggal_Kegiatan])===String(body.tanggalKegiatan) && !['Ditolak','Dibatalkan'].includes(String(r[ix.Status])))
    .map(r=>({mulai:String(r[ix.Jam_Mulai]),selesai:String(r[ix.Jam_Selesai]),status:String(r[ix.Status])}));
  return {ok:true,busy:busy};
}
function dateOnly_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, APP.TIMEZONE, 'yyyy-MM-dd');
  }

  const s = String(v == null ? '' : v).trim();
  if (!s) return '';

  // Sudah berupa ISO yyyy-MM-dd (atau timestamp yang diawali tanggal ISO).
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    return iso[1] + '-' + ('0' + iso[2]).slice(-2) + '-' + ('0' + iso[3]).slice(-2);
  }

  // Tanggal tampilan Indonesia: d/M/yyyy atau dd/MM/yyyy, termasuk pemisah - atau .
  const indo = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (indo) {
    return indo[3] + '-' + ('0' + indo[2]).slice(-2) + '-' + ('0' + indo[1]).slice(-2);
  }

  return '';
}
function log_(id,actor,activity,detail) {
  const sh=getSS_().getSheetByName(APP.SHEETS.logs);
  if(sh) sh.appendRow([new Date(),id,actor,activity,detail]);
}


function publicRooms_() {
  const sh=getSS_().getSheetByName('Ruang');
  if(!sh || sh.getLastRow()<2) return {ok:true,items:[]};
  const data=sh.getDataRange().getValues(), headers=data.shift(), ix=Object.fromEntries(headers.map((h,i)=>[h,i]));
  const items=data.filter(r=>r[ix.Nama_Ruang] && (r[ix.Aktif]===true || String(r[ix.Aktif]).toLowerCase()==='true' || String(r[ix.Aktif]).toLowerCase()==='aktif'))
    .map(r=>({id:String(r[ix.ID_Ruang]||''),namaRuang:String(r[ix.Nama_Ruang]||''),deskripsi:String(r[ix.Deskripsi]||''),kapasitas:Number(r[ix.Kapasitas]||0),fasilitas:String(r[ix.Fasilitas]||''),fotoUrl:String(r[ix.Foto_URL]||''),fotoUrl2:String(r[ix.Foto_URL_2]||''),fotoUrl3:String(r[ix.Foto_URL_3]||''),fotoUrls:[r[ix.Foto_URL],r[ix.Foto_URL_2],r[ix.Foto_URL_3]].map(v=>String(v||'').trim()).filter(Boolean),aktif:true,urutan:Number(r[ix.Urutan]||999)}))
    .sort((a,b)=>a.urutan-b.urutan);
  return {ok:true,items:items};
}
function adminRooms_(body) {
  requireAdmin_(body.adminKey);
  const sh=getSS_().getSheetByName('Ruang');
  ensureColumns_(sh, ['Foto_URL_2','Foto_URL_3']);
  const data=sh.getDataRange().getValues(), headers=data[0], ix=Object.fromEntries(headers.map((h,i)=>[h,i]));
  const items=data.slice(1).filter(r=>r[ix.ID_Ruang]).map(r=>({
    id:String(r[ix.ID_Ruang]),namaRuang:String(r[ix.Nama_Ruang]||''),deskripsi:String(r[ix.Deskripsi]||''),
    kapasitas:Number(r[ix.Kapasitas]||0),fasilitas:String(r[ix.Fasilitas]||''),fotoUrl:String(r[ix.Foto_URL]||''),fotoUrl2:String(r[ix.Foto_URL_2]||''),fotoUrl3:String(r[ix.Foto_URL_3]||''),
    aktif:String(r[ix.Aktif]).toLowerCase()==='true'||String(r[ix.Aktif]).toLowerCase()==='aktif',urutan:Number(r[ix.Urutan]||999)
  }));
  return {ok:true,items:items};
}
function saveRoom_(body) {
  requireAdmin_(body.adminKey);
  const d=body.room||{};
  if(!String(d.namaRuang||'').trim()) throw new Error('Nama ruang wajib diisi.');
  const sh=getSS_().getSheetByName('Ruang'); ensureColumns_(sh, ['Foto_URL_2','Foto_URL_3']); const data=sh.getDataRange().getValues(), headers=data[0], ix=Object.fromEntries(headers.map((h,i)=>[h,i]));
  let row=-1, id=String(d.id||'').trim();
  if(id) row=data.findIndex((r,i)=>i>0 && String(r[ix.ID_Ruang])===id);
  const now=new Date();
  if(!id) id='R-'+Utilities.getUuid().slice(0,8).toUpperCase();
  const values={ID_Ruang:id,Nama_Ruang:String(d.namaRuang).trim(),Deskripsi:String(d.deskripsi||'').trim(),Kapasitas:Number(d.kapasitas||0),Fasilitas:String(d.fasilitas||'').trim(),Foto_URL:String(d.fotoUrl||'').trim(),Foto_URL_2:String(d.fotoUrl2||'').trim(),Foto_URL_3:String(d.fotoUrl3||'').trim(),Aktif:!!d.aktif,Urutan:Number(d.urutan||999),Dibuat_Pada:row>0?data[row][ix.Dibuat_Pada]:now,Diubah_Pada:now};
  const arr=headers.map(h=>values[h]===undefined?'':values[h]);
  if(row>0) sh.getRange(row+1,1,1,arr.length).setValues([arr]); else sh.appendRow(arr);
  log_(id,String(body.adminName||'Admin'),'Data ruang disimpan',values.Nama_Ruang);
  return {ok:true,message:'Data ruang tersimpan.',id:id};
}
function deleteRoom_(body) {
  requireAdmin_(body.adminKey);
  const id=String(body.id||'');
  const sh=getSS_().getSheetByName('Ruang'), data=sh.getDataRange().getValues(), ix=data[0].indexOf('ID_Ruang');
  const row=data.findIndex((r,i)=>i>0 && String(r[ix])===id);
  if(row<1) throw new Error('Data ruang tidak ditemukan.');
  // Soft delete: hide room from public and keep history.
  const aktifCol=data[0].indexOf('Aktif')+1;
  sh.getRange(row+1,aktifCol).setValue(false);
  return {ok:true,message:'Ruang dinonaktifkan.'};
}
function requireAdmin_(provided) {
  const key=PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if(!key || String(provided||'')!==key) throw new Error('Akses admin tidak sah.');
}

function ensureColumns_(sheet, names) {
  if (!sheet) throw new Error('Sheet tidak ditemukan.');
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1,1,1,lastCol).getDisplayValues()[0].map(v=>String(v).trim());
  names.forEach(name=>{
    if (!headers.includes(name)) {
      const col = sheet.getLastColumn()+1;
      sheet.getRange(1,col).setValue(name).setFontWeight('bold').setBackground('#166534').setFontColor('#ffffff');
      headers.push(name);
    }
  });
}

function publicSchedule_() {
  const sh = getSS_().getSheetByName(APP.SHEETS.bookings);
  if (!sh) return {ok:true, items:[]};
  ensureColumns_(sh, ['Nama_Kegiatan']);
  if (sh.getLastRow() < 2) return {ok:true, items:[]};

  // Gunakan nilai asli agar tanggal berupa Date tidak berubah menjadi dd/MM/yyyy.
  const range = sh.getDataRange();
  const raw = range.getValues();
  const display = range.getDisplayValues();
  const headers = raw.shift();
  display.shift();
  const ix = Object.fromEntries(headers.map((h,i) => [String(h).trim(), i]));

  const items = raw.map((r, rowIndex) => {
    const shown = display[rowIndex];
    return {
      tanggalKegiatan: dateOnly_(r[ix.Tanggal_Kegiatan]),
      jamMulai: String(shown[ix.Jam_Mulai] || ''),
      jamSelesai: String(shown[ix.Jam_Selesai] || ''),
      namaRuang: String(shown[ix.Nama_Ruang] || '').trim(),
      namaKegiatan: String(shown[ix.Nama_Kegiatan] || '').trim(),
      instansi: String(shown[ix.Instansi] || '').trim(),
      kegiatan: String(shown[ix.Jenis_Kegiatan] || '').trim(),
      status: String(shown[ix.Status] || '').trim()
    };
  }).filter(x => x.tanggalKegiatan && x.status.toLowerCase() !== 'dibatalkan');

  return {ok:true, items:items};
}

function notifyFonnte_(target,message) {
  const token=PropertiesService.getScriptProperties().getProperty('FONNTE_TOKEN');
  if(!token || !target) return {ok:false,skipped:true};
  try {
    const response=UrlFetchApp.fetch('https://api.fonnte.com/send',{
      method:'post', payload:{target:String(target),message:String(message)},
      headers:{Authorization:token}, muteHttpExceptions:true
    });
    return {ok:response.getResponseCode()>=200 && response.getResponseCode()<300,code:response.getResponseCode()};
  } catch(err) { console.error('Fonnte error: '+err); return {ok:false,error:String(err)}; }
}
function testFonnte() {
  const cfg=getSettings_();
  if(!cfg.WA_ADMIN) throw new Error('Isi WA_ADMIN pada sheet Pengaturan terlebih dahulu.');
  const r=notifyFonnte_(cfg.WA_ADMIN,'Tes notifikasi Super Mas — MPP Alaya Sewagati. Jika pesan ini diterima, integrasi Fonnte berjalan.');
  Logger.log(JSON.stringify(r)); return r;
}
