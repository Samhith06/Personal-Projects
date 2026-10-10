from db_connections import get_sqlite_connection
from performance_reviewer import get_performance_reviews_for_employee

def generate_employee_project_report():
    """Combines Employees, Projects, and Assignments using a SQL JOIN."""
    conn = get_sqlite_connection()
    query = '''
        SELECT e.first_name || ' ' || e.last_name AS full_name, 
               p.project_name, ep.role, ep.assignment_date
        FROM Employees e
        JOIN EmployeeProjects ep ON e.employee_id = ep.employee_id
        JOIN Projects p ON ep.project_id = p.project_id
    '''
    results = conn.execute(query).fetchall()
    if results is None:
        print("No employee-project assignments found.")
        return
    conn.close()

    print("\n--- 📋 Employee-Project Assignment Report ---")
    print(f"{'Employee Name':<20} | {'Project Name':<20} | {'Role':<15} | {'Date'}")
    print("-" * 75)
    for row in results:
        print(f"{row['full_name']:<20} | {row['project_name']:<20} | {row['role']:<15} | {row['assignment_date']}")

def generate_employee_performance_summary(employee_id):
    """Fetches details from SQL and summarizes Atlas performance reviews."""
    # 1. Get Name from SQL
    conn = get_sqlite_connection()
    emp = conn.execute("SELECT first_name, last_name FROM Employees WHERE employee_id = ?", (employee_id,)).fetchone()
    conn.close()

    if not emp:
        print(f"No employee found with ID {employee_id}")
        return

    # 2. Get Reviews from Atlas
    reviews = get_performance_reviews_for_employee(employee_id)
    
    print(f"Performance Summary for {emp['first_name']} {emp['last_name']}")
    if not reviews:
        print("No reviews found in Atlas for this employee.")
        return

    # Calculate Average Rating
    ratings = [r['overall_rating'] for r in reviews]
    avg_rating = sum(ratings) / len(ratings)

    print(f"Total Reviews: {len(reviews)}")
    print(f"Average Rating: {avg_rating:.2f} / 5")
    print("\nRecent Feedback Highlights:")
    for r in reviews[-2:]:  # Show last two reviews
        print(f"- Strengths: {r['strengths']}")
        print(f"- Areas to Improve: {r['areas_for_improvement']}")