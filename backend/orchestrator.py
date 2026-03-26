import os
import json
import time
import threading
from datetime import datetime, timedelta
import pytz
import subprocess
from ingestion import run_ingestion

# Configuration
LISTENING_PORT = 3000
DATA_DIR = "data"
IST = pytz.timezone('Asia/Kolkata')

def run_maintenance_cycle():
    """
    Comprehensive nightly maintenance: Ingestion, Metadata Sync, and Link Scrubbing.
    """
    print(f"\n--- 🌑 {datetime.now(IST)} Nightly Maintenance Triggered ---")
    
    # 1. Update Anime Catalog (Daily Update Cycle)
    print("Step 1: Synchronizing Catalog with Jikan API...")
    try:
        run_ingestion()
    except Exception as e:
        print(f"Ingestion failed: {e}")
    
    # 2. Sync Trailers (Dynamic Video Preview Sync)
    print("Step 2: Recasting official trailers...")
    subprocess.run(['python', 'backend/trailer_sync.py'])
    
    # 3. Autonomous Health Bot Manual Scan
    print("Step 3: Performing global link scrubbing...")
    # This triggers the health bot for a manual scan
    subprocess.run(['python', 'backend/link_status_bot.py', '--once'])
    
    print("--- 🌕 Maintenance Cycle Complete ---\n")
    schedule_next_maintenance()

def schedule_next_maintenance():
    """
    Precise scheduling for hourly execution to ensure new anime are always fetched.
    """
    now_ist = datetime.now(IST)
    # Target next hour exactly
    next_run = now_ist.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    
    delay = (next_run - now_ist).total_seconds()
    print(f"Next rapid-sync window opens at: {next_run} IST (Time until: {delay/60:.2f} mins)")
    
    # Start timer for next run
    threading.Timer(delay, run_maintenance_cycle).start()

def start_services():
    """
    Starts background monitor services.
    """
    print("Starting Background Link Health Bot...")
    # Health bit runs continuously in the background
    subprocess.Popen(['python', 'backend/link_status_bot.py'])

def main():
    print("==============================================")
    print("       ANICloud Production Orchestrator       ")
    print("==============================================")
    print(f"Timezone: {IST}")
    print("Manager: Autonomous Daily Content Ingestion")
    
    # Start autonomous bots
    start_services()
    
    # Perform initial boot sync
    print("Running initial boot sequence...")
    run_maintenance_cycle()

if __name__ == "__main__":
    main()
