# RoadNetra

RoadNetra is a full-stack road-damage reporting platform.

Citizens can report potholes, cracked roads, waterlogging, and other road problems. Each report receives a complaint ID for tracking. Municipal administrators can sign in to update complaint statuses.

## Features

- Report road damage with manual location or GPS
- Complaint ID generation and tracking
- Search and filter reports
- Citizen confirmations and priority calculation
- Dashboard statistics
- Admin login for protected status updates
- Backend API and persistent JSON data store

## Technology

- HTML, CSS, JavaScript
- Node.js and Express
- JSON file storage

## Run locally

1. Install Node.js.
2. Open the project folder in VS Code.
3. Run:

```powershell
npm install
npm start
```

4. Open [http://localhost:3000](http://localhost:3000).

## Admin login

```text
Username: roadnetra_admin
Password: rn_admin
```

For a different admin account, copy `.env.example` to `.env` and change the values.
