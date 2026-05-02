from app.db.session import SessionLocal
from app.db import models
from app.auth.security import hash_password

def main():
    db = SessionLocal()
    try:
        # roles
        for r in ["admin", "auditor", "user"]:
            if not db.query(models.Role).filter_by(name=r).first():
                db.add(models.Role(name=r))
        db.commit()

        # demo user
        if not db.query(models.User).filter_by(email="admin@example.com").first():
            u = models.User(email="admin@example.com", username="admin", password_hash=hash_password("admin123"), auth_type="db")
            db.add(u)
            db.commit()
            db.refresh(u)
            # assign admin role via user_roles
            admin_role = db.query(models.Role).filter_by(name="admin").first()
            db.add(models.UserRole(user_id=u.id, role_id=admin_role.id))
            db.commit()
        print("Seed completed")
    finally:
        db.close()

if __name__ == "__main__":
    main()