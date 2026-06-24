from fastapi import APIRouter
from database import users
from models import LoginUser

router = APIRouter()
ADMIN_EMAILS = [
    "2315022@nec.edu.in"
]


@router.post("/login")
def login(user: LoginUser):

    existing = users.find_one(
        {"email": user.email}
    )

    if existing:
        role = "admin" if user.email in ADMIN_EMAILS else existing.get("role", "citizen")
        users.update_one(
            {"email": user.email},
            {"$set": {"name": user.name, "role": role}}
        )
    else:
        role = "admin" if user.email in ADMIN_EMAILS else "citizen"
        users.insert_one({
            "name": user.name,
            "email": user.email,
            "role": role
        })

    return {
        "message": "Login Successful",
        "role": role
    }