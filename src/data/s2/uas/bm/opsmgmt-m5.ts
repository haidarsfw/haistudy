export const opsmgmtModule5 = `
<h1>Modul 5: Short-Term Scheduling</h1>

<h2>Apa Itu Short-Term Scheduling</h2>
Tujuan scheduling adalah membagi dan menyusun prioritas permintaan (yang datang dari ramalan atau dari pesanan pelanggan) ke fasilitas yang tersedia. Singkatnya, mengatur pekerjaan apa dikerjakan di mana dan kapan.

<h2>Pentingnya Penjadwalan Jangka Pendek</h2>
Penjadwalan yang baik bisa jadi keunggulan bersaing. Barang yang bergerak lebih cepat melewati pabrik berarti aset terpakai lebih baik dan biaya lebih rendah. Throughput yang cepat juga memberi kapasitas tambahan, sehingga layanan ke pelanggan membaik lewat pengiriman yang lebih cepat. Jadwal yang baik membuat pengiriman lebih bisa diandalkan.

<h2>Hal-Hal dalam Penjadwalan</h2>
Penjadwalan berurusan dengan pengaturan waktu operasi. Tugasnya membagi dan memberi prioritas permintaan. Ada tiga faktor penting: memilih forward atau backward scheduling, memilih finite atau infinite loading, dan menentukan kriteria untuk mengurutkan pekerjaan (sequencing).
<slide src="s2-uas-bm/opsmgmt/scheduling-flow.png" alt="Alur penjadwalan dari capacity planning sampai short-term scheduling"/>
Dari capacity planning (jangka tahunan), turun ke aggregate planning (bulanan), ke master schedule (mingguan), lalu ke short-term scheduling (harian sampai per menit). Tiap tingkat makin rinci.
<h3>Forward dan Backward Scheduling</h3>
Forward scheduling mulai menjadwalkan segera setelah kebutuhan diketahui. Hasilnya feasible, tapi belum tentu memenuhi due date (tanggal jatuh tempo), dan sering menumpuk work-in-process inventory. Backward scheduling mulai dari due date, lalu menjadwalkan operasi terakhir lebih dulu dan bekerja mundur. Risikonya, sumber daya bisa saja tidak tersedia saat dibutuhkan. Sering kali dua cara ini digabung untuk menyeimbangkan keterbatasan kapasitas dengan harapan pelanggan.
<h3>Finite dan Infinite Loading</h3>
Finite loading memberi pekerjaan hanya sampai batas kapasitas work station. Semua pekerjaan akhirnya selesai, tapi due date bisa mundur. Infinite loading tidak memperhitungkan kapasitas. Semua due date dianggap terpenuhi, tapi kapasitasnya yang mungkin harus disesuaikan.
<h3>Kriteria Penjadwalan</h3>
<bullet>Menekan waktu penyelesaian (completion time).</bullet>
<bullet>Memaksimalkan pemakaian fasilitas.</bullet>
<bullet>Menekan work-in-process (WIP) inventory.</bullet>
<bullet>Menekan waktu tunggu pelanggan.</bullet>

<h2>Proses Berbeda, Pendekatan Berbeda</h2>
Jenis proses produksi menentukan cara penjadwalannya (Table 15.2):
<bullet><b>Process-focused (job shops):</b> menjadwal sesuai pesanan pelanggan, dengan volume dan ragam pekerjaan yang sering berubah. Fokus pada due date, dirapikan dengan finite loading. Contoh: foundries, machine shops, cabinet shops, print shops, banyak restoran, dan industri fashion.</bullet>
<bullet><b>Repetitive (assembly lines):</b> menjadwal pembuatan modul dan perakitan berdasar ramalan yang sering diperbarui. Pakai finite loading yang melihat ke depan, dan teknik JIT untuk komponen yang masuk ke jalur perakitan. Contoh: mesin cuci di Whirlpool dan mobil di Ford.</bullet>
<bullet><b>Product-focused (continuous):</b> menjadwal produk jadi bervolume tinggi tapi ragamnya terbatas, untuk permintaan yang cukup stabil dalam kapasitas tetap. Pakai finite loading yang melihat ke depan dengan setup dan run time yang sudah diketahui. Contoh: mesin kertas raksasa di International Paper, bir di Anheuser-Busch, dan keripik kentang di Frito-Lay.</bullet>
Untuk fasilitas process-focused (job shop), cirinya ragam tinggi tapi volume rendah, barang yang dibuat beda-beda, dan pesanan harus dijadwal tanpa melebihi kapasitas. Penjadwalannya bisa rumit.

<h2>Loading dan Input-Output Control</h2>
Loading berarti menempatkan pekerjaan supaya biaya, waktu menganggur, atau waktu penyelesaian jadi sekecil mungkin. Ada dua bentuk: berorientasi kapasitas, dan menempatkan pekerjaan tertentu ke work center tertentu.
Input-Output Control mengenali kondisi kelebihan dan kekurangan beban, lalu mendorong tindakan manajemen untuk membereskannya. Ini bisa dijaga memakai ConWIP cards yang mengatur penjadwalan batch.
<b>Contoh dari slide:</b> Input-Output Control di welding work center (Figure 15.2), dalam standard hours. Planned input 280 tiap minggu; actual input 270, 250, 280, 285, 280; cumulative deviation -10, -40, -40, -35. Planned output 320; actual output 270 terus; cumulative deviation -50, -100, -150, -200. Cumulative change in backlog 0, -20, -10, +5. Penjelasannya: input 270 dan output 270 berarti perubahan 0; input 250 dan output 270 berarti perubahan -20. Pilihan tindakannya: memperbaiki kinerja, menambah kapasitas, atau menambah dan mengurangi input ke work center.

<h2>Gantt Charts</h2>
Gantt chart ada dua jenis. Load chart menunjukkan beban dan waktu menganggur dari departemen, mesin, atau fasilitas, jadi terlihat beban kerja relatif sepanjang waktu. Schedule chart memantau pekerjaan yang sedang berjalan. Semua Gantt chart perlu sering diperbarui mengikuti perubahan.
<slide src="s2-uas-bm/opsmgmt/gantt-load-chart.png" alt="Gantt load chart, beban tiap work center per hari"/>
Tiap work center (Metalworks, Mechanical, Electronics, Painting) terlihat sedang mengerjakan job mana pada hari apa, dan kapan menganggur.
<slide src="s2-uas-bm/opsmgmt/gantt-schedule-chart.png" alt="Gantt schedule chart, waktu dijadwalkan dan kemajuan kerja sesungguhnya"/>
Batang menunjukkan waktu yang dijadwalkan, kemajuan kerja sesungguhnya, dan titik "Now" saat chart diperiksa.

<h2>Assignment Method</h2>
Assignment method adalah jenis khusus linear programming yang memasangkan tugas atau pekerjaan ke sumber daya, biasanya untuk menekan biaya atau waktu. Aturannya satu pekerjaan untuk satu mesin (atau satu pekerja untuk satu proyek).
Langkahnya: buat tabel biaya atau waktu; ciptakan zero opportunity cost dengan mengurangi biaya terkecil dari tiap baris lalu tiap kolom; tarik garis sesedikit mungkin untuk menutup semua angka nol. Kalau jumlah garis sudah sama dengan jumlah baris atau kolom, lanjut ke penugasan. Kalau belum, kurangi angka terkecil yang belum tertutup dari semua angka yang belum tertutup, tambahkan angka itu pada persilangan dua garis, lalu ulangi. Penugasan optimal ada di posisi angka nol.
<b>Contoh dari slide:</b> Tiga typesetter A, B, C dan tiga job R-34, S-66, T-50. Biayanya: R-34 = USD 11, USD 14, USD 6; S-66 = USD 8, USD 10, USD 11; T-50 = USD 9, USD 12, USD 7. Setelah pengurangan baris dan kolom serta langkah garis, hasil optimalnya: R-34 ke C, S-66 ke B, T-50 ke A. Dilihat dari tabel biaya asli, total biaya minimum = USD 6 + USD 10 + USD 9 = USD 25.
<b>Latihan dari slide (Green Cab Company):</b> ada taksi menunggu di empat pangkalan di Evanston, Illinois, dan empat pelanggan memesan. Diberikan jarak (mil) dari tiap taksi ke tiap pelanggan, lalu diminta mencari penugasan taksi ke pelanggan yang membuat total jarak tempuh paling kecil.

<h2>Sequencing Jobs</h2>
Sequencing menentukan urutan pekerjaan dikerjakan di work center. Aturan prioritas (priority rules) yang umum: FCFS (First Come, First Served), SPT (Shortest Processing Time), EDD (Earliest Due Date), dan LPT (Longest Processing Time).
Ukuran kinerjanya: flow time adalah waktu sejak pekerjaan dilepas sampai selesai. Average completion time = total flow time dibagi jumlah job. Utilization metric = total waktu kerja dibagi total flow time. Average number of jobs in system = total flow time dibagi total waktu kerja. Average job lateness = total hari terlambat dibagi jumlah job. Job lateness sendiri = nilai terbesar antara 0 dan (flow time dikurangi due date).
<b>Contoh dari slide:</b> Lima job dengan (processing time, due date): A (6, 8), B (2, 6), C (8, 18), D (3, 15), E (9, 23). Hasil tiap aturan dibandingkan di bawah.
<b>Contoh dari slide:</b> FCFS, urutan A-B-C-D-E. Total flow time 77, total lateness 11. Average completion 77 dibagi 5 = 15,4 hari; utilization 28 dibagi 77 = 36,4%; average jobs in system 77 dibagi 28 = 2,75; average lateness 11 dibagi 5 = 2,2 hari.
<b>Contoh dari slide:</b> SPT, urutan B-D-A-C-E. Total flow time 65, lateness 9. Average completion 13 hari; utilization 43,1%; average jobs 2,32; average lateness 1,8 hari.
<b>Contoh dari slide:</b> EDD, urutan B-A-D-C-E. Total flow time 68, lateness 6. Average completion 13,6 hari; utilization 41,2%; average jobs 2,43; average lateness 1,2 hari.
<b>Contoh dari slide:</b> LPT, urutan E-C-A-D-B. Total flow time 103, lateness 48. Average completion 20,6 hari; utilization 27,2%; average jobs 3,68; average lateness 9,6 hari.
Tidak ada satu aturan yang unggul di semua ukuran. SPT bagus untuk menekan flow time dan jumlah job dalam sistem, tapi ia menaruh job panjang di akhir sehingga bisa membuat pelanggan job panjang kecewa. FCFS tidak terlalu bagus atau buruk di kriteria mana pun, tapi dianggap adil oleh pelanggan. EDD paling kecil keterlambatan maksimalnya (minimizes maximum lateness).
<b>Latihan dari slide:</b> beberapa job menunggu diproses di satu machine center, dicatat saat datang, semua dianggap tiba pada hari 275. Diminta menyusun urutannya menurut FCFS, EDD, SPT, dan LPT, lalu menilai mana yang terbaik dan alasannya.

<h2>Critical Ratio (CR)</h2>
Critical Ratio adalah angka indeks yang didapat dengan membagi sisa waktu sampai due date dengan sisa waktu kerja pada job itu. Job dengan CR kecil dikerjakan lebih dulu daripada job dengan CR besar. CR bekerja baik untuk menekan rata-rata keterlambatan. Rumusnya:
$$\\text{CR} = \\dfrac{\\text{Due date} - \\text{tanggal hari ini}}{\\text{Sisa waktu kerja}}$$
<b>Contoh dari slide:</b> Hari ini hari ke-25. Job A due 30, sisa kerja 4 hari, CR = (30-25) dibagi 4 = 1,25 (prioritas 3). Job B due 28, sisa 5 hari, CR = 0,60 (prioritas 1). Job C due 27, sisa 2 hari, CR = 1,00 (prioritas 2). Kalau CR kurang dari 1 berarti job sudah terlambat (Job B terlambat), CR = 1 berarti pas jadwal (Job C), dan CR di atas 1 berarti masih ada waktu longgar (Job A).
Kelebihan teknik Critical Ratio: bisa menentukan status sebuah job, menyusun prioritas antar job dengan dasar yang sama, menyesuaikan prioritas secara otomatis saat permintaan dan kemajuan job berubah, serta melacak kemajuan job secara dinamis.

<h2>Johnson's Rule (Dua Mesin)</h2>
Johnson's Rule dipakai untuk beberapa job yang melewati dua mesin atau work center yang sama. Tujuannya menekan total waktu produksi dan waktu menganggur. Ini disebut masalah N/2, yaitu N job melewati 2 work station. Langkahnya: daftar semua job dan waktunya; pilih job dengan waktu paling singkat. Kalau waktu tersingkatnya ada di work center pertama, jadwalkan job itu paling awal; kalau di work center kedua, jadwalkan paling akhir. Job yang sudah dijadwal dicoret, lalu ulangi sambil bergerak ke tengah urutan.
<b>Contoh dari slide:</b> Lima job dengan waktu (WC1 drill press, WC2 lathe): A (5, 2), B (3, 6), C (8, 4), D (10, 7), E (7, 12). Urutan hasil Johnson's Rule adalah B-E-D-C-A. Pada timeline, WC1 menyelesaikan tiap job di waktu 3, 10, 20, 28, dan 33, lalu WC2 mengikuti dengan sedikit waktu menganggur di awal.
<slide src="s2-uas-bm/opsmgmt/johnsons-rule-timeline.png" alt="Timeline Johnson's Rule untuk urutan B-E-D-C-A pada dua work center"/>
Bagian "Idle" menunjukkan WC2 menunggu di awal sebelum job pertama selesai di WC1.

<h2>Keterbatasan Aturan dan Finite Capacity Scheduling</h2>
Sistem berbasis aturan (rule-based dispatching) punya batas: penjadwalan itu dinamis sehingga aturan perlu sering direvisi, aturan tidak melihat ke proses sebelum atau sesudahnya, dan aturan tidak melihat melampaui due date.
Finite Capacity Scheduling (FCS) mengatasi kelemahan itu dengan sistem grafis berbasis komputer yang interaktif. FCS bisa memasukkan aturan, expert system, atau simulation sehingga bisa menanggapi perubahan secara real time, dan ia membantu menyeimbangkan kebutuhan pengiriman dengan efisiensi. Masukannya berupa planning data (master schedule, BOM, inventory), routing files, informasi work center, alat dan sumber daya lain, priority rules, serta data setup dan run time.

<h2>Penjadwalan di Sektor Jasa</h2>
Sistem jasa berbeda dari manufaktur. Manufaktur menjadwalkan mesin dan material, jasa menjadwalkan staf. Manufaktur memakai persediaan untuk meredam permintaan, jasa jarang menyimpan persediaan. Manufaktur bersifat padat mesin dengan permintaan yang mungkin mulus, jasa padat tenaga kerja dengan permintaan yang bisa berubah-ubah. Penjadwalan manufaktur bisa terikat kontrak serikat, sedangkan jasa bisa terbatas oleh urusan hukum. Manufaktur sedikit menghadapi masalah sosial, sedangkan di jasa masalah sosial dan perilaku bisa penting.
Contohnya: rumah sakit punya sistem penjadwalan yang rumit; bank memakai tenaga kerja lintas keahlian dan pekerja paruh waktu; toko ritel memakai sistem optimasi penjadwalan yang melacak penjualan, transaksi, dan lalu lintas pelanggan. Maskapai harus memenuhi aturan FAA dan serikat, sering memakai linear programming untuk jadwal optimal. Operasi 24 jam seperti polisi, pemadam kebakaran, hotline darurat, dan usaha pesan-antar memakai pekerja fleksibel dan jadwal yang berubah-ubah lewat sistem komputer.

<h2>Cyclical Scheduling untuk Karyawan Jasa</h2>
Tujuannya memenuhi kebutuhan staf dengan jumlah pekerja paling sedikit, dengan jadwal yang mulus dan membuat pekerja senang. Langkahnya: tentukan kebutuhan staf tiap hari; cari dua hari berturut-turut dengan total kebutuhan paling rendah dan jadikan itu hari libur; buat kebutuhan baru dengan mengurangi hari yang sudah dikerjakan pekerja pertama; ulangi langkah pemilihan hari libur pada baris baru; teruskan sampai semua kebutuhan terpenuhi.
<b>Contoh dari slide:</b> Kebutuhan staf per hari: Senin 5, Selasa 5, Rabu 6, Kamis 5, Jumat 4, Sabtu 3, Minggu 3. Dengan menambahkan pekerja satu per satu (Employee 1 sampai 7) dan memberi tiap pekerja dua hari libur pada hari yang kebutuhannya paling kecil, kapasitas akhirnya pas memenuhi kebutuhan tiap hari, dengan kelebihan kapasitas hanya 1 orang di hari Sabtu.
`;
