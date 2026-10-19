from sqlalchemy import Column,Integer,String,DateTime,ForeignKey,Text,Boolean,Float
from app.database import Base

from sqlalchemy.sql import func



class target(Base):
    __tablename__ = "targets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    url = Column(String(2048), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

class CheckResult(Base):
    __tablename__="checkresult"

    id=Column(Integer,primary_key=True,index=True)

    target_id=Column(Integer,ForeignKey("targets.id"),nullable=True)

    status_code=Column(Integer,nullable=True)
    response_time_ms = Column(Float, nullable=False)
    is_healthy = Column(Boolean, nullable=False)
    error = Column(Text, nullable=True)

    checked_at=Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
