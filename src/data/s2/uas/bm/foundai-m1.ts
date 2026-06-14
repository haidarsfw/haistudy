export const foundaiModule1 = `
<h1>Modul 1: AI With IoT & AI and Robots In Our Lives</h1>
<subtitle>Modul ini menggabungkan dua materi yang saling nyambung. Session 8 membahas bagaimana AI bekerja bareng Internet of Things (IoT) untuk membaca keadaan dunia nyata lewat sensor, lalu mengambil keputusan dari data itu. Session 9 melanjutkannya ke bentuk yang lebih nyata, yaitu robot, saat kecerdasan tadi diberi "tubuh" yang bisa bergerak dan melakukan sesuatu.</subtitle>

<h2>Bagian A: AI With IoT (Session 8)</h2>
Session 8 membahas enam hal: Introduction to IoT, IoT Application with AI, Self-driving Cars, Robots in Manufacturing, Smart Homes, dan Smart Cities.
<h3>Apa itu IoT</h3>
Internet of Things (IoT) adalah jaringan dari banyak perangkat yang saling terhubung, di mana perangkat itu bisa tersambung dan saling bertukar data, baik dengan perangkat IoT lain maupun dengan cloud. Perangkatnya biasanya sudah dipasangi teknologi seperti sensors dan software, dan bentuknya bisa berupa alat mekanik maupun digital.
Yang bikin IoT khas: tiap perangkat bisa diberi sebuah Internet Protocol (IP) address dan bisa mengirim data lewat jaringan tanpa perlu manusia ikut campur, baik antar manusia maupun antara manusia dan komputer. Singkatnya, perangkatnya bekerja dan saling "ngobrol" sendiri secara otomatis.
<h3>Bagaimana IoT Bekerja</h3>
Slide ini menjelaskan bagian-bagian penyusun IoT lewat satu alur yang berurutan. Datanya jalan dari kiri ke kanan, mulai dari benda fisik sampai jadi informasi yang berguna.
<slide src="s2-uas-bm/foundai/iot-workflow.png" alt="Gambar 1.1 Alur kerja IoT"/>
Urutannya: Sensors, Devices, Connectivity, Cloud Computing, lalu Analytics and Data Processing. Penjelasan singkat tiap tahap: Sensors menangkap keadaan nyata seperti suhu, cahaya, atau gerakan. Devices mengolah dan menyiapkan sinyal dari sensor. Connectivity mengirim data itu lewat jaringan. Cloud Computing menyimpan dan mengolah data dalam jumlah besar. Terakhir, Analytics and Data Processing mengubah data mentah jadi informasi berguna yang bisa dipakai untuk mengambil keputusan.
<h3>IoT Application with AI</h3>
Begitu IoT digabung dengan AI, jumlah dan jenis perangkat yang bisa terhubung jadi sangat banyak. Slide "example" menampilkannya sebagai roda perangkat yang berpusat pada smartphone.
<slide src="s2-uas-bm/foundai/iot-devices-example.png" alt="Gambar 1.2 Contoh berbagai perangkat IoT"/>
Smartphone ditaruh sebagai Universal Remote Control di tengah (1st Generation), dikelilingi perangkat seperti thermostat, light, music system, smoke detector, lock, camera, watch, fitness wearable, glucometer, water sensor, heart monitor, accelerometer, security sensor, auto, shirt, appliances, router, printer, dan tablet, yang tersebar di 1st, 2nd, dan 3rd generation.
Bagian "how it works" menunjukkan susunan teknisnya, yang sering disebut AIoT architecture (gabungan AI dan IoT) yang berbasis cloud.
<slide src="s2-uas-bm/foundai/aiot-cloud-architecture.png" alt="Gambar 1.3 Susunan AIoT berbasis cloud"/>
Susunannya terbagi jadi empat lapis:
<bullet><b>Device layer:</b> kumpulan sumber data, seperti Sensors, Mobile devices, Wearables, dan Automobiles.</bullet>
<bullet><b>Connectivity layer:</b> jalur pengiriman data, terdiri dari IoT field gateways dan Cloud gateways. Data dari perangkat dikirim ke sini dalam bentuk Streaming Data.</bullet>
<bullet><b>Cloud layer:</b> tempat data diolah, mencakup Data storage, Data processing, Data visualization, dan Data access via API. Di antara connectivity dan cloud, data yang sudah dibersihkan disebut Scrubbed Data.</bullet>
<bullet><b>User communication layer:</b> bagian akhir tempat pengguna melihat hasilnya, lewat Web portals dan Mobile apps. Hasil olahan dari cloud dikirim ke sini sebagai Insights (informasi yang sudah berguna).</bullet>
<h3>Self-driving Cars</h3>
Mobil tanpa pengemudi (self-driving atau autonomous car) adalah salah satu contoh penggabungan IoT dan AI yang paling rumit, karena mobil harus mengerti keadaan di sekelilingnya saat itu juga (real-time). Slide "how it works" merangkum teknologinya dengan judul "ADAS and Autonomous - A Full Range of Technologies is Required".
<slide src="s2-uas-bm/foundai/self-driving-sensors.png" alt="Gambar 1.4 Kumpulan teknologi sensor pada self-driving car"/>
Mobil tanpa pengemudi memakai beberapa jenis sensor yang saling melengkapi, masing-masing punya jarak jangkau dan tugas yang berbeda:
<bullet>Long-range radar</bullet>
<bullet>LIDAR</bullet>
<bullet>Camera</bullet>
<bullet>Short-range atau medium-range radar</bullet>
<bullet>Ultrasound atau ultra-short-range radar</bullet>
Dari sensor-sensor itu, mobil bisa menjalankan banyak fungsi keselamatan dan kemudi sekaligus, di antaranya Adaptive cruise control, Emergency braking, Pedestrian detection, Collision avoidance, Environment mapping, Traffic sign recognition, Surround view atau Digital side mirror, Cross-traffic alert, Park assist, Blind spot detection, Rear collision warning, dan Lane departure warning. Semua data ini diolah oleh Processor di pusat, yang di gambar disebut 14nm sampai 7nm Autonomous Processor dan 22FDX atau 12FDX ADAS Processor.
<h3>Robots in Manufacturing</h3>
Di pabrik, robot dan AI dipakai supaya proses produksi jadi lebih cepat, lebih tepat, dan lebih hemat. Materinya memakai satu contoh kasus utama.
<b>Contoh dari slide, AUDI Case Study:</b> slide menampilkan konsep "The smart factory" di pabrik percontohan Audi Neckarsulm yang ada di bawah VW Group. Pabrik ini memetakan 12 penerapan teknologi.
<slide src="s2-uas-bm/foundai/audi-smart-factory.png" alt="Gambar 1.5 Contoh kasus smart factory Audi Neckarsulm"/>
<bullet>RFID provides vehicle data throughout the plant (memberi data kendaraan di seluruh pabrik).</bullet>
<bullet>Pearl chain concept synchronizes production and logistics (menyelaraskan produksi dan logistik).</bullet>
<bullet>Driverless floor conveyors (ban berjalan tanpa pengemudi).</bullet>
<bullet>Driverless transport system (sistem angkut tanpa pengemudi).</bullet>
<bullet>3D building scans.</bullet>
<bullet>Smart maintenance (perawatan pintar).</bullet>
<bullet>Virtual assembly planning (perencanaan perakitan secara virtual).</bullet>
<bullet>Virtual container planning.</bullet>
<bullet>3D printing.</bullet>
<bullet>Paint shop cockpit (ruang kendali bagian pengecatan).</bullet>
<bullet>AudiStream, tur pabrik secara virtual.</bullet>
<bullet>Vehicle localization drone (drone pelacak posisi kendaraan).</bullet>
Gambar juga menyorot peran Big Data yang dipakai untuk Wear Prediction, yaitu memperkirakan kapan komponen mesin akan aus sebelum benar-benar rusak.
<h3>Smart Homes</h3>
Rumah pintar bekerja dengan pola yang mirip tubuh manusia: ada indra (sensor), ada otak (controller), dan ada bagian penggerak (actuator) yang menjalankan perintah.
<slide src="s2-uas-bm/foundai/smart-home.png" alt="Gambar 1.6 Cara kerja smart home"/>
Alurnya terbagi jadi tiga kelompok:
<bullet><b>Sensors:</b> Flood detector, Luminosity detector, presence detector, dan temperature detector. Ini yang membaca keadaan rumah.</bullet>
<bullet><b>Controller:</b> otak sistem yang menerima data sensor, terhubung ke Gateway dan ke berbagai Interfaces seperti Tablet, Mobile phone, PC, Digital TV, Internet, dan switch.</bullet>
<bullet><b>Actuators:</b> bagian yang bertindak, seperti Blind actuator (penggerak tirai), Light actuator (lampu), dan Door actuator (pintu).</bullet>
Jadi saat presence detector membaca ada orang dan luminosity detector mendeteksi ruangan gelap, controller bisa menyuruh light actuator menyalakan lampu, dan pengguna tetap bisa memantau atau mengaturnya lewat smartphone.
<h3>Smart Cities</h3>
Konsep ini menaikkan cara kerja smart home ke ukuran satu kota. Slide "how it works" memetakan kota pintar jadi enam bagian utama.
<slide src="s2-uas-bm/foundai/smart-city.png" alt="Gambar 1.7 Enam bagian smart city"/>
Enam bagiannya: Smart Energy, Smart Water, Smart Buildings, Smart Mobility, Smart Integration, dan Smart Public Services. Tiap bagian dijelaskan lebih rinci di slide berikutnya.
<b>Smart Energy</b> adalah pemakaian teknologi dan sistem canggih untuk mengatur produksi, penyaluran, dan pemakaian energi secara hemat. Mencakup Smart Grids (teknologi digital supaya jaringan listrik lebih andal dan hemat), Renewable Energy Integration (memasukkan solar dan wind dengan mulus ke jaringan), dan Energy Management Systems (software dan hardware yang memantau serta mengatur pemakaian energi langsung).
<b>Contoh tambahan (di luar PPT):</b> Singapura lewat program Smart Nation memasang smart meter dan sistem pengatur energi di banyak gedung publik supaya pemakaian listrik bisa dipantau dan diatur otomatis.
<b>Smart Water</b> adalah pemakaian teknologi untuk mengatur sumber daya air secara hemat. Bagian utamanya: Smart Meters (data pemakaian air langsung), Leak Detection Systems (mendeteksi kebocoran di jaringan air), dan Water Quality Monitoring (memantau kualitas air terus-menerus).
<b>Contoh tambahan (di luar PPT):</b> Barcelona memasang sensor air pada sistem penyiraman tamannya, jadi penyiraman menyesuaikan kelembapan tanah dan menghemat pemakaian air kota.
<b>Smart Buildings</b> adalah gedung yang memakai proses otomatis untuk mengatur operasionalnya, seperti pemanas, ventilasi, pendingin udara, lampu, dan keamanan. Fiturnya: Building Management Systems (BMS), Energy Efficiency (smart lighting dan HVAC systems), dan Occupant Comfort (smart thermostats dan adaptive lighting).
<b>Smart Mobility</b> adalah pemakaian teknologi untuk membuat sistem transportasi lebih efisien, ramah lingkungan, dan mudah dipakai. Mencakup Intelligent Transportation Systems (ITS), Electric and Autonomous Vehicles, dan Mobility as a Service (MaaS).
<b>Smart Integration</b> adalah penyatuan berbagai sistem dan teknologi pintar supaya jadi satu kesatuan yang utuh dan efisien. Mencakup Interoperability Standards, Data Integration Platforms, dan Cross-Sector Collaboration (kerja sama antar sektor energi, air, dan transportasi).
<b>Smart Public Service</b> memakai teknologi digital untuk meningkatkan kualitas dan kecepatan layanan publik. Bagian utamanya: E-Government Services (layanan pemerintah online), Smart Health Services (telemedicine), dan Public Safety (sistem pengawasan, koordinasi tanggap darurat, dan crime prediction tools).
<h3>Diskusi (Session 8)</h3>
Pertanyaan diskusi dari slide: Explore the latest application of IoT with AI in your field then discuss the problem and benefit of the usage. Intinya, cari penerapan IoT dengan AI yang paling baru di bidang Anda, lalu bahas masalah sekaligus manfaat dari pemakaiannya.

<h2>Bagian B: AI and Robots In Our Lives (Session 9)</h2>
Session 9 membahas empat hal: Introduction to Robotics, The Partnership between AI and robots, AI's role in robotics for supporting daily-life activities, dan Possibilities of AI-based social robotics.
<h3>Introduction to Robotics</h3>
Robotics adalah bidang yang menggabungkan beberapa ilmu sekaligus, yaitu computer science, engineering, dan mathematics, untuk merancang, membuat, dan menjalankan robot.
Soal fungsinya, robot diprogram untuk mengerjakan tugas yang biasanya butuh kecerdasan manusia, seperti visual perception (melihat dan mengenali objek), decision-making (mengambil keputusan), dan manipulation of objects (memegang dan memindahkan benda).
<b>Contoh tambahan (di luar PPT):</b> lengan robot di pabrik seperti buatan KUKA atau ABB di jalur perakitan mobil sudah menunjukkan ketiga hal itu sekaligus, yaitu melihat posisi komponen, memutuskan urutan pemasangan, dan menggerakkan benda dengan tepat.
<h3>The Partnership between AI and Robots</h3>
AI-Robot Synergy. Gabungan antara artificial intelligence (AI) dan robotics punya potensi mengubah banyak industri. AI membuat robot jadi lebih pintar dan lebih mudah menyesuaikan diri, sehingga robot lebih jago mengambil keputusan. Gabungan ini juga bisa menciptakan lingkungan kerja yang lebih aman sambil menjaga hasil kerjanya tetap efisien.
AI's Role in Robotics. Di sini AI berperan memberi kemampuan berpikir yang dibutuhkan robot: mengambil keputusan, belajar dari lingkungannya, dan menyesuaikan diri dengan keadaan baru.
Robot Capabilities. Gabungan tadi membuat robot bisa mengerjakan tugas rumit yang sulit atau bahkan mustahil mereka lakukan sendirian. Slide memakai robot NAO sebagai contoh, dengan kemampuan yang dibagi ke empat fungsi.
<slide src="s2-uas-bm/foundai/nao-robot-capabilities.png" alt="Gambar 1.8 Empat kelompok kemampuan robot NAO"/>
<bullet><b>Move:</b> 25 Degrees of Freedom, Coreless motors, Controlled with software.</bullet>
<bullet><b>Sense:</b> Cameras, Microphones, FSRs and Bumpers, Sonars, MRE (Magnetic Rotary Encoders), Inertial Unit (Gyros, Accelerometer).</bullet>
<bullet><b>Communicate:</b> Loudspeakers, Multiple LEDs, Tactile sensors and prehensile hands, Infrared sensors, WIFI connection.</bullet>
<bullet><b>Think:</b> Geode 500 MHz CPU, 256 MB SDRAM, 2 GB Flash Memory, Software suite dan SDK.</bullet>
Cara membacanya: bagian Sense adalah indra robot, Think adalah otak yang mengolah, Move membuatnya bergerak, dan Communicate membuatnya bisa berinteraksi dengan manusia.
<h3>AI's Role in Robotics untuk Kegiatan Sehari-hari</h3>
Bagian ini membahas tiga peran robot ber-AI dalam kegiatan sehari-hari.
Household Chores. Robot ber-AI bisa membantu pekerjaan rumah seperti membersihkan, memasak, dan mencuci.
<b>Contoh tambahan (di luar PPT):</b> robot vacuum seperti iRobot Roomba memetakan ruangan dan membersihkan lantai sendiri tanpa harus diarahkan terus-menerus.
Precision Tasks. Robot ber-AI membantu tugas yang butuh ketelitian dan kelincahan tinggi, seperti surgery (operasi) dan assembly line work (pekerjaan di jalur perakitan).
<b>Contoh tambahan (di luar PPT):</b> alat bedah da Vinci Surgical System memungkinkan dokter melakukan operasi dengan sayatan kecil dan gerakan yang jauh lebih stabil serta tepat dibanding tangan manusia langsung.
Companionship and Support. Robot ber-AI bisa menemani dan memberi dukungan perasaan, terutama untuk orang lanjut usia dan penyandang disabilitas.
<b>Contoh tambahan (di luar PPT):</b> robot ElliQ dibuat khusus untuk menemani lansia yang tinggal sendiri, mengingatkan waktu minum obat, dan mengajak ngobrol supaya tidak kesepian.
<h3>Possibilities of AI-based Social Robotics</h3>
Bagian penutup membahas arah pengembangan social robotics (robot yang bisa bersosialisasi).
Emotional Intelligence. Social robot ber-AI bisa dirancang untuk mengenali dan menanggapi perasaan manusia.
<b>Contoh tambahan (di luar PPT):</b> robot Pepper buatan SoftBank dibuat untuk membaca ekspresi wajah dan nada suara, lalu menyesuaikan tanggapannya.
Companionship and Therapy. Social robot ber-AI bisa menemani dan membantu terapi, lagi-lagi terutama untuk lansia dan penyandang disabilitas.
<b>Contoh tambahan (di luar PPT):</b> robot terapi PARO berbentuk anak anjing laut dipakai di panti dan rumah sakit untuk menenangkan pasien demensia, mirip efek terapi hewan tapi tanpa repot merawat hewan hidup.
Future of Social Robotics. Memasukkan AI ke dalam social robotics punya dampak besar bagi pengembangan robot yang bisa menemani, membantu terapi, dan memberi dukungan sosial untuk orang yang membutuhkannya.
<h3>Diskusi (Session 9)</h3>
Pertanyaan diskusi dari slide: Discuss any possibility of robotic usage in your field. Diminta membahas kemungkinan pemakaian robotika di bidang Anda masing-masing.
`;
