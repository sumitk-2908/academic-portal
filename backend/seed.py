from app.database import SessionLocal, engine
from app.models.academic import Degree, Semester, Subject, Module, Base

def seed_db():
    # --- BULLETPROOF FIX ---
    # Force Python to create all tables before trying to add data
    Base.metadata.create_all(bind=engine)
    # -----------------------

    db = SessionLocal()
    
    # Check if data already exists
    if db.query(Degree).first():
        print("Database already seeded!")
        return

    print("Seeding database...")
    
    # 1. Create Degree
    degree = Degree(name="B.Tech Computer Science")
    db.add(degree)
    db.commit()

    # 2. Create Semester
    semester = Semester(degree_id=degree.id, semester_number=1)
    db.add(semester)
    db.commit()

    # 3. Create Subject
    subject = Subject(
        semester_id=semester.id, 
        subject_code="CS101", 
        name="Programming for Problem Solving (PPS)", 
        credits=4
    )
    db.add(subject)
    db.commit()

    # 4. Create Module
    module = Module(
        subject_id=subject.id, 
        module_number=1, 
        title="Introduction to C Programming"
    )
    db.add(module)
    db.commit()

    print(f"✅ Success! Created Module ID: {module.id} ({module.title})")
    db.close()

if __name__ == "__main__":
    seed_db()