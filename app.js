// =================================================================
// KONFIGURASI UTAMA
// =================================================================
// PASTE URL EXEC GOOGLE APPS SCRIPT KAMU DI SINI
const API_URL = "https://script.google.com/macros/s/AKfycbwiZFnuX_ccRw0CdfGzJxxsEoxXy_UxQ_SJQBNPO1eOrfodJydUQtc3CIwUnMJjYT_J/exec"; 

let allPegawaiData = []; // Menyimpan data master pegawai
let selectedPegawai = null; // Menyimpan pegawai yang sedang diproses
let modalSKInstance = null;
let modalUserInstance = null;

// Initialization saat halaman dibuka
document.addEventListener("DOMContentLoaded", () => {
  modalSKInstance = new bootstrap.Modal(document.getElementById("modalSK"));
  modalUserInstance = new bootstrap.Modal(document.getElementById("modalUser"));

  // Pengecekan status login token
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
  const usernameInput = document.getElementById("username").value.trim();
  const passwordInput = document.getElementById("password").value.trim();

  if (!usernameInput || !passwordInput) {
    alert("Username dan password harus diisi!");
    return;
  }

  const btnLogin = document.getElementById("btnLogin");
  btnLogin.disabled = true;
  btnLogin.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Memproses...`;

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
    console.error("Login error:", error);
    alert("Gagal terhubung ke server Google Apps Script: " + error.message);
  } finally {
    btnLogin.disabled = false;
    btnLogin.innerHTML = `<i class="bi bi-box-arrow-in-right me-1"></i> Masuk`;
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
  document.getElementById("userDisplay").innerText = localStorage.getItem("username") || "Admin";
  
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
// MANAJEMEN DATA PEGAWAI & FILTER
// =================================================================
async function loadDataPegawai() {
  const token = localStorage.getItem("token");
  const tbody = document.getElementById("tbodyPegawai");
  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Memuat data pegawai...</td></tr>`;

  try {
    const response = await fetch(`${API_URL}?action=getDaftarPensiun&token=${encodeURIComponent(token)}`, { redirect: "follow" });
    const res = await response.json();

    if (res.status === "unauthorized") {
      alert(res.message);
      doLogout();
      return;
    }

    if (res.status === "success") {
      allPegawaiData = res.data;
      updateStatistikCard(allPegawaiData);
      applyFilter();
    } else {
      alert("Gagal memuat data: " + res.message);
    }
  } catch (err) {
    console.error("Error load pegawai:", err);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Gagal memuat data pegawai. Hubungkan jaringan/Apps Script.</td></tr>`;
  }
}

function updateStatistikCard(dataList) {
  let kritis = 0, warning = 0, aman = 0;
  
  dataList.forEach(item => {
    if (item.kategoriPensiun.includes("≤ 2 Bulan")) kritis++;
    else if (item.kategoriPensiun.includes("≤ 6 Bulan")) warning++;
    else if (item.kategoriPensiun === "Belum Pensiun") aman++;
  });

  document.getElementById("statTotal").innerText = dataList.length;
  document.getElementById("statKritis").innerText = kritis;
  document.getElementById("statWarning").innerText = warning;
  document.getElementById("statAman").innerText = aman;
}

function applyFilter() {
  const keyword = document.getElementById("filterSearch").value.toLowerCase();
  const selectedJenis = document.getElementById("filterJenisPegawai").value;
  const selectedKategori = document.getElementById("filterKategoriPensiun").value;

  const filtered = allPegawaiData.filter(item => {
    const matchSearch = item.nip.toLowerCase().includes(keyword) || item.nama.toLowerCase().includes(keyword);
    const matchJenis = (selectedJenis === "ALL") || (item.jenisPegawai === selectedJenis);
    const matchKategori = (selectedKategori === "ALL") || (item.kategoriPensiun === selectedKategori);

    return matchSearch && matchJenis && matchKategori;
  });

  renderTablePegawai(filtered);
}

function renderTablePegawai(dataList) {
  const tbody = document.getElementById("tbodyPegawai");
  tbody.innerHTML = "";

  if (dataList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Tidak ada data pegawai yang sesuai filter.</td></tr>`;
    return;
  }

  dataList.forEach(item => {
    let badgeClass = "bg-secondary";
    if (item.kategoriPensiun.includes("≤ 2 Bulan")) badgeClass = "bg-danger";
    else if (item.kategoriPensiun.includes("≤ 6 Bulan")) badgeClass = "bg-warning text-dark";
    else if (item.kategoriPensiun === "Belum Pensiun") badgeClass = "bg-success";

    const row = `
      <tr>
        <td><strong>${item.nip}</strong></td>
        <td>${item.nama}</td>
        <td><span class="badge bg-info text-dark">${item.jenisPegawai}</span></td>
        <td>${item.tmtAwalKerja}</td>
        <td>${item.tglPensiunEstimate}</td>
        <td><span class="badge ${badgeClass}">${item.kategoriPensiun}</span></td>
        <td class="text-center">
          <button class="btn btn-sm btn-primary" onclick="openModalSK('${item.nip}')">
            <i class="bi bi-gear-fill me-1"></i> Proses SK
          </button>
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}

// =================================================================
// PROSES GENERATE SK & INTEGRASI GOOGLE FORM
// =================================================================
function openModalSK(nip) {
  selectedPegawai = allPegawaiData.find(p => p.nip === nip);
  if (!selectedPegawai) return;

  document.getElementById("skNip").innerText = selectedPegawai.nip;
  document.getElementById("skNama").innerText = selectedPegawai.nama;
  document.getElementById("skJenisPegawai").innerText = selectedPegawai.jenisPegawai;
  document.getElementById("skTmtAwal").innerText = selectedPegawai.tmtAwalKerja;

  // Reset form & alert
  document.getElementById("formSK").reset();
  document.getElementById("alertBerkas").classList.add("d-none");

  cekBerkasForm(); // Otomatis cek kelengkapan berkas pas modal dibuka
  modalSKInstance.show();
}

async function cekBerkasForm() {
  const token = localStorage.getItem("token");
  const jenisPemberhentian = document.getElementById("skJenisPemberhentian").value;
  const alertBox = document.getElementById("alertBerkas");
  const statusPesan = document.getElementById("statusBerkasPesan");

  alertBox.className = "alert alert-info";
  alertBox.classList.remove("d-none");
  statusPesan.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Memeriksa respon Google Form...`;

  // Render variabel tambahan sesuai jenis pensiun
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
      document.getElementById("btnSubmitSK").disabled = true; // Kunci tombol jika berkas belum ada
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

  // Validasi form kosong
  if (!payload.nomorSk || !payload.tanggalSk || !payload.tmtBerhenti || !payload.gajiPokok) {
    alert("Harap lengkapi semua kolom input formulir!");
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
      modalSKInstance.hide();
      // Buka PDF hasil generate di tab baru
      window.open(res.pdfUrl, "_blank");
    } else {
      alert("Gagal menerbitkan SK: " + res.message);
    }
  } catch (err) {
    console.error("Generate SK Error:", err);
    alert("Terjadi kesalahan sistem saat membuat SK.");
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
    alert("Username dan password tidak boleh kosong!");
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
      modalUserInstance.hide();
      loadDaftarUser();
    } else {
      alert("Gagal menambah user: " + res.message);
    }
  } catch (err) {
    alert("Terjadi kesalahan jaringan.");
  }
}

