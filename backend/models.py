from sqlalchemy import Column, Integer, String
from database import Base
class Member(Base):
    __tablename__ = "members"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    department = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    designation = Column(String, nullable=True)
    team = Column(String, nullable=True)
    date_joined = Column(String, nullable=True)
    membership_status = Column(String, default="Active")