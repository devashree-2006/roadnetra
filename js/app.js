const KEY = "roadnetra_reports";

const demoReports = [{
        id: "RN-2026-A7K29M",
        type: "Pothole",
        severity: "High",
        location: "Near City Library, MG Road",
        city: "Bengaluru",
        pin: "560001",
        description: "Large pothole near the bus stop.",
        status: "Under Inspection",
        date: "2026-08-06"
    },
    {
        id: "RN-2026-Q4N81B",
        type: "Cracked road",
        severity: "Medium",
        location: "Lake View Junction",
        city: "Bengaluru",
        pin: "560038",
        description: "Road surface is cracked across one lane.",
        status: "Work Started",
        date: "2026-08-04"
    },
    {
        id: "RN-2026-P9T36R",
        type: "Waterlogging",
        severity: "Low",
        location: "Market Road",
        city: "Bengaluru",
        pin: "560002",
        description: "Water collects after rainfall.",
        status: "Completed",
        date: "2026-08-01"
    }
];

const statuses = ["Pending", "Under Inspection", "Work Started", "Completed"];

function reports() {
    let data = JSON.parse(localStorage.getItem(KEY));
    if (!data) {
        data = demoReports;
        localStorage.setItem(KEY, JSON.stringify(data));
    }
    return data;
}

function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
}

function tag(text) {
    return `<span class="${text.toLowerCase()}">${text}</span>`;
}

function updateHome() {
    const data = reports();
    const total = document.getElementById("total");
    const pending = document.getElementById("pending");
    const completed = document.getElementById("completed");

    if (total) total.textContent = data.length;
    if (pending) pending.textContent = data.filter(x => x.status === "Pending").length;
    if (completed) completed.textContent = data.filter(x => x.status === "Completed").length;
}

function renderComplaints() {
    const list = document.getElementById("complaintList");
    if (!list) return;

    const search = document.getElementById("search");
    const filter = document.getElementById("filter");

    function draw() {
        const word = search.value.toLowerCase();
        const status = filter.value;

        const data = reports().filter(item => {
            const matchesText = Object.values(item).join(" ").toLowerCase().includes(word);
            const matchesStatus = status === "All" || item.status === status;
            return matchesText && matchesStatus;
        });

        list.innerHTML = data.length ? data.map(item => `
      <article class="complaint">
        <div>
          <h3>${item.type} <span class="id">${item.id}</span></h3>
          <p>${item.location}, ${item.city}</p>
          <p class="small">${tag(item.severity)} &nbsp; · &nbsp; Reported ${item.date}</p>
        </div>
        <div>
          ${tag(item.status)}
          <br>
          <select class="status-select" data-id="${item.id}">
            ${statuses.map(s => `<option ${s === item.status ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </div>
      </article>
    `).join("") : `<div class="empty">No reports found.</div>`;

    document.querySelectorAll(".status-select").forEach(select => {
      select.onchange = () => {
        const data = reports();
        const item = data.find(x => x.id === select.dataset.id);
        item.status = select.value;
        save(data);
        draw();
      };
    });
  }

  search.oninput = draw;
  filter.onchange = draw;
  draw();
}

function setupReportForm() {
  const form = document.getElementById("reportForm");
  if (!form) return;

  const photo = document.getElementById("photo");
  const preview = document.getElementById("preview");
  const uploadText = document.getElementById("uploadText");

  photo.onchange = () => {
    const file = photo.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      preview.src = event.target.result;
      preview.style.display = "block";
      uploadText.style.display = "none";
    };
    reader.readAsDataURL(file);
  };

  form.onsubmit = event => {
    event.preventDefault();

    const formData = new FormData(form);
    const id = "RN-" + new Date().getFullYear() + "-" +
      Math.random().toString(36).substring(2, 8).toUpperCase();

    const item = {
      id: id,
      type: formData.get("type"),
      severity: formData.get("severity"),
      location: formData.get("location"),
      city: formData.get("city"),
      pin: formData.get("pin"),
      description: formData.get("description"),
      status: "Pending",
      date: new Date().toISOString().slice(0, 10)
    };

    const data = reports();
    data.unshift(item);
    save(data);

    alert("Report submitted successfully!\nYour Complaint ID: " + id);
    window.location.href = "track.html?id=" + id;
  };
}

function setupTracker() {
  const form = document.getElementById("trackForm");
  const result = document.getElementById("trackResult");
  if (!form) return;

  function track(id) {
    const item = reports().find(x => x.id.toLowerCase() === id.toLowerCase().trim());

    if (!item) {
      result.innerHTML = `<div class="empty">Complaint ID not found. Please check and try again.</div>`;
      return;
    }

    const current = statuses.indexOf(item.status);

    result.innerHTML = `
      <section class="card track-card">
        <p class="id">${item.id}</p>
        <h2>${item.type}</h2>
        <p class="muted">${item.location}, ${item.city}</p>
        <p>${tag(item.status)} &nbsp; ${tag(item.severity)}</p>

        <div class="progress">
          ${statuses.map((status, index) => `
            <div class="${index <= current ? "done" : ""}">
              <i></i>${status}
            </div>
          `).join("")}
        </div>

        <p class="small">Reported on ${item.date}<br>${item.description}</p>
      </section>
    `;
  }

  form.onsubmit = event => {
    event.preventDefault();
    track(document.getElementById("trackId").value);
  };

  const id = new URLSearchParams(window.location.search).get("id");
  if (id) {
    document.getElementById("trackId").value = id;
    track(id);
  }
}

function dashboard() {
  const cards = document.getElementById("dashCards");
  if (!cards) return;

  function count(status) {
    return reports().filter(x => x.status === status).length;
  }

  function draw() {
    const data = reports();

    cards.innerHTML = `
      <article><p>Total reports</p><b>${data.length}</b></article>
      <article><p>Pending</p><b>${count("Pending")}</b></article>
      <article><p>In progress</p><b>${count("Under Inspection") + count("Work Started")}</b></article>
      <article><p>Resolved</p><b>${count("Completed")}</b></article>
    `;

    document.getElementById("bars").innerHTML = statuses.map(status => {
      const number = count(status);
      const width = data.length ? (number / data.length) * 100 : 0;

      return `
        <div class="bar-row">
          <span>${status}</span>
          <div class="bar"><i style="width:${width}%"></i></div>
          <b>${number}</b>
        </div>
      `;
    }).join("");

    document.getElementById("recent").innerHTML = data.slice(0, 4).map(item => `
      <div class="recent">
        <b>${item.type} · ${item.location}</b><br>
        <span class="small">${item.id} · ${item.status}</span>
      </div>
    `).join("");
  }

  draw();

  document.getElementById("reset").onclick = () => {
    localStorage.removeItem(KEY);
    draw();
  };
}

updateHome();
renderComplaints();
setupReportForm();
setupTracker();
dashboard();