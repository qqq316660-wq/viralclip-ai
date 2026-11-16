"""
ViralClip AI Studio - License Key Manager & Generator Tool
Use this tool to:
1. Generate batches of 10, 50, 100, or more unique license keys.
2. Export keys to text file / CSV for distribution.
3. Automatically upload keys into your Google Firebase Firestore database.
4. View activation status of any key (Owner Name, Phone, PC-HWID, Date).
5. Reset HWID for a customer (if they bought a new laptop or reinstalled Windows).
"""

import os
import sys
import json
import secrets
import string
import time
from pathlib import Path
import requests

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
FIREBASE_CONFIG_FILE = STORAGE_DIR / "firebase_config.json"

def get_firebase_config():
    if FIREBASE_CONFIG_FILE.exists():
        try:
            with open(FIREBASE_CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"project_id": "", "api_key": ""}

def generate_key_string() -> str:
    """Generate key in format VC-XXXX-XXXX-XXXX"""
    charset = string.ascii_uppercase + string.digits
    # Exclude ambiguous characters (0, O, 1, I)
    clean_charset = "".join(c for c in charset if c not in "0O1I")
    p1 = "".join(secrets.choice(clean_charset) for _ in range(4))
    p2 = "".join(secrets.choice(clean_charset) for _ in range(4))
    p3 = "".join(secrets.choice(clean_charset) for _ in range(4))
    return f"VC-{p1}-{p2}-{p3}"

def generate_keys_batch(count: int = 100):
    keys = []
    seen = set()
    while len(keys) < count:
        k = generate_key_string()
        if k not in seen:
            seen.add(k)
            keys.append(k)
    return keys

def export_keys_to_files(keys: list, base_name: str = "generated_keys"):
    """Exports generated keys to both plain TXT and Excel-ready CSV format."""
    txt_path = BASE_DIR / "tools" / f"{base_name}_{len(keys)}.txt"
    csv_path = BASE_DIR / "tools" / f"{base_name}_{len(keys)}.csv"

    # TXT Export (one key per line)
    with open(txt_path, "w", encoding="utf-8") as f:
        for k in keys:
            f.write(k + "\n")

    # CSV Export (Excel & Payment Gateway compatible)
    with open(csv_path, "w", encoding="utf-8") as f:
        f.write("Index,License_Key,Status,Device_Locked,Owner_Name,Created_At\n")
        now_str = time.strftime("%Y-%m-%d %H:%M:%S")
        for i, k in enumerate(keys, 1):
            f.write(f"{i},{k},active,Unused,Unassigned,{now_str}\n")

    return txt_path, csv_path

def upload_keys_batch_firestore(project_id: str, keys_chunk: list):
    """
    Uploads up to 500 keys in a single atomic batch commit request to Firestore.
    Significantly faster (upload 10,000 keys in ~15 seconds instead of 30 minutes).
    """
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents:commit"
    created_time = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    writes = []
    for k in keys_chunk:
        doc_name = f"projects/{project_id}/databases/(default)/documents/licenses/{k}"
        writes.append({
            "update": {
                "name": doc_name,
                "fields": {
                    "key": {"stringValue": k},
                    "hwid": {"stringValue": ""},
                    "registered_name": {"stringValue": ""},
                    "registered_phone": {"stringValue": ""},
                    "status": {"stringValue": "active"},
                    "created_at": {"stringValue": created_time},
                    "activated_at": {"stringValue": ""}
                }
            }
        })

    payload = {"writes": writes}
    res = requests.post(url, json=payload, timeout=30.0)
    return res.status_code == 200, res.text

def upload_key_to_firestore(project_id: str, key: str):
    """
    Creates document in Firestore collection 'licenses' with document ID = key.
    URL: https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/licenses/{key}
    """
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/licenses/{key}"
    payload = {
        "fields": {
            "key": {"stringValue": key},
            "hwid": {"stringValue": ""},
            "registered_name": {"stringValue": ""},
            "registered_phone": {"stringValue": ""},
            "status": {"stringValue": "active"},
            "created_at": {"stringValue": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())},
            "activated_at": {"stringValue": ""}
        }
    }
    res = requests.patch(url, json=payload, timeout=10.0)
    return res.status_code in [200, 204], res.text

def get_key_details(project_id: str, key: str):
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/licenses/{key}"
    res = requests.get(url, timeout=10.0)
    if res.status_code == 404:
        return None, "Key not found in database"
    if res.status_code != 200:
        return None, f"Error ({res.status_code}): {res.text}"
    
    data = res.json().get("fields", {})
    details = {
        "key": data.get("key", {}).get("stringValue", key),
        "status": data.get("status", {}).get("stringValue", "active"),
        "hwid": data.get("hwid", {}).get("stringValue", ""),
        "registered_name": data.get("registered_name", {}).get("stringValue", ""),
        "registered_phone": data.get("registered_phone", {}).get("stringValue", ""),
        "created_at": data.get("created_at", {}).get("stringValue", ""),
        "activated_at": data.get("activated_at", {}).get("stringValue", "")
    }
    return details, "Success"

def reset_key_hwid(project_id: str, key: str):
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/licenses/{key}?updateMask.fieldPaths=hwid&updateMask.fieldPaths=activated_at"
    payload = {
        "fields": {
            "hwid": {"stringValue": ""},
            "activated_at": {"stringValue": ""}
        }
    }
    res = requests.patch(url, json=payload, timeout=10.0)
    return res.status_code in [200, 204]

def main():
    print("=" * 65)
    print("   🚀 VIRALCLIP AI STUDIO - LICENSE KEY MANAGER & GENERATOR")
    print("=" * 65)
    
    config = get_firebase_config()
    project_id = config.get("project_id", "").strip()

    if not project_id:
        print("\n⚠️ Note: Firebase Project ID is not yet configured.")
        print("To configure, open storage/firebase_config.json and set 'project_id'.")
    else:
        print(f"\n Connected Firebase Project: {project_id}")

    print("\nSelect an action:")
    print(" [1] Generate Keys Locally (Save to TXT & Excel-ready CSV)")
    print(" [2] Generate & Fast-Upload Batch to Firebase (Supports 100 to 10,000+ keys)")
    print(" [3] Check Status of a License Key")
    print(" [4] Reset PC-Lock (HWID) for a Customer")
    print(" [5] Exit")

    choice = input("\nEnter choice [1-5]: ").strip()

    if choice == "1":
        try:
            count = int(input("\nHow many keys to generate (e.g. 100, 1000, 10000)? ").strip() or "100")
        except ValueError:
            count = 100
        print(f"\n[*] Generating {count} unique cryptographic license keys...")
        t0 = time.time()
        keys = generate_keys_batch(count)
        txt_path, csv_path = export_keys_to_files(keys, f"keys_batch_{count}")
        elapsed = time.time() - t0
        print(f"\n✅ Successfully generated {count} license keys in {elapsed:.2f}s!")
        print(f"📁 TXT format (1 per line): {txt_path}")
        print(f"📁 CSV format (Excel ready): {csv_path}")

    elif choice == "2":
        if not project_id:
            print("\n❌ Error: Please configure 'project_id' in storage/firebase_config.json first.")
            return

        try:
            count = int(input("\nHow many keys to generate & upload (e.g. 100, 1000, 10000)? ").strip() or "100")
        except ValueError:
            count = 100

        print(f"\n[*] Generating {count} keys in memory...")
        t0 = time.time()
        keys = generate_keys_batch(count)
        txt_path, csv_path = export_keys_to_files(keys, f"firebase_keys_{count}")
        print(f"[*] Local backup saved to {txt_path.name} & {csv_path.name}")

        chunk_size = 500  # Firestore commit maximum
        total_batches = (count + chunk_size - 1) // chunk_size
        print(f"\n[*] Fast-uploading {count} keys across {total_batches} atomic batch commits (500 keys/commit)...")

        uploaded = 0
        for b_idx in range(total_batches):
            chunk = keys[b_idx * chunk_size:(b_idx + 1) * chunk_size]
            ok, msg = upload_keys_batch_firestore(project_id, chunk)
            if ok:
                uploaded += len(chunk)
                pct = int((uploaded / count) * 100)
                print(f" [Batch {b_idx + 1}/{total_batches}] ✅ Uploaded {len(chunk)} keys (Total: {uploaded}/{count} - {pct}%)")
            else:
                print(f" [Batch {b_idx + 1}/{total_batches}] ❌ Failed: {msg[:100]}")
                if "PERMISSION_DENIED" in msg or "403" in msg:
                    print("\n" + "=" * 65)
                    print("❌ FIRESTORE PERMISSION DENIED (403 ERROR)")
                    print("Firebase rules need 'allow create: if true;' to add keys.")
                    print("Check FIREBASE_SETUP_GUIDE.md Step 3.")
                    print("=" * 65)
                    break
            time.sleep(0.3)

        elapsed = time.time() - t0
        print(f"\n✅ Complete! {uploaded}/{count} keys created in Firestore database in {elapsed:.1f}s.")
        print(f"📁 Keys files saved at:")
        print(f"   TXT: {txt_path}")
        print(f"   CSV: {csv_path}")


    elif choice == "3":
        if not project_id:
            print("\n❌ Error: Please configure 'project_id' in storage/firebase_config.json first.")
            return
        key_input = input("\nEnter License Key to check: ").strip().upper()
        details, msg = get_key_details(project_id, key_input)
        if details:
            print("\n--- Key Details ---")
            print(f"Key:            {details['key']}")
            print(f"Status:         {details['status']}")
            print(f"Hardware Lock:  {details['hwid'] if details['hwid'] else '⚠️ UNUSED / NOT YET ACTIVATED'}")
            print(f"Customer Name:  {details['registered_name'] or 'N/A'}")
            print(f"Phone/Email:    {details['registered_phone'] or 'N/A'}")
            print(f"Activated At:   {details['activated_at'] or 'N/A'}")
        else:
            print(f"\n❌ {msg}")

    elif choice == "4":
        if not project_id:
            print("\n❌ Error: Please configure 'project_id' in storage/firebase_config.json first.")
            return
        key_input = input("\nEnter License Key to reset HWID: ").strip().upper()
        confirm = input(f"Are you sure you want to unlock {key_input} so it can be used on a new PC? (y/n): ").strip().lower()
        if confirm == 'y':
            ok = reset_key_hwid(project_id, key_input)
            if ok:
                print(f"\n✅ Success! Key {key_input} HWID has been reset. The customer can now activate it on their new PC.")
            else:
                print("\n❌ Failed to reset key. Check your internet connection or Firestore rules.")

if __name__ == "__main__":
    main()
