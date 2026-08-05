## STO Travel Desk — Product Requirements

### Original problem statement
PIC Accounting melakukan perencanaan dan realisasi biaya Stock Take Opname (STO) lintas cabang Auto2000 secara manual melalui benchmark harga, spreadsheet bersama, bukti lampiran, dan approval berjenjang. Produk ini menyatukan trip plan, RAB fleksibel, rekomendasi estimasi, persetujuan, pemesanan, realisasi, survei, dan reimbursement.

### Personas
- **PIC Accounting:** menyusun trip plan, menentukan proporsi anggaran, melampirkan bukti, mengirim realisasi dan survei.
- **Koordinator, SPV, Manager:** meninjau dan menyetujui RAB secara berjenjang serta memantau anggaran/realisasi.
- **Sekretaris Divisi:** mengonfirmasi pemesanan dan memverifikasi kelengkapan reimbursement.

### Architecture decisions
- React + React Router frontend dengan dashboard multi-peran dan API URL dari `REACT_APP_BACKEND_URL`.
- FastAPI + MongoDB backend memakai ID UUID string agar respons bebas BSON ObjectId.
- Role demo dipilih dari dashboard; API tetap membatasi aksi workflow berdasarkan peran yang dikirimkan.
- Rekomendasi perjalanan merupakan **estimasi demonstrasi**. Integrasi live akan memakai adapter provider setelah akses komersial tersedia.
- Lampiran saat ini menyimpan metadata bukti; object storage/presigned upload ditunda sampai kredensial tersedia.

### Core requirements
- Trip plan, data PIC, lokasi, cabang/wilayah, dan total anggaran STO.
- Alokasi anggaran fleksibel yang harus berjumlah 100%.
- Review Koordinator → SPV → Manager → Sekretaris dengan status dan jejak keputusan.
- Konfirmasi tiket/hotel oleh Sekretaris dan inbox untuk PIC.
- Realisasi pengeluaran, rekening reimbursement, dan survei wajib.
- Monitoring kelengkapan dan peringatan overbudget.

### What's been implemented
#### 2026-08-05
- Dashboard korporat Swiss/high-contrast dengan ringkasan siklus STO, anggaran, status, dan navigasi per modul.
- Rencana STO dan RAB fleksibel dengan proporsi tiket/hotel/transport, rekomendasi estimasi, serta metadata lampiran benchmarking.
- API workflow yang menjalankan submit, approval berjenjang, pengembalian revisi, konfirmasi pemesanan, pengiriman realisasi, dan verifikasi Sekretaris.
- Halaman review, inbox pemesanan, realisasi/reimbursement, dan monitoring kelengkapan/realisasi/overbudget.
- Endpoint CRUD dasar dan validasi 4xx untuk input proporsi salah atau peran yang tidak berwenang.
- Halaman **AI Travel Assistant**: menangkap jadwal, asal, cabang, anggaran, dan preferensi; menampilkan struktur itinerary, biaya, serta alternatif hemat yang akan dihasilkan GPT-5.4.
- Status koneksi AI terlihat jelas di aplikasi. Pengaktifan respons GPT-5.4 menunggu OpenAI API key milik pengguna.

### Verification performed
- API external: create → get → submit/update → get, validasi peran 403, input tidak valid 422, delete → get 404.
- Browser: dashboard, rekomendasi estimasi, simpan draf, approval Koordinator → SPV → Manager, konfirmasi Sekretaris, realisasi PIC, dan monitoring 100%.

### Prioritized backlog
#### P0
- Integrasi autentikasi organisasi yang benar untuk menggantikan pemilih peran demonstrasi.
- Object storage privat untuk unggahan bukti aktual dan benchmarking, dengan akses reviewer yang berwenang.
- Sambungkan OpenAI GPT-5.4 memakai API key pengguna, streaming respons, validasi JSON itinerary, serta penyimpanan rekomendasi yang telah direview.

#### P1
- Integrasi provider perjalanan live setelah persetujuan partner (Traveloka/tiket.com/Amadeus) dan Google Routes untuk estimasi rute.
- Notifikasi email/in-app untuk setiap perpindahan approval, booking, dan reimbursement.
- Data cabang Auto2000, histori actual tahun sebelumnya, serta ekspor laporan STO.

#### P2
- Analisis AI terhadap survei untuk peringkat rekomendasi perjalanan berikutnya.
- SLA dashboard dan audit trail yang lebih detail untuk kebutuhan tata kelola.

### Next tasks
1. Kumpulkan akses partner perjalanan dan object storage sesuai kebijakan perusahaan.
2. Konfirmasi aturan approval/reimbursement serta field data PIC yang wajib secara internal.
3. Uji alur dengan pengguna dari setiap peran dan lengkapi data cabang/wilayah produksi.
