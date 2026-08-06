// =============================================================================
// KONFIGURASI WEB APP URL
// =============================================================================
const API_URL = "https://script.google.com/macros/s/AKfycbwiZFnuX_ccRw0CdfGzJxxsEoxXy_UxQ_SJQBNPO1eOrfodJydUQtc3CIwUnMJjYT_J/exec";

// Global Variables
let currentToken = localStorage.getItem("userToken") || "";
let currentUser = localStorage.getItem("username") || "";
let pegawaiList = [];
let filteredPegawaiList = [];
let selectedPegawai = null;

// =============================================================================
// INISIALISASI SAAT HALAMAN DIMUAT
// =============================================================================
document.addEventListener("DOMContentLoaded", function () {
  checkAuthState();

  const loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  const generateSkForm = document.getElementById("generateSkForm");
  if (generateSkForm) generateSkForm.addEventListener("submit", handleGenerateSK);

  const addUserForm = document.getElementById("addUserForm");
  if (addUserForm) addUserForm.addEventListener("submit", handleAddUser);
});

// =============================================================================
// LOGIC AUTENTIKASI
// =============================================================================
function checkAuthState() {
  const loginSection = document.getElementById("loginSection");
  const mainDashboard = document.getElementById("mainDashboard");
  const userDisplay = document.getElementById("userDisplay");

  if (currentToken) {
    if (loginSection) loginSection.classList.add("d-none");
    if (mainDashboard) mainDashboard.classList.remove("d-none");
    if (userDisplay) userDisplay.innerText = currentUser;
    loadPegawaiData();
  } else {
    if (loginSection) loginSection.classList.remove("d-none");
    if (mainDashboard) mainDashboard.classList.add("d-none");
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById("username").value;
  const passwordInput = document.getElementById("password").value;
  const alertBox = document.getElementById("loginAlert");

  showLoading(true);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "login",
        username: usernameInput,
        password: passwordInput
      })
    });

    const res = await response.json();

    if (res.status === "success") {
      currentToken = res.token;
      currentUser = res.username;
      localStorage.setItem("userToken", res.token);
      localStorage.setItem("username", res.username);
      if (alertBox) alertBox.classList.add("d-none");
      checkAuthState();
    } else {
      if (alertBox) {
        alertBox.innerText = res.message || "Login gagal!";
        alertBox.classList.remove("d-none");
      }
    }
  } catch (err) {
    alert("Terjadi kesalahan koneksi saat login: " + err.message);
  } finally {
    showLoading(false);
  }
}

function handleLogout() {
  localStorage.removeItem("userToken");
  localStorage.removeItem("username");
  currentToken = "";
  currentUser = "";
  checkAuthState();
}

// =============================================================================
// LOAD & MANAJEMEN DATA
// =============================================================================
async function loadPegawaiData() {
  const tbody = document.getElementById("pegawaiTbody");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="11" class="text-center">Memuat data pegawai...</td></tr>';

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "getPegawai",
        token: currentToken
      })
    });

    const res = await response.json();

    if (res.status === "success") {
      pegawaiList = res.data || [];
      
      // Update Statistik Ringkasan
      calculateStatistics(pegawaiList);

      // Tampilkan awal (semua data)
      filteredPegawaiList = [...pegawaiList];
      renderPegawaiTable(filteredPegawaiList);
    } else {
      if (res.message && res.message.includes("Sesi")) {
        handleLogout();
      }
      tbody.innerHTML = `<tr><td colspan="11" class="text-center text-danger">${res.message}</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="11" class="text-center text-danger">Gagal memuat data: ${err.message}</td></tr>`;
  }
}

// =============================================================================
// KALKULASI RINGKASAN / STATISTIK
// =============================================================================
function calculateStatistics(data) {
  const totalPegawai = data.length;
  const now = new Date();
  const currentYear = now.getFullYear();

  let pensiun2BulanCount = 0;
  let pensiunTahunIniCount = 0;

  data.forEach(p => {
    if (p.tmtPensiun) {
      const pDate = new Date(p.tmtPensiun);
      if (!isNaN(pDate.getTime())) {
        if (pDate.getFullYear() === currentYear) {
          pensiunTahunIniCount++;
        }

        const diffTime = pDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 62) {
          pensiun2BulanCount++;
        }
      }
    }
  });

  const sisaPegawai = totalPegawai - pensiunTahunIniCount;

  document.getElementById("statTotalPegawai").innerText = totalPegawai;
  document.getElementById("statPensiun2Bulan").innerText = pensiun2BulanCount;
  document.getElementById("statPensiunTahunIni").innerText = pensiunTahunIniCount;
  document.getElementById("statSisaPegawai").innerText = sisaPegawai;
}

// =============================================================================
// LOGIKA FILTERING DATA PEGAWAI (DENGAN INPUT BULAN/KALENDER)
// =============================================================================
function applyFilters() {
  const searchText = document.getElementById("filterSearch").value.toLowerCase().trim();
  const selectedYearMonth = document.getElementById("filterTmtPensiun").value; // Format: "YYYY-MM"
  const selectedStatus = document.getElementById("filterStatusSk").value;

  filteredPegawaiList = pegawaiList.filter(p => {
    // 1. Filter Pencarian NIP / Nama
    const matchSearch = !searchText || 
      (p.nip && p.nip.toLowerCase().includes(searchText)) || 
      (p.nama && p.nama.toLowerCase().includes(searchText));

    // 2. Filter TMT Pensiun (Mencocokkan Format YYYY-MM)
    let matchTmt = true;
    if (selectedYearMonth && p.tmtPensiun) {
      const pDate = new Date(p.tmtPensiun);
      if (!isNaN(pDate.getTime())) {
        const pYear = pDate.getFullYear();
        const pMonth = String(pDate.getMonth() + 1).padStart(2, '0');
        const pYearMonth = `${pYear}-${pMonth}`;
        matchTmt = (pYearMonth === selectedYearMonth);
      } else {
        matchTmt = false;
      }
    } else if (selectedYearMonth && !p.tmtPensiun) {
      matchTmt = false;
    }

    // 3. Filter Status SK
    const hasSk = p.skPdfUrl && p.skPdfUrl.trim() !== "";
    let matchStatus = true;
    if (selectedStatus === "SUDAH") matchStatus = hasSk;
    if (selectedStatus === "BELUM") matchStatus = !hasSk;

    return matchSearch && matchTmt && matchStatus;
  });

  renderPegawaiTable(filteredPegawaiList);
}

function resetFilters() {
  document.getElementById("filterSearch").value = "";
  document.getElementById("filterTmtPensiun").value = "";
  document.getElementById("filterStatusSk").value = "";
  
  filteredPegawaiList = [...pegawaiList];
  renderPegawaiTable(filteredPegawaiList);
}

// =============================================================================
// RENDER TABEL PEGAWAI
// =============================================================================
function renderPegawaiTable(data) {
  const tbody = document.getElementById("pegawaiTbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-muted">Tidak ada data pegawai yang sesuai dengan filter.</td></tr>';
    return;
  }

  data.forEach((p, index) => {
    const tglLahirVal = p.tanggalLahir || p.tglLahir || "-";
    
    let statusSkBadge = "";
    if (p.skPdfUrl && p.skPdfUrl.trim() !== "") {
      statusSkBadge = `<span class="badge bg-success">Sudah SK</span> 
                       <a href="${p.skPdfUrl}" target="_blank" class="btn btn-sm btn-outline-success ms-1" title="Lihat PDF"><i class="bi bi-file-pdf"></i> PDF</a>`;
    } else {
      statusSkBadge = `<span class="badge bg-warning text-dark">Belum SK</span>`;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${p.nip || "-"}</td>
      <td><strong>${p.nama || "-"}</strong></td>
      <td>${p.jabatan || "-"}</td>
      <td>${p.jenisPegawai || "-"}</td>
      <td>${formatDateIndoStr(tglLahirVal)}</td>
      <td>${formatDateIndoStr(p.tmtAwal)}</td>
      <td><strong>${formatDateIndoStr(p.tmtPensiun)}</strong></td>
      <td>${p.masaKerjaTahun || 0} Thn ${p.masaKerjaBulan || 0} Bln</td>
      <td class="text-center">${statusSkBadge}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-primary" onclick="openGenerateModalByNip('${p.nip}')">
          Generate SK
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// =============================================================================
// MODAL & GENERATE SK
// =============================================================================
function openGenerateModalByNip(nip) {
  selectedPegawai = pegawaiList.find(p => String(p.nip) === String(nip));
  if (!selectedPegawai) return;

  document.getElementById("modalNip").value = selectedPegawai.nip || "";
  document.getElementById("modalNama").value = selectedPegawai.nama || "";
  document.getElementById("modalJabatan").value = selectedPegawai.jabatan || "";
  document.getElementById("modalPerangkatDaerah").value = selectedPegawai.perangkatDaerah || "";
  document.getElementById("modalJenisPegawai").value = selectedPegawai.jenisPegawai || "";
  document.getElementById("modalTmtPensiun").value = selectedPegawai.tmtPensiun || "";
  document.getElementById("modalMasaKerjaTahun").value = selectedPegawai.masaKerjaTahun || "0";
  document.getElementById("modalMasaKerjaBulan").value = selectedPegawai.masaKerjaBulan || "0";
  
  const modalTglLahir = document.getElementById("modalTanggalLahir");
  if (modalTglLahir) {
    modalTglLahir.value = selectedPegawai.tanggalLahir || selectedPegawai.tglLahir || "";
  }

  const modalElement = document.getElementById("skModal");
  if (modalElement) {
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }
}

async function handleGenerateSK(e) {
  e.preventDefault();

  const payload = {
    action: "generateSK",
    token: currentToken,
    nip: document.getElementById("modalNip").value,
    nama: document.getElementById("modalNama").value,
    jabatan: document.getElementById("modalJabatan").value,
    perangkatDaerah: document.getElementById("modalPerangkatDaerah").value,
    jenisPegawai: document.getElementById("modalJenisPegawai").value,
    jenisPegawaiKey: document.getElementById("modalJenisPegawai").value,
    tanggalLahir: document.getElementById("modalTanggalLahir") ? document.getElementById("modalTanggalLahir").value : "",
    jenisPemberhentian: document.getElementById("modalJenisPemberhentian").value,
    nomorSk: document.getElementById("modalNomorSk").value,
    tanggalSk: document.getElementById("modalTanggalSk").value,
    tmtBerhenti: document.getElementById("modalTmtPensiun").value,
    masaKerjaTahun: document.getElementById("modalMasaKerjaTahun").value,
    masaKerjaBulan: document.getElementById("modalMasaKerjaBulan").value,
    nomorPertek: document.getElementById("modalNomorPertek") ? document.getElementById("modalNomorPertek").value : "",
    tanggalPertek: document.getElementById("modalTanggalPertek") ? document.getElementById("modalTanggalPertek").value : "",
    gajiPokok: document.getElementById("modalGajiPokok") ? document.getElementById("modalGajiPokok").value : "0",
    alamat: document.getElementById("modalAlamat") ? document.getElementById("modalAlamat").value : ""
  };

  showLoading(true, "Sedang membuat Dokumen & PDF SK...");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const res = await response.json();

    if (res.status === "success") {
      alert("SK Berhasil Dibuat!");

      const modalElement = document.getElementById("skModal");
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) modal.hide();

      if (res.pdfUrl) {
        window.open(res.pdfUrl, "_blank");
      }

      loadPegawaiData();
    } else {
      alert("Gagal membuat SK: " + res.message);
    }
  } catch (err) {
    alert("Terjadi kesalahan sistem: " + err.message);
  } finally {
    showLoading(false);
  }
}

// =============================================================================
// EXPORT DATA (KE EXCEL CSV)
// =============================================================================
function exportToExcel() {
  if (filteredPegawaiList.length === 0) {
    alert("Tidak ada data yang tersedia untuk di-export!");
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "No,NIP,Nama,Jabatan,Jenis Pegawai,Tanggal Lahir,TMT Awal,TMT Pensiun,Masa Kerja,Status SK\n";

  filteredPegawaiList.forEach((p, idx) => {
    const tglLahir = p.tanggalLahir || p.tglLahir || "-";
    const status = (p.skPdfUrl && p.skPdfUrl.trim() !== "") ? "Sudah SK" : "Belum SK";
    const row = [
      idx + 1,
      `"${p.nip || ''}"`,
      `"${p.nama || ''}"`,
      `"${p.jabatan || ''}"`,
      `"${p.jenisPegawai || ''}"`,
      `"${tglLahir}"`,
      `"${p.tmtAwal || ''}"`,
      `"${p.tmtPensiun || ''}"`,
      `"${p.masaKerjaTahun || 0} Thn ${p.masaKerjaBulan || 0} Bln"`,
      `"${status}"`
    ];
    csvContent += row.join(",") + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Data_Pegawai_Filtered_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =============================================================================
// USER MANAGEMENT & UTILITIES
// =============================================================================
async function handleAddUser(e) {
  e.preventDefault();
  const usernameInput = document.getElementById("newUsername").value;
  const passwordInput = document.getElementById("newPassword").value;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "addUser",
        token: currentToken,
        username: usernameInput,
        password: passwordInput
      })
    });

    const res = await response.json();
    if (res.status === "success") {
      alert("Pengguna baru berhasil ditambahkan!");
      document.getElementById("addUserForm").reset();
    } else {
      alert("Gagal menambahkan pengguna: " + res.message);
    }
  } catch (err) {
    alert("Terjadi kesalahan: " + err.message);
  }
}

function formatDateIndoStr(dateStr) {
  if (!dateStr || dateStr === "-") return "-";
  try {
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return dateStr;
    const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    return `${dt.getDate()} ${bulan[dt.getMonth()]} ${dt.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
}

function showLoading(isLoading, text = "Memproses...") {
  const overlay = document.getElementById("loadingOverlay");
  const loadingText = document.getElementById("loadingText");
  if (!overlay) return;

  if (isLoading) {
    if (loadingText) loadingText.innerText = text;
    overlay.classList.remove("d-none");
  } else {
    overlay.classList.add("d-none");
  }
}
