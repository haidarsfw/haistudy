import type { CheatSheet } from "@/types/exam";

/**
 * Operations Management — Cheat Sheet (5 sheets)
 *
 * Transcribed from "Operations Management - Cheat Sheet (5 Lembar A4).pdf",
 * split into 5 balanced sheets so it reads like the allowed 5-sheet handwritten
 * note set. Single-language (Bahasa Indonesia, English terms preserved), shown
 * the same regardless of exam language (formulas and terms are universal).
 *
 * NOTE: inside template literals, LaTeX commands need double backslashes
 * (`\\frac`, `\\sqrt`, `\\sum`, `\\times`, `\\sigma`, `\\bar`) so KaTeX receives
 * a single backslash.
 */
export const opsmgmtCheatSheet: CheatSheet = {
  sheets: [
    {
      title: "1. Location Strategies",
      contentMd: `### 1. Location Strategies

**Labor cost per unit**

$$\\text{Biaya TK/unit} = \\frac{\\text{upah per hari}}{\\text{produktivitas (unit/hari)}}$$

Upah murah belum tentu total murah jika produktivitas rendah.

**Tiga tingkat keputusan:** Negara (risiko politik, pajak, nilai tukar) → Region/Komunitas (TK, utilitas, insentif, dekat bahan baku) → Site (lahan, akses, zonasi). Tiap tingkat punya Key Success Factors (KSF). Lokasi = keputusan long-term, pengaruhi fixed & variable cost.

**Factor-Rating Method**

$$\\text{Skor lokasi} = \\sum_i (\\text{bobot}_i \\times \\text{nilai}_i)$$

Langkah: daftar KSF → beri bobot (jumlah = 1) → skala nilai → nilai tiap lokasi → kali bobot lalu jumlah → pilih total tertinggi.

**Locational Cost-Volume Analysis**

$$TC = FC + (VC \\times V)$$

Crossover: samakan $TC_1 = TC_2$, cari V. FC kecil unggul di volume rendah; FC besar tapi VC kecil unggul di volume tinggi. Pilih TC terendah pada volume yang diperkirakan.

**Center-of-Gravity Method**

$$C_x = \\frac{\\sum x_i Q_i}{\\sum Q_i}, \\quad C_y = \\frac{\\sum y_i Q_i}{\\sum Q_i}$$

Untuk menaruh distribution center (biaya sebanding jarak × jumlah).

**Lainnya:** Transportation model (LP khusus, minimalkan total biaya produksi + kirim). Tangible cost (utilitas, TK, bahan, pajak) vs intangible (pendidikan, transport umum, quality-of-life). Clustering = perusahaan sejenis berkumpul. Proximity to supplier untuk barang busuk/berat/biaya angkut tinggi. Operational hedging = pindah produksi ikut nilai tukar. GIS = analisis demografi & peta.`,
    },
    {
      title: "2. Inventory Management",
      contentMd: `### 2. Inventory Management

**Fungsi:** penuhi permintaan & lindungi dari fluktuasi, decouple proses, manfaatkan quantity discount, hedge inflasi. **Jenis:** raw material, WIP, MRO, finished goods. Tujuan: seimbangkan inventory investment vs customer service.

**ABC Analysis:** annual dollar volume = unit/tahun × harga. Kelas A: kira-kira 20% item, 72% nilai; B: 30% / 23%; C: 50% / 5%. Kontrol A: supplier development, kontrol ketat, forecasting hati-hati, cycle count rapat (A tiap bulan, B tiap kuartal, C tiap 6 bulan).

**Simbol:** D = permintaan/tahun, S = setup/order, H = holding/unit/tahun, P = harga, L = lead time, d = permintaan/hari. Holding cost biasanya kira-kira 26% nilai.

**EOQ (Basic)**

$$Q^* = \\sqrt{\\frac{2DS}{H}}$$

$$\\text{Setup} = \\frac{D}{Q}S, \\quad \\text{Holding} = \\frac{Q}{2}H, \\quad TC = \\frac{D}{Q}S + \\frac{Q}{2}H + PD$$

$N = D/Q^*$ pesanan/tahun, $T = $ (hari kerja)/N. Di optimal: setup = holding. Asumsi: permintaan tetap & diketahui, lead time tetap, datang sekaligus, tanpa diskon. Robust: kurva biaya datar di sekitar $Q^*$.

**Reorder Point**

$$ROP = d \\times L, \\quad d = \\frac{D}{\\text{hari kerja/tahun}}$$

**Production Order Quantity** (diproduksi & dipakai bersamaan; p = laju produksi/hari, d = laju pakai/hari)

$$Q_p^* = \\sqrt{\\frac{2DS}{H\\left(1 - \\frac{d}{p}\\right)}}$$

Max inventory $= Q\\left(1 - \\frac{d}{p}\\right)$; Holding $= \\frac{Q}{2}\\left(1 - \\frac{d}{p}\\right)H$.

**Quantity Discount**

$$TC = \\frac{D}{Q}S + \\frac{Q}{2}(I \\cdot P) + P \\cdot D$$

I = holding sebagai % harga. Langkah: dari harga termurah hitung $Q^*$; cari Q feasible pertama; hitung TC tiap Q feasible dan tiap titik break; pilih TC terkecil.

**Safety Stock & Probabilistik**

$$ss = Z \\sigma_{dLT}, \\quad ROP = \\bar{d}L + Z \\sigma_{dLT}$$

- Demand var, LT tetap: $ROP = \\bar{d}L + Z \\sigma_d \\sqrt{L}$.
- LT var, demand tetap: $ROP = \\bar{d}L + Z\\,\\bar{d}\\,\\sigma_{LT}$.
- Keduanya var: $\\sigma_{dLT} = \\sqrt{\\bar{L}\\sigma_d^2 + \\bar{d}^2 \\sigma_{LT}^2}$.

**Tabel Z:** 50% → 0,00; 80% → 0,84; 85% → 1,04; 90% → 1,28; 95% → 1,645; 96% → 1,75; 97,5% → 1,96; 98% → 2,05; 99% → 2,33.

**Single-Period Model** (pesan sekali, sisa tak bernilai)

$$C_s = \\text{harga} - \\text{biaya}, \\quad C_o = \\text{biaya} - \\text{salvage}$$
$$\\text{Service level} = \\frac{C_s}{C_s + C_o}, \\quad Q^* = \\mu + Z\\sigma$$`,
    },
    {
      title: "3. Aggregate Planning, S&OP & MRP/ERP",
      contentMd: `### 3. Aggregate Planning & S&OP

**Horizon:** Long (> 1 thn, kapasitas, R&D, top exec) → Intermediate (3-18 bln, S&OP/aggregate, ops manager) → Short (< 3 bln, scheduling, supervisor).

**S&OP:** selaraskan demand forecast dengan kapasitas & supply chain (tim lintas fungsi). Hasil: aggregate plan feasible → dipecah jadi MPS.

**Capacity options:** (1) ubah inventory; (2) ubah jumlah pekerja (hire/layoff); (3) ubah laju produksi (overtime/idle); (4) subkontrak; (5) part-time.

**Demand options:** (1) memengaruhi permintaan (iklan, promo, diskon); (2) backordering; (3) counterseasonal mixing.

**Chase vs Level:** Chase = produksi mengikuti permintaan tiap periode (ubah pekerja/laju), persediaan kecil, disukai jasa. Level = produksi/pekerja tetap, pakai inventory/idle sebagai penyangga, kualitas stabil. Mixed strategy sering paling murah.

**Metode:** Graphical (trial-and-error: hitung kebutuhan, kapasitas, biaya, bandingkan). Transportation method of LP: optimal; tambah kolom dummy "unused capacity"; backordering tidak boleh.

**Revenue Management:** alokasikan kapasitas ke segmen pada harga yang maksimalkan yield. $\\text{Contribution} = (\\text{harga} - VC) \\times \\text{unit}$. Cocok saat: bisa dijual di muka, permintaan fluktuatif, kapasitas tetap, segmentable, VC rendah & FC tinggi.

### 4. MRP & ERP

**Dasar:** dependent demand (kebutuhan item ikut end item). Syarat MRP: MPS, BOM, inventory availability, PO outstanding, lead times. MPS = apa & kapan dibuat (rolling, sebagian frozen).

**BOM & explosion:** parents & components; low-level coding (item dikode di tingkat terendah ia muncul). $\\text{Keb. komponen} = \\sum_{\\text{induk}} (\\text{jumlah induk} \\times \\text{koef BOM})$.

**Net requirements:** $\\text{Net} = \\text{Gross} - \\text{On-hand} - \\text{Sched. receipts}$. Planned order receipt → mundur sebanyak lead time (time phasing) → planned order release.

**Lot sizing:** Lot-for-Lot (pesan persis net req, holding 0, mahal jika setup besar); POQ (interval = EOQ ÷ rata-rata permintaan/periode); EOQ (asumsi permintaan tetap); Wagner-Whitin (optimal). LFL jika setup murah; POQ/EOQ jika setup besar & permintaan mulus.

**Perluasan:** system nervousness diatasi time fences & pegging. MRP II (tambah labor/machine hours, scrap); Closed-Loop MRP (umpan balik planning↔execution); DRP (pull sepanjang supply chain); ERP (basis data bersama, real-time; modul MRP, finance, HR, SCM, CRM).`,
    },
    {
      title: "5. Short-Term Scheduling",
      contentMd: `### 5. Short-Term Scheduling

**Arah:** Forward (mulai saat kebutuhan diketahui; bisa lewat due date, numpuk WIP) vs Backward (mulai dari due date, mundur). Finite loading (sampai batas kapasitas) vs infinite. Input-Output control: pantau input vs output vs backlog.

**Proses:** Job shop / process-focused (jadwal per pesanan, fokus due date). Repetitive/assembly (ramalan + JIT). Continuous / product-focused (volume tinggi).

**Assignment Method** (LP khusus, 1 job ke 1 mesin): (1) tabel biaya; (2) kurangi nilai terkecil tiap baris lalu tiap kolom; (3) tutup semua 0 dengan garis seminimal mungkin. Jika #garis = #baris → optimal; jika belum, kurangi angka terkecil tak tertutup dari semua sel tak tertutup & tambahkan di persilangan garis, ulangi.

**Priority rules & metrik** (FCFS, SPT, EDD, LPT). Flow time = waktu lepas sampai selesai.

$$\\text{Avg completion} = \\frac{\\sum \\text{flow time}}{\\text{jumlah job}}, \\quad \\text{Utilization} = \\frac{\\sum \\text{waktu kerja}}{\\sum \\text{flow time}}$$

$$\\text{Avg \\# jobs} = \\frac{\\sum \\text{flow time}}{\\sum \\text{waktu kerja}}, \\quad \\text{Lateness} = \\max(0,\\ \\text{flow} - \\text{due date})$$

SPT: minimalkan flow time & jumlah job. EDD: minimalkan max lateness. FCFS: paling adil. LPT: paling buruk.

**Critical Ratio**

$$CR = \\frac{\\text{Due date} - \\text{hari ini}}{\\text{sisa waktu kerja}}$$

CR < 1 terlambat, = 1 pas jadwal, > 1 longgar. Kerjakan CR terkecil dulu.

**Johnson's Rule** (N job / 2 mesin): cari waktu terkecil di seluruh tabel; jika di M1 jadwalkan paling awal, jika di M2 jadwalkan paling akhir; coret, ulangi ke tengah. Tujuan: minimalkan makespan & idle.

**Jasa:** jadwalkan staf, bukan mesin. Cyclical scheduling: penuhi kebutuhan dengan pekerja paling sedikit; beri 2 hari libur berturut pada hari kebutuhan terkecil, ulangi.`,
    },
    {
      title: "6. Maintenance, Reliability, Lean + Panduan",
      contentMd: `### 6. Maintenance, Reliability & Lean

**Definisi:** Maintenance = menjaga kemampuan sistem. Reliability = peluang komponen berfungsi benar selama waktu & kondisi tertentu. Taktik reliability: perbaiki komponen + redundancy. Taktik maintenance: preventive + tingkatkan kemampuan perbaikan.

**Jenis maintenance:** Preventive (inspeksi/servis rutin, terjadwal); Breakdown (perbaikan darurat setelah rusak); Predictive (prediksi sebelum rusak: getaran, IR, oli). MTBF = rata-rata waktu antar kerusakan. Autonomous maintenance: operator observe, check, adjust, clean, notify. TPM: mesin andal & mudah dirawat, total cost of ownership, rencana PM, latih operator.

**Keputusan biaya breakdown:** $\\text{Expected breakdown} = \\sum (\\text{jumlah} \\times \\text{prob})$. Biaya tanpa kontrak = expected breakdown × biaya/kerusakan; bandingkan dengan biaya kontrak; pilih termurah.

**Effective Reliability**

$$R_{eff} = 1 - \\left[P(\\text{failure}) \\times P(\\text{tak terdeteksi})\\right]$$

Contoh: R = 0,90, deteksi 0,70 ⇒ $R_{eff} = 1 - (0,10 \\times 0,30) = 0,97$. Naik hanya jika metode cocok, pemantauan cukup sering, tindakan cepat.

**Lean: 3 dasar:** hilangkan waste, hilangkan variability, naikkan throughput. Pull (tarik saat dibutuhkan, lot kecil) vs Push (menjejalkan tanpa peduli kebutuhan).

**7 Waste (Ohno):** overproduction, queues, transportation, inventory, motion, overprocessing, defective products. **5S:** Sort, Simplify, Shine, Standardize, Sustain. Analogi air & batu: turunkan persediaan untuk membuka masalah tersembunyi.

**JIT:** suppliers (sedikit vendor, mutu tepat waktu); layout (work cell, U-shape, poka-yoke); inventory (lot kecil, setup rendah); scheduling (level schedule, kanban); PM terjadwal; quality (SPC, poka-yoke).

**Kanban**

$$\\#\\text{kanban} = \\frac{\\text{demand selama LT} + \\text{safety stock}}{\\text{ukuran container}}$$

Demand selama LT = permintaan harian × LT. Setup turun → lot kecil → rata-rata persediaan (Q/2) turun.

**TPS:** continuous improvement (kaizen), respect for people, standard work; jidoka (henti saat cacat). Level schedule: batch kecil sering (A A B B B C), bukan large-lot.

### Panduan Cepat Memilih Metode

- Bandingkan banyak faktor lokasi → Factor-Rating.
- Pilih lokasi vs volume produksi → Cost-Volume (crossover).
- Tentukan letak distribution center → Center-of-Gravity.
- Berapa & kapan memesan (permintaan tetap) → EOQ + ROP.
- Produksi & pakai bersamaan → Production Order Quantity.
- Ada diskon kuantitas → Quantity Discount (cek tiap break).
- Permintaan tak pasti → Safety stock (Z) atau biaya stockout.
- Pesan sekali, barang cepat basi → Single-Period.
- Pecah end item jadi komponen → BOM explosion + MRP gross-to-net.
- Tentukan ukuran lot MRP → LFL / POQ / EOQ / Wagner-Whitin.
- Urutkan job 1 mesin → FCFS/SPT/EDD/LPT atau Critical Ratio.
- Job lewat 2 mesin berurutan → Johnson's Rule.
- Pasangkan job ke mesin (biaya minimum) → Assignment Method.
- Pakai kontrak servis atau tidak → bandingkan expected breakdown cost.
- Nilai manfaat predictive maintenance → Effective Reliability.
- Hitung sinyal pull system → jumlah Kanban.`,
    },
  ],
  // Original-PDF view: 5 sheets pre-rendered from the 5-page cheat-sheet PDF
  // (generated into /public via pdftoppm). Order matches `sheets` above.
  imageSheets: [
    "/cheatsheets/opsmgmt/sheet-1.png",
    "/cheatsheets/opsmgmt/sheet-2.png",
    "/cheatsheets/opsmgmt/sheet-3.png",
    "/cheatsheets/opsmgmt/sheet-4.png",
    "/cheatsheets/opsmgmt/sheet-5.png",
  ],
};
