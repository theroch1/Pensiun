// =============================================================================
// KONFIGURASI WEB APP (SESUAIKAN URL WEB APP GOOGLE APPS SCRIPT ANDA)
// =============================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwiZFnuX_ccRw0CdfGzJxxsEoxXy_UxQ_SJQBNPO1eOrfodJydUQtc3CIwUnMJjYT_J/exec";

// State Global Aplikasi
let globalPegawaiList = [];
let currentToken = localStorage.getItem("app_token") || "";

// =============================================================================
// INITIALIZATION / EVENT LISTENERS
// =============================================================================
document.addEventListener("DOMContentLoaded", () => {
  checkAuthStatus();

  // Event Listener Login Form
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
  }

  // Event Listener Refresh Data
  const btnRefresh = document.getElementById("btnRefresh");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", fetchPegawaiData);
  }

  // Event Listener Form Generate SK
  const skForm = document.getElementById("generateSkForm");
  if (skForm) {
    skForm.addEventListener("submit", handleGenerateSkSubmit);
  }
});

// =============================================================================
// LOGIC AUTENTIKASI (LOGIN & LOGOUT)
// =============================================================================
function checkAuthStatus() {
  const loginSection = document.getElementById("loginSection");
  const dashboardSection = document.getElementById("dashboardSection");

  if (currentToken) {
    if (loginSection) loginSection.classList.add("d-none");
    if (dashboardSection) dashboardSection.classList.remove("d-none");
    fetchPegawaiData();
  } else {
    if (loginSection) loginSection.classList.remove("d-none");
    if (dashboardSection) dashboardSection.classList.add("d-none");
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const usernameInput = document.getElementById("username").value;
  const passwordInput = document.getElementById("password").value;
  const alertBox = document.getElementById("loginAlert");

  alertBox.classList.add("d-none");

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

    const result = await response.json();

    if (result.status === "success") {
      currentToken = result.token;
      localStorage.setItem("app_token", result.token);
      checkAuthStatus();
    } else {
      alertBox.textContent = result.message || "Login gagal!";
      alertBox.classList.remove("d-none");
    }
  } catch (err) {
    alertBox.textContent = "Gagal terhubung ke server: " + err.message;
    alertBox.classList.remove("d-none");
  }
}

function handleLogout() {
  localStorage.removeItem("app_token");
  currentToken = "";
  checkAuthStatus();
}

// =============================================================================
// MENGAMBIL DATA PEGAWAI FROM BACKEND APPS SCRIPT
// =============================================================================
async function fetchPegawaiData() {
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

    const result = await response.json();

    if (result.status === "success") {
      globalPegawaiList = result.data || [];
      renderPegawaiTable(globalPegawaiList);
    } else {
      if (result.message && result.message.includes("Sesi")) {
        handleLogout();
      }
      alert(result.message || "Gagal mengambil data pegawai.");
    }
  } catch (err) {
    console.error("Error fetching pegawai:", err);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-danger">Gagal memuat data dari server.</td></tr>';
    }
  }
}

// =============================================================================
// HELPER PARSING TANGGAL & KALKULASI ULANG TAHUN BUP
// =============================================================================

/**
 * Memparsing string tanggal dalam berbagai format (ISO, Bahasa Indonesia, Bahasa Inggris)
 */
function parseAnyDate(dateStr) {
  if (!dateStr || dateStr === "-" || dateStr === "") return null;

  var dt = new Date(dateStr);
  if (!isNaN(dt.getTime())) return dt;

  var monthsMap = {
    january: 0, januari: 0, jan: 0,
    february: 1, februari: 1, feb: 1,
    march: 2, maret: 2, mar: 2,
    april: 3, apr: 3,
    may: 4, mei: 4,
    june: 5, juni: 5, jun: 5,
    july: 6, juli: 6, jul: 6,
    august: 7, agustus: 7, agt: 7,
    september: 8, sep: 8,
    october: 9, oktober: 9, okt: 9,
    november: 10, nov: 10,
    december: 11, desember: 11, des: 11
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

/**
 * Menghitung tanggal ulang tahun persis di tahun pensiun (BUP)
 */
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

/**
 * Format string tanggal YYYY-MM-DD ke teks Bahasa Indonesia ("3 Agustus 2026")
 */
function formatDateIndoStr(dateStr) {
  if (!dateStr || dateStr === "-") return "-";

  var dt = parseAnyDate(dateStr);
  if (!dt || isNaN(dt.getTime())) return dateStr;

  var months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  return dt.getDate() + " " + months[dt.getMonth()] + " " + dt.getFullYear();
}

// =============================================================================
// RENDER TABEL DAFTAR PEGAWAI
// =============================================================================
function renderPegawaiTable(data) {
  const tbody = document.getElementById("pegawaiTbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-muted">Tidak ada data pegawai.</td></tr>';
    return;
  }

  data.forEach((p, index) => {
    const tglLahirVal = p.tanggalLahir || "-";
    const tmtPensiunVal = p.tmtPensiun || "-";
    
    // Hitung Ulang Tahun BUP
    const tglUlangTahunBup = calculateBupBirthday(tglLahirVal, tmtPensiunVal);

    let statusSkBadge = "";
    if (p.skPdfUrl && p.skPdfUrl.trim() !== "") {
      statusSkBadge = `<span class="badge bg-success">Sudah SK</span> 
                       <a href="${p.skPdfUrl}" target="_blank" class="btn btn-sm btn-outline-success ms-1" title="Lihat PDF SK"><i class="bi bi-file-pdf"></i> PDF</a>`;
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
      <td class="text-primary fw-bold">${formatDateIndoStr(tglUlangTahunBup)}</td>
      <td><strong>${formatDateIndoStr(tmtPensiunVal)}</strong></td>
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
// MODAL & GENERATE SK HANDLER
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

  document.getElementById("modalNip").value = pegawai.nip || "";
  document.getElementById("modalNama").value = pegawai.nama || "";
  document.getElementById("modalJabatan").value = pegawai.jabatan || "";
  document.getElementById("modalJenisPegawai").value = pegawai.jenisPegawai || "";
  document.getElementById("modalPerangkatDaerah").value = pegawai.perangkatDaerah || "";
  document.getElementById("modalTanggalLahir").value = tglLahirVal;
  document.getElementById("modalTmtBerhenti").value = tmtPensiunVal;
  
  const elemBup = document.getElementById("modalTanggalUlangTahunBup");
  if (elemBup) {
    elemBup.value = tglUlangTahunBup;
  }

  document.getElementById("modalMasaKerjaTahun").value = pegawai.masaKerjaTahun || 0;
  document.getElementById("modalMasaKerjaBulan").value = pegawai.masaKerjaBulan || 0;

  if (document.getElementById("modalNomorSk")) document.getElementById("modalNomorSk").value = "";
  if (document.getElementById("modalTanggalSk")) document.getElementById("modalTanggalSk").value = new Date().toISOString().split('T')[0];
  if (document.getElementById("modalNomorPertek")) document.getElementById("modalNomorPertek").value = "";
  if (document.getElementById("modalTanggalPertek")) document.getElementById("modalTanggalPertek").value = "";
  if (document.getElementById("modalGajiPokok")) document.getElementById("modalGajiPokok").value = "";
  if (document.getElementById("modalAlamat")) document.getElementById("modalAlamat").value = "";

  const modalElem = document.getElementById("generateSkModal");
  if (modalElem) {
    const bsModal = new bootstrap.Modal(modalElem);
    bsModal.show();
  }
}

async function handleGenerateSkSubmit(e) {
  e.preventDefault();
  
  const btnSubmit = document.getElementById("btnSubmitSk");
  const spinner = document.getElementById("spinnerSk");
  
  if (btnSubmit) btnSubmit.disabled = true;
  if (spinner) spinner.classList.remove("d-none");

  const jenisPegawaiVal = document.getElementById("modalJenisPegawai").value;
  const jenisPemberhentianVal = document.getElementById("modalJenisPemberhentian") ? 
                                document.getElementById("modalJenisPemberhentian").value : "BUP";

  const payload = {
    action: "generateSK",
    token: currentToken,
    nip: document.getElementById("modalNip").value,
    nama: document.getElementById("modalNama").value,
    jabatan: document.getElementById("modalJabatan").value,
    jenisPegawai: jenisPegawaiVal,
    perangkatDaerah: document.getElementById("modalPerangkatDaerah").value,
    tanggalLahir: document.getElementById("modalTanggalLahir").value,
    tanggalUlangTahunBup: document.getElementById("modalTanggalUlangTahunBup") ? 
                          document.getElementById("modalTanggalUlangTahunBup").value : "",
    tmtBerhenti: document.getElementById("modalTmtBerhenti").value,
    jenisPemberhentian: jenisPemberhentianVal,
    nomorSk: document.getElementById("modalNomorSk").value,
    tanggalSk: document.getElementById("modalTanggalSk").value,
    nomorPertek: document.getElementById("modalNomorPertek").value,
    tanggalPertek: document.getElementById("modalTanggalPertek").value,
    gajiPokok: document.getElementById("modalGajiPokok").value,
    alamat: document.getElementById("modalAlamat").value,
    masaKerjaTahun: document.getElementById("modalMasaKerjaTahun").value,
    masaKerjaBulan: document.getElementById("modalMasaKerjaBulan").value
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
      
      const modalElem = document.getElementById("generateSkModal");
      const bsModal = bootstrap.Modal.getInstance(modalElem);
      if (bsModal) bsModal.hide();

      fetchPegawaiData();
    } else {
      alert("Gagal membuat SK: " + (result.message || "Terjadi kesalahan server."));
    }
  } catch (err) {
    alert("Terjadi kesalahan koneksi: " + err.message);
  } finally {
    if (btnSubmit) btnSubmit.disabled = false;
    if (spinner) spinner.classList.add("d-none");
  }
}
