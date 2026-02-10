# users/utils/general_utils.py
import csv
import random
import string
import logging
from typing import List, Dict
from django.http import HttpResponse

logger = logging.getLogger(__name__)

# -------------------------
# RANDOM PASSWORD GENERATOR
# -------------------------
def generate_random_password(length: int = 12) -> str:
    """
    Generate a secure random password with at least one lowercase, uppercase, digit, and special character.
    """
    if length < 4:
        raise ValueError("Password length must be at least 4 characters.")
    
    # Ensure at least one of each required character type
    chars = {
        "lower": random.choice(string.ascii_lowercase),
        "upper": random.choice(string.ascii_uppercase),
        "digit": random.choice(string.digits),
        "special": random.choice("@$!%*?&"),
    }
    
    # Fill remaining length with random characters
    remaining = [random.choice(string.ascii_letters + string.digits + "@$!%*?&") for _ in range(length - 4)]
    password_list = list(chars.values()) + remaining
    random.shuffle(password_list)
    return "".join(password_list)


# -------------------------
# CSV EXPORT
# -------------------------
def export_students_to_csv(students: List[Dict[str, str]]) -> HttpResponse:
    """
    Export a list of student dictionaries to CSV.
    Each dict must contain keys: roll_number, email, password.
    """
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="created_students.csv"'
    writer = csv.writer(response)
    writer.writerow(["Roll Number", "Email", "Password"])
    
    for student in students:
        writer.writerow([
            student.get("roll_number", ""),
            student.get("email", ""),
            student.get("password", "")
        ])
    
    return response


# -------------------------
# USER SERIALIZATION
# -------------------------
def serialize_user(user) -> Dict[str, object]:
    """
    Generic user serializer for API responses.
    Can be used across the project wherever a lightweight user dict is needed.
    """
    return {
        "id": getattr(user, "id", None),
        "username": getattr(user, "username", ""),
        "email": getattr(user, "email", ""),
        "first_time_login": getattr(user, "first_time_login", False),
        "need_password_reset": getattr(user, "need_password_reset", False),
    }
