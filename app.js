const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwiZFnuX_ccRw0CdfGzJxxsEoxXy_UxQ_SJQBNPO1eOrfodJydUQtc3CIwUnMJjYT_J/exec";
let userToken = localStorage.getItem("userToken") || "";
let customVars = [];

document.addEventListener("DOMContentLoaded", () => {
  if (userToken) {
    showDashboard();
  }
});

function doLogin() {
  const u = document.getElementById("loginUser").value;
  const p = document.getElementById("loginPass").value;

  fetch(`${WEB_APP_URL}?action=login&username=${u}&password=${p}`)
    .then(r => r.json())
    .then(res => {
      if (res.status === "success") {
        userToken = res.token;
        localStorage.setItem("userToken", userToken);
        showDashboard();
      } else {
        Swal.fire("Login Gagal", res.message, "error");
      }
    });
}

function logout() {
  localStorage.removeItem("userToken");
  location.reload();
}

function showDashboard() {
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("mainDashboard").style.display = "block";
  loadTablePensiun();
  loadCustomVariables();
}

function loadTablePensiun() {
  fetch(`${WEB_APP_URL}?action=getDaftarPensiun&token=${userToken}`)
    .then(r => r.json())
    .then(res => {
      if (res.status === "unauthorized") return logout();
      
      const tbody = document.getElementById("tabelPensiunBody");
      tbody.innerHTML = "";
      
      res.data.forEach(item => {
        tbody.innerHTML += `
          <tr>
            <td><b>${item.nip}</b></td>
            <td>${item.nama}</td>
            <td><span class="badge bg-info text-dark">${item.jenisPegawai}</span></td>
            <td>${item.tglPensiunEstimate}</td>
            <td>
              <button onclick='prosesSK(${JSON.stringify(item)})' class="btn btn-sm btn-primary">
                Proses SK
              </button>
            </td>
          </tr>
        `;
      });
    });
}

function prosesSK(pegawai) {
  const jenisPem = "BUP"; // Default awal
  
  Swal.fire({ title: 'Memeriksa Berkas Google Form...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

  // GATEKEEPER CHECK VIA API
  fetch(`${WEB_APP_URL}?action=cekBerkas&nip=${pegawai.nip}&jenis=${jenisPem}&token=${userToken}`)
    .then(r => r.json())
    .then(res => {
      Swal.close();
      
      if (!res.isLengkap) {
        // NOTIFIKASI DITOLAK JIKA BERKAS BELUM LENGKAP
        Swal.fire({
          icon: 'error',
          title: 'Ditolak: Berkas Belum Lengkap!',
          text: res.pesan,
          confirmButtonColor: '#d33'
        });
        return; // HENTIKAN EKSEKUSI
      }

      // JIKA LENGKAP: BUKA MODAL FORM
      document.getElementById("skNip").value = pegawai.nip;
      document.getElementById("skNama").value = pegawai.nama;
      document.getElementById("skTmtAwal").value = pegawai.tmtAwalKerja;
      document.getElementById("skJenisPegawai").value = pegawai.jenisPegawai;
      document.getElementById("skTmtBerhenti").value = pegawai.tglPensiunEstimate;
      
      renderDynamicFields(jenisPem);
      toggleKondisionalInput();
      
      var myModal = new bootstrap.Modal(document.getElementById('modalSK'));
      myModal.show();
    });
}

function toggleKondisionalInput() {
  const j = document.getElementById("skJenisPemberhentian").value;
  document.getElementById("groupMeninggal").style.display = (j === "MENINGGAL") ? "block" : "none";
  document.getElementById("groupAPS").style.display = (j === "APS") ? "block" : "none";
  renderDynamicFields(j);
}

function loadCustomVariables() {
  fetch(`${WEB_APP_URL}?action=getCustomVariables&token=${userToken}`)
    .then(r => r.json())
    .then(res => { customVars = res.data || []; });
}

function renderDynamicFields(jenisPemberhentian) {
  const container = document.getElementById("dynamicContainer");
  container.innerHTML = "";
  
  customVars.forEach(v => {
    if (v.jenis === "SEMUA" || v.jenis === jenisPemberhentian) {
      container.innerHTML += `
        <div class="mb-2">
          <label>${v.label}:</label>
          <input type="${v.type}" class="form-control dynamic-input" data-tag="${v.tag}">
        </div>
      `;
    }
  });
}

function submitGenerateSK() {
  // Collect Custom Dynamic Inputs
  const customInputs = [];
  document.querySelectorAll(".dynamic-input").forEach(el => {
    customInputs.push({ tag: el.dataset.tag, val: el.value });
  });

  const payload = {
    token: userToken,
    nip: document.getElementById("skNip").value,
    nama: document.getElementById("skNama").value,
    tmtAwalKerja: document.getElementById("skTmtAwal").value,
    jenisPegawai: document.getElementById("skJenisPegawai").value,
    jenisPemberhentian: document.getElementById("skJenisPemberhentian").value,
    tmtBerhenti: document.getElementById("skTmtBerhenti").value,
    nomorPertek: document.getElementById("skNoPertek").value,
    tanggalPertek: document.getElementById("skTglPertek").value,
    nomorAktaKematian: document.getElementById("skNoAkta").value,
    suratPengunduranDiri: document.getElementById("skSuratAPS").value,
    nomorSk: document.getElementById("skNomor").value,
    tanggalSk: document.getElementById("skTglTerbit").value,
    gajiPokok: document.getElementById("skGaji").value,
    alamat: document.getElementById("skAlamat").value,
    customFields: customInputs
  };

  Swal.fire({ title: 'Memproses SK & Mengkonversi ke PDF...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

  fetch(WEB_APP_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  })
  .then(r => r.json())
  .then(res => {
    Swal.close();
    if (res.status === "success") {
      Swal.fire({
        icon: 'success',
        title: 'SK Berhasil Diterbitkan!',
        html: `<a href="${res.pdfUrl}" target="_blank" class="btn btn-success mt-2">Unduh File SK (PDF)</a>`
      }).then(() => {
        bootstrap.Modal.getInstance(document.getElementById('modalSK')).hide();
      });
    } else {
      Swal.fire('Gagal Generasi SK', res.message, 'error');
    }
  });
}

function tambahVariable() {
  const payload = {
    token: userToken,
    action: "simpanVariableBaru",
    label: document.getElementById("newVarLabel").value,
    tag: document.getElementById("newVarTag").value,
    type: "text",
    required: "Tidak",
    jenis: document.getElementById("newVarJenis").value
  };

  fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
    .then(r => r.json())
    .then(res => {
      Swal.fire("Berhasil", res.message, "success");
      loadCustomVariables();
    });
}
