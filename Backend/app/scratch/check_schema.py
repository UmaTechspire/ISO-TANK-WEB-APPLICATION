from app.database import engine
from sqlalchemy import text

def check_schema():
    with engine.connect() as conn:
        print("Schema for tank_inspection_details:")
        try:
            res = conn.execute(text("DESCRIBE tank_inspection_details")).fetchall()
            for row in res:
                print(row)
        except Exception as e:
            print(f"Error describing tank_inspection_details: {e}")

        print("\nSchema for inspection_history:")
        try:
            res = conn.execute(text("DESCRIBE inspection_history")).fetchall()
            for row in res:
                print(row)
        except Exception as e:
            print(f"Error describing inspection_history: {e}")

        print("\nSchema for tank_details:")
        try:
            res = conn.execute(text("DESCRIBE tank_details")).fetchall()
            for row in res:
                print(row)
        except Exception as e:
            print(f"Error describing tank_details: {e}")

        print("\nChecking for vacuum_uom in inspection_history:")
        try:
            res = conn.execute(text("SHOW COLUMNS FROM inspection_history LIKE 'vacuum_uom'")).fetchone()
            print(f"vacuum_uom exists: {res is not None}")
        except Exception as e:
            print(f"Error checking vacuum_uom: {e}")

        print("\nChecking for product_id in tank_inspection_details:")
        try:
            res = conn.execute(text("SHOW COLUMNS FROM tank_inspection_details LIKE 'product_id'")).fetchone()
            print(f"product_id exists: {res is not None}")
        except Exception as e:
            print(f"Error checking product_id: {e}")

if __name__ == "__main__":
    check_schema()
