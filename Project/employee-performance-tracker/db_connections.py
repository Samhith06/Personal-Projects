import sqlite3
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

DB_CONNECTION = os.getenv("DB_CONNECTION")  # Default to SQLite if not specified

# Configurations
Database_folder = "database"
SQLITE_DB_PATH = os.path.join(Database_folder, "company.db")
MONGO_URI = DB_CONNECTION if DB_CONNECTION else "mongodb://127.0.0.1:27017/"

def get_sqlite_connection():
    """Establishes a connection to the SQLite database."""
    os.makedirs("database", exist_ok=True) # Ensuring the data folder exists
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row  # Accessing columns by name
    return conn

def init_sql_databases():
    """Creates the Employees, Projects, and EmployeeProjects tables if they don't exist."""
    conn = get_sqlite_connection()
    cursor = conn.cursor()

    # 1. Employees Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Employees (
            employee_id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            hire_date TEXT NOT NULL,
            department TEXT NOT NULL
        )
    ''')

    # 2. Projects Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Projects (
            project_id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_name TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT,
            status TEXT DEFAULT 'Planning'
        )
    ''')

    # 3. EmployeeProjects Junction Table (The Relationship)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS EmployeeProjects (
            assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            project_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            assignment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES Employees (employee_id),
            FOREIGN KEY (project_id) REFERENCES Projects (project_id)
        )
    ''')

    conn.commit()
    conn.close()
    print("SQL Databases initialized successfully!")

def get_mongodb_client():
    """Establishes a connection to MongoDB."""
    try:
        client = MongoClient(MONGO_URI)
        db = client['performance_reviews_db']
        return db
    except Exception as e:
        print(f"MongoDB Connection Error: {e}")
        return None

if __name__ == "__main__":
    init_sql_databases()
    print("Database setup completed!")