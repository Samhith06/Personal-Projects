from db_connections import get_mongodb_client
from datetime import datetime

def submit_performance_review(employee_id, reviewer_name, rating, strengths, areas, comments, goals):
    """Inserts a new review document into the Atlas 'reviews' collection."""
    db = get_mongodb_client()
    if db is None:
        print("Could not connect to Atlas. Review not saved.")
        return
    
    # Selecting the collection explicitly as per your requirement
    collection = db['reviews']

    review_document = {
        "employee_id": int(employee_id),  # Linked to SQLite Primary Key
        "review_date": datetime.now().strftime("%Y-%m-%d"),
        "reviewer_name": reviewer_name,
        "overall_rating": rating,
        "strengths": strengths,
        "areas_for_improvement": areas,
        "comments": comments,
        "goals_for_next_period": goals
    }

    try:
        result = collection.insert_one(review_document)
        print(f"Review successfully pushed to Atlas! Document ID: {result.inserted_id}")
    except Exception as e:
        print(f"Failed to insert review into Atlas: {e}")

def get_performance_reviews_for_employee(employee_id):
    """Retrieves all reviews from Atlas for a specific employee."""
    db = get_mongodb_client()
    if db is None:
        return []
    
    collection = db['reviews']
    
    # We use .find() to get all documents matching the employee_id
    reviews = list(collection.find({"employee_id": int(employee_id)}))
    return reviews