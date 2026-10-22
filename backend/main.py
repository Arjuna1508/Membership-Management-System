from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from database import engine, Base, SessionLocal
import models
Base.metadata.create_all(bind=engine)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class MemberCreate(BaseModel):
    name: str
    email: EmailStr
    department: str
    year: int
    designation: Optional[str] = None
    team: Optional[str] = None
    date_joined: Optional[str] = None
    membership_status: str = "Active"

class MemberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    year: Optional[int] = None
    designation: Optional[str] = None
    team: Optional[str] = None
    date_joined: Optional[str] = None
    membership_status: Optional[str] = None

@app.get("/members")
def get_members(db: Session = Depends(get_db)):
    return db.query(models.Member).all()

@app.post("/members")
def create_members(member: MemberCreate, db: Session = Depends(get_db)):
    existing_member = db.query(models.Member).filter(models.Member.email == member.email).first()

    if existing_member:
            raise HTTPException(status_code=400, detail="Email already exists")

    new_member = models.Member(**member.model_dump())
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member

@app.get("/members/{member_id}")
def get_member(member_id: int, db: Session = Depends(get_db)):
    member = db.query(models.Member).filter(models.Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member

@app.put("/members/{member_id}")
def update_member(member_id: int, updates: MemberUpdate, db: Session = Depends(get_db)):
    member = db.query(models.Member).filter(models.Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(member, field, value)
    db.commit()
    db.refresh(member)
    return member

@app.delete("/members/{member_id}")
def delete_member(member_id: int, db: Session = Depends(get_db)):
    member = db.query(models.Member).filter(models.Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return {"message": "Member deleted"}