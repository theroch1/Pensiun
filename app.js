// =================================================================
// KONFIGURASI UTAMA
// =================================================================
// Ganti URL di bawah dengan Web App URL dari Deployment Google Apps Script Anda
const API_URL = "https://script.google.com/macros/s/AKfycbwiZFnuX_ccRw0CdfGzJxxsEoxXy_UxQ_SJQBNPO1eOrfodJydUQtc3CIwUnMJjYT_J/exec"; 

let allPegawaiData = []; // Menyimpan master data dari server
let selectedPegawai = null; // Menyimpan data pegawai yang dipilih untuk SK
let modalSKInstance = null;
let modalUserInstance = null;

// Inisialisasi Aplikasi saat DOM Selesai Dimuat
document.addEventListener("DOMContentLoaded", () => {
  // Inisialisasi Modal Bootstrap jika elemennya tersedia
  const modalSKEl = document.getElementById("modalSK");
  const modalUserEl = document.getElementById("modalUser");
  
  if (modalSKEl) modalSKInstance = new bootstrap.Modal(modalSKEl);
  if (modalUserEl) modalUserInstance = new bootstrap.Modal(modalUserEl);

  // Cek Status Auth Token
  const token = localStorage.getItem("token");
  if (token) {
    showDashboard();
  } else {
    showLogin();
  }
});

// =================================================================
// AUTHENTICATION (LOGIN & LOGOUT)
// =================================================================
async function doLogin() {
  const elUser = document.getElementById("username");
  const elPass = document.getElementById("password");

  if (!elUser || !elPass) {
    alert("Elemen input username/password tidak ditemukan!");
    return;
  }

  const usernameInput = elUser.value.trim();
  const passwordInput = elPass.value.trim();

  if (!usernameInput || !passwordInput) {
    alert("Username dan password wajib diisi!");
    return;
  }

  const btnLogin = document.getElementById("btnLogin");
  if (btnLogin) {
    btnLogin.disabled = true;
    btnLogin.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Memproses...`;
  }

  const loginUrl = `${API_URL}?action=login&username=${encodeURIComponent(usernameInput)}&password=${encodeURIComponent(passwordInput)}`;

  try {
    const response = await fetch(loginUrl, { method: "GET", redirect: "follow" });
    const result = await response.json();

    if (result.status === "success") {
      localStorage.setItem("token", result.token);
      localStorage.setItem("username", result.username);
      showDashboard();
    } else {
      alert("Login Gagal: " + result.message);
    }
  } catch (error) {
    console.error("Login Error:", error);
    alert("Gagal terhubung ke server Google Apps Script: " + error.message);
  } finally {
    if (btnLogin) {
      btnLogin.disabled = false;
      btnLogin.innerHTML = `<i class="bi bi-box-arrow-in-right me-1"></i> Masuk`;
    }
  }
}

function doLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  showLogin();
}

function showLogin() {
  document.getElementById("loginSection").classList.remove("d-none");
  document.getElementById("dashboardSection").classList.add("d-none");
}

function showDashboard() {
  document.getElementById("loginSection").classList.add("d-none");
  document.getElementById("dashboardSection").classList.remove("d-none");
  
  const userDisp = document.getElementById("userDisplay");
  if (userDisp) {
    userDisp.innerText = localStorage.getItem("username") || "Admin";
  }
  
  loadDataPegawai();
}

// =================================================================
// NAVIGASI MENU DASHBOARD
// =================================================================
function showSection(sectionName) {
  document.getElementById("sectionPegawai").classList.add("d-none");
  document.getElementById("sectionUser").classList.add("d-none");
  document.getElementById("menuPegawai").classList.remove("active");
  document.getElementById("menuUser").classList.remove("active");

  if (sectionName === "pegawai") {
    document.getElementById("sectionPegawai").classList.remove("d-none");
    document.getElementById("menuPegawai").classList.add("active");
  } else if (sectionName === "user") {
    document.getElementById("sectionUser").classList.remove("d-none");
    document.getElementById("menuUser").classList.add("active");
    loadDaftarUser();
  }
}

// =================================================================
// MANAJEMEN DATA PEGAWAI & FILTER TMT
// =================================================================
async function loadDataPegawai() {
  const token = localStorage.getItem("token");
  const tbody = document.getElementById("tbodyPegawai");
  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Memuat 3000+ data pegawai...</td></tr>`;

  try {
    const response = await fetch(`${API_URL}?action=getDaftarPensiun&token=${encodeURIComponent(token)}`, { redirect: "follow" });
    const res = await response.json();

    if (res.status === "unauthorized") {
      alert(res.message);
      doLogout();
      return;
    }

    if (res.status === "success") {
      allPegawaiData = res.data || [];
      updateStatistikCard(allPegawaiData);
      applyFilter();
    } else {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Gagal memuat data: ${res.message}</td></tr>`;
    }
  } catch (err) {
    console.error("Error load data:", err);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Gagal memuat data pegawai. Hubungkan jaringan/Apps Script. (${err.message})</td></tr>`;
  }
}

function updateStatistikCard(dataList) {
  let kritis = 0, warning = 0, aman = 0;
  
  dataList.forEach(item => {
    if (item.kategoriPensiun && item.kategoriPensiun.includes("≤ 2 Bulan")) kritis++;
    else if (item.kategoriPensiun && item.kategoriPensiun.includes("≤ 6 Bulan")) warning++;
    else if (item.kategoriPensiun === "Belum Pensiun") aman++;
  });

  // Tampilkan Total Keseluruhan Data Pegawai
  document.getElementById("statTotal").innerText = dataList.length;
  document.getElementById("statKritis").innerText = kritis;
  document.getElementById("statWarning").innerText = warning;
  document.getElementById("statAman").innerText = aman;
}

function applyFilter() {
  const keyword = document.getElementById("filterSearch").value.toLowerCase();
  const selectedJenis = document.getElementById("filterJenisPegawai").value;
  const selectedTmtMonth = document.getElementById("filterTmtMonth").value; // Format nilainya: "YYYY-MM"

  const filtered = allPegawaiData.filter(item => {
    const nip = item.nip ? String(item.nip).toLowerCase() : "";
    const nama = item.nama ? String(item.nama).toLowerCase() : "";
    
    // 1. Filter Cari NIP / Nama
    const matchSearch = nip.includes(keyword) || nama.includes(keyword);
    
    // 2. Filter Jenis Pegawai
    const matchJenis = (selectedJenis === "ALL") || (item.jenisPegawai === selectedJenis);
    
    // 3. Filter TMT Pensiun (Pilih Oktober 2026 -> Otomatis cocok dengan pegawai Ultah September + BUP)
    const matchTmt = (!selectedTmtMonth) || (item.filterTmtKey === selectedTmtMonth);

    return matchSearch && matchJenis && matchTmt;
  });

  renderTablePegawai(filtered);
}

function resetFilter() {
  document.getElementById("filterSearch").value = "";
  document.getElementById("filterJenisPegawai").value = "ALL";
  document.getElementById("filterTmtMonth").value = "";
  applyFilter();
}

function renderTablePegawai(dataList) {
  const tbody = document.getElementById("tbodyPegawai");
  tbody.innerHTML = "";

  if (dataList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Tidak ada data pegawai yang sesuai dengan filter.</td></tr>`;
    return;
  }

  // Render Baris Data (Menggunakan HTML String Concatenation untuk Peforma Cepat)
  let htmlRows = "";
  dataList.forEach(item => {
    let badgeClass = "bg-secondary";
    if (item.kategoriPensiun.includes("≤ 2 Bulan")) badgeClass = "bg-danger";
    else if (item.kategoriPensiun.includes("≤ 6 Bulan")) badgeClass = "bg-warning text-dark";
    else if (item.kategoriPensiun === "Belum Pensiun") badgeClass = "bg-success";
    else if (item.kategoriPensiun === "Data Tanggal Tidak Valid") badgeClass = "bg-dark";

    htmlRows += `
      <tr>
        <td><strong>${item.nip}</strong></td>
        <td>${item.nama}</td>
        <td><span class="badge bg-info text-dark">${item.jenisPegawai} (BUP ${item.bup})</span></td>
        <td>${item.tglLahir}</td>
        <td><strong class="text-primary">${item.tmtPensiun}</strong></td>
        <td><span class="badge ${badgeClass}">${item.kategoriPensiun}</span></td>
        <td class="text-center">
          <button class="btn btn-sm btn-primary" onclick="openModalSK('${item.nip}')">
            <i class="bi bi-gear-fill me-1"></i> Proses SK
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = htmlRows;
}

// =================================================================
// PROSES SK & CEK GOOGLE FORM
// =================================================================
function openModalSK(nip) {
  selectedPegawai = allPegawaiData.find(p => String(p.nip) === String(nip));
  if (!selectedPegawai) return;

  document.getElementById("skNip").innerText = selectedPegawai.nip;
  document.getElementById("skNama").innerText = selectedPegawai.nama;
  document.getElementById("skJenisPegawai").innerText = selectedPegawai.jenisPegawai;
  document.getElementById("skTmtPensiun").innerText = selectedPegawai.tmtPensiun;

  // Pre-fill input TMT Berhenti secara otomatis
  const inputTmtBerhenti = document.getElementById("skTmtBerhenti");
  if (inputTmtBerhenti) {
    inputTmtBerhenti.value = selectedPegawai.tmtPensiun !== "-" ? selectedPegawai.tmtPensiun : "";
  }

  document.getElementById("formSK").reset();
  if (inputTmtBerhenti) {
    inputTmtBerhenti.value = selectedPegawai.tmtPensiun !== "-" ? selectedPegawai.tmtPensiun : "";
  }
  
  document.getElementById("alertBerkas").classList.add("d-none");

  cekBerkasForm();
  if (modalSKInstance) modalSKInstance.show();
}

async function cekBerkasForm() {
  const token = localStorage.getItem("token");
  const jenisPemberhentian = document.getElementById("skJenisPemberhentian").value;
  const alertBox = document.getElementById("alertBerkas");
  const statusPesan = document.getElementById("statusBerkasPesan");

  alertBox.className = "alert alert-info";
  alertBox.classList.remove("d-none");
  statusPesan.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Memeriksa respon Google Form...`;

  renderExtraFields(jenisPemberhentian);

  try {
    const url = `${API_URL}?action=cekBerkas&token=${encodeURIComponent(token)}&nip=${encodeURIComponent(selectedPegawai.nip)}&jenis=${encodeURIComponent(jenisPemberhentian)}`;
    const response = await fetch(url, { redirect: "follow" });
    const res = await response.json();

    if (res.isLengkap) {
      alertBox.className = "alert alert-success";
      statusPesan.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> ${res.pesan}`;
      document.getElementById("btnSubmitSK").disabled = false;
    } else {
      alertBox.className = "alert alert-warning";
      statusPesan.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i> ${res.pesan}`;
      document.getElementById("btnSubmitSK").disabled = true;
    }
  } catch (err) {
    alertBox.className = "alert alert-danger";
    statusPesan.innerText = "Gagal terhubung saat verifikasi berkas: " + err.message;
  }
}

function renderExtraFields(jenisPemberhentian) {
  const container = document.getElementById("extraFields");
  container.innerHTML = "";

  if (jenisPemberhentian === "MENINGGAL") {
    container.innerHTML = `
      <div class="mb-3">
        <label class="form-label text-danger fw-bold">Nomor Akta Kematian</label>
        <input type="text" id="skAktaKematian" class="form-control" placeholder="Contoh: 474.3/01-KMT/2026" required>
      </div>
    `;
  } else if (jenisPemberhentian === "APS") {
    container.innerHTML = `
      <div class="mb-3">
        <label class="form-label text-warning fw-bold">Nomor Surat Permohonan Pengunduran Diri (APS)</label>
        <input type="text" id="skSuratAPS" class="form-control" placeholder="Contoh: 800/APS/05/2026" required>
      </div>
    `;
  }
}

async function submitGenerateSK() {
  const token = localStorage.getItem("token");
  const jenisPemberhentian = document.getElementById("skJenisPemberhentian").value;

  const payload = {
    action: "generateSK",
    token: token,
    nip: selectedPegawai.nip,
    nama: selectedPegawai.nama,
    jenisPegawai: selectedPegawai.jenisPegawai,
    jenisPemberhentian: jenisPemberhentian,
    tmtAwalKerja: selectedPegawai.tmtAwalKerja,
    nomorSk: document.getElementById("skNomor").value,
    tanggalSk: document.getElementById("skTanggal").value,
    tmtBerhenti: document.getElementById("skTmtBerhenti").value,
    gajiPokok: document.getElementById("skGajiPokok").value,
    nomorPertek: document.getElementById("skNomorPertek").value,
    tanggalPertek: document.getElementById("skTanggalPertek").value,
    alamat: document.getElementById("skAlamat").value,
    nomorAktaKematian: document.getElementById("skAktaKematian") ? document.getElementById("skAktaKematian").value : "",
    suratPengunduranDiri: document.getElementById("skSuratAPS") ? document.getElementById("skSuratAPS").value : ""
  };

  if (!payload.nomorSk || !payload.tanggalSk || !payload.tmtBerhenti || !payload.gajiPokok) {
    alert("Harap lengkapi seluruh field formulir yang dibutuhkan!");
    return;
  }

  const btnSubmit = document.getElementById("btnSubmitSK");
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Mengolah PDF SK...`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const res = await response.json();

    if (res.status === "success") {
      alert("SK Berhasil Diterbitkan!");
      if (modalSKInstance) modalSKInstance.hide();
      window.open(res.pdfUrl, "_blank");
    } else {
      alert("Gagal menerbitkan SK: " + res.message);
    }
  } catch (err) {
    console.error("Generate SK Error:", err);
    alert("Terjadi kesalahan sistem saat memproses PDF SK.");
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `<i class="bi bi-printer-fill me-1"></i> Terbitkan PDF SK`;
  }
}

// =================================================================
// KELOLA USER ADMIN
// =================================================================
async function loadDaftarUser() {
  const token = localStorage.getItem("token");
  const listContainer = document.getElementById("listUserAdmin");
  listContainer.innerHTML = `<li class="list-group-item text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Memuat daftar user...</li>`;

  try {
    const response = await fetch(`${API_URL}?action=getDaftarUser&token=${encodeURIComponent(token)}`, { redirect: "follow" });
    const res = await response.json();

    if (res.status === "success") {
      listContainer.innerHTML = "";
      res.data.forEach(user => {
        listContainer.innerHTML += `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <span><i class="bi bi-person-circle me-2 text-primary"></i><strong>${user.username}</strong></span>
            <span class="badge bg-success rounded-pill">Aktif</span>
          </li>
        `;
      });
    } else {
      listContainer.innerHTML = `<li class="list-group-item text-danger">${res.message}</li>`;
    }
  } catch (err) {
    listContainer.innerHTML = `<li class="list-group-item text-danger">Gagal memuat daftar user.</li>`;
  }
}

async function submitTambahUser() {
  const token = localStorage.getItem("token");
  const newUsername = document.getElementById("newUsername").value.trim();
  const newPassword = document.getElementById("newPassword").value.trim();

  if (!newUsername || !newPassword) {
    alert("Username dan password baru tidak boleh kosong!");
    return;
  }

  const payload = {
    action: "tambahUser",
    token: token,
    newUsername: newUsername,
    newPassword: newPassword
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const res = await response.json();

    if (res.status === "success") {
      alert(res.message);
      document.getElementById("formTambahUser").reset();
      if (modalUserInstance) modalUserInstance.hide();
      loadDaftarUser();
    } else {
      alert("Gagal menambah user: " + res.message);
    }
  } catch (err) {
    alert("Terjadi kesalahan koneksi saat menambah admin.");
  }
}
