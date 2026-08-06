const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwiZFnuX_ccRw0CdfGzJxxsEoxXy_UxQ_SJQBNPO1eOrfodJydUQtc3CIwUnMJjYT_J/exec";

let masterDataPegawai = [];
let modalSKInstance = null;

document.addEventListener("DOMContentLoaded", function () {
  modalSKInstance = new bootstrap.Modal(document.getElementById('modalSK'));
  checkSession();
});

// =================================================================
// 1. AUTHENTICATION & SESSION
// =================================================================
function checkSession() {
  const token = sessionStorage.getItem("token");
  const username = sessionStorage.getItem("username");

  if (token && username) {
    document.getElementById("loginSection").classList.add("d-none");
    document.getElementById("dashboardSection").classList.remove("d-none");
    document.getElementById("userDisplay").innerText = username;
    loadDataPegawai();
  } else {
    document.getElementById("loginSection").classList.remove("d-none");
    document.getElementById("dashboardSection").classList.add("d-none");
  }
}

function doLogin() {
  const userVal = document.getElementById("username").value.trim();
  const passVal = document.getElementById("password").value.trim();

  if (!userVal || !passVal) {
    alert("Username dan Password wajib diisi!");
    return;
  }

  const btn = document.getElementById("btnLogin");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Processing...`;

  fetch(`${SCRIPT_URL}?action=login&username=${encodeURIComponent(userVal)}&password=${encodeURIComponent(passVal)}`)
    .then(res => res.json())
    .then(res => {
      btn.disabled = false;
      btn.innerHTML = `<i class="bi bi-box-arrow-in-right me-1"></i> Masuk`;

      if (res.status === "success") {
        sessionStorage.setItem("token", res.token);
        sessionStorage.setItem("username", res.username);
        checkSession();
      } else {
        alert(res.message);
      }
    })
    .catch(err => {
      btn.disabled = false;
      btn.innerHTML = `<i class="bi bi-box-arrow-in-right me-1"></i> Masuk`;
      alert("Terjadi kesalahan koneksi: " + err);
    });
}

function doLogout() {
  sessionStorage.clear();
  checkSession();
}


// =================================================================
// 2. LOAD DATA & RENDER TABLE
// =================================================================
function loadDataPegawai() {
  const token = sessionStorage.getItem("token");
  const tbody = document.getElementById("tbodyPegawai");
  tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Memuat data pegawai...</td></tr>`;

  fetch(`${SCRIPT_URL}?action=getDaftarPensiun&token=${encodeURIComponent(token)}`)
    .then(res => res.json())
    .then(res => {
      if (res.status === "unauthorized") {
        alert(res.message);
        doLogout();
        return;
      }
      if (res.status === "success") {
        masterDataPegawai = res.data;
        updateStatistik(masterDataPegawai);
        applyFilter();
      } else {
        alert("Gagal memuat data: " + res.message);
      }
    })
    .catch(err => {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger py-4">Gagal terhubung ke server.</td></tr>`;
    });
}

function updateStatistik(data) {
  let total = data.length;
  let kritis = 0;
  let warning = 0;
  let aman = 0;

  data.forEach(item => {
    if (item.kategoriPensiun.includes("≤ 2 Bulan")) kritis++;
    else if (item.kategoriPensiun.includes("≤ 6 Bulan")) warning++;
    else if (item.kategoriPensiun === "Belum Pensiun") aman++;
  });

  document.getElementById("statTotal").innerText = total;
  document.getElementById("statKritis").innerText = kritis;
  document.getElementById("statWarning").innerText = warning;
  document.getElementById("statAman").innerText = aman;
}

function applyFilter() {
  const searchVal = document.getElementById("filterSearch").value.toLowerCase().trim();
  const jenisVal = document.getElementById("filterJenisPegawai").value;
  const statusSkVal = document.getElementById("filterStatusSk").value;
  const monthVal = document.getElementById("filterTmtMonth").value;

  const filtered = masterDataPegawai.filter(item => {
    const matchSearch = item.nip.toLowerCase().includes(searchVal) || 
                        item.nama.toLowerCase().includes(searchVal) ||
                        (item.perangkatDaerah && item.perangkatDaerah.toLowerCase().includes(searchVal)) ||
                        (item.jabatan && item.jabatan.toLowerCase().includes(searchVal));

    const matchJenis = (jenisVal === "ALL") || (item.jenisPegawai === jenisVal);
    
    let matchStatusSk = true;
    if (statusSkVal === "SUDAH") {
      matchStatusSk = item.statusSk && item.statusSk !== "Belum SK";
    } else if (statusSkVal === "BELUM") {
      matchStatusSk = !item.statusSk || item.statusSk === "Belum SK";
    }

    const matchMonth = (!monthVal) || (item.filterTmtKey === monthVal);

    return matchSearch && matchJenis && matchStatusSk && matchMonth;
  });

  renderTablePegawai(filtered);
}

function resetFilter() {
  document.getElementById("filterSearch").value = "";
  document.getElementById("filterJenisPegawai").value = "ALL";
  document.getElementById("filterStatusSk").value = "ALL";
  document.getElementById("filterTmtMonth").value = "";
  applyFilter();
}

function renderTablePegawai(dataList) {
  const tbody = document.getElementById("tbodyPegawai");
  tbody.innerHTML = "";

  if (dataList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">Tidak ada data yang sesuai.</td></tr>`;
    return;
  }

  let htmlRows = "";
  dataList.forEach(item => {
    let badgeSk = `<span class="badge bg-secondary">Belum SK</span>`;
    if (item.statusSk && item.statusSk !== "Belum SK") {
      badgeSk = `<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>${item.statusSk}</span>`;
    }

    htmlRows += `
      <tr>
        <td><strong>${item.nip}</strong></td>
        <td>${item.nama}</td>
        <td><small class="fw-bold text-muted">${item.perangkatDaerah || "-"}</small></td>
        <td><small>${item.jabatan || "-"}</small></td>
        <td><span class="badge bg-info text-dark">${item.jenisPegawai} (BUP ${item.bup})</span></td>
        <td><small>${item.tmtAwalKerja}</small></td>
        <td><strong class="text-primary">${item.tmtPensiun}</strong></td>
        <td><span class="badge bg-secondary">${item.masaKerjaText}</span></td>
        <td>${badgeSk}</td>
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
// MODAL PROSES SK & SUBMIT WITH DYNAMIC CATEGORY
// =================================================================
function openModalSK(nip) {
  const pegawai = masterDataPegawai.find(p => p.nip === nip);
  if (!pegawai) return;

  document.getElementById("skNip").innerText = pegawai.nip;
  document.getElementById("skNama").innerText = pegawai.nama;
  document.getElementById("skPerangkatDaerah").innerText = pegawai.perangkatDaerah;
  document.getElementById("skJabatan").innerText = pegawai.jabatan;
  document.getElementById("skJenisPegawai").innerText = pegawai.jenisPegawai;
  document.getElementById("skTmtPensiun").innerText = pegawai.tmtPensiun;

  // Auto-Select Kategori Jenis Pegawai
  const strJenis = (pegawai.jenisPegawai || "").toUpperCase();
  let keyJenis = "PPPK";
  if (strJenis.includes("PARUH WAKTU")) {
    keyJenis = "PPPK_PARUH_WAKTU";
  } else if (strJenis.includes("PNS")) {
    keyJenis = "PNS";
  }
  
  const selectCategory = document.getElementById("skJenisPegawaiKey");
  if (selectCategory) {
    selectCategory.value = keyJenis;
  }

  // Set Masa Kerja & Default TMT
  document.getElementById("skMasaKerjaTahun").value = pegawai.masaKerjaTahun || 0;
  document.getElementById("skMasaKerjaBulan").value = pegawai.masaKerjaBulan || 0;
  document.getElementById("skTmtBerhenti").value = pegawai.tmtPensiunInput || "";
  document.getElementById("skJenisPemberhentian").value = "BUP";
  
  onJenisPemberhentianChange();
  modalSKInstance.show();
}

function submitGenerateSK() {
  const btn = document.getElementById("btnSubmitSK");
  const jenis = document.getElementById("skJenisPemberhentian").value;
  
  // Ambil Jenis Pegawai Key dari Select / Dataset
  const selectCategory = document.getElementById("skJenisPegawaiKey");
  let keyJenis = selectCategory ? selectCategory.value : "PPPK";

  const payload = {
    action: "generateSK",
    token: sessionStorage.getItem("token"),
    nip: document.getElementById("skNip").innerText,
    nama: document.getElementById("skNama").innerText,
    perangkatDaerah: document.getElementById("skPerangkatDaerah").innerText,
    jabatan: document.getElementById("skJabatan").innerText,
    jenisPegawai: document.getElementById("skJenisPegawai").innerText,
    jenisPegawaiKey: keyJenis, // Send PPPK, PPPK_PARUH_WAKTU, or PNS
    jenisPemberhentian: jenis,
    tmtBerhenti: document.getElementById("skTmtBerhenti").value,
    
    masaKerjaTahun: document.getElementById("skMasaKerjaTahun").value,
    masaKerjaBulan: document.getElementById("skMasaKerjaBulan").value,

    nomorSk: document.getElementById("skNomor").value,
    tanggalSk: document.getElementById("skTanggal").value,
    gajiPokok: document.getElementById("skGajiPokok").value,
    nomorPertek: document.getElementById("skNomorPertek").value,
    tanggalPertek: document.getElementById("skTanggalPertek").value,
    alamat: document.getElementById("skAlamat").value,
    
    noAktaKematian: document.getElementById("skNoAktaKematian") ? document.getElementById("skNoAktaKematian").value : "",
    tglAktaKematian: document.getElementById("skTglAktaKematian") ? document.getElementById("skTglAktaKematian").value : "",
    namaAhliWaris: document.getElementById("skNamaAhliWaris") ? document.getElementById("skNamaAhliWaris").value : "",
    tglSuratAps: document.getElementById("skTglSuratAps") ? document.getElementById("skTglSuratAps").value : "",
    noSuratAps: document.getElementById("skNoSuratAps") ? document.getElementById("skNoSuratAps").value : "",
    alasanHukuman: document.getElementById("skAlasanHukuman") ? document.getElementById("skAlasanHukuman").value : ""
  };

  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Menerbitkan SK...`;

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-printer-fill me-1"></i> Terbitkan SK (PDF)`;

    if (data.status === "success") {
      alert("SK Berhasil Diterbitkan!");
      modalSKInstance.hide();
      window.open(data.pdfUrl, "_blank");
      loadDataPegawai();
    } else {
      alert("Gagal: " + data.message);
    }
  })
  .catch(err => {
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-printer-fill me-1"></i> Terbitkan SK (PDF)`;
    alert("Terjadi kesalahan sistem: " + err);
  });
}

// =================================================================
// 4. MANAGEMENT ADMIN USER & SECTION ROUTER
// =================================================================
function showSection(sectionName) {
  if (sectionName === 'pegawai') {
    document.getElementById("sectionPegawai").classList.remove("d-none");
    document.getElementById("sectionUser").classList.add("d-none");
    document.getElementById("menuPegawai").classList.add("active");
    document.getElementById("menuUser").classList.remove("active");
  } else {
    document.getElementById("sectionPegawai").classList.remove("d-none");
    document.getElementById("sectionUser").classList.remove("d-none");
    document.getElementById("menuPegawai").classList.remove("active");
    document.getElementById("menuUser").classList.add("active");
    loadDaftarUser();
  }
}

function loadDaftarUser() {
  const token = sessionStorage.getItem("token");
  const list = document.getElementById("listUserAdmin");
  list.innerHTML = `<li class="list-group-item text-muted">Memuat user...</li>`;

  fetch(`${SCRIPT_URL}?action=getDaftarUser&token=${encodeURIComponent(token)}`)
    .then(res => res.json())
    .then(res => {
      if (res.status === "success") {
        list.innerHTML = "";
        res.data.forEach(u => {
          list.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center"><span><i class="bi bi-person me-2"></i>${u.username}</span></li>`;
        });
      }
    });
}

function submitTambahUser() {
  const newUsername = document.getElementById("newUsername").value.trim();
  const newPassword = document.getElementById("newPassword").value.trim();
  const token = sessionStorage.getItem("token");

  if (!newUsername || !newPassword) {
    alert("Semua field user wajib diisi!");
    return;
  }

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "tambahUser", token: token, newUsername: newUsername, newPassword: newPassword })
  })
  .then(res => res.json())
  .then(res => {
    if (res.status === "success") {
      alert(res.message);
      document.getElementById("formTambahUser").reset();
      bootstrap.Modal.getInstance(document.getElementById('modalUser')).hide();
      loadDaftarUser();
    } else {
      alert(res.message);
    }
  });
}
