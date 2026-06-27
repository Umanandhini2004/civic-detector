from datetime import datetime
import csv
import io

from fastapi import FastAPI, HTTPException, Depends, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from bson import ObjectId

from models import Complaint, ComplaintUpdate, UserRoleUpdate
from database import complaints, users
from utils import (
    detect_issue,
    get_sentiment,
    extract_area,
    get_priority,
    get_department,
    get_severity,
    get_issue_confidence,
    count_similar_complaints,
)

from auth import router as auth_router


app = FastAPI()

app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://civic-detector-dt88.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_current_user(
    x_user_email: str = Header(None, alias="X-User-Email"),
    x_user_role: str = Header(None, alias="X-User-Role"),
):
    if not x_user_email:
        raise HTTPException(
            status_code=401,
            detail="Missing user email header"
        )

    user = users.find_one({"email": x_user_email})

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Unknown user"
        )

    return {
        "email": user["email"],
        "name": user.get("name", ""),
        "role": user.get("role", "citizen")
    }


def serialize_complaint(c):
    return {
        "id": str(c.get("_id", "")),
        "text": c.get("text"),
        "issue": c.get("issue"),
        "sentiment": c.get("sentiment"),
        "confidence": c.get("confidence", "0.0%"),
        "priority": c.get("priority", "Low"),
        "severity": c.get("severity", "Low"),
        "department": c.get("department", "Municipal Corporation"),
        "area": c.get("area", "Unknown"),
        "status": c.get("status", "Pending"),
        "duplicate_count": c.get("duplicate_count", 0),
        "author_email": c.get("author_email"),
        "author_name": c.get("author_name"),
        "created_at": c.get("created_at"),
        "updated_at": c.get("updated_at"),
    }


@app.get("/")
def home():
    return {"message": "Civic Issue Detector Running"}


@app.post("/analyze")
def analyze(
    data: Complaint,
    current_user=Depends(get_current_user)
):

    issue = detect_issue(data.text)
    area = extract_area(data.text)
    sentiment = get_sentiment(data.text)
    priority = get_priority(issue)
    department = get_department(issue)
    severity = get_severity(data.text, issue)
    confidence = get_issue_confidence(data.text)
    similar_count = count_similar_complaints(
        data.text,
        [c.get("text", "") for c in complaints.find()],
        threshold=0.7,
    )

    document = {
        "text": data.text,
        "issue": issue,
        "sentiment": sentiment,
        "priority": priority,
        "department": department,
        "severity": severity,
        "confidence": confidence,
        "duplicate_count": similar_count,
        "area": area,
        "status": "Pending",
        "author_email": current_user["email"],
        "author_name": current_user["name"],
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

    result = complaints.insert_one(document)
    document["_id"] = result.inserted_id

    return serialize_complaint(document)


@app.get("/complaints")
def get_complaints(current_user=Depends(get_current_user)):
    query = {}
    if current_user["role"] != "admin":
        query["author_email"] = current_user["email"]

    return [serialize_complaint(c) for c in complaints.find(query)]


@app.put("/complaints/{complaint_id}")
def update_complaint(
    complaint_id: str,
    update: ComplaintUpdate,
    current_user=Depends(get_current_user)
):

    complaint = complaints.find_one(
        {"_id": ObjectId(complaint_id)}
    )

    if not complaint:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    if (
        complaint.get("author_email")
        != current_user["email"]
        and current_user["role"] != "admin"
    ):
        raise HTTPException(
            status_code=403,
            detail="Not allowed"
        )

    issue = detect_issue(update.text)
    area = extract_area(update.text)
    sentiment = get_sentiment(update.text)
    priority = get_priority(issue)

    complaints.update_one(
        {"_id": ObjectId(complaint_id)},
        {
            "$set": {
                "text": update.text,
                "issue": issue,
                "priority": priority,
                "area": area,
                "sentiment": sentiment,
                "status": "Pending",
                "updated_at": datetime.utcnow().isoformat()
            }
        }
    )

    updated = complaints.find_one(
        {"_id": ObjectId(complaint_id)}
    )

    return serialize_complaint(updated)


@app.delete("/complaints/{complaint_id}")
def delete_complaint(
    complaint_id: str,
    current_user=Depends(get_current_user)
):
    complaint = complaints.find_one({"_id": ObjectId(complaint_id)})
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if (
        complaint.get("author_email") != current_user["email"]
        and current_user["role"] != "admin"
    ):
        raise HTTPException(status_code=403, detail="Not allowed to delete this complaint")

    complaints.delete_one({"_id": ObjectId(complaint_id)})
    return {"message": "Complaint deleted"}


@app.get("/analytics")
def analytics(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    counts = {}
    for c in complaints.find():
        issue = c.get("issue", "Other")
        counts[issue] = counts.get(issue, 0) + 1
    return counts


@app.get("/area-analytics")
def area_analytics(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    result = {}
    for c in complaints.find():
        area = c.get("area", "Unknown")
        issue = c.get("issue", "Other")
        if area not in result:
            result[area] = {}
        result[area][issue] = result[area].get(issue, 0) + 1
    return result


@app.get("/priority-analytics")
def priority_analytics(
    current_user=Depends(get_current_user)
):

    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    result = {}

    for c in complaints.find():
        priority = c.get(
            "priority",
            "Low"
        )
        result[priority] = (
            result.get(priority, 0) + 1
        )

    return result


@app.get("/search")
def search_complaints(
    query: str = Query(...),
    current_user=Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    regex = {"$regex": query, "$options": "i"}
    search_filter = {
        "$or": [
            {"text": regex},
            {"issue": regex},
            {"area": regex},
            {"status": regex},
            {"author_name": regex},
            {"author_email": regex},
        ]
    }

    return [serialize_complaint(c) for c in complaints.find(search_filter)]


@app.get("/download-reports")
def download_reports(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    all_complaints = [serialize_complaint(c) for c in complaints.find()]

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "S.No",
        "Text",
        "Issue",
        "Priority",
        "Sentiment",
        "Area",
        "Status",
        "Author Name",
        "Author Email",
        "Created At",
        "Updated At"
    ])

    for idx, c in enumerate(all_complaints, start=1):
        writer.writerow([
            idx,
            c.get("text", ""),
            c.get("issue", ""),
            c.get("priority", ""),
            c.get("sentiment", ""),
            c.get("area", ""),
            c.get("status", ""),
            c.get("author_name", ""),
            c.get("author_email", ""),
            c.get("created_at", ""),
            c.get("updated_at", ""),
        ])

    csv_text = output.getvalue()
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=civic_report.csv"},
    )


@app.get("/users")
def list_users(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return [
        {
            "name": u.get("name"),
            "email": u.get("email"),
            "role": u.get("role", "citizen")
        }
        for u in users.find()
    ]


@app.patch("/users/{user_email}")
def update_user_role(
    user_email: str,
    update: UserRoleUpdate,
    current_user=Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    if update.role not in ["citizen", "admin"]:
        raise HTTPException(status_code=400, detail="Role must be citizen or admin")

    result = users.update_one(
        {"email": user_email},
        {"$set": {"role": update.role}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User role updated"}


@app.put("/update-status/{complaint_id}")
def update_status(
    complaint_id: str,
    status: str = Query(...),
    current_user=Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    complaint = complaints.find_one({"_id": ObjectId(complaint_id)})
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Update status first (so status is correct even if email fails)
    complaints.update_one(
        {"_id": ObjectId(complaint_id)},
        {"$set": {"status": status, "updated_at": datetime.utcnow().isoformat()}}
    )

    try:
        from email_utils import send_status_email

        receiver_email = complaint.get("author_email")
        complaint_text = complaint.get("text", "")

        if receiver_email:
            send_status_email(receiver_email, complaint_text, status)
        else:
            print("Email not sent: complaint author_email missing")
    except Exception as e:
        print("❌ Email Error:", str(e))

    return {"message": "Status Updated"}
