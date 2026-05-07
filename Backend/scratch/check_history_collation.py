
import os
import pymysql
from dotenv import load_dotenv

def check_collation():
    load_dotenv()
    conn = pymysql.connect(
        host=os.getenv('DB_HOST'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        database=os.getenv('DB_NAME'),
        port=int(os.getenv('DB_PORT', 3306))
    )
    cursor = conn.cursor()
    cursor.execute("SELECT table_collation FROM information_schema.tables WHERE table_schema = %s AND table_name = 'inspection_history'", (os.getenv('DB_NAME'),))
    print(f"Table Collation: {cursor.fetchone()[0]}")
    
    cursor.execute("SELECT column_name, collation_name FROM information_schema.columns WHERE table_schema = %s AND table_name = 'inspection_history' AND column_name = 'tank_number'", (os.getenv('DB_NAME'),))
    print(f"Column Collation: {cursor.fetchone()[0]}")
    conn.close()

if __name__ == "__main__":
    check_collation()
