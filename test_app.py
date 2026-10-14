import os
import tempfile
import pytest
import sqlite3
import app as flask_app_module
from app import app, init_db


@pytest.fixture
def client(monkeypatch):
    """Set up an isolated test SQLite database and Flask test client."""
    # Create a temporary file for the test database
    db_fd, temp_db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)

    # Monkeypatch the DB_FILE in the app module
    monkeypatch.setattr(flask_app_module, "DB_FILE", temp_db_path)

    # Configure app for testing
    app.config["TESTING"] = True
    app.config["WTF_CSRF_ENABLED"] = False

    # Initialize tables and seed data in the temporary DB
    with app.app_context():
        init_db()

    with app.test_client() as client:
        yield client

    # Cleanup temporary test database file
    if os.path.exists(temp_db_path):
        try:
            os.remove(temp_db_path)
        except OSError:
            pass


def test_app_starts(client):
    """Test that the Flask application fixture initializes properly."""
    assert client is not None


def test_home_page_status_code(client):
    """Test that the home page ('/') loads successfully with HTTP 200."""
    response = client.get("/")
    assert response.status_code == 200
    assert b"Game Rental Tracking System" in response.data
    assert b"DevOps Laboratory Project" in response.data


def test_rent_page_status_code(client):
    """Test that the rental form page ('/rent') returns HTTP 200."""
    response = client.get("/rent")
    assert response.status_code == 200
    assert b"Rent a Game" in response.data
    assert b"Customer Name" in response.data or b"Full Name" in response.data


def test_track_page_status_code(client):
    """Test that the tracking page ('/track') returns HTTP 200."""
    response = client.get("/track")
    assert response.status_code == 200
    assert b"Track Your Rental" in response.data


def test_submit_rental_request(client):
    """Test submitting a rental request stores it in SQLite and redirects to track."""
    payload = {
        "customer_name": "Marcus Fenix",
        "contact": "marcus@gearsofwar.com",
        "game_title": "Halo Infinite",
        "platform": "Xbox Series X",
        "rental_days": "14",
        "priority": "Express"
    }

    response = client.post("/submit_rental", data=payload, follow_redirects=True)
    assert response.status_code == 200
    assert b"Rental request submitted successfully" in response.data
    assert b"Marcus Fenix" in response.data
    assert b"Halo Infinite" in response.data

    # Verify directly in SQLite database
    conn = sqlite3.connect(flask_app_module.DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rentals WHERE customer_name = ?", ("Marcus Fenix",))
    record = cursor.fetchone()
    conn.close()

    assert record is not None
    assert record["customer_name"] == "Marcus Fenix"
    assert record["game_title"] == "Halo Infinite"
    assert record["platform"] == "Xbox Series X"
    assert record["rental_days"] == 14
    assert record["priority"] == "Express"
    assert record["status"] == "Pending"


def test_track_existing_rental(client):
    """Test querying a valid rental ID on the tracking endpoint."""
    # First insert a record
    conn = sqlite3.connect(flask_app_module.DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO rentals (customer_name, contact, game_title, platform, rental_days, priority, status)
        VALUES ('Lara Croft', 'lara@tombraider.com', 'Cyberpunk 2077', 'PC', 5, 'Standard', 'Pending')
    """)
    conn.commit()
    rental_id = cursor.lastrowid
    conn.close()

    response = client.get(f"/track?id={rental_id}")
    assert response.status_code == 200
    assert b"Lara Croft" in response.data
    assert b"Pending" in response.data


def test_admin_page_status_code_and_records(client):
    """Test that the admin dashboard returns HTTP 200 and displays requests."""
    # Insert a record
    conn = sqlite3.connect(flask_app_module.DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO rentals (customer_name, contact, game_title, platform, rental_days, priority, status)
        VALUES ('Geralt of Rivia', 'geralt@kaermorhen.com', 'Elden Ring', 'PlayStation 5', 10, 'Standard', 'Pending')
    """)
    conn.commit()
    conn.close()

    response = client.get("/admin")
    assert response.status_code == 200
    assert b"Admin Dashboard" in response.data
    assert b"Geralt of Rivia" in response.data
    assert b"Total Requests" in response.data


def test_update_status_workflow(client):
    """Test updating the status of a rental via admin POST request."""
    # Insert initial pending record
    conn = sqlite3.connect(flask_app_module.DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO rentals (customer_name, contact, game_title, platform, rental_days, priority, status)
        VALUES ('Samus Aran', 'samus@metroid.org', 'Super Mario Wonder', 'Nintendo Switch', 3, 'Pickup', 'Pending')
    """)
    conn.commit()
    rental_id = cursor.lastrowid
    conn.close()

    # Update status to Approved
    response = client.post("/update_status", data={
        "rental_id": rental_id,
        "status": "Approved"
    }, follow_redirects=True)

    assert response.status_code == 200
    assert b"successfully updated" in response.data

    # Verify status in database
    conn = sqlite3.connect(flask_app_module.DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM rentals WHERE id = ?", (rental_id,))
    updated_status = cursor.fetchone()[0]
    conn.close()

    assert updated_status == "Approved"


def test_health_check_api(client):
    """Test /api/health endpoint used in DevOps container monitoring."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
