from app.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        print("Starting migration...")
        
        # 1. Add vacuum_uom to inspection_history
        try:
            print("Adding vacuum_uom to inspection_history...")
            conn.execute(text("ALTER TABLE inspection_history ADD COLUMN vacuum_uom VARCHAR(20) AFTER vacuum_reading"))
            conn.commit()
            print("Successfully added vacuum_uom to inspection_history.")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("vacuum_uom already exists in inspection_history.")
            else:
                print(f"Error adding vacuum_uom: {e}")

        # 2. Add product_id to tank_inspection_details
        try:
            print("Adding product_id to tank_inspection_details...")
            conn.execute(text("ALTER TABLE tank_inspection_details ADD COLUMN product_id INT AFTER pi_next_inspection_date"))
            conn.commit()
            print("Successfully added product_id to tank_inspection_details.")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("product_id already exists in tank_inspection_details.")
            else:
                print(f"Error adding product_id: {e}")

        # 3. Ensure product_id in inspection_history is aligned (it was int, let's keep it int)
        # But if tank_details.product_id is text, we might have issues.
        # Let's check tank_details.product_id content.
        print("Checking tank_details.product_id content...")
        res = conn.execute(text("SELECT product_id FROM tank_details LIMIT 5")).fetchall()
        print(f"Sample product_id from tank_details: {res}")

        print("Migration check completed.")

if __name__ == "__main__":
    migrate()
