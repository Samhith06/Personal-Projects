from db_connections import get_sqlite_connection
import sqlite3

def add_employee(first_name, last_name, email, hire_date, department):
    conn = get_sqlite_connection()
    try:
        query = '''INSERT INTO Employees (first_name, last_name, email, hire_date, department)
                   VALUES (?, ?, ?, ?, ?)'''
        conn.execute(query, (first_name, last_name, email, hire_date, department))
        conn.commit()
        print(f"Success: {first_name} {last_name} onboarded.")
    except sqlite3.IntegrityError:
        print(f"Error: The email '{email}' is already assigned to an employee.")
    finally:
        conn.close()

def get_employee_by_id(employee_id):
    conn = get_sqlite_connection()
    employee = conn.execute("SELECT * FROM Employees WHERE employee_id = ?", (employee_id,)).fetchone()
    conn.close()
    return employee

def list_all_employees():
    conn = get_sqlite_connection()
    employees = conn.execute("SELECT * FROM Employees").fetchall()
    conn.close()
    return employees