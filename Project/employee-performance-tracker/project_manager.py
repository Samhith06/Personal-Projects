from db_connections import get_sqlite_connection

def add_project(project_name, start_date, end_date=None, status='Planning'):
    conn = get_sqlite_connection()
    query = "INSERT INTO Projects (project_name, start_date, end_date, status) VALUES (?, ?, ?, ?)"
    conn.execute(query, (project_name, start_date, end_date, status))
    conn.commit()
    conn.close()
    print(f"Project '{project_name}' created.")

def assign_employee_to_project(employee_id, project_id, role):
    conn = get_sqlite_connection()
    try:
        query = "INSERT INTO EmployeeProjects (employee_id, project_id, role) VALUES (?, ?, ?)"
        conn.execute(query, (employee_id, project_id, role))
        conn.commit()
        print(f"Assigned Employee {employee_id} to Project {project_id} as {role}.")
    except Exception as e:
        print(f"Error during assignment: {e}")
    finally:
        conn.close()

def get_projects_for_employee(employee_id):
    conn = get_sqlite_connection()
    # SQL JOIN to get project names based on assignments
    query = '''
        SELECT p.project_name, ep.role, p.status
        FROM Projects p
        JOIN EmployeeProjects ep ON p.project_id = ep.project_id
        WHERE ep.employee_id = ?
    '''
    projects = conn.execute(query, (employee_id,)).fetchall()
    conn.close()
    return projects