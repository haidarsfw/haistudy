export const opsmgmtModule2 = `
<h1>Modul 2: Inventory Management</h1>

<h2>Tujuan Manajemen Persediaan</h2>
Tujuan inventory management adalah mencari keseimbangan antara uang yang ditanam di persediaan (inventory investment) dan pelayanan ke pelanggan (customer service). Terlalu sedikit stok bikin pelanggan kecewa, terlalu banyak stok bikin biaya membengkak.

<h2>Pentingnya Persediaan</h2>
Persediaan adalah salah satu aset paling mahal di banyak perusahaan, bahkan bisa mencapai 50% dari seluruh modal yang ditanam. Stok yang lebih sedikit memang menurunkan biaya, tapi memperbesar kemungkinan kehabisan barang (shortage), yang bisa menghentikan proses produksi atau membuat pelanggan kecewa. Sebaliknya, stok yang lebih banyak menaikkan biaya, tapi memperbesar peluang untuk memenuhi kebutuhan proses dan pelanggan.

<h2>Fungsi Persediaan</h2>
<bullet>Menyediakan pilihan barang untuk permintaan yang diperkirakan, sekaligus melindungi perusahaan dari naik turunnya permintaan.</bullet>
<bullet>Memisahkan (decouple) bagian-bagian proses produksi supaya satu bagian tidak langsung terganggu kalau bagian lain bermasalah.</bullet>
<bullet>Memanfaatkan potongan harga untuk pembelian banyak (quantity discounts).</bullet>
<bullet>Melindungi nilai uang dari inflasi (hedge against inflation).</bullet>

<h2>Jenis-Jenis Persediaan</h2>
<bullet><b>Raw material:</b> bahan yang sudah dibeli tapi belum diproses.</bullet>
<bullet><b>Work-in-process (WIP):</b> barang yang sudah mulai diproses tapi belum selesai. Jumlahnya tergantung flow time (lama barang mengalir di proses).</bullet>
<bullet><b>Maintenance/repair/operating (MRO):</b> barang yang diperlukan untuk menjaga mesin dan proses tetap berjalan.</bullet>
<bullet><b>Finished goods:</b> produk jadi yang tinggal menunggu dikirim.</bullet>

<h2>Siklus Aliran Material</h2>
Yang menarik, sebagian besar waktu sebuah barang di pabrik sebenarnya cuma dipakai untuk menunggu. Pada siklus ini, kira-kira hanya 5% waktu yang benar-benar dipakai mengerjakan barang (run time), sisanya yang 95% adalah menunggu. Tahapannya: input, menunggu inspeksi, menunggu dipindah, waktu pindah, menunggu antrian operator, setup time, run time, lalu output.
<slide src="s2-uas-bm/opsmgmt/inventory-usage-sawtooth.png" alt="Grafik pemakaian stok terhadap waktu, bentuk gigi gergaji"/>
Grafik pemakaian stok terhadap waktu berbentuk seperti gigi gergaji. Stok turun pelan karena dipakai, lalu naik lagi saat pesanan datang. Order quantity Q adalah stok tertinggi, dan rata-rata stok adalah $Q/2$.

<h2>Mengelola Persediaan</h2>
Ada dua hal utama: bagaimana barang dikelompokkan (ABC analysis) dan bagaimana catatan stok dijaga tetap akurat.
<h3>ABC Analysis</h3>
ABC analysis membagi persediaan jadi tiga kelas berdasarkan annual dollar volume, yaitu nilai uang per tahun (jumlah unit dikali harga). Class A bernilai tinggi, Class B sedang, dan Class C rendah. Tujuannya supaya perhatian dipusatkan ke sedikit barang yang penting, bukan dihabiskan untuk banyak barang yang nilainya kecil.
Pola umumnya: barang Class A jumlahnya sedikit (sekitar 20% dari jumlah barang) tapi menyumbang sekitar 72% nilai uang. Class B sekitar 30% jumlah dan 23% nilai. Class C sekitar 50% jumlah tapi cuma 5% nilai.
<b>Contoh dari slide:</b> Tabel ABC dari slide. Item 10286: 1.000 unit dikali USD 90 = USD 90.000 (38,8%), masuk A. Item 11526: 500 dikali USD 154 = USD 77.000 (33,2%), A. Item 12760: 1.550 dikali USD 17 = USD 26.350 (11,3%), B. Item 10867: 350 dikali USD 42,86 = USD 15.001 (6,4%), B. Item 10500: 1.000 dikali USD 12,50 = USD 12.500 (5,4%), B. Item 12572: 600 dikali USD 14,17 = USD 8.502 (3,7%), C. Item 14075: 2.000 dikali USD 0,60 = USD 1.200 (0,5%), C. Item 01036: 100 dikali USD 8,50 = USD 850 (0,4%), C. Item 01307: 1.200 dikali USD 0,42 = USD 504 (0,2%), C. Item 10572: 250 dikali USD 0,60 = USD 150 (0,1%), C. Total 8.550 unit senilai USD 232.057.
<slide src="s2-uas-bm/opsmgmt/abc-analysis.png" alt="Kurva ABC Analysis, persentase nilai uang terhadap persentase jumlah barang"/>
Kurva ABC menunjukkan sedikit barang (A items) menyumbang porsi nilai uang paling besar, sementara banyak barang (C items) hanya menyumbang sedikit.
Selain nilai uang per tahun, ada kriteria lain yang bisa dipakai: biaya kehabisan atau biaya simpan yang tinggi, perkiraan adanya perubahan desain teknik, masalah pengiriman, dan masalah kualitas. Kebijakan untuk barang A biasanya: lebih giat membina pemasok (supplier development), kontrol fisik stok yang lebih ketat, dan peramalan (forecasting) yang lebih hati-hati.
<h3>Keakuratan Catatan</h3>
Catatan yang akurat adalah bahan penting dalam sistem produksi dan persediaan. Sistem periodic memeriksa stok secara berkala, salah satunya dengan two-bin system (sistem dua wadah). Sistem perpetual inventory mencatat barang masuk dan keluar terus-menerus, dan bisa dibuat semi-otomatis. Catatan barang masuk dan keluar harus akurat, gudang harus aman, karena ini menentukan keputusan soal pemesanan, penjadwalan, dan pengiriman.
<h3>Cycle Counting</h3>
Cycle counting adalah menghitung barang dan memperbarui catatan secara berkala, sering dipadukan dengan ABC analysis. Keuntungannya: tidak perlu menghentikan operasi, tidak perlu penyesuaian stok besar-besaran tiap tahun, dihitung oleh orang terlatih, penyebab kesalahan bisa ditemukan dan diperbaiki, serta catatan tetap akurat.
<b>Contoh dari slide:</b> Ada 5.000 barang (500 A, 1.750 B, 2.750 C). Aturannya: A dihitung tiap bulan (20 hari kerja), B tiap kuartal (60 hari), C tiap enam bulan (120 hari). Maka A: 500 dibagi 20 = 25 per hari; B: 1.750 dibagi 60 = 29 per hari; C: 2.750 dibagi 120 = 23 per hari. Totalnya 77 barang per hari.

<h2>Kontrol Persediaan Jasa</h2>
Untuk usaha jasa, kontrol persediaan bisa sangat menentukan laba. Kerugian biasanya datang dari shrinkage (susut) atau pilferage (pencurian kecil). Caranya: memilih, melatih, dan mendisiplinkan karyawan dengan baik; mengontrol ketat barang masuk; dan mengontrol semua barang yang keluar dari tempat usaha.

<h2>Jenis Permintaan dan Jenis Biaya</h2>
Independent demand adalah saat permintaan suatu barang tidak bergantung pada barang lain. Dependent demand adalah saat permintaan suatu barang bergantung pada permintaan barang lain.
Biaya yang terlibat: holding cost (biaya menyimpan stok dari waktu ke waktu), ordering cost (biaya memesan dan menerima barang), dan setup cost (biaya menyiapkan mesin atau proses untuk satu pesanan, biasanya sejalan dengan setup time).
<b>Contoh dari slide:</b> Rincian holding cost (Table 12.1) sebagai persen dari nilai persediaan: biaya gedung (housing) 6% (kisaran 3 sampai 10%), penanganan material 3% (1 sampai 3,5%), tenaga kerja 3% (3 sampai 5%), biaya investasi 11% (6 sampai 24%), serta pilferage, ruang, dan keusangan 3% (2 sampai 5%). Totalnya sekitar 26%. Holding cost berbeda-beda tergantung jenis usaha, lokasi, dan suku bunga. Umumnya di atas 15%, dan untuk barang teknologi tinggi atau fashion bisa di atas 40%.

<h2>Model Persediaan untuk Independent Demand</h2>
Di sini kita perlu menentukan kapan dan berapa banyak memesan. Ada tiga model: Basic EOQ, Production Order Quantity, dan Quantity Discount.
<h3>Basic EOQ Model</h3>
Asumsi pentingnya: permintaan diketahui, tetap, dan independen; lead time diketahui dan tetap; barang datang sekaligus dan langsung penuh; tidak ada potongan harga; satu-satunya biaya yang berubah adalah setup (atau order) dan holding; serta kehabisan stok bisa benar-benar dihindari.
Tujuannya meminimalkan total biaya, yaitu setup cost ditambah holding cost. Order quantity yang paling hemat disebut Q*. Titik paling hemat ini terjadi tepat saat holding cost sama besar dengan setup cost.
<slide src="s2-uas-bm/opsmgmt/eoq-minimizing-costs.png" alt="Grafik biaya EOQ, total cost minimum di order quantity optimal"/>
Garis holding cost naik dan garis setup cost turun. Total biaya paling rendah (minimum total cost) berada tepat di order quantity optimal Q*.
Lambang yang dipakai: Q jumlah per pesanan, Q* jumlah paling hemat (EOQ), D permintaan tahunan, S biaya setup atau order per pesanan, H holding cost per unit per tahun. Rumusnya:
$$\\text{annual setup cost} = (D/Q)\\,S$$
$$\\text{annual holding cost} = (Q/2)\\,H$$
$$Q^* = \\sqrt{2DS/H}$$
<b>Contoh dari slide:</b> Menentukan jumlah jarum (needles) yang dipesan. D = 1.000 unit, S = USD 10 per order, H = USD 0,50 per unit per tahun. Maka Q* = akar dari (2 dikali 1.000 dikali 10 dibagi 0,50) = akar 40.000 = 200 unit. Jumlah pesanan per tahun N = D dibagi Q* = 1.000 dibagi 200 = 5 kali. Jarak antar pesanan T = 250 hari kerja dibagi 5 = 50 hari. Total annual cost = setup + holding = (5 dikali USD 10) + (100 dikali USD 0,50) = USD 50 + USD 50 = USD 100. Kalau harga bahan P ikut dihitung, totalnya jadi setup + holding + product cost.
<h3>Robust Model</h3>
EOQ bersifat robust, artinya tetap berguna walaupun tidak semua asumsi terpenuhi. Sebabnya, kurva total biaya cukup datar di sekitar titik EOQ. Jadi salah sedikit dalam menebak permintaan tidak membuat biaya melonjak.
<b>Contoh dari slide:</b> Kalau ternyata permintaan asli 1.500 unit (bukan 1.000), Q* yang benar adalah 244,9 unit. Tapi kalau perusahaan tetap memesan dengan Q* lama (200 unit), total biayanya cuma sekitar 2% lebih mahal dari biaya optimal. Selisihnya kecil.
<h3>Reorder Point (ROP)</h3>
EOQ menjawab pertanyaan "berapa banyak", sedangkan reorder point (ROP) menjawab "kapan" harus memesan. Lead time (L) adalah jarak waktu antara memesan dan menerima barang. Rumusnya:
$$\\text{ROP} = d \\times L$$
dengan $d$ = permintaan per hari = D dibagi jumlah hari kerja per tahun.
<b>Contoh dari slide:</b> Permintaan 8.000 iPhone per tahun, 250 hari kerja, lead time 3 hari (kadang bisa 4 hari). Maka d = 8.000 dibagi 250 = 32 unit per hari. ROP = 32 dikali 3 = 96 unit. Kalau lead time-nya 4 hari, ROP = 32 dikali 4 = 128 unit. Jadi saat stok tinggal segitu, sudah waktunya memesan lagi.
<slide src="s2-uas-bm/opsmgmt/reorder-point.png" alt="Kurva reorder point, stok dipesan ulang saat menyentuh garis ROP"/>
Stok dipesan ulang saat menyentuh garis ROP, lalu terisi lagi setelah lead time L berlalu.
<h3>Production Order Quantity Model</h3>
Model ini dipakai saat stok terbentuk sedikit demi sedikit setelah pesanan dimulai, yaitu ketika barang diproduksi dan dipakai (dijual) pada waktu yang bersamaan. Lambang tambahannya: p daily production rate (laju produksi per hari) dan d daily demand atau usage rate (laju pemakaian per hari), serta t lama produksi dalam hari.
Rumusnya:
$$\\text{Maximum inventory level} = pt - dt = Q\\left(1 - \\dfrac{d}{p}\\right)$$
$$\\text{Holding cost} = (Q/2)\\left(1 - \\dfrac{d}{p}\\right)H$$
$$Q_p^* = \\sqrt{\\dfrac{2DS}{H\\left(1 - \\dfrac{d}{p}\\right)}}$$
<b>Contoh dari slide:</b> D = 1.000 unit, S = USD 10, H = USD 0,50 per unit per tahun, p = 8 unit per hari, d = 4 unit per hari. Nilai d = 4 didapat dari D dibagi jumlah hari operasi, yaitu 1.000 dibagi 250 = 4 per hari.
<slide src="s2-uas-bm/opsmgmt/production-order-quantity.png" alt="Production order quantity model, stok naik saat produksi lalu turun saat hanya dipakai"/>
Selama produksi berjalan, stok naik (karena produksi lebih cepat dari pemakaian), lalu turun saat produksi berhenti dan barang hanya dipakai.
<h3>Quantity Discount Models</h3>
Harga sering lebih murah kalau memesan dalam jumlah besar. Untung ruginya: harga barang jadi lebih murah, tapi holding cost naik karena stok jadi banyak.
<b>Contoh dari slide:</b> Skema potongan harga (Table 12.2): jumlah 0 sampai 119 harganya USD 100 per unit, jumlah 120 sampai 1.499 harganya USD 98, dan jumlah 1.500 ke atas harganya USD 96.
Total cost = setup + holding + product cost:
$$\\text{Total cost} = (D/Q)S + (Q/2)(I \\cdot P) + PD$$
Karena harga per unit berubah-ubah, holding cost ditulis sebagai persentase I dari harga P. Langkahnya: mulai dari harga termurah, hitung Q* sampai ketemu EOQ pertama yang feasible (masuk akal sesuai rentang jumlahnya). Lalu hitung total cost untuk tiap kemungkinan jumlah pesanan, dan pilih yang totalnya paling rendah.
<b>Contoh dari slide:</b> Chris Beehner Electronics memesan drone. Mulai dari harga termurah: Q untuk USD 96 = akar dari (2 dikali 5.200 dikali 200 dibagi (0,28 dikali 96)) = 278 drone, tapi ini infeasible karena harga USD 96 butuh minimal 1.500. Lalu Q untuk USD 98 = akar dari (2 dikali 5.200 dikali 200 dibagi (0,28 dikali 98)) = 275 drone, dan ini feasible. Hitung totalnya (Table 12.3): pesan 275 unit di harga USD 98 totalnya USD 3.782 (ordering) + USD 3.773 (holding) + USD 509.600 (product) = USD 517.155. Pesan 1.500 unit di harga USD 96 totalnya USD 693 + USD 20.160 + USD 499.200 = USD 520.053. Karena USD 517.155 lebih kecil, pilih beli 275 drone seharga USD 98 per unit.
<b>Latihan dari slide (Bell Computers):</b> membeli integrated chips seharga USD 350 per chip, holding cost USD 35 per unit per tahun, ordering cost USD 120 per order, penjualan stabil 400 per bulan. Pemasok menawarkan potongan harga untuk pesanan besar. Yang dicari: jumlah pesanan optimal dan biaya tahunan minimum, lalu hitung ulang kalau holding cost memakai 10% dari harga, bukan USD 35 tetap.
Variasi quantity discount: all-units discount adalah bentuk paling umum (potongan berlaku untuk semua unit). Incremental quantity discount hanya berlaku untuk unit yang dibeli di atas batas tertentu. Ada juga fixed fee yang mendorong pembelian besar, serta penggabungan (aggregation) antar barang atau antar waktu, misalnya truckload discount, beli-satu-gratis-satu, dan diskon satu kali saja.

<h2>Probabilistic Models dan Safety Stock</h2>
Model ini dipakai saat permintaan tidak tetap atau tidak pasti. Untuk menghindari kehabisan stok dan mencapai tingkat layanan (service level) yang diinginkan, dipakai safety stock (ss), yaitu stok cadangan. Rumusnya:
$$\\text{ROP} = d \\times L + ss$$
Biaya kehabisan stok per tahun = jumlah unit yang kurang di tiap tingkat permintaan, dikali peluangnya, dikali biaya kehabisan per unit, dikali jumlah pesanan per tahun.
<b>Contoh dari slide:</b> ROP = 50 unit, 6 pesanan per tahun, stockout cost USD 40 per frame, carrying cost USD 5 per frame per tahun. Peluang permintaan: 30 (0,2), 40 (0,2), 50 (0,3), 60 (0,2), 70 (0,1). Bandingkan biaya tiap safety stock. Safety stock 20: holding (20)(USD 5) = USD 100, stockout USD 0, total USD 100. Safety stock 10: holding USD 50, stockout (10)(0,1)(USD 40)(6) = USD 240, total USD 290. Safety stock 0: holding USD 0, stockout (10)(0,2)(USD 40)(6) + (20)(0,1)(USD 40)(6) = USD 960, total USD 960. Yang termurah adalah safety stock 20 frame, sehingga ROP = 50 + 20 = 70 frame.
Kalau biaya kehabisan stok tidak bisa dihitung, safety stock ditentukan dari service level yang ditargetkan. Rumusnya:
$$\\text{ROP} = \\text{permintaan selama lead time} + Z\\,\\sigma_{dLT}$$
Di sini Z adalah jumlah standar deviasi, dan $\\sigma_{dLT}$ adalah standar deviasi permintaan selama lead time.
<b>Contoh dari slide:</b> Permintaan rata-rata 350 kits, $\\sigma_{dLT}$ = 10 kits, kebijakan kehabisan stok 5% (service level 95%). Dari Appendix I, untuk luas 95% nilai Z = 1,645. Safety stock = 1,645 dikali 10 = 16,5 kits. Reorder point = 350 + 16,5 = 366,5 atau dibulatkan 367 kits.
<slide src="s2-uas-bm/opsmgmt/probabilistic-demand.png" alt="Permintaan probabilistik, kurva normal dengan safety stock menggeser ROP"/>
Kurva normal menunjukkan permintaan selama lead time bisa naik turun. Safety stock 16,5 unit menggeser ROP ke 366,5 supaya risiko kehabisan stok kecil.
<h3>Model Probabilistik Lainnya</h3>
Kalau data permintaan selama lead time tidak ada, ada beberapa model lain.
Permintaan berubah-ubah, lead time tetap:
$$\\text{ROP} = (\\text{rata-rata permintaan harian} \\times \\text{lead time}) + Z\\,\\sigma_{dLT}$$
dengan $\\sigma_{dLT} = \\sigma_d \\sqrt{\\text{lead time}}$.
<b>Contoh dari slide:</b> Rata-rata permintaan harian 15, lead time 2 hari, sigma-d = 5, service level 90% sehingga Z = 1,28. ROP = (15 dikali 2) + 1,28(5)(akar 2) = 30 + 9,02 = 39,02, dibulatkan 39. Safety stock-nya sekitar 9 komputer.
Lead time berubah-ubah, permintaan tetap:
$$\\text{ROP} = (\\text{permintaan harian} \\times \\text{rata-rata lead time}) + Z \\times \\text{permintaan harian} \\times \\sigma_{LT}$$
dengan $\\sigma_{LT}$ standar deviasi lead time dalam hari.
<b>Contoh dari slide:</b> Permintaan harian 10, rata-rata lead time 6 hari, sigma-LT = 1, service level 98% sehingga Z = 2,055. ROP = (10 dikali 6) + 2,055(10)(1) = 60 + 20,55 = 80,55, dibulatkan sekitar 81 kamera.
Permintaan dan lead time sama-sama berubah:
$$\\text{ROP} = (\\text{rata-rata permintaan harian} \\times \\text{rata-rata lead time}) + Z\\,\\sigma_{dLT}$$
dengan $\\sigma_{dLT} = \\sqrt{(\\text{rata-rata lead time} \\times \\sigma_d^2) + (\\text{rata-rata permintaan harian})^2 \\times \\sigma_{LT}^2}$.
<b>Contoh dari slide:</b> Rata-rata permintaan harian 150, sigma-d = 16, rata-rata lead time 5 hari, sigma-LT = 1 hari, service level 95% sehingga Z = 1,645.
<h3>Single-Period Model</h3>
Model ini dipakai saat barang hanya dipesan satu kali, dan di akhir periode jual barangnya sudah tidak ada nilainya (atau sangat kecil), misalnya koran harian. Cs = cost of shortage = harga jual per unit dikurangi biaya per unit. Co = cost of overage = biaya per unit dikurangi nilai sisa (salvage value). Service level $= \\dfrac{C_s}{C_s + C_o}$.
<b>Contoh dari slide:</b> Rata-rata permintaan 120 koran per hari, sigma = 15. Cs = USD 1,25 - USD 0,70 = USD 0,55. Co = USD 0,70 - USD 0,30 = USD 0,40. Service level = 0,55 dibagi (0,55 + 0,40) = 0,55 dibagi 0,95 = 0,579 atau 57,9%. Dari Appendix I, untuk luas 0,579 nilai Z sekitar 0,199. Maka jumlah stok optimal = 120 + (0,199)(15) = 120 + 3 = 123 koran. Risiko kehabisan = 1 dikurangi service level = 1 - 0,579 = 0,421 atau 42,1%.
`;
