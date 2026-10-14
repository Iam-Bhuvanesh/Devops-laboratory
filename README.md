# Game Rental Tracking System

[![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/downloads/)
[![Flask 3.0](https://img.shields.io/badge/flask-3.0.3-black.svg)](https://flask.palletsprojects.com/)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED.svg)](https://www.docker.com/)
[![Pytest](https://img.shields.io/badge/pytest-passing-brightgreen.svg)](https://pytest.org/)
[![Ansible](https://img.shields.io/badge/ansible-automated-EE0000.svg)](https://www.ansible.com/)
[![Jenkins](https://img.shields.io/badge/jenkins-CI%2FCD-D24939.svg)](https://www.jenkins.io/)

A complete, production-grade DevOps laboratory project built using Python Flask, SQLite, Docker, Pytest, Jenkins CI/CD, and Ansible automation.

---

## 1. Project Overview

The **Game Rental Tracking System** is a responsive web application that enables users to browse a catalog of video games across multiple platforms (PC, PlayStation 5, Xbox Series X, Nintendo Switch), submit rental requests with customized delivery priorities, and track fulfillment status in real time.

For administrators, the system provides a centralized operations dashboard displaying key performance indicators (KPIs), an interactive request table, and one-click status transitions (`Pending` &rarr; `Approved` &rarr; `Dispatched` &rarr; `Completed`).

Crucially, the project is designed from the ground up for a **College DevOps Laboratory Demonstration**, illustrating end-to-end continuous integration and continuous deployment (CI/CD) pipelines, automated containerized testing, infrastructure automation, and container data persistence.

---

## 2. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, CSS3 (Modern responsive dark theme, glassmorphism), Vanilla JavaScript |
| **Backend** | Python 3.11, Flask 3.0.3 |
| **Database** | SQLite 3 (`data/game_rental.db`) with parameterized queries |
| **Testing** | Pytest (automated test suite) |
| **Containerization** | Docker, Dockerfile (`python:3.11-slim`), Docker Volumes |
| **CI/CD** | Jenkins Declarative Pipeline (`Jenkinsfile`) |
| **Configuration / Deployment** | Ansible (`community.docker.docker_container`, `game-deploy.yml`) |

---

## 3. Project Architecture & Workflows

### 3.1 Application Flow (Runtime User Flow)
```
Customer
   │
   ▼
Open Website (/)
   │
   ▼
Browse Games & Click "Rent Game" (/rent)
   │
   ▼
Select Game, Platform, Duration, Priority
   │
   ▼
Submit Request (POST /submit_rental)
   │
   ▼
Flask Backend (Input validation & parameterized SQL)
   │
   ▼
SQLite Database (Stored in data/game_rental.db)
   │
   ▼
Tracking ID Generated (#1, #2...)
   │
   ▼
Customer Tracks Live Status (/track?id=...)
   │
   ▼
Admin Updates Status (/admin -> POST /update_status)
[ Pending  ──►  Approved  ──►  Dispatched  ──►  Completed ]
```

> **Note for Viva:** Submitting a rental request modifies the SQLite database at runtime and does **NOT** trigger Jenkins. Runtime application traffic is strictly isolated from CI/CD pipeline events.

---

### 3.2 DevOps CI/CD Flow (Deployment Pipeline)
```
Developer (Code Commit)
   │
   ▼
Git Push to GitHub
   │
   ▼
Jenkins Webhook / Poll Trigger
   │
   ▼
Stage 1: Build Docker Image
(docker build -t game-rental-ci .)
   │
   ▼
Stage 2: Run Automated Pytest
(docker run --rm game-rental-ci python -m pytest test_app.py)
   │
   ▼
Stage 3: Deploy with Ansible
(docker exec ansible-docker-lab ansible-playbook -i /inventory.ini /game-deploy.yml)
   │
   ▼
Docker Container (game-rental-ansible)
Port 5002:5000 | Restart: unless-stopped
   │
   ▼
Persistent Docker Volume (game_rental_data mounted to /app/data)
   │
   ▼
Persistent SQLite Database (/app/data/game_rental.db)
```

---

## 4. Project Structure

```
Devops-proj/
│
├── app.py                  # Main Flask application and database logic
├── requirements.txt        # Python package dependencies
├── Dockerfile              # Docker image build specification
├── Jenkinsfile             # Declarative Jenkins CI/CD pipeline
├── test_app.py             # Pytest automated test suite (9 test cases)
├── game-deploy.yml         # Ansible deployment playbook
├── waste-deploy.yml        # Ansible deployment playbook (lab alias)
├── inventory.ini           # Sample Ansible inventory
├── .gitignore              # Git ignore rules for DB and cache files
├── README.md               # Project documentation and lab guide
│
├── templates/              # Jinja2 HTML templates
│   ├── base.html           # Reusable base layout with navbar & footer
│   ├── index.html          # Home landing page with game catalog & KPI stats
│   ├── rent.html           # Rental submission form with validation
│   ├── track.html          # Visual status tracker & timeline
│   └── admin.html          # Admin dashboard with KPI cards and table
│
├── static/                 # Static web assets
│   ├── style.css           # Modern CSS styling with dark palette
│   └── script.js           # Client-side dynamic interactivity
│
└── data/
    └── .gitkeep            # Ensures data directory is tracked in Git
```

---

## 5. Quickstart Guide

### 5.1 Run Locally (Without Docker)

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd Devops-proj
   ```

2. **Create and activate a virtual environment (optional but recommended):**
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Flask application:**
   ```bash
   python app.py
   ```

5. **Open in browser:**
   - Home: `http://localhost:5000`
   - Rent Game: `http://localhost:5000/rent`
   - Track Order: `http://localhost:5000/track`
   - Admin Dashboard: `http://localhost:5000/admin`

---

### 5.2 Run Automated Tests (Pytest)

Run the test suite using:
```bash
python -m pytest test_app.py -v
```

**Expected output:**
```
test_app.py::test_app_starts PASSED
test_app.py::test_home_page_status_code PASSED
test_app.py::test_rent_page_status_code PASSED
test_app.py::test_track_page_status_code PASSED
test_app.py::test_submit_rental_request PASSED
test_app.py::test_track_existing_rental PASSED
test_app.py::test_admin_page_status_code_and_records PASSED
test_app.py::test_update_status_workflow PASSED
test_app.py::test_health_check_api PASSED

9 passed in 0.87s
```

---

### 5.3 Build and Run with Docker

#### Step 1: Build the Docker Image
```bash
docker build -t game-rental-ci .
```

#### Step 2: Run Tests inside the Docker Container
```bash
docker run --rm game-rental-ci python -m pytest test_app.py
```

#### Step 3: Run the Container with Persistent Docker Volume
```bash
docker run -d \
  --name game-rental-ansible \
  -p 5002:5000 \
  -v game_rental_data:/app/data \
  --restart unless-stopped \
  game-rental-ci
```

Access the application on: `http://localhost:5002`

---

### 5.4 Deploy with Ansible

Execute the deployment playbook using Ansible:
```bash
ansible-playbook -i inventory.ini game-deploy.yml
```

Inside an Ansible lab container (`ansible-docker-lab`):
```bash
docker exec ansible-docker-lab ansible-playbook -i /inventory.ini /game-deploy.yml
```

---

## 6. How Docker Volume Provides Data Persistence

By default, data created inside a container is written to a writable container layer. When a container is deleted (`docker rm`), that data is lost permanently.

In this project, the SQLite database is stored at `/app/data/game_rental.db`.
When running the container, we bind a named Docker volume `game_rental_data` to `/app/data`:
```
-v game_rental_data:/app/data
```

### Demonstration Steps for Viva / Examiner:
1. Submit a rental request in the browser (e.g., ID #1).
2. Stop and delete the container:
   ```bash
   docker stop game-rental-ansible
   docker rm game-rental-ansible
   ```
3. Re-launch a brand new container with the same volume:
   ```bash
   docker run -d --name game-rental-ansible -p 5002:5000 -v game_rental_data:/app/data game-rental-ci
   ```
4. Refresh `http://localhost:5002/track?id=1` or `http://localhost:5002/admin`.
5. **Result:** The rental record remains completely intact!

---

## 7. Jenkins CI/CD Pipeline Explanation

The `Jenkinsfile` defines a 3-stage Declarative Pipeline:

1. **Stage 1: Build**
   - Commands: `docker build -t game-rental-ci .`
   - Purpose: Packages the source code, requirements, templates, and static assets into an immutable Docker image.

2. **Stage 2: Test**
   - Commands: `docker run --rm game-rental-ci python -m pytest test_app.py`
   - Purpose: Executes the automated test suite within an ephemeral container. If any test fails, the pipeline halts immediately, preventing broken code from deploying.

3. **Stage 3: Deploy with Ansible**
   - Commands:
     ```bash
     docker exec ansible-docker-lab \
       ansible-playbook \
       -i /inventory.ini \
       /game-deploy.yml
     ```
   - Purpose: Uses Ansible's idempotent `community.docker.docker_container` module to deploy or update the container without manual intervention.

4. **Post-execution Notifications:**
   - **Success:** `SUCCESS: Game Rental CI/CD Pipeline Completed Successfully!`
   - **Failure:** `FAILURE: Game Rental CI/CD Pipeline Failed!`

---

## 8. College Viva / Interview Questions & Answers

### Q1: Why use SQLite instead of MySQL or PostgreSQL for this project?
**Answer:** SQLite is serverless, zero-configuration, and stores data in a single file (`data/game_rental.db`). This makes it lightweight, portable, fast for demonstration, and ideal for showing Docker Volume persistence without needing a separate database container.

### Q2: Why is the database stored in `data/game_rental.db` rather than the root directory?
**Answer:** Placing the database in a dedicated `data/` subdirectory allows us to mount a Docker volume specifically to `/app/data` without overwriting the application code (`app.py`, `templates/`, etc.) located in `/app`.

### Q3: What is the difference between Application Workflow and CI/CD Workflow?
**Answer:**
- **Application Workflow** is triggered by end users (submitting rentals, updating status). It runs directly inside Flask and reads/writes to SQLite.
- **CI/CD Workflow** is triggered by developers (pushing code to Git/GitHub). Jenkins picks up the commit, builds the Docker image, runs Pytest, and invokes Ansible to deploy the container.

### Q4: What makes Ansible deployment better than plain `docker run` commands?
**Answer:** Ansible provides **idempotency**. If the container is already running with the desired configuration, Ansible does not redundantly recreate it. It also manages state declaratively across environments via inventory files.

---

## 9. License & Academic Integrity
Developed as a DevOps Laboratory demonstration project. Designed for educational use and technical presentation.
