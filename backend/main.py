from contextlib import asynccontextmanager
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import Field
import auth
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, EmailStr
from typing import Optional

from database import engine, Base, SessionLocal
import models


def migrate_existing_members():
    db = SessionLocal()
    try:
        members = db.query(models.Member).all()

        for member in members:
            if not member.team:
                continue

            team_name = member.team.strip()
            if not team_name:
                continue

            team = (
                db.query(models.Team)
                .filter(models.Team.name == team_name)
                .first()
            )

            if not team:
                team = models.Team(name=team_name)
                db.add(team)
                db.flush()

            existing = (
                db.query(models.Membership)
                .filter(
                    models.Membership.member_id == member.id,
                    models.Membership.team_id == team.id,
                )
                .first()
            )

            if not existing:
                db.add(
                    models.Membership(
                        member_id=member.id,
                        team_id=team.id,
                        designation=member.designation,
                        start_date=member.date_joined,
                    )
                )

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    migrate_existing_members()
    yield


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


app = FastAPI(lifespan=lifespan)

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


class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    lead: Optional[str] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    lead: Optional[str] = None


class MembershipCreate(BaseModel):
    member_id: int
    team_id: int
    designation: Optional[str] = None
    start_date: Optional[str] = None


class MembershipUpdate(BaseModel):
    designation: Optional[str] = None
    start_date: Optional[str] = None


@app.get("/")
def home():
    return {"message": "MMS API is running"}


@app.post("/auth/register", status_code=201)
def register_user(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    email = str(request.email).lower()

    existing = db.query(models.User).filter(
        models.User.email == email
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists",
        )

    user = models.User(
        name=request.name.strip(),
        email=email,
        hashed_password=auth.hash_password(request.password),
        role="member",
        is_active=True,
    )

    if not user.name:
        raise HTTPException(status_code=400, detail="Name is required")

    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists",
        )

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }


@app.post("/auth/login")
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    email = form.username.strip().lower()

    user = db.query(models.User).filter(
        models.User.email == email
    ).first()

    if (
        not user
        or not auth.verify_password(form.password, user.hashed_password)
        or not user.is_active
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "access_token": auth.create_access_token(user.id, user.role),
        "token_type": "bearer",
    }


@app.get("/auth/me")
def get_me(current_user=Depends(auth.get_current_user)):
    return current_user


def serialize_member(member):
    return {
        "id": member.id,
        "name": member.name,
        "email": member.email,
        "department": member.department,
        "year": member.year,
        "designation": member.designation,
        "team": member.team,  # Legacy field; don't use it for display
        "date_joined": member.date_joined,
        "membership_status": member.membership_status,
        "sigs": [
            {
                "membership_id": assignment.id,
                "id": assignment.team.id,
                "name": assignment.team.name,
                "designation": assignment.designation,
                "start_date": assignment.start_date,
            }
            for assignment in member.memberships
        ],
    }


@app.get("/members")
def get_members(
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    members = db.query(models.Member).order_by(models.Member.name).all()
    return [serialize_member(member) for member in members]


@app.post("/members")
def create_member(
    member: MemberCreate,
    db: Session = Depends(get_db),
    current_user=Depends(auth.require_admin),
):
    existing = (
        db.query(models.Member)
        .filter(models.Member.email == member.email)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    new_member = models.Member(**member.model_dump())
    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    if member.team and member.team.strip():
        team_name = member.team.strip()
        team = (
            db.query(models.Team)
            .filter(models.Team.name == team_name)
            .first()
        )

        if not team:
            team = models.Team(name=team_name)
            db.add(team)
            db.flush()

        existing_assignment = (
            db.query(models.Membership)
            .filter(
                models.Membership.member_id == new_member.id,
                models.Membership.team_id == team.id,
            )
            .first()
        )

        if not existing_assignment:
            db.add(
                models.Membership(
                    member_id=new_member.id,
                    team_id=team.id,
                    designation=member.designation,
                    start_date=member.date_joined,
                )
            )
            db.commit()

    db.refresh(new_member)
    return serialize_member(new_member)


@app.get("/members/{member_id}")
def get_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    member = (
        db.query(models.Member)
        .filter(models.Member.id == member_id)
        .first()
    )

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    return serialize_member(member)


@app.put("/members/{member_id}")
def update_member(
    member_id: int,
    updates: MemberUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(auth.require_admin),
):
    member = db.query(models.Member).filter(
        models.Member.id == member_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    data = updates.model_dump(exclude_unset=True)

    if "email" in data and data["email"] != member.email:
        existing = db.query(models.Member).filter(
            models.Member.email == data["email"]
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")

    for field, value in data.items():
        setattr(member, field, value)

    db.commit()
    db.refresh(member)
    return member


@app.delete("/members/{member_id}")
def delete_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth.require_admin),
):
    member = db.query(models.Member).filter(
        models.Member.id == member_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(member)
    db.commit()
    return {"message": "Member deleted"}


@app.get("/teams")
def get_teams(
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    teams = db.query(models.Team).order_by(models.Team.name).all()
    return [
        {
            "id": team.id,
            "name": team.name,
            "description": team.description,
            "lead": team.lead,
            "member_count": len(team.memberships),
        }
        for team in teams
    ]


@app.post("/teams", status_code=201)
def create_team(
    team: TeamCreate,
    db: Session = Depends(get_db),
    current_user=Depends(auth.require_admin),
):
    name = team.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Team name is required")

    if db.query(models.Team).filter(models.Team.name == name).first():
        raise HTTPException(status_code=400, detail="Team already exists")

    new_team = models.Team(
        name=name,
        description=team.description,
        lead=team.lead,
    )
    db.add(new_team)
    db.commit()
    db.refresh(new_team)
    return {
        "id": new_team.id,
        "name": new_team.name,
        "description": new_team.description,
        "lead": new_team.lead,
        "member_count": len(new_team.memberships),
    }


@app.put("/teams/{team_id}")
def update_team(
    team_id: int,
    updates: TeamUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(auth.require_admin),
):
    team = db.query(models.Team).filter(
        models.Team.id == team_id
    ).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    data = updates.model_dump(exclude_unset=True)

    if "name" in data:
        data["name"] = data["name"].strip()
        if not data["name"]:
            raise HTTPException(status_code=400, detail="Team name is required")
        duplicate = db.query(models.Team).filter(
            models.Team.name == data["name"],
            models.Team.id != team_id,
        ).first()
        if duplicate:
            raise HTTPException(status_code=400, detail="Team already exists")

    for field, value in data.items():
        setattr(team, field, value)

    db.commit()
    db.refresh(team)
    return {
        "id": team.id,
        "name": team.name,
        "description": team.description,
        "lead": team.lead,
        "member_count": len(team.memberships),
    }


@app.delete("/teams/{team_id}")
def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth.require_admin),
):
    team = db.query(models.Team).filter(
        models.Team.id == team_id
    ).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    db.delete(team)
    db.commit()
    return {"message": "Team deleted"}


@app.get("/memberships")
def get_memberships(
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    memberships = db.query(models.Membership).all()
    return [
        {
            "id": item.id,
            "member_id": item.member_id,
            "member_name": item.member.name,
            "team_id": item.team_id,
            "team_name": item.team.name,
            "designation": item.designation,
            "start_date": item.start_date,
        }
        for item in memberships
    ]


@app.post("/memberships", status_code=201)
def create_membership(
    assignment: MembershipCreate,
    db: Session = Depends(get_db),
    current_user=Depends(auth.require_admin),
):
    member = db.query(models.Member).filter(
        models.Member.id == assignment.member_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    team = db.query(models.Team).filter(
        models.Team.id == assignment.team_id
    ).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    existing = db.query(models.Membership).filter(
        models.Membership.member_id == assignment.member_id,
        models.Membership.team_id == assignment.team_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Member is already assigned to this team",
        )

    new_assignment = models.Membership(**assignment.model_dump())
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    return {
        "id": new_assignment.id,
        "member_id": member.id,
        "member_name": member.name,
        "team_id": team.id,
        "team_name": team.name,
        "designation": new_assignment.designation,
        "start_date": new_assignment.start_date,
    }


@app.put("/memberships/{membership_id}")
def update_membership(
    membership_id: int,
    updates: MembershipUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(auth.require_admin),
):
    assignment = db.query(models.Membership).filter(
        models.Membership.id == membership_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Membership not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(assignment, field, value)

    db.commit()
    db.refresh(assignment)
    return {
        "id": assignment.id,
        "member_id": assignment.member_id,
        "member_name": assignment.member.name,
        "team_id": assignment.team_id,
        "team_name": assignment.team.name,
        "designation": assignment.designation,
        "start_date": assignment.start_date,
    }


@app.delete("/memberships/{membership_id}")
def delete_membership(
    membership_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth.require_admin),
):
    assignment = db.query(models.Membership).filter(
        models.Membership.id == membership_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Membership not found")

    db.delete(assignment)
    db.commit()
    return {"message": "Membership deleted"}


@app.get("/dashboard/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    total = db.query(models.Member).count()
    active = db.query(models.Member).filter(
        models.Member.membership_status == "Active"
    ).count()
    inactive = (
        db.query(models.Member)
        .filter(models.Member.membership_status == "Inactive")
        .count()
    )

    return {
        "total_members": total,
        "active_members": active,
        "inactive_members": inactive,
        "total_teams": db.query(models.Team).count(),
        "total_memberships": db.query(models.Membership).count(),
    }
