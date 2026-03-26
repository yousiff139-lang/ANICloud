import os
import time
import subprocess
from datetime import datetime

def run_script(script_name):
    print(f"[{datetime.now()}] Running {script_name}...")
    try:
        result = subprocess.run(["python", script_name], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"SUCCESS: {script_name}\n{result.stdout}")
        else:
            print(f"FAILED: {script_name}\n{result.stderr}")
    except Exception as e:
        print(f"ERROR executing {script_name}: {e}")

def main():
    print("ANICloud Automation Manager v1.0")
    print("-------------------------------")
    
    while True:
        # 1. Update Metadata
        run_script("backend/ingestion.py")
        
        # 2. Validate Links
        run_script("backend/link_validator.py")
        
        print(f"[{datetime.now()}] Cycle complete. Waiting for next window...")
        # Run every 24 hours
        time.sleep(24 * 3600)

if __name__ == "__main__":
    main()
