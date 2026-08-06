// =============================================================================
// KONFIGURASI WEB APP URL
// =============================================================================
// Ganti URL di bawah ini dengan URL Web App Deployment Apps Script Anda!
const API_URL = "https://script.google.com/macros/s/AKfycbwiZFnuX_ccRw0CdfGzJxxsEoxXy_UxQ_SJQBNPO1eOrfodJydUQtc3CIwUnMJjYT_J/exec";

// Global Variables
let currentToken = localStorage.getItem("userToken") || "";
let currentUser = localStorage.getItem("username") || "";
let pegawaiList = [];
let selectedPegawai = null;

// =============================================================================
// INISIALISASI SAAT HALAMAN DIMUAT
// =============================================================================
document.addEventListener("DOMContentLoaded", function () {
  checkAuthState();

  // Form Submit Listeners
  const loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  const generateSkForm = document.getElementById("generateSkForm");
  if (generateSkForm) generateSkForm.addEventListener("submit", handleGenerateSK);

  const addUserForm = document.getElementById("addUserForm");
  if (addUserForm) addUserForm.addEventListener("submit", handleAddUser);
});

// =============================================================================
// LOGIC AUTENTIKASI & MANAJEMEN SESI
// =============================================================================
function checkAuthState() {
  const loginSection = document.getElementById("loginSection");
  const mainDashboard = document.getElementById("mainDashboard");
  const userDisplay = document.getElementById("userDisplay");

  if (currentToken) {
    if (loginSection) loginSection.classList.add("d-none");
    if (mainDashboard) mainDashboard.classList.remove("d-none");
    if (userDisplay) userDisplay.innerText = currentUser;
    
    // Muat Data Pegawai
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
// LOAD & RENDER DATA PEGAWAI
// =============================================================================
async function loadPegawaiData() {
  const tbody = document.getElementById("pegawaiTbody");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="10" class="text-center">Memuat data pegawai...</td></tr>';

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
      renderPegawaiTable(pegawaiList);
    } else {
      if (res.message && res.message.includes("Sesi")) {
        handleLogout();
      }
      tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">${res.message}</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Gagal memuat data: ${err.message}</td></tr>`;
  }
}

function renderPegawaiTable(data) {
  const tbody = document.getElementById("pegawaiTbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center">Tidak ada data pegawai.</td></tr>';
    return;
  }

  data.forEach((p, index) => {
    // Format Tanggal Lahir (Mencoba key tanggalLahir atau tglLahir)
    const tglLahirVal = p.tanggalLahir || p.tglLahir || "-";
    
    // Status SK: Jika skPdfUrl ada nilainya, maka "Sudah SK", jika kosong "Belum SK"
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
        <button class="btn btn-sm btn-primary" onclick="openGenerateModal(${index})">
          Generate SK
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// =============================================================================
// GENERATE SK & MODAL HANDLER
// =============================================================================
function openGenerateModal(index) {
  selectedPegawai = pegawaiList[index];
  if (!selectedPegawai) return;

  // Isi Field Form di Modal Generate SK
  document.getElementById("modalNip").value = selectedPegawai.nip || "";
  document.getElementById("modalNama").value = selectedPegawai.nama || "";
  document.getElementById("modalJabatan").value = selectedPegawai.jabatan || "";
  document.getElementById("modalPerangkatDaerah").value = selectedPegawai.perangkatDaerah || "";
  document.getElementById("modalJenisPegawai").value = selectedPegawai.jenisPegawai || "";
  document.getElementById("modalTmtPensiun").value = selectedPegawai.tmtPensiun || "";
  document.getElementById("modalMasaKerjaTahun").value = selectedPegawai.masaKerjaTahun || "0";
  document.getElementById("modalMasaKerjaBulan").value = selectedPegawai.masaKerjaBulan || "0";
  
  // Pastikan Tanggal Lahir Terisi ke Hidden / Input Form Modal
  const modalTglLahir = document.getElementById("modalTanggalLahir");
  if (modalTglLahir) {
    modalTglLahir.value = selectedPegawai.tanggalLahir || selectedPegawai.tglLahir || "";
  }

  // Buka Modal (Bootstrap 5)
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
    tanggalLahir: document.getElementById("modalTanggalLahir") ? document.getElementById("modalTanggalLahir").value : (selectedPegawai.tanggalLahir || selectedPegawai.tglLahir || ""),
    jenisPemberhentian: document.getElementById("modalJenisPemberhentian").value, // e.g., 'BUP', 'APS', dll.
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

      // Tutup Modal
      const modalElement = document.getElementById("skModal");
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) modal.hide();

      // Buka Link PDF di Tab Baru
      if (res.pdfUrl) {
        window.open(res.pdfUrl, "_blank");
      }

      // MUAT ULANG DATA AGAR KETERANGAN "SUDAN SK" TERUPDATE REALLTIME
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
// USER MANAGEMENT HANDLER
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

// =============================================================================
// HELPER FORMATTING & UI UTILITIES
// =============================================================================
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
