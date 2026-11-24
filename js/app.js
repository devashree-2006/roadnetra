const API = "/api";
const TOKEN_KEY = "roadnetra_admin_token";
const CONFIRMED_KEY = "roadnetra_confirmed";
const statuses = ["Pending", "Under Inspection", "Work Started", "Completed"];

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function isAdmin() {
  return Boolean(getToken());
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: "Bearer " + token } : {};
}

async function request(path, options = {}) {
  const response = await fetch(API + path, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Unable to complete the request.");
  return data;
}

async function getReports() {
  return request("/reports");
}

function getPriority(severity, confirmations = 1) {
  if (severity === "High") return "Critical";
  if (severity === "Medium") return confirmations >= 5 ? "Critical" : "High";
  return confirmations >= 5 ? "High" : "Normal";
}

function tag(text) {
  return `<span class="${String(text).toLowerCase().replaceAll(" ", "-")}">${text}</span>`;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

async function updateHome() {
  const total = document.getElementById("total");
  if (!total) return;

  try {
    const stats = await request("/stats");
    total.textContent = stats.total;
    document.getElementById("pending").textContent = stats.pending;
    document.getElementById("completed").textContent = stats.resolved;
  } catch (error) {
    console.error(error);
  }
}

function logout() {
  sessionStorage.removeItem(TOKEN_KEY);
  window.location.href = "complaints.html";
}

async function renderComplaints() {
  const list = document.getElementById("complaintList");
  if (!list) return;

  const search = document.getElementById("search");
  const filter = document.getElementById("filter");
  const action = document.getElementById("adminAction");
  const notice = document.getElementById("adminNotice");
  let allReports = [];

  if (isAdmin()) {
    action.innerHTML = '<button class="simple-btn" id="logoutButton">Sign out</button>';
    notice.innerHTML = '<div class="admin-notice">Admin session active. You can update complaint statuses.</div>';
    document.getElementById("logoutButton").onclick = logout;
  } else {
    action.innerHTML = '<a class="btn dark" href="login.html">Admin login</a>';
    notice.innerHTML = '<div class="admin-notice">Complaint status updates are restricted to municipal administrators. <a href="login.html">Sign in -&gt;</a></div>';
  }

  function mapLink(item) {
    if (item.latitude !== "" && item.longitude !== "" && item.latitude != null) {
      return `<a href="https://www.google.com/maps?q=${item.latitude},${item.longitude}" target="_blank" rel="noopener noreferrer" class="map-link">View exact location on Google Maps</a>`;
    }
    const query = encodeURIComponent(`${item.location}, ${item.city}, ${item.pin || ""}`);
    return `<a href="https://www.google.com/maps/search/?api=1&query=${query}" target="_blank" rel="noopener noreferrer" class="map-link">View location on Google Maps</a>`;
  }

  function draw() {
    const word = search.value.toLowerCase();
    const selectedStatus = filter.value;
    const reports = allReports.filter(item => {
      const matchesText = Object.values(item).join(" ").toLowerCase().includes(word);
      return matchesText && (selectedStatus === "All" || item.status === selectedStatus);
    });

    list.innerHTML = reports.length ? reports.map(item => {
      const priority = item.priority || getPriority(item.severity, item.confirmations || 1);
      const adminControls = isAdmin()
        ? `<select class="status-select" data-id="${item.id}">${statuses.map(status => `<option ${status === item.status ? "selected" : ""}>${status}</option>`).join("")}</select>`
        : "";

      return `<article class="complaint">
        <div>
          <h3>${escapeHtml(item.type)} <span class="id">${escapeHtml(item.id)}</span></h3>
          <p>${escapeHtml(item.location)}, ${escapeHtml(item.city)}</p>
          ${mapLink(item)}
          <p class="small">${tag(item.severity)} · Priority: <strong>${priority}</strong> · ${item.confirmations || 1} citizen${(item.confirmations || 1) === 1 ? "" : "s"} confirmed · Reported ${escapeHtml(item.date)}</p>
        </div>
        <div>
          ${tag(item.status)}<br>
          ${adminControls}
          <button class="confirm-btn" data-id="${item.id}">I'm facing this too</button>
        </div>
      </article>`;
    }).join("") : '<div class="empty">No reports found.</div>';

    document.querySelectorAll(".confirm-btn").forEach(button => {
      button.onclick = async () => {
        const confirmed = JSON.parse(localStorage.getItem(CONFIRMED_KEY) || "[]");
        if (confirmed.includes(button.dataset.id)) {
          alert("You have already confirmed this issue.");
          return;
        }
        try {
          await request("/reports/" + encodeURIComponent(button.dataset.id) + "/confirm", { method: "POST" });
          confirmed.push(button.dataset.id);
          localStorage.setItem(CONFIRMED_KEY, JSON.stringify(confirmed));
          allReports = await getReports();
          draw();
        } catch (error) {
          alert(error.message);
        }
      };
    });

    document.querySelectorAll(".status-select").forEach(select => {
      select.onchange = async () => {
        try {
          await request("/reports/" + encodeURIComponent(select.dataset.id) + "/status", {
            method: "PATCH",
            body: JSON.stringify({ status: select.value })
          });
          allReports = await getReports();
          draw();
        } catch (error) {
          if (error.message.includes("session")) logout();
          else alert(error.message);
        }
      };
    });
  }

  try {
    allReports = await getReports();
    draw();
  } catch (error) {
    list.innerHTML = '<div class="empty">Unable to load reports. Start the RoadNetra server and try again.</div>';
  }

  search.oninput = draw;
  filter.onchange = draw;
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

  form.onsubmit = async event => {
    event.preventDefault();
    const formData = new FormData(form);
    const report = {
      type: formData.get("type"),
      severity: formData.get("severity"),
      location: String(formData.get("location") || "").trim(),
      city: String(formData.get("city") || "").trim(),
      pin: String(formData.get("pin") || "").trim(),
      description: formData.get("description"),
      latitude: formData.get("latitude"),
      longitude: formData.get("longitude")
    };

    const hasGps = report.latitude && report.longitude;
    const hasManualLocation = report.location && report.city && /^\d{6}$/.test(report.pin);
    if (!hasGps && !hasManualLocation) {
      alert("Please either enter the complete location manually or use your current GPS location.");
      return;
    }

    try {
      const created = await request("/reports", { method: "POST", body: JSON.stringify(report) });
      alert("Report submitted successfully!\nComplaint ID: " + created.id);
      window.location.href = "track.html?id=" + encodeURIComponent(created.id);
    } catch (error) {
      alert(error.message);
    }
  };
}

function setupGPS() {
  const button = document.getElementById("getLocationBtn");
  if (!button) return;

  const status = document.getElementById("locationStatus");
  const latitude = document.getElementById("latitude");
  const longitude = document.getElementById("longitude");

  button.onclick = () => {
    if (!navigator.geolocation) {
      status.textContent = "Location services are not supported by your browser.";
      return;
    }

    status.textContent = "Getting your current location...";
    button.disabled = true;
    navigator.geolocation.getCurrentPosition(
      position => {
        latitude.value = position.coords.latitude;
        longitude.value = position.coords.longitude;
        status.textContent = `Location captured: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        button.disabled = false;
      },
      () => {
        status.textContent = "Unable to get your location. Enter the location manually instead.";
        button.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );
  };
}

function setupTracker() {
  const form = document.getElementById("trackForm");
  const result = document.getElementById("trackResult");
  if (!form) return;

  async function track(id) {
    try {
      const item = await request("/reports/" + encodeURIComponent(id.trim()));
      const step = statuses.indexOf(item.status);
      const map = item.latitude !== "" && item.longitude !== "" && item.latitude != null
        ? `<a href="https://www.google.com/maps?q=${item.latitude},${item.longitude}" target="_blank" rel="noopener noreferrer" class="map-link">View exact location on Google Maps</a>`
        : "";

      result.innerHTML = `<section class="card track-card">
        <p class="id">${escapeHtml(item.id)}</p>
        <h2>${escapeHtml(item.type)}</h2>
        <p class="muted">${escapeHtml(item.location)}, ${escapeHtml(item.city)}</p>
        ${map}
        <p>${tag(item.status)} ${tag(item.severity)}</p>
        <div class="progress">${statuses.map((status, index) => `<div class="${index <= step ? "done" : ""}"><i></i>${status}</div>`).join("")}</div>
        <p class="small">Reported on ${escapeHtml(item.date)}<br>${escapeHtml(item.description)}</p>
      </section>`;
    } catch (error) {
      result.innerHTML = '<div class="empty">Complaint ID not found. Please try again.</div>';
    }
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

async function dashboard() {
  const cards = document.getElementById("dashCards");
  if (!cards) return;

  const reset = document.getElementById("reset");
  if (reset) {
    reset.textContent = "Server data";
    reset.disabled = true;
    reset.title = "Reports are now stored on the backend.";
  }

  try {
    const data = await getReports();
    const count = status => data.filter(item => item.status === status).length;
    cards.innerHTML = `<article><p>Total reports</p><b>${data.length}</b></article>
      <article><p>Pending</p><b>${count("Pending")}</b></article>
      <article><p>In progress</p><b>${count("Under Inspection") + count("Work Started")}</b></article>
      <article><p>Resolved</p><b>${count("Completed")}</b></article>`;

    const priorityCount = { Critical: 0, High: 0, Normal: 0 };
    data.forEach(item => priorityCount[item.priority || getPriority(item.severity, item.confirmations || 1)]++);
    const priorityBox = document.getElementById("priorityOverview");
    if (priorityBox) priorityBox.innerHTML = `<div class="priority-item critical"><strong>${priorityCount.Critical}</strong><span>Critical</span><small>Immediate attention</small></div>
      <div class="priority-item high"><strong>${priorityCount.High}</strong><span>High</span><small>Needs attention</small></div>
      <div class="priority-item normal"><strong>${priorityCount.Normal}</strong><span>Normal</span><small>Routine monitoring</small></div>`;

    document.getElementById("bars").innerHTML = statuses.map(status => {
      const number = count(status);
      const width = data.length ? (number / data.length) * 100 : 0;
      return `<div class="bar-row"><span>${status}</span><div class="bar"><i style="width:${width}%"></i></div><b>${number}</b></div>`;
    }).join("");

    const priorityOrder = { Critical: 3, High: 2, Normal: 1 };
    const recent = [...data].sort((a, b) => priorityOrder[b.priority || getPriority(b.severity, b.confirmations || 1)] - priorityOrder[a.priority || getPriority(a.severity, a.confirmations || 1)]).slice(0, 4);
    document.getElementById("recent").innerHTML = recent.map(item => `<div class="recent"><b>${escapeHtml(item.type)} · ${escapeHtml(item.location)}</b><br><span class="small">${escapeHtml(item.id)} · ${escapeHtml(item.status)}</span></div>`).join("");
  } catch (error) {
    console.error(error);
  }
}

function setupLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  if (isAdmin()) window.location.href = "complaints.html";

  form.onsubmit = async event => {
    event.preventDefault();
    const error = document.getElementById("loginError");
    error.textContent = "";

    try {
      const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: document.getElementById("username").value.trim(),
          password: document.getElementById("password").value
        })
      });
      sessionStorage.setItem(TOKEN_KEY, data.token);
      window.location.href = "complaints.html";
    } catch (err) {
      error.textContent = err.message;
    }
  };
}

updateHome();
renderComplaints();
setupReportForm();
setupGPS();
setupTracker();
dashboard();
setupLogin();
