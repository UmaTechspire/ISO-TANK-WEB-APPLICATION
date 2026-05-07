import sys
import os
from sqlalchemy import text
from sqlalchemy.orm import Session

# Add the project root to sys.path
sys.path.append(os.getcwd())

from app.database import SessionLocal, engine
from app.models.inspection_history_model import InspectionHistory
from sqlalchemy import func

def debug_review(inspection_id):
    db = SessionLocal()
    try:
        print(f"Checking inspection_id: {inspection_id}")
        
        # 1. Update is_reviewed (simulate what router does)
        db.execute(
            text("UPDATE tank_inspection_details SET is_reviewed = 1, reviewed_by = 1002, updated_at = NOW() WHERE inspection_id = :id"),
            {"id": inspection_id}
        )
        db.commit()
        print("Updated tank_inspection_details")

        # 2. Fetch the record
        query = text("""
            SELECT ti.*, t.product_id as t_product_id, t.safety_valve_brand_id as t_brand_id
            FROM tank_inspection_details ti
            LEFT JOIN tank_details t ON ti.tank_id = t.tank_id
            WHERE ti.inspection_id = :id
        """)
        record = db.execute(query, {"id": inspection_id}).fetchone()
        
        if not record:
            print("Record not found after update!")
            return

        print("Fetched record successfully")
        r = record._mapping if hasattr(record, "_mapping") else dict(zip(record.keys(), record))
        
        # print("Columns in record:", r.keys())

        # 3. Try to create history entry
        try:
            history_entry = InspectionHistory(
                inspection_id=r["inspection_id"],
                inspection_date=r["inspection_date"],
                created_at=r["created_at"],
                updated_at=r["updated_at"],
                report_number=r["report_number"],
                tank_id=r["tank_id"],
                tank_number=r["tank_number"],
                status_id=r["status_id"],
                product_id=r.get("product_id") or r.get("t_product_id"),
                inspection_type_id=r["inspection_type_id"],
                location_id=r["location_id"],
                working_pressure=r["working_pressure"],
                design_temperature=r["design_temperature"],
                frame_type=r["frame_type"],
                cabinet_type=r["cabinet_type"],
                mfgr=r["mfgr"],
                safety_valve_brand_id=r.get("safety_valve_brand_id") or r.get("t_brand_id"),
                safety_valve_model_id=r["safety_valve_model_id"],
                safety_valve_size_id=r["safety_valve_size_id"],
                pi_next_inspection_date=r["pi_next_inspection_date"],
                notes=r["notes"],
                lifter_weight=r.get("lifter_weight"),
                lifter_weight_thumbnail=r.get("lifter_weight_thumbnail"),
                vacuum_reading=r["vacuum_reading"],
                vacuum_uom=r["vacuum_uom"],
                lifter_weight_value=r["lifter_weight_value"],
                emp_id=r["emp_id"],
                operator_id=r["operator_id"],
                ownership=r["ownership"],
                is_submitted=r["is_submitted"],
                is_reviewed=r["is_reviewed"],
                reviewed_by=r["reviewed_by"],
                web_submitted=r["web_submitted"],
                created_by=r["created_by"],
                updated_by=r["updated_by"],
                history_date=func.now()
            )
            db.add(history_entry)
            db.commit()
            print("SUCCESS: Inserted into inspection_history")
        except Exception as e:
            print(f"FAILED to insert into history: {e}")
            db.rollback()

    except Exception as e:
        print(f"OUTER ERROR: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Use one of the inspection IDs from the screenshot that is reviewed=1 but not in history
    # Looking at screenshot 1, there is a reviewed row. I'll try to find an ID.
    # I'll just pick a likely one or let it fail if I don't know the ID.
    # Actually, I'll first list some IDs that are reviewed=1 but NOT in history.
    
    db = SessionLocal()
    # res = db.execute(text("SELECT product_id FROM tank_inspection_details LIMIT 5")).fetchall()
    # print("Sample product_id from tank_inspection_details:", [row[0] for row in res])
    
    res = db.execute(text("""
        SELECT inspection_id FROM tank_inspection_details 
        WHERE is_reviewed = 1 
        AND inspection_id NOT IN (SELECT inspection_id FROM inspection_history)
    """)).fetchall()
    db.close()
    
    ids = [row[0] for row in res]
    print(f"Found reviewed IDs missing from history: {ids}")
    
    if ids:
        debug_review(ids[0])
    else:
        print("No missing records found to debug. Maybe try a known one.")
