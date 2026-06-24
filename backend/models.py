from pydantic import BaseModel
from typing import Optional


class LoginUser(BaseModel):
    name: str
    email: str


class Complaint(BaseModel):
    text: str


class ComplaintUpdate(BaseModel):
    text: str


class UserRoleUpdate(BaseModel):
    role: str