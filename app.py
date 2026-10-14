import os
import sqlite3
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "game-rental-secret-devops-key")

# Database path strictly set to data/game_rental.db
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_FILE = os.environ.get("DB_PATH", os.path.join(BASE_DIR, "data", "game_rental.db"))


def get_db_connection():
    """Create and return a database connection with Row factory."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Ensure data directory and database tables exist."""
    db_dir = os.path.dirname(DB_FILE)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

    conn = get_db_connection()
    cursor = conn.cursor()

    # Table for rental requests
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rentals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            contact TEXT NOT NULL,
            game_title TEXT NOT NULL,
            platform TEXT NOT NULL,
            rental_days INTEGER NOT NULL,
            priority TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Table for game inventory catalog
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            platform TEXT NOT NULL,
            genre TEXT NOT NULL,
            daily_rate REAL NOT NULL,
            available INTEGER DEFAULT 1
        )
    """)

    # Seed default games if table is empty
    cursor.execute("SELECT COUNT(*) FROM games")
    if cursor.fetchone()[0] == 0:
        sample_games = [
            ("Cyberpunk 2077: Phantom Liberty", "PC", "RPG / Sci-Fi", 4.99, 1),
            ("Elden Ring: Shadow of the Erdtree", "PlayStation 5", "Action RPG", 5.49, 1),
            ("The Legend of Zelda: Tears of the Kingdom", "Nintendo Switch", "Adventure", 4.49, 1),
            ("Marvel's Spider-Man 2", "PlayStation 5", "Action / Adventure", 4.99, 1),
            ("Forza Horizon 5", "Xbox Series X", "Racing", 3.99, 1),
            ("God of War Ragnarök", "PlayStation 5", "Action / Mythological", 4.99, 1),
            ("Halo Infinite", "Xbox Series X", "FPS / Sci-Fi", 3.49, 1),
            ("Super Mario Wonder", "Nintendo Switch", "Platformer", 3.99, 1)
        ]
        cursor.executemany("""
            INSERT INTO games (title, platform, genre, daily_rate, available)
            VALUES (?, ?, ?, ?, ?)
        """, sample_games)

    conn.commit()
    conn.close()


# Initialize database upon module load
init_db()


@app.route("/")
def index():
    """Home page: Displays system overview, featured games, and quick action cards."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM games ORDER BY id ASC")
    games = cursor.fetchall()

    cursor.execute("SELECT COUNT(*) FROM rentals")
    total_rentals = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM rentals WHERE status = 'Pending'")
    pending_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM rentals WHERE status IN ('Approved', 'Dispatched')")
    active_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM rentals WHERE status = 'Completed'")
    completed_count = cursor.fetchone()[0]

    conn.close()

    stats = {
        "total": total_rentals,
        "pending": pending_count,
        "active": active_count,
        "completed": completed_count
    }

    return render_template("index.html", games=games, stats=stats)


@app.route("/rent")
def rent():
    """Rental request page: User fills rental form."""
    selected_game = request.args.get("game", "")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT title, platform FROM games WHERE available = 1 ORDER BY title ASC")
    available_games = cursor.fetchall()
    conn.close()

    return render_template("rent.html", available_games=available_games, selected_game=selected_game)


@app.route("/submit_rental", methods=["POST"])
def submit_rental():
    """Handles submission of rental request with validation and parameterization."""
    customer_name = request.form.get("customer_name", "").strip()
    contact = request.form.get("contact", "").strip()
    game_title = request.form.get("game_title", "").strip()
    platform = request.form.get("platform", "").strip()
    rental_days_raw = request.form.get("rental_days", "").strip()
    priority = request.form.get("priority", "Standard").strip()

    # Input validation
    if not customer_name or not contact or not game_title or not platform or not rental_days_raw:
        flash("All fields are required. Please check your inputs.", "error")
        return redirect(url_for("rent"))

    try:
        rental_days = int(rental_days_raw)
        if rental_days <= 0 or rental_days > 90:
            flash("Rental duration must be between 1 and 90 days.", "error")
            return redirect(url_for("rent"))
    except ValueError:
        flash("Invalid rental duration specified.", "error")
        return redirect(url_for("rent"))

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO rentals (customer_name, contact, game_title, platform, rental_days, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, 'Pending')
    """, (customer_name, contact, game_title, platform, rental_days, priority))

    rental_id = cursor.lastrowid
    conn.commit()
    conn.close()

    flash(f"Rental request submitted successfully! Your Tracking ID is #{rental_id}.", "success")
    return redirect(url_for("track", id=rental_id))


@app.route("/track")
def track():
    """Track rental request status by ID."""
    rental_id = request.args.get("id", "").strip()
    rental = None
    not_found = False

    if rental_id:
        try:
            r_id = int(rental_id)
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM rentals WHERE id = ?", (r_id,))
            rental = cursor.fetchone()
            conn.close()

            if not rental:
                not_found = True
        except ValueError:
            not_found = True

    return render_template("track.html", rental=rental, rental_id=rental_id, not_found=not_found)


@app.route("/admin")
def admin():
    """Admin Dashboard: displays KPI summary cards, full rental requests list, and status update options."""
    status_filter = request.args.get("filter", "all")

    conn = get_db_connection()
    cursor = conn.cursor()

    # Summary counts
    cursor.execute("SELECT COUNT(*) FROM rentals")
    total_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM rentals WHERE status = 'Pending'")
    pending_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM rentals WHERE status IN ('Approved', 'Dispatched')")
    active_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM rentals WHERE status = 'Completed'")
    completed_count = cursor.fetchone()[0]

    # Filtered query
    if status_filter in ["Pending", "Approved", "Dispatched", "Completed"]:
        cursor.execute("SELECT * FROM rentals WHERE status = ? ORDER BY id DESC", (status_filter,))
    else:
        cursor.execute("SELECT * FROM rentals ORDER BY id DESC")
    rentals = cursor.fetchall()

    conn.close()

    summary = {
        "total": total_count,
        "pending": pending_count,
        "active": active_count,
        "completed": completed_count,
        "current_filter": status_filter
    }

    return render_template("admin.html", rentals=rentals, summary=summary)


@app.route("/update_status", methods=["POST"])
def update_status():
    """Admin action: Updates the workflow status of a rental request."""
    rental_id_raw = request.form.get("rental_id", "").strip()
    new_status = request.form.get("status", "").strip()

    valid_statuses = ["Pending", "Approved", "Dispatched", "Completed"]

    if not rental_id_raw or new_status not in valid_statuses:
        flash("Invalid status update request.", "error")
        return redirect(url_for("admin"))

    try:
        rental_id = int(rental_id_raw)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE rentals SET status = ? WHERE id = ?", (new_status, rental_id))
        conn.commit()
        conn.close()

        flash(f"Rental #{rental_id} status successfully updated to '{new_status}'.", "success")
    except Exception as e:
        flash(f"Error updating status: {str(e)}", "error")

    return redirect(url_for("admin"))


@app.route("/api/health")
def health_check():
    """Health check endpoint for Docker & CI/CD pipeline monitoring."""
    return jsonify({
        "status": "healthy",
        "service": "Game Rental Tracking System",
        "timestamp": datetime.utcnow().isoformat()
    }), 200


if __name__ == "__main__":
    # Flask listens on 0.0.0.0 and port 5000 inside Docker
    app.run(host="0.0.0.0", port=5000, debug=False)
