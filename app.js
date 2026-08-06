// GANTI DENGAN URL WEB APP DEPLOYMENT GOOGLE APPS SCRIPT ANDA
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwiZFnuX_ccRw0CdfGzJxxsEoxXy_UxQ_SJQBNPO1eOrfodJydUQtc3CIwUnMJjYT_J/exec";

let allPegawaiData = [];
let filteredPegawaiData = [];
let modalSKInstance = null;
let modalUserInstance = null;

document.addEventListener("DOMContentLoaded", function() {
  modalSKInstance = new bootstrap.Modal(document.getElementById('modalSK'));
  modalUserInstance = new bootstrap.Modal(document.getElementById('modalUser'));
  
  checkSession();
});

function checkSession() {
  const token = sessionStorage.getItem("token");
  const username = sessionStorage.getItem("username");

  if (token && username) {
    document.getElementById("loginSection").classList.add("d-none");
    document.getElementById("dashboardSection").classList.remove("d-none");
    document.getElementById("userDisplay").innerText = username;
    loadDataPegawai();
    loadDataUsers();
  } else {
    document.getElementById("loginSection").classList.remove("d-none");
    document.getElementById("dashboardSection").classList.add("d-none");
  }
}

function doLogin() {
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;
  const btn = document.getElementById("btnLogin");

  if (!u || !p) {
    alert("Username dan Password wajib diisi!");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Memeriksa...`;

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "login", username: u, password: p })
  })
  .then(res => res.json())
  .then(data => {
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-box-arrow-in-right me-1"></i> Masuk`;

    if (data.status === "success") {
      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("username", data.username);
      checkSession();
    } else {
      alert("Login gagal: " + data.message);
    }
  })
  .catch(err => {
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-box-arrow-in-right me-1"></i> Masuk`;
    alert("Gagal terhubung ke server: " + err);
  });
}

function doLogout() {
  sessionStorage.clear();
  checkSession();
}

function showSection(sec) {
  document.getElementById("sectionPegawai").classList.add("d-none");
  document.getElementById("sectionUser").classList.add("d-none");
  document.getElementById("menuPegawai").classList.remove("active");
  document.getElementById("menuUser").classList.remove("active");

  if (sec === "pegawai") {
    document.getElementById("sectionPegawai").classList.remove("d-none");
    document.getElementById("menuPegawai").classList.add("active");
  } else {
    document.getElementById("sectionUser").classList.remove("d-none");
    document.getElementById("menuUser").classList.add("active");
  }
}

function loadDataPegawai() {
  const tbody = document.getElementById("tbodyPegawai");
  tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Memuat data...</td></tr>`;

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "getPegawai", token: sessionStorage.getItem("token") })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "success") {
      allPegawaiData = data.data;
      applyFilter();
    } else {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger py-4">${data.message}</td></tr>`;
    }
  })
  .catch(err => {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger py-4">Gagal memuat data: ${err}</td></tr>`;
  });
}

function renderTable(data) {
  const tbody = document.getElementById("tbodyPegawai");
  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">Tidak ada data ditemukan</td></tr>`;
    updateStats([]);
    return;
  }

  data.forEach((item) => {
    const tr = document.createElement("tr");

    let statusBadge = item.skPdfUrl 
      ? `<a href="${item.skPdfUrl}" target="_blank" class="badge bg-success text-decoration-none"><i class="bi bi-file-earmark-pdf"></i> Sudah SK</a>`
      : `<span class="badge bg-secondary">Belum SK</span>`;

    let btnAksi = item.skPdfUrl
      ? `<button class="btn btn-sm btn-outline-primary" onclick="openModalSK('${item.nip}')"><i class="bi bi-pencil-square"></i> Cetak Ulang</button>`
      : `<button class="btn btn-sm btn-primary" onclick="openModalSK('${item.nip}')"><i class="bi bi-printer"></i> Terbitkan SK</button>`;

    tr.innerHTML = `
      <td><strong>${item.nip}</strong></td>
      <td>${item.nama}</td>
      <td>${item.perangkatDaerah}</td>
      <td>${item.jabatan}</td>
      <td><span class="badge bg-info text-dark">${item.jenisPegawai}</span></td>
      <td>${item.tmtAwal || '-'}</td>
      <td><strong class="text-primary">${item.tmtPensiun || '-'}</strong></td>
      <td>${item.masaKerjaTahun || 0} Thn ${item.masaKerjaBulan || 0} Bln</td>
      <td>${statusBadge}</td>
      <td class="text-center">${btnAksi}</td>
    `;
    tbody.appendChild(tr);
  });

  updateStats(data);
}

function applyFilter() {
  const search = document.getElementById("filterSearch").value.toLowerCase();
  const jenis = document.getElementById("filterJenisPegawai").value;
  const statusSk = document.getElementById("filterStatusSk").value;
  const tmtMonth = document.getElementById("filterTmtMonth").value;

  filteredPegawaiData = allPegawaiData.filter(item => {
    const matchSearch = (item.nip && item.nip.toLowerCase().includes(search)) ||
                        (item.nama && item.nama.toLowerCase().includes(search)) ||
                        (item.perangkatDaerah && item.perangkatDaerah.toLowerCase().includes(search));

    const matchJenis = jenis === "ALL" || item.jenisPegawai === jenis;
    const matchStatus = statusSk === "ALL" || 
                        (statusSk === "SUDAH" && item.skPdfUrl) || 
                        (statusSk === "BELUM" && !item.skPdfUrl);

    let matchMonth = true;
    if (tmtMonth && item.tmtPensiun) {
      matchMonth = item.tmtPensiun.startsWith(tmtMonth);
    }

    return matchSearch && matchJenis && matchStatus && matchMonth;
  });

  renderTable(filteredPegawaiData);
}

function resetFilter() {
  document.getElementById("filterSearch").value = "";
  document.getElementById("filterJenisPegawai").value = "ALL";
  document.getElementById("filterStatusSk").value = "ALL";
  document.getElementById("filterTmtMonth").value = "";
  applyFilter();
}

function updateStats(data) {
  let kritis = 0;
  let warning = 0;
  let aman = 0;

  const now = new Date();

  data.forEach(item => {
    if (!item.tmtPensiun) return;
    const tmt = new Date(item.tmtPensiun);
    const diffMonth = (tmt.getFullYear() - now.getFullYear()) * 12 + (tmt.getMonth() - now.getMonth());

    if (diffMonth <= 2) {
      kritis++;
    } else if (diffMonth <= 6) {
      warning++;
    } else {
      aman++;
    }
  });

  document.getElementById("statTotal").innerText = data.length;
  document.getElementById("statKritis").innerText = kritis;
  document.getElementById("statWarning").innerText = warning;
  document.getElementById("statAman").innerText = aman;
}

// EXPORT TO EXCEL CLIENT-SIDE
function exportToExcel() {
  if (!filteredPegawaiData || filteredPegawaiData.length === 0) {
    alert("Tidak ada data untuk di-export!");
    return;
  }

  const exportList = filteredPegawaiData.map((item, index) => ({
    "No": index + 1,
    "NIP": item.nip,
    "Nama": item.nama,
    "Perangkat Daerah": item.perangkatDaerah,
    "Jabatan": item.jabatan,
    "Jenis Pegawai": item.jenisPegawai,
    "TMT Awal": item.tmtAwal || "-",
    "TMT Pensiun": item.tmtPensiun || "-",
    "Masa Kerja Tahun": item.masaKerjaTahun || 0,
    "Masa Kerja Bulan": item.masaKerjaBulan || 0,
    "Status SK": item.skPdfUrl ? "Sudah SK" : "Belum SK",
    "Link SK": item.skPdfUrl || "-"
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportList);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pensiun");

  XLSX.writeFile(workbook, `Data_Pensiun_Pegawai_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function openModalSK(nip) {
  const item = allPegawaiData.find(p => p.nip === nip);
  if (!item) return;

  document.getElementById("skNip").innerText = item.nip;
  document.getElementById("skNama").innerText = item.nama;
  document.getElementById("skJabatan").innerText = item.jabatan;
  document.getElementById("skPerangkatDaerah").innerText = item.perangkatDaerah;
  document.getElementById("skJenisPegawai").innerText = item.jenisPegawai;
  document.getElementById("skTmtPensiun").innerText = item.tmtPensiun || "-";

  // Auto Select Template Key (Ubah PPPK Paruh Waktu -> PPPK_PARUH_WAKTU)
  const selKey = document.getElementById("skJenisPegawaiKey");
  let formatKey = (item.jenisPegawai || "PPPK").toUpperCase().replace(/\s+/g, '_');
  if (formatKey.includes("PARUH")) formatKey = "PPPK_PARUH_WAKTU";
  selKey.value = formatKey;

  document.getElementById("skTmtBerhenti").value = item.tmtPensiun || "";
  document.getElementById("skMasaKerjaTahun").value = item.masaKerjaTahun || 0;
  document.getElementById("skMasaKerjaBulan").value = item.masaKerjaBulan || 0;
  
  onJenisPemberhentianChange();
  modalSKInstance.show();
}

function onJenisPemberhentianChange() {
  const jenis = document.getElementById("skJenisPemberhentian").value;
  const container = document.getElementById("dynamicFields");
  container.innerHTML = "";

  if (jenis === "MENINGGAL") {
    container.innerHTML = `
      <div class="col-md-4">
        <label class="form-label fw-bold">No. Akta Kematian</label>
        <input type="text" id="skNoAktaKematian" class="form-control" required>
      </div>
      <div class="col-md-4">
        <label class="form-label fw-bold">Tgl Akta Kematian</label>
        <input type="date" id="skTglAktaKematian" class="form-control" required>
      </div>
      <div class="col-md-4">
        <label class="form-label fw-bold">Nama Ahli Waris / Janda / Duda</label>
        <input type="text" id="skNamaAhliWaris" class="form-control" required>
      </div>
    `;
  } else if (jenis === "APS") {
    container.innerHTML = `
      <div class="col-md-6">
        <label class="form-label fw-bold">No. Surat Permohonan APS</label>
        <input type="text" id="skNoSuratAps" class="form-control" required>
      </div>
      <div class="col-md-6">
        <label class="form-label fw-bold">Tgl Surat APS</label>
        <input type="date" id="skTglSuratAps" class="form-control" required>
      </div>
    `;
  } else if (jenis === "DISIPLIN") {
    container.innerHTML = `
      <div class="col-md-12">
        <label class="form-label fw-bold">Alasan / Jenis Hukuman Disiplin</label>
        <input type="text" id="skAlasanHukuman" class="form-control" required placeholder="Sebutkan tingkat & jenis pelanggaran">
      </div>
    `;
  }
}

function submitGenerateSK() {
  const btn = document.getElementById("btnSubmitSK");
  const selectCategory = document.getElementById("skJenisPegawaiKey");
  
  let rawKey = selectCategory ? selectCategory.value : "PPPK";
  let keyJenis = rawKey.trim().toUpperCase().replace(/\s+/g, '_');

  const payload = {
    action: "generateSK",
    token: sessionStorage.getItem("token"),
    nip: document.getElementById("skNip").innerText,
    nama: document.getElementById("skNama").innerText,
    perangkatDaerah: document.getElementById("skPerangkatDaerah").innerText,
    jabatan: document.getElementById("skJabatan").innerText,
    jenisPegawai: document.getElementById("skJenisPegawai").innerText,
    
    jenisPegawaiKey: keyJenis, 
    jenisPemberhentian: document.getElementById("skJenisPemberhentian").value,
    
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

function loadDataUsers() {
  const list = document.getElementById("listUserAdmin");
  list.innerHTML = `<li class="list-group-item text-muted">Memuat user...</li>`;

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "getUsers", token: sessionStorage.getItem("token") })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "success") {
      list.innerHTML = "";
      data.data.forEach(u => {
        list.innerHTML += `
          <li class="list-group-item d-flex justify-content-between align-items-center py-3">
            <div>
              <strong>${u.username}</strong>
            </div>
            <span class="badge bg-secondary">Admin</span>
          </li>
        `;
      });
    }
  });
}

function submitTambahUser() {
  const u = document.getElementById("newUsername").value;
  const p = document.getElementById("newPassword").value;

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "addUser", token: sessionStorage.getItem("token"), username: u, password: p })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "success") {
      alert("Admin berhasil ditambahkan!");
      modalUserInstance.hide();
      document.getElementById("formTambahUser").reset();
      loadDataUsers();
    } else {
      alert("Gagal: " + data.message);
    }
  });
}
