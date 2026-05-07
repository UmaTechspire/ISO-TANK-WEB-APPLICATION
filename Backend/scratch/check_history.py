from app.database import engine
from sqlalchemy import text

def check():
    with engine.connect() as conn:
        print("--- Columns for tank_details ---")
        res = conn.execute(text("DESCRIBE tank_details"))
        for row in res:
            print(row)
            
        print("\n--- Columns for inspection_history ---")
        res = conn.execute(text("DESCRIBE inspection_history"))
        for row in res:
            print(row)

        print("\n--- Columns for tank_inspection_details ---")
        res = conn.execute(text("DESCRIBE tank_inspection_details"))
        for row in res:
            print(row)

if __name__ == "__main__":
    check()
