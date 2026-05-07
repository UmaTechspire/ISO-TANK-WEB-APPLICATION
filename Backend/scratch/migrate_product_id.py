from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("Altering inspection_history.product_id to VARCHAR(255)...")
    conn.execute(text("ALTER TABLE inspection_history MODIFY product_id VARCHAR(255)"))
    conn.commit()
    print("Successfully altered column.")
