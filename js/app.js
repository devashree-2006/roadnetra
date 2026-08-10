const KEY = "roadnetra_reports";
const ADMIN_KEY = "roadnetra_admin_session";

const ADMIN_USERNAME = "roadnetra_admin";
const ADMIN_PASSWORD = "admin123";

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

function isAdmin() {
    return sessionStorage.getItem(ADMIN_KEY) === "true";
}

function logout() {
    sessionStorage.removeItem(ADMIN_KEY);
    window.location.reload();
}

function tag(text) {
    return `<span class="${text.toLowerCase().replaceAll(" ", "-")}">${text}</span>`;
}

function updateHome() {
    const data = reports();

    if (document.getElementById("total")) {
        document.getElementById("total").textContent = data.length;
        document.getElementById("pending").textContent =
            data.filter(item => item.status === "Pending").length;
        document.getElementById("completed").textContent =
            data.filter(item => item.status === "Completed").length;
    }
}

function renderComplaints() {
    const list = document.getElementById("complaintList");
    if (!list) return;

    const search = document.getElementById("search");
    const filter = document.getElementById("filter");
    const action = document.getElementById("adminAction");
    const notice = document.getElementById("adminNotice");

    if (isAdmin()) {
        action.innerHTML = `<button class="simple-btn" id="logoutButton">Sign out</button>`;

        notice.innerHTML = `
      <div class="admin-notice">
        ✓ Admin session active. You can update complaint statuses.
      </div>
    `;

        document.getElementById("logoutButton").onclick = logout;
    } else {
        action.innerHTML = `<a class="btn dark" href="login.html">Admin login</a>`;

        notice.innerHTML = `
      <div class="admin-notice">
        Complaint status updates are restricted to municipal administrators.
        <a href="login.html">Sign in →</a>
      </div>
    `;
    }

    function draw() {
        const word = search.value.toLowerCase();
        const selectedStatus = filter.value;

        const data = reports().filter(item => {
            const matchesText = Object.values(item)
                .join(" ")
                .toLowerCase()
                .includes(word);

            const matchesStatus =
                selectedStatus === "All" || item.status === selectedStatus;

            return matchesText && matchesStatus;
        });

        list.innerHTML = data.length ?
            data.map(item => {
                    const adminControls = isAdmin() ?
                        `
              <select class="status-select" data-id="${item.id}">
                ${statuses.map(status => `
                  <option ${status === item.status ? "selected" : ""}>
                    ${status}
                  </option>
                `).join("")}
              </select>
            `
            : "";

          return `
            <article class="complaint">
              <div>
                <h3>${item.type} <span class="id">${item.id}</span></h3>
                <p>${item.location}, ${item.city}</p>
                <p class="small">
                  ${tag(item.severity)} · Reported ${item.date}
                </p>
              </div>

              <div>
                ${tag(item.status)}
                <br>
                ${adminControls}
              </div>
            </article>
          `;
        }).join("")
      : `<div class="empty">No reports found.</div>`;

    document.querySelectorAll(".status-select").forEach(select => {
      select.onchange = () => {
        if (!isAdmin()) return;

        const data = reports();
        const item = data.find(report => report.id === select.dataset.id);

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

    const id =
      "RN-" +
      new Date().getFullYear() +
      "-" +
      Math.random().toString(36).substring(2, 8).toUpperCase();

    const report = {
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
    data.unshift(report);
    save(data);

    alert("Report submitted successfully!\nComplaint ID: " + id);
    window.location.href = "track.html?id=" + id;
  };
}

function setupTracker() {
  const form = document.getElementById("trackForm");
  const result = document.getElementById("trackResult");
  if (!form) return;

  function track(id) {
    const item = reports().find(
      report => report.id.toLowerCase() === id.trim().toLowerCase()
    );

    if (!item) {
      result.innerHTML =
        `<div class="empty">Complaint ID not found. Please try again.</div>`;
      return;
    }

    const currentStep = statuses.indexOf(item.status);

    result.innerHTML = `
      <section class="card track-card">
        <p class="id">${item.id}</p>
        <h2>${item.type}</h2>
        <p class="muted">${item.location}, ${item.city}</p>
        <p>${tag(item.status)} ${tag(item.severity)}</p>

        <div class="progress">
          ${statuses.map((status, index) => `
            <div class="${index <= currentStep ? "done" : ""}">
              <i></i>${status}
            </div>
          `).join("")}
        </div>

        <p class="small">
          Reported on ${item.date}<br>
          ${item.description}
        </p>
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
    return reports().filter(item => item.status === status).length;
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

function setupLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  if (isAdmin()) {
    window.location.href = "complaints.html";
  }

  form.onsubmit = event => {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const error = document.getElementById("loginError");

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_KEY, "true");
      window.location.href = "complaints.html";
    } else {
      error.textContent = "Incorrect username or password.";
    }
  };
}

updateHome();
renderComplaints();
setupReportForm();
setupTracker();
dashboard();
setupLogin();