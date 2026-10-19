import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


# Render provides DATABASE_URL; local development can use a local PostgreSQL URL.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./apipulse.db",
)
# Some managed Postgres providers expose postgres://; SQLAlchemy needs postgresql://.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = "postgresql://" + DATABASE_URL[len("postgres://") :]

engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
sessionlocal = sessionmaker(autoflush=False, autocommit=False, bind=engine)
Base = declarative_base()


def get_db():
    db = sessionlocal()
    try:
        yield db
    finally:
        db.close()
