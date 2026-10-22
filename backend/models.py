
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint,Boolean
from sqlalchemy.orm import relationship
from database import Base


class Member(Base):
    __tablename__ = "members"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    department = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    # Keep these temporarily for compatibility with the existing frontend
    designation = Column(String, nullable=True)
    team = Column(String, nullable=True)
    date_joined = Column(String, nullable=True)
    membership_status = Column(String, default="Active")
    memberships = relationship(
        "Membership",
        back_populates="member",
        cascade="all, delete-orphan"
    )

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    lead = Column(String, nullable=True)
    memberships = relationship(
        "Membership",
        back_populates="team",
        cascade="all, delete-orphan"
    )

class Membership(Base):
    __tablename__ = "memberships"
    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(
        Integer, ForeignKey("members.id"), nullable=False
    )
    team_id = Column(
        Integer, ForeignKey("teams.id"), nullable=False
    )
    designation = Column(String, nullable=True)
    start_date = Column(String, nullable=True)
    __table_args__ = (
        UniqueConstraint(
            "member_id", "team_id",
            name="unique_member_team"
        ),
    )
    member = relationship("Member", back_populates="memberships")
    team = relationship("Team", back_populates="memberships")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="member")
    is_active = Column(Boolean, nullable=False, default=True)