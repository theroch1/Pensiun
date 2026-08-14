// =============================================================================
// KONFIGURASI WEB APP
// =============================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz4x61AJdvugWBFiS7kAOhJBZD1JKOmUjJZqfZzYbRGC-LDeeLp1c0LZLDWnnyNCduKkQ/exec";

let globalPegawaiList = [];
let currentToken = localStorage.getItem("app_token") || "";

// =============================================================================
// INITIALIZATION
// =============================================================================
document.addEventListener("DOMContentLoaded", () => {
  try {
    checkAuthStatus();

    const loginForm = document.getElementById("loginForm");
    if (loginForm) loginForm.addEventListener("submit", handleLoginSubmit);

    const skForm = document.getElementById("generateSkForm");
    if (skForm) skForm.addEventListener("submit", handleGenerateSkSubmit);

    const addUserForm = document.getElementById("addUserForm");
    if (addUserForm) addUserForm.addEventListener("submit", handleAddUserSubmit);
  } catch (err) {
    console.error("Init Error:", err);
  }
});

// =============================================================================
// AUTENTIKASI
// =============================================================================
function checkAuthStatus() {
  const loginSection = document.getElementById("loginSection");
  const mainDashboard = document.getElementById("mainDashboard");

  if (currentToken) {
    if (loginSection) loginSection.classList.add("d-none");
    if (mainDashboard) mainDashboard.classList.remove("d-none");
    loadPegawaiData();
  } else {
    if (loginSection) loginSection.classList.remove("d-none");
    if (mainDashboard) mainDashboard.classList.add("d-none");
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const usernameInput = document.getElementById("username") ? document.getElementById("username").value : "";
  const passwordInput = document.getElementById("password") ? document.getElementById("password").value : "";
  const alertBox = document.getElementById("loginAlert");

  if (alertBox) alertBox.classList.add("d-none");

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "login",
        username: usernameInput,
        password: passwordInput
      })
    });

    const textResult = await response.text();
    let result;
    try {
      result = JSON.parse(textResult);
    } catch (parseErr) {
      throw new Error("Respon server bukan format JSON yang valid: " + textResult);
    }

    if (result && result.status === "success") {
      currentToken = result.token;
      localStorage.setItem("app_token", result.token);
      
      const userDisplay = document.getElementById("userDisplay");
      if (userDisplay) userDisplay.textContent = result.username || "Admin";
      
      checkAuthStatus();
    } else {
      const msg = result ? result.message : "Login gagal!";
      if (alertBox) {
        alertBox.textContent = msg;
        alertBox.classList.remove("d-none");
      } else {
        alert(msg);
      }
    }
  } catch (err) {
    console.error("Login Error:", err);
    if (alertBox) {
      alertBox.textContent = "Gagal terhubung ke server: " + err.message;
      alertBox.classList.remove("d-none");
    } else {
      alert("Gagal terhubung ke server: " + err.message);
    }
  }
}

function handleLogout() {
  localStorage.removeItem("app_token");
  currentToken = "";
  checkAuthStatus();
}

// =============================================================================
// FETCH & RENDER DATA PEGAWAI & STATISTIK
// =============================================================================
async function loadPegawaiData() {
  const tbody = document.getElementById("pegawaiTbody");
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Memuat data pegawai...</td></tr>';
  }

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "getPegawai",
        token: currentToken
      })
    });

    const textResult = await response.text();
    let result;
    try {
      result = JSON.parse(textResult);
    } catch (e) {
      throw new Error("Respon getPegawai bukan JSON: " + textResult);
    }

    if (result.status === "success") {
      globalPegawaiList = Array.isArray(result.data) ? result.data : [];
      updateStatistics(globalPegawaiList);
      renderPegawaiTable(globalPegawaiList);
    } else {
      if (result.message && result.message.includes("Sesi")) {
        handleLogout();
        return;
      }
      alert(result.message || "Gagal mengambil data pegawai.");
    }
  } catch (err) {
    console.error("Error fetching pegawai:", err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="11" class="text-center py-4 text-danger">Gagal memuat data dari server: ${err.message}</td></tr>`;
    }
  }
}

function updateStatistics(data) {
  const totalPegawai = data.length;
  let pensiunTahunIni = 0;
  let pensiun2Bulan = 0;
  let sudahSkCount = 0;

  const currentYear = new Date().getFullYear();
  const now = new Date();

  data.forEach(p => {
    if (p.skPdfUrl && String(p.skPdfUrl).trim() !== "" && p.skPdfUrl !== "Belum Ada") {
      sudahSkCount++;
    }
    if (p.tmtPensiun && p.tmtPensiun !== "-") {
      const dtPensiun = parseAnyDate(p.tmtPensiun);
      if (dtPensiun && !isNaN(dtPensiun.getTime())) {
        if (dtPensiun.getFullYear() === currentYear) {
          pensiunTahunIni++;
        }
        const diffTime = dtPensiun - now;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        if (diffDays >= 0 && diffDays <= 60) {
          pensiun2Bulan++;
        }
      }
    }
  });

  const setElemText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setElemText("statTotalPegawai", totalPegawai);
  setElemText("statPensiun2Bulan", pensiun2Bulan);
  setElemText("statPensiunTahunIni", pensiunTahunIni);
  setElemText("statSisaPegawai", totalPegawai - sudahSkCount);
}

function renderPegawaiTable(data) {
  const tbody = document.getElementById("pegawaiTbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-muted">Tidak ada data pegawai.</td></tr>';
    return;
  }

  data.forEach((p, index) => {
    const nipVal = p.nip || "-";
    const namaVal = p.nama || "-";
    const jabatanVal = p.jabatan || "-";
    const jenisPegawaiVal = p.jenisPegawai || "-";
    const tglLahirVal = p.tanggalLahir || "-";
    const tmtPensiunVal = p.tmtPensiun || "-";
    
    const tglUlangTahunBup = calculateBupBirthday(tglLahirVal, tmtPensiunVal);

   let statusSkBadge = "";
    // Pastikan pengecekan ketat: hanya tampil jika link PDF ada dan bukan teks "Belum Ada"
    if (p.skPdfUrl && String(p.skPdfUrl).trim() !== "" && p.skPdfUrl !== "Belum Ada") {
      statusSkBadge = `<span class="badge bg-success">Sudah SK</span> 
                       <a href="${p.skPdfUrl}" target="_blank" class="btn btn-sm btn-outline-success ms-1"><i class="bi bi-file-pdf"></i> PDF</a>`;
    } else {
      statusSkBadge = `<span class="badge bg-secondary">Belum SK</span>`;
    }


    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${nipVal}</td>
      <td><strong>${namaVal}</strong></td>
      <td>${jabatanVal}</td>
      <td>${jenisPegawaiVal}</td>
      <td>${formatDateIndoStr(tglLahirVal)}</td>
      <td class="text-primary fw-bold">${formatDateIndoStr(tglUlangTahunBup)}</td>
      <td><strong>${formatDateIndoStr(tmtPensiunVal)}</strong></td>
      <td>${String(p.masaKerjaTahun || 0).padStart(2, '0')} Thn ${String(p.masaKerjaBulan || 0).padStart(2, '0')} Bln</td>
      <td class="text-center">${statusSkBadge}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-primary" onclick="openGenerateModalByNip('${nipVal}')">
          Generate SK
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// =============================================================================
// FILTER & EXPORT
// =============================================================================
function applyFilters() {
  const searchEl = document.getElementById("filterSearch");
  const tmtEl = document.getElementById("filterTmtPensiun");
  const statusEl = document.getElementById("filterStatusSk");

  const keyword = searchEl ? searchEl.value.toLowerCase() : "";
  const filterTmt = tmtEl ? tmtEl.value : "";
  const filterStatus = statusEl ? statusEl.value : "";

  const filtered = globalPegawaiList.filter(p => {
    const matchKeyword = (p.nip && p.nip.toLowerCase().includes(keyword)) || 
                         (p.nama && p.nama.toLowerCase().includes(keyword));
    
    const matchTmt = !filterTmt || p.tmtPensiun === filterTmt;

    const isSudahSk = p.skPdfUrl && String(p.skPdfUrl).trim() !== "";
    let matchStatus = true;
    if (filterStatus === "SUDAH") matchStatus = isSudahSk;
    if (filterStatus === "BELUM") matchStatus = !isSudahSk;

    return matchKeyword && matchTmt && matchStatus;
  });

  renderPegawaiTable(filtered);
}

function resetFilters() {
  const searchEl = document.getElementById("filterSearch");
  const tmtEl = document.getElementById("filterTmtPensiun");
  const statusEl = document.getElementById("filterStatusSk");

  if (searchEl) searchEl.value = "";
  if (tmtEl) tmtEl.value = "";
  if (statusEl) statusEl.value = "";
  renderPegawaiTable(globalPegawaiList);
}

function exportToExcel() {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "No,NIP,Nama,Jabatan,Jenis Pegawai,Tanggal Lahir,TMT Pensiun,Status SK\r\n";

  globalPegawaiList.forEach((p, idx) => {
    const status = (p.skPdfUrl && String(p.skPdfUrl).trim() !== "") ? "Sudah SK" : "Belum SK";
    const row = [idx + 1, `"${p.nip}"`, `"${p.nama}"`, `"${p.jabatan}"`, `"${p.jenisPegawai}"`, `"${p.tanggalLahir}"`, `"${p.tmtPensiun}"`, `"${status}"`];
    csvContent += row.join(",") + "\r\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "data_pegawai_pensiun.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =============================================================================
// TAMBAH USER
// =============================================================================
async function handleAddUserSubmit(e) {
  e.preventDefault();
  const username = document.getElementById("newUsername").value;
  const password = document.getElementById("newPassword").value;

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "addUser",
        token: currentToken,
        username: username,
        password: password
      })
    });
    const result = await response.json();
    alert(result.message);
    if (result.status === "success") {
      document.getElementById("addUserForm").reset();
    }
  } catch (err) {
    alert("Gagal menambah user: " + err.message);
  }
}

// =============================================================================
// HELPER TANGGAL
// =============================================================================
function parseAnyDate(dateStr) {
  if (!dateStr || dateStr === "-" || dateStr === "") return null;
  var dt = new Date(dateStr);
  if (!isNaN(dt.getTime())) return dt;

  var monthsMap = {
    january: 0, januari: 0, jan: 0, february: 1, februari: 1, feb: 1,
    march: 2, maret: 2, mar: 2, april: 3, apr: 3, may: 4, mei: 4,
    june: 5, juni: 5, jun: 5, july: 6, juli: 6, jul: 6, august: 7, agustus: 7, agt: 7,
    september: 8, sep: 8, october: 9, oktober: 9, okt: 9, november: 10, nov: 10, december: 11, desember: 11, des: 11
  };

  var parts = String(dateStr).trim().split(/\s+/);
  if (parts.length === 3) {
    var day = parseInt(parts[0], 10);
    var monthStr = parts[1].toLowerCase();
    var year = parseInt(parts[2], 10);

    if (!isNaN(day) && !isNaN(year) && monthsMap[monthStr] !== undefined) {
      return new Date(year, monthsMap[monthStr], day);
    }
  }
  return null;
}

function calculateBupBirthday(tanggalLahir, tmtPensiun) {
  if (!tanggalLahir || tanggalLahir === "-") return "-";
  var dtLahir = parseAnyDate(tanggalLahir);
  if (!dtLahir || isNaN(dtLahir.getTime())) return "-";

  var day = String(dtLahir.getDate()).padStart(2, '0');
  var month = String(dtLahir.getMonth() + 1).padStart(2, '0');
  var targetYear = dtLahir.getFullYear();

  if (tmtPensiun && tmtPensiun !== "-") {
    var dtPensiun = parseAnyDate(tmtPensiun);
    if (dtPensiun && !isNaN(dtPensiun.getTime())) {
      targetYear = dtPensiun.getFullYear();
      if (dtPensiun.getDate() === 1 && dtPensiun.getMonth() === 0 && dtLahir.getMonth() === 11) {
        targetYear = dtPensiun.getFullYear() - 1;
      }
    }
  }
  return `${targetYear}-${month}-${day}`;
}

function toIsoDateStr(dateStr) {
  const dt = parseAnyDate(dateStr);
  if (!dt || isNaN(dt.getTime())) return "";
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateIndoStr(dateStr) {
  if (!dateStr || dateStr === "-") return "-";
  var dt = parseAnyDate(dateStr);
  if (!dt || isNaN(dt.getTime())) return dateStr;
  
  var months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  var hari = String(dt.getDate()).padStart(2, '0');
  
  return hari + " " + months[dt.getMonth()] + " " + dt.getFullYear();
}

// =============================================================================
// MODAL & SUBMIT SK
// =============================================================================
function openGenerateModalByNip(nip) {
  const pegawai = globalPegawaiList.find(p => String(p.nip).trim() === String(nip).trim());
  if (!pegawai) {
    alert("Data pegawai tidak ditemukan!");
    return;
  }

  const tglLahirVal = pegawai.tanggalLahir || "";
  const tmtPensiunVal = pegawai.tmtPensiun || "";
  const tglUlangTahunBup = calculateBupBirthday(tglLahirVal, tmtPensiunVal);

  const setVal = (id, val) => {
    const elem = document.getElementById(id);
    if (elem) elem.value = val;
  };

  setVal("modalNip", pegawai.nip || "");
  setVal("modalNama", pegawai.nama || "");
  setVal("modalJabatan", pegawai.jabatan || "");
  setVal("modalGolongan", pegawai.golongan || "");
  setVal("modalJenisPegawai", pegawai.jenisPegawai || "");
  setVal("modalPerangkatDaerah", pegawai.perangkatDaerah || "");
  setVal("modalTanggalLahir", toIsoDateStr(tglLahirVal));
  setVal("modalTanggalUlangTahunBup", toIsoDateStr(tglUlangTahunBup));
  setVal("modalTmtPensiun", toIsoDateStr(tmtPensiunVal));
  setVal("modalMasaKerjaTahun", pegawai.masaKerjaTahun || 0);
  setVal("modalMasaKerjaBulan", pegawai.masaKerjaBulan || 0);
  setVal("modalNomorSk", "");
  setVal("modalTanggalSk", new Date().toISOString().split('T')[0]);
  setVal("modalNomorPertek", "");
  setVal("modalTanggalPertek", "");
  setVal("modalGajiPokok", "0");
  setVal("modalAlamat", pegawai.alamat || "");

  const modalElem = document.getElementById("skModal");
  if (modalElem) {
    const bsModal = new bootstrap.Modal(modalElem);
    bsModal.show();
  }
}

async function handleGenerateSkSubmit(e) {
  e.preventDefault();
  
  const getVal = (id) => {
    const elem = document.getElementById(id);
    return elem ? elem.value : "";
  };

  const payload = {
    action: "generateSK",
    token: currentToken,
    nip: getVal("modalNip"),
    nama: getVal("modalNama"),
    jabatan: getVal("modalJabatan"),
    golongan: getVal("modalGolongan"),
    jenisPegawai: getVal("modalJenisPegawai"),
    perangkatDaerah: getVal("modalPerangkatDaerah"),
    tanggalLahir: getVal("modalTanggalLahir"),
    tanggalUlangTahunBup: getVal("modalTanggalUlangTahunBup"),
    tmtBerhenti: getVal("modalTmtPensiun"),
    jenisPemberhentian: getVal("modalJenisPemberhentian") || "BUP",
    nomorSk: getVal("modalNomorSk"),
    tanggalSk: getVal("modalTanggalSk"),
    nomorPertek: getVal("modalNomorPertek"),
    tanggalPertek: getVal("modalTanggalPertek"),
    gajiPokok: getVal("modalGajiPokok"),
    alamat: getVal("modalAlamat"),
    masaKerjaTahun: getVal("modalMasaKerjaTahun"),
    masaKerjaBulan: getVal("modalMasaKerjaBulan")
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.status === "success") {
      alert("SK Berhasil Dibuat!\n\nLink PDF: " + result.pdfUrl);
      const modalElem = document.getElementById("skModal");
      const bsModal = bootstrap.Modal.getInstance(modalElem);
      if (bsModal) bsModal.hide();
      loadPegawaiData();
    } else {
      alert("Gagal membuat SK: " + (result.message || "Terjadi kesalahan server."));
    }
  } catch (err) {
    alert("Terjadi kesalahan koneksi: " + err.message);
  }
}

function formatDuaDigitWeb(angka) {
  let num = parseInt(angka) || 0;
  return num < 10 ? "0" + num : String(num);
}
