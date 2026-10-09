"""Isolated role preview for manual UI verification; never uses the application database."""
from __future__ import annotations

import os
import sys
from pathlib import Path
from tempfile import TemporaryDirectory


def main() -> None:
    with TemporaryDirectory(prefix="rail-permissions-preview-") as directory:
        os.environ["DATABASE_URL"] = f"sqlite:///{Path(directory).as_posix()}/preview.db"
        os.environ["JWT_SECRET"] = "isolated-permissions-preview-secret"
        os.environ["CORS_ORIGINS"] = "http://127.0.0.1:5175"
        os.environ["ADMIN_USERNAME"] = ""
        sys.path.insert(0, str(Path(__file__).parents[1]))
        from app.database import Base, SessionLocal, engine
        from app.models import HazardAssessment, User
        from app.security import hash_password
        from app.main import app
        from test_hazard_assessments import payload
        import uvicorn

        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            users = {}
            for role in ("safety_manager", "project_manager", "ordinary", "admin"):
                user = User(username=f"preview-{role}", display_name=f"测试-{role}", role=role, password_hash=hash_password("preview123456"))
                db.add(user)
                users[role] = user
            db.flush()
            record = payload()
            record["created_label"] = record.pop("created_at")
            record["photo_data"] = ""
            db.add(HazardAssessment(user_id=users["safety_manager"].id, **record))
            db.commit()
        try:
            uvicorn.run(app, host="127.0.0.1", port=8001)
        finally:
            engine.dispose()


if __name__ == "__main__":
    main()
