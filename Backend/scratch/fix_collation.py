
import os
import pymysql
from dotenv import load_dotenv

def fix_collation():
    load_dotenv()
    
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = int(os.getenv("DB_PORT", 3306))
    DB_NAME = os.getenv("DB_NAME")

    print(f"Connecting to {DB_NAME} on {DB_HOST}...")
    
    conn = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        port=DB_PORT,
        autocommit=True
    )
    
    try:
        with conn.cursor() as cursor:
            # 1. Fix sp_GetInspectionTankDetails
            print("Updating sp_GetInspectionTankDetails...")
            cursor.execute("DROP PROCEDURE IF EXISTS sp_GetInspectionTankDetails")
            cursor.execute("""
                CREATE PROCEDURE `sp_GetInspectionTankDetails`(IN p_tank_number VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci)
                BEGIN
                    SELECT t.working_pressure, t.frame_type, t.design_temperature, t.cabinet_type, t.mfgr, t.ownership,
                           t.safety_valve_brand_id, sv.brand_name AS safety_valve_brand_name
                    FROM tank_details t
                    LEFT JOIN safety_valve_brand sv ON t.safety_valve_brand_id = sv.id
                    WHERE t.tank_number COLLATE utf8mb4_unicode_ci = p_tank_number COLLATE utf8mb4_unicode_ci
                    LIMIT 1;
                END
            """)
            
            # 2. Fix sp_GetNextInspDate
            print("Updating sp_GetNextInspDate...")
            cursor.execute("DROP PROCEDURE IF EXISTS sp_GetNextInspDate")
            cursor.execute("""
                CREATE PROCEDURE `sp_GetNextInspDate`(IN p_tank_number VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci)
                BEGIN
                    SELECT next_insp_date
                    FROM tank_certificate
                    WHERE tank_number COLLATE utf8mb4_unicode_ci = p_tank_number COLLATE utf8mb4_unicode_ci
                    ORDER BY next_insp_date IS NULL ASC, next_insp_date DESC
                    LIMIT 1;
                END
            """)
            
            # 3. Fix sp_GetTankByNumber
            print("Updating sp_GetTankByNumber...")
            cursor.execute("DROP PROCEDURE IF EXISTS sp_GetTankByNumber")
            cursor.execute("""
                CREATE PROCEDURE `sp_GetTankByNumber`(IN p_tank_number VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci)
                BEGIN
                    SELECT t.id, t.tank_number, td.id as detail_id,
                           td.mfgr, td.date_mfg, td.initial_test, td.un_code, td.tank_iso_code, 
                           td.standard, td.capacity_l, td.mawp, td.design_temperature, td.tare_weight_kg, 
                           td.mgw_kg, td.mpl_kg, td.size, td.pump_type, td.gross_kg, td.net_kg, 
                           td.working_pressure, td.cabinet_type, td.frame_type, td.remark, td.ownership,
                           td.status, td.color_body_frame, td.evacuation_valve, td.product_id,
                           td.safety_valve_brand_id, td.pv_id, td.pid_id, td.ga_id, td.tank_number_image_path, td.remark2
                    FROM tank_header t
                    LEFT JOIN tank_details td ON t.id = td.tank_id
                    WHERE t.tank_number COLLATE utf8mb4_unicode_ci = p_tank_number COLLATE utf8mb4_unicode_ci;
                END
            """)
            
            # 4. Fix sp_CheckReportNumberExists
            print("Updating sp_CheckReportNumberExists...")
            cursor.execute("DROP PROCEDURE IF EXISTS sp_CheckReportNumberExists")
            cursor.execute("""
                CREATE PROCEDURE `sp_CheckReportNumberExists`(IN p_report_number VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci)
                BEGIN
                    SELECT 1 FROM tank_inspection_details WHERE report_number COLLATE utf8mb4_unicode_ci = p_report_number COLLATE utf8mb4_unicode_ci LIMIT 1;
                END
            """)

            print("All procedures updated successfully.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_collation()
