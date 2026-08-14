const KEY = "roadnetra_reports";
const ADMIN_KEY = "roadnetra_admin_session";

const ADMIN_USERNAME = "roadnetra_admin";
const ADMIN_PASSWORD = "rn_admin";


// ======================================================
// DEMO REPORTS
// ======================================================

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


const statuses = [
    "Pending",
    "Under Inspection",
    "Work Started",
    "Completed"
];


// ======================================================
// GET REPORTS
// ======================================================

function reports() {

    let data = JSON.parse(localStorage.getItem(KEY));

    if (!data) {
        data = demoReports;
        localStorage.setItem(KEY, JSON.stringify(data));
    }

    return data;
}


// ======================================================
// SAVE REPORTS
// ======================================================

function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
}


// ======================================================
// ADMIN
// ======================================================

function isAdmin() {
    return sessionStorage.getItem(ADMIN_KEY) === "true";
}


function logout() {
    sessionStorage.removeItem(ADMIN_KEY);
    window.location.reload();
}


// ======================================================
// STATUS TAG
// ======================================================

function tag(text) {
    return `<span class="${text
        .toLowerCase()
        .replaceAll(" ", "-")}">${text}</span>`;
}

function getPriority(severity, confirmations = 1) {

    if (severity === "High") {
        return "Critical";
    }

    if (severity === "Medium") {

        if (confirmations >= 5) {
            return "Critical";
        }

        return "High";
    }

    if (confirmations >= 5) {
        return "High";
    }

    return "Normal";
}
// ======================================================
// HOME PAGE
// ======================================================

function updateHome() {

    const data = reports();

    if (document.getElementById("total")) {

        document.getElementById("total").textContent =
            data.length;

        document.getElementById("pending").textContent =
            data.filter(item => item.status === "Pending").length;

        document.getElementById("completed").textContent =
            data.filter(item => item.status === "Completed").length;
    }
}


// ======================================================
// COMPLAINTS PAGE
// ======================================================

function renderComplaints() {

    const list = document.getElementById("complaintList");

    if (!list) return;

    const search = document.getElementById("search");
    const filter = document.getElementById("filter");
    const action = document.getElementById("adminAction");
    const notice = document.getElementById("adminNotice");


    if (isAdmin()) {

        action.innerHTML =
            `<button class="simple-btn" id="logoutButton">
                Sign out
            </button>`;

        notice.innerHTML = `
            <div class="admin-notice">
                ✓ Admin session active. You can update complaint statuses.
            </div>
        `;

        document.getElementById("logoutButton").onclick = logout;

    } else {

        action.innerHTML =
            `<a class="btn dark" href="login.html">
                Admin login
            </a>`;

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

            const matchesText =
                Object.values(item)
                .join(" ")
                .toLowerCase()
                .includes(word);


            const matchesStatus =
                selectedStatus === "All" ||
                item.status === selectedStatus;


            return matchesText && matchesStatus;
        });


        list.innerHTML = data.length ?

            data.map(item => {

                    const adminControls = isAdmin() ?

                        `
                    <select
                        class="status-select"
                        data-id="${item.id}"
                    >

                        ${statuses.map(status => `

                            <option
                                ${status === item.status ? "selected" : ""}
                            >
                                ${status}
                            </option>

                        `).join("")}

                    </select>
                    `

                    : "";


                return `
                    <article class="complaint">

                        <div>

                            <h3>
                                ${item.type}
                                <span class="id">${item.id}</span>
                            </h3>

                            <p>
    ${item.location},
    ${item.city}
</p>

${
    item.latitude && item.longitude
    ? `
        <a
            href="https://www.google.com/maps?q=${item.latitude},${item.longitude}"
            target="_blank"
            rel="noopener noreferrer"
            class="map-link"
        >
            📍 View exact location on Google Maps
        </a>
      `
    : `
        <a
            href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${item.location}, ${item.city}, ${item.pin}`
            )}"
            target="_blank"
            rel="noopener noreferrer"
            class="map-link"
        >
            📍 View location on Google Maps
        </a>
      `
}

                            <p class="small">
    ${tag(item.severity)}
    · Priority: <strong>${item.priority || getPriority(item.severity)}</strong>
    · 👥 ${item.confirmations || 1} citizen${(item.confirmations || 1) === 1 ? "" : "s"} confirmed
    · Reported ${item.date}
</p>
                        </div>


                        <div>

    ${tag(item.status)}

    <br>

    ${adminControls}

    <button
        class="confirm-btn"
        data-id="${item.id}"
    >
        👍 I'm facing this too
    </button>

</div>

                    </article>
                `;

            }).join("")

            :

            `<div class="empty">
                No reports found.
            </div>`;

            document
    .querySelectorAll(".confirm-btn")
    .forEach(button => {

        button.onclick = () => {

            const reportId = button.dataset.id;

            // Get complaints already confirmed by this browser
            const confirmedReports =
                JSON.parse(
                    localStorage.getItem("roadnetra_confirmed") || "[]"
                );

            // Prevent duplicate confirmation
            if (confirmedReports.includes(reportId)) {

                alert("You have already confirmed this issue.");

                return;
            }

            const data = reports();

            const item = data.find(
                report => report.id === reportId
            );

            if (!item) return;

            // Increase confirmation count
            item.confirmations =
                (item.confirmations || 1) + 1;

            // Recalculate priority
            item.priority =
                getPriority(
                    item.severity,
                    item.confirmations
                );

            // Remember this confirmation
            confirmedReports.push(reportId);

            localStorage.setItem(
                "roadnetra_confirmed",
                JSON.stringify(confirmedReports)
            );

            save(data);

            draw();
        };

    });

        document
            .querySelectorAll(".status-select")
            .forEach(select => {

                select.onchange = () => {

                    if (!isAdmin()) return;

                    const data = reports();

                    const item =
                        data.find(
                            report =>
                                report.id === select.dataset.id
                        );


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


// ======================================================
// REPORT FORM
// ======================================================

function setupReportForm() {

    const form =
        document.getElementById("reportForm");

    if (!form) return;


    const photo =
        document.getElementById("photo");

    const preview =
        document.getElementById("preview");

    const uploadText =
        document.getElementById("uploadText");


    // ==================================================
    // PHOTO PREVIEW
    // ==================================================

    photo.onchange = () => {

        const file = photo.files[0];

        if (!file) return;


        const reader =
            new FileReader();


        reader.onload = event => {

            preview.src =
                event.target.result;

            preview.style.display =
                "block";

            uploadText.style.display =
                "none";
        };


        reader.readAsDataURL(file);
    };


    // ==================================================
    // FORM SUBMISSION
    // ==================================================

    form.onsubmit = event => {

        event.preventDefault();


        const manualLocation =
            form.querySelector(
                '[name="location"]'
            ).value.trim();


        const city =
            form.querySelector(
                '[name="city"]'
            ).value.trim();


        const pin =
            form.querySelector(
                '[name="pin"]'
            ).value.trim();


        const latitude =
            document.getElementById(
                "latitude"
            ).value;


        const longitude =
            document.getElementById(
                "longitude"
            ).value;


        // ==============================================
        // CHECK LOCATION
        // ==============================================

        const hasGPS =
            latitude && longitude;


        const hasManualLocation =
            manualLocation &&
            city &&
            pin;


        // User must provide either GPS
        // OR complete manual location

        if (!hasGPS && !hasManualLocation) {

            alert(
                "Please either enter the complete location manually or use your current GPS location."
            );

            return;
        }


        // ==============================================
        // CREATE FORM DATA
        // ==============================================

        const formData =
            new FormData(form);


        // ==============================================
        // GENERATE COMPLAINT ID
        // ==============================================

        const id =
            "RN-" +
            new Date().getFullYear() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();


        // ==============================================
        // CREATE REPORT
        // ==============================================

        const report = {

    id: id,

    type:
        formData.get("type"),

    severity:
        formData.get("severity"),

    priority:
        getPriority(formData.get("severity")),

    confirmations: 1,

    location:
        manualLocation ||
        "GPS Location",

    city:
        city ||
        "Location detected by GPS",

    pin:
        pin || "",

    description:
        formData.get("description"),

    latitude:
        latitude || "",

    longitude:
        longitude || "",

    status:
        "Pending",

    date:
        new Date()
            .toISOString()
            .slice(0, 10)
};


        // ==============================================
        // SAVE REPORT
        // ==============================================

        const data =
            reports();


        data.unshift(report);


        save(data);


        // ==============================================
        // SUCCESS
        // ==============================================

        alert(
            "Report submitted successfully!\nComplaint ID: " +
            id
        );


        window.location.href =
            "track.html?id=" + id;
    };
}


// ======================================================
// GPS LOCATION
// ======================================================

function setupGPS() {

    const getLocationBtn =
        document.getElementById(
            "getLocationBtn"
        );

    const locationStatus =
        document.getElementById(
            "locationStatus"
        );

    const latitudeInput =
        document.getElementById(
            "latitude"
        );

    const longitudeInput =
        document.getElementById(
            "longitude"
        );


    if (!getLocationBtn) return;


    getLocationBtn.addEventListener(
        "click",
        function () {


            // Browser support
            if (!navigator.geolocation) {

                locationStatus.textContent =
                    "❌ Location services are not supported by your browser.";

                return;
            }


            locationStatus.textContent =
                "📍 Getting your current location...";


            getLocationBtn.disabled =
                true;


            navigator.geolocation.getCurrentPosition(


                // ======================================
                // SUCCESS
                // ======================================

                function(position) {

                    const latitude =
                        position.coords.latitude;

                    const longitude =
                        position.coords.longitude;


                    latitudeInput.value =
                        latitude;

                    longitudeInput.value =
                        longitude;


                    locationStatus.textContent =
                        `✅ Location captured: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;


                    getLocationBtn.textContent =
                        "📍 Location Captured";


                    getLocationBtn.disabled =
                        false;
                },


                // ======================================
                // ERROR
                // ======================================

                function(error) {

                    getLocationBtn.disabled =
                        false;


                    switch (error.code) {

                        case error.PERMISSION_DENIED:

                            locationStatus.textContent =
                                "❌ Location permission was denied.";

                            break;


                        case error.POSITION_UNAVAILABLE:

                            locationStatus.textContent =
                                "❌ Your location could not be determined.";

                            break;


                        case error.TIMEOUT:

                            locationStatus.textContent =
                                "❌ Location request timed out. Please try again.";

                            break;


                        default:

                            locationStatus.textContent =
                                "❌ Unable to get your location.";
                    }
                },


                // ======================================
                // SETTINGS
                // ======================================

                {
                    enableHighAccuracy: true,
                    timeout: 30000,
                    maximumAge: 0
                }
            );
        }
    );
}


// ======================================================
// TRACKER
// ======================================================

function setupTracker() {

    const form =
        document.getElementById(
            "trackForm"
        );

    const result =
        document.getElementById(
            "trackResult"
        );


    if (!form) return;


    function track(id) {

        const item =
            reports().find(
                report =>
                    report.id
                        .toLowerCase() ===
                    id.trim().toLowerCase()
            );


        if (!item) {

            result.innerHTML =
                `<div class="empty">
                    Complaint ID not found. Please try again.
                </div>`;

            return;
        }


        const currentStep =
            statuses.indexOf(
                item.status
            );


        result.innerHTML = `

            <section class="card track-card">

                <p class="id">
                    ${item.id}
                </p>

                <h2>
                    ${item.type}
                </h2>

                <p class="muted">
    ${item.location},
    ${item.city}
</p>

${
    item.latitude && item.longitude
    ? `
        <a
            href="https://www.google.com/maps?q=${item.latitude},${item.longitude}"
            target="_blank"
            rel="noopener noreferrer"
            class="map-link"
        >
            📍 View exact location on Google Maps
        </a>
      `
    : ""
}

                <p>
                    ${tag(item.status)}
                    ${tag(item.severity)}
                </p>


                <div class="progress">

                    ${statuses.map(
                        (status, index) => `

                        <div
                            class="${index <= currentStep ? "done" : ""}"
                        >

                            <i></i>

                            ${status}

                        </div>

                    `).join("")}

                </div>


                <p class="small">

                    Reported on ${item.date}

                    <br>

                    ${item.description}

                </p>

            </section>
        `;
    }


    form.onsubmit =
        event => {

            event.preventDefault();

            track(
                document.getElementById(
                    "trackId"
                ).value
            );
        };


    const id =
        new URLSearchParams(
            window.location.search
        ).get("id");


    if (id) {

        document.getElementById(
            "trackId"
        ).value = id;

        track(id);
    }
}


// ======================================================
// DASHBOARD
// ======================================================

function dashboard() {

    const cards =
        document.getElementById(
            "dashCards"
        );


    if (!cards) return;


    function count(status) {

        return reports()
            .filter(
                item =>
                    item.status === status
            )
            .length;
    }


    function draw() {

    const data =
        reports();

    // Sort reports by priority
    const priorityOrder = {
        "Critical": 3,
        "High": 2,
        "Normal": 1
    };

    const sortedData = [...data].sort(
        (a, b) =>
            (priorityOrder[b.priority || getPriority(b.severity, b.confirmations || 1)] || 0) -
            (priorityOrder[a.priority || getPriority(a.severity, a.confirmations || 1)] || 0)
    );


        cards.innerHTML = `

            <article>
                <p>Total reports</p>
                <b>${data.length}</b>
            </article>

            <article>
                <p>Pending</p>
                <b>${count("Pending")}</b>
            </article>

            <article>
                <p>In progress</p>
                <b>
                    ${count("Under Inspection") +
                    count("Work Started")}
                </b>
            </article>

            <article>
                <p>Resolved</p>
                <b>
                    ${count("Completed")}
                </b>
            </article>
        `;
          const priorityCount = {
    Critical: data.filter(
        item => (item.priority || getPriority(item.severity, item.confirmations || 1)) === "Critical"
    ).length,

    High: data.filter(
        item => (item.priority || getPriority(item.severity, item.confirmations || 1)) === "High"
    ).length,

    Normal: data.filter(
        item => (item.priority || getPriority(item.severity, item.confirmations || 1)) === "Normal"
    ).length
};

const priorityBox =
    document.getElementById("priorityOverview");

if (priorityBox) {

    priorityBox.innerHTML = `
        <div class="priority-item critical">
            <strong>${priorityCount.Critical}</strong>
            <span>Critical</span>
            <small>Immediate attention</small>
        </div>

        <div class="priority-item high">
            <strong>${priorityCount.High}</strong>
            <span>High</span>
            <small>Needs attention</small>
        </div>

        <div class="priority-item normal">
            <strong>${priorityCount.Normal}</strong>
            <span>Normal</span>
            <small>Routine monitoring</small>
        </div>
    `;
}

        document.getElementById(
            "bars"
        ).innerHTML =

            statuses.map(
                status => {

                    const number =
                        count(status);


                    const width =
                        data.length
                            ? (number / data.length) * 100
                            : 0;


                    return `

                        <div class="bar-row">

                            <span>
                                ${status}
                            </span>

                            <div class="bar">
                                <i
                                    style="width:${width}%"
                                ></i>
                            </div>

                            <b>
                                ${number}
                            </b>

                        </div>
                    `;
                }
            ).join("");


        document.getElementById(
            "recent"
        ).innerHTML =

            sortedData
                .slice(0, 4)
                .map(
                    item => `

                    <div class="recent">

                        <b>
                            ${item.type}
                            ·
                            ${item.location}
                        </b>

                        <br>

                        <span class="small">

                            ${item.id}
                            ·
                            ${item.status}

                        </span>

                    </div>
                `
                )
                .join("");
    }


    draw();


    document.getElementById(
        "reset"
    ).onclick = () => {

        localStorage.removeItem(
            KEY
        );

        draw();
    };
}


// ======================================================
// LOGIN
// ======================================================

function setupLogin() {

    const form =
        document.getElementById(
            "loginForm"
        );


    if (!form) return;


    if (isAdmin()) {

        window.location.href =
            "complaints.html";
    }


    form.onsubmit =
        event => {

            event.preventDefault();


            const username =
                document.getElementById(
                    "username"
                ).value.trim();


            const password =
                document.getElementById(
                    "password"
                ).value;


            const error =
                document.getElementById(
                    "loginError"
                );


            if (
                username === ADMIN_USERNAME &&
                password === ADMIN_PASSWORD
            ) {

                sessionStorage.setItem(
                    ADMIN_KEY,
                    "true"
                );


                window.location.href =
                    "complaints.html";

            } else {

                error.textContent =
                    "Incorrect username or password.";
            }
        };
}


// ======================================================
// INITIALIZE
// ======================================================

updateHome();

renderComplaints();

setupReportForm();

setupGPS();

setupTracker();

dashboard();

setupLogin();