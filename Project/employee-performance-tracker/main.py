import sys
from db_connections import init_sql_databases
import employee_manager as em
import project_manager as pm
import performance_reviewer as pr
import reports

def menu():
    init_sql_databases() # Ensure tables exist on startup
    
    while True:
        print("\n=== 🏢 Employee Performance System ===")
        print("1. Add Employee")
        print("2. Add Project")
        print("3. Assign Employee to Project")
        print("4. Submit Performance Review (Atlas)")
        print("5. View Employee Projects")
        print("6. View Employee Performance Summary")
        print("7. Generate All-Project Report")
        print("8. Exit")
        
        choice = input("\nSelect an option (1-8): ").strip()

        if choice == '1':
            fn = input("First Name: ")
            ln = input("Last Name: ")
            eml = input("Email: ")
            hd = input("Hire Date (YYYY-MM-DD): ")
            dept = input("Department: ")
            em.add_employee(fn, ln, eml, hd, dept)

        elif choice == '2':
            name = input("Project Name: ")
            sd = input("Start Date: ")
            pm.add_project(name, sd)

        elif choice == '3':
            eid = input("Employee ID: ")
            pid = input("Project ID: ")
            role = input("Role: ")
            pm.assign_employee_to_project(eid, pid, role)

        elif choice == '4':
            eid = input("Employee ID: ")
            rev = input("Reviewer Name: ")
            rat = int(input("Rating (1-5): "))
            strn = input("Strengths: ")
            area = input("Areas for Improvement: ")
            comm = input("Comments: ")
            goal = input("Goals: ")
            pr.submit_performance_review(eid, rev, rat, strn, area, comm, goal)

        elif choice == '5':
            eid = input("Enter Employee ID: ")
            projs = pm.get_projects_for_employee(eid)
            for p in projs:
                print(f"- {p['project_name']} (Role: {p['role']})")

        elif choice == '6':
            eid = input("Enter Employee ID: ")
            reports.generate_employee_performance_summary(eid)

        elif choice == '7':
            reports.generate_employee_project_report()

        elif choice == '8':
            print("Goodbye!")
            sys.exit()
        else:
            print("Invalid choice, try again.")

if __name__ == "__main__":
    menu()