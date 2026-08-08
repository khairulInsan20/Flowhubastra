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
- GPT-5.4 kini aktif melalui Emergent LLM key. Setelah PIC memilih bandara, hotel, dan rute transport, aplikasi melakukan streaming itinerary Bahasa Indonesia, estimasi item biaya, alternatif hemat, serta catatan verifikasi ke layar review.
- Endpoint AI memvalidasi tanggal/anggaran, membatasi lima permintaan per menit, dan tidak mengklaim bahwa estimasi merupakan harga atau ketersediaan live.
- AI Travel Assistant direvisi menjadi alur PIC bertahap: budget dari Koordinator bersifat read-only; Gemini 3.5 Flash + Google Search memberi rekomendasi tiket, lalu hotel, lalu transport lokal berdasarkan rute yang dipilih PIC; GPT-5.4 menyusun itinerary akhir setelah pilihan transport dikonfirmasi.
- Konteks STO mendukung daftar kunjungan cabang per tanggal. Transport lokal mencakup rumah-ke-hub, hub-ke-cabang, antar-cabang, cabang-ke-hotel, dan hotel-ke-hub. Setiap rekomendasi browsing menampilkan hasil sebagai estimasi yang perlu diverifikasi.
- Flowhub menggantikan nama aplikasi. AI Travel Assistant saat ini diganti menjadi alur pilihan manual tanpa panggilan AI: PIC memilih tiket, hotel, dan transport lokal, menyesuaikan nominal sesuai aplikasi penyedia, melampirkan bukti harga, lalu mengirim RAB untuk approval.
- Reviewer di Monitoring RAB dapat membuka rincian permintaan sebelum mengambil keputusan approval atau revisi.
- AI Travel Assistant kini memakai wizard keputusan berurutan: pilih bandara/rekomendasi gerbang perjalanan, pilih penginapan berdasarkan keputusan itu, lalu pilih transportasi lokal berdasarkan bandara dan hotel terpilih sebelum review RAB.
- Otorisasi demonstrasi berbasis peran diterapkan: Koordinator membuat jadwal STO pada wilayah penugasannya dan menetapkan PIC; data nama, email, dan telepon PIC terisi dari direktori profil contoh; PIC menetapkan alokasi, menggunakan AI, mengirim realisasi, serta melihat pesanan/revisi miliknya.
- Menu Monitoring RAB dan Monitoring Anggaran dibatasi bagi Koordinator/SPV/Manager; Inbox Pemesanan dibatasi bagi PIC/Sekretaris; Sekretaris menerima daftar pemesanan untuk checklist; revisi RAB membuat notifikasi inbox PIC.

### Verification performed
- API external: create → get → submit/update → get, validasi peran 403, input tidak valid 422, delete → get 404.
- Browser: dashboard, rekomendasi estimasi, simpan draf, approval Koordinator → SPV → Manager, konfirmasi Sekretaris, realisasi PIC, dan monitoring 100%.

### Prioritized backlog
#### P0
- Integrasi autentikasi organisasi yang benar untuk menggantikan pemilih peran demonstrasi.
- Ganti identitas demo dengan Google Workspace/Emergent Auth dan terapkan identitas terverifikasi sebagai sumber otorisasi server.
- Object storage privat untuk unggahan bukti aktual dan benchmarking, dengan akses reviewer yang berwenang.
- Sambungkan OpenAI GPT-5.4 memakai API key pengguna, streaming respons, validasi JSON itinerary, serta penyimpanan rekomendasi yang telah direview.
- Hubungkan hasil GPT-5.4 ke kandidat bandara, hotel, dan transportasi live saat akses provider perjalanan telah tersedia.

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
