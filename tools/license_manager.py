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
    print(" [1] Generate 100 Keys (Save to text file)")
    print(" [2] Generate Custom Number of Keys & Upload to Firebase")
    print(" [3] Check Status of a License Key")
    print(" [4] Reset PC-Lock (HWID) for a Customer")
    print(" [5] Exit")

    choice = input("\nEnter choice [1-5]: ").strip()

    if choice == "1":
        count = 100
        keys = generate_keys_batch(count)
        out_file = BASE_DIR / "tools" / f"generated_keys_{count}.txt"
        with open(out_file, "w", encoding="utf-8") as f:
            for k in keys:
                f.write(k + "\n")
        print(f"\n Successfully generated {count} license keys!")
        print(f"📁 Saved to: {out_file}")

    elif choice == "2":
        if not project_id:
            print("\n❌ Error: Please configure 'project_id' in storage/firebase_config.json first.")
            return
        
        try:
            count = int(input("\nHow many keys to generate (e.g. 50, 100)? ").strip() or "50")
        except ValueError:
            count = 50

        print(f"\nGenerating {count} keys...")
        keys = generate_keys_batch(count)
        
        # Save local copy first
        out_file = BASE_DIR / "tools" / f"uploaded_keys_{count}_{int(time.time())}.txt"
        with open(out_file, "w", encoding="utf-8") as f:
            for k in keys:
                f.write(k + "\n")

        print(f"Uploading {count} keys to Firebase Firestore collection 'licenses'...")
        success_count = 0
        consecutive_denied = 0

        for i, k in enumerate(keys, 1):
            ok, msg = upload_key_to_firestore(project_id, k)
            if ok:
                success_count += 1
                consecutive_denied = 0
                print(f" [{i}/{count}] Uploaded: {k}")
            else:
                print(f" [{i}/{count}] ❌ Failed: {k}")
                if "PERMISSION_DENIED" in msg or "403" in msg:
                    consecutive_denied += 1
                    if consecutive_denied >= 3:
                        print("\n" + "=" * 65)
                        print("❌ FIRESTORE PERMISSION DENIED (403 ERROR)")
                        print("=" * 65)
                        print("Firebase rules ne keys create karne se block kar diya hai.")
                        print("\nFIX (1 Minute):")
                        print("1. Firebase Console kholiye -> Firestore Database -> 'Rules' tab.")
                        print("2. 'allow create: if true;' add kijiye aur 'Publish' par click kijiye.")
                        print("   (Exact rules Step 3 in FIREBASE_SETUP_GUIDE.md mein likhi hain)")
                        print("=" * 65)
                        break
            time.sleep(0.05) # gentle rate-limiting

        print(f"\n Upload Summary: {success_count}/{count} keys created in Firestore.")
        print(f"📁 Keys list saved locally at: {out_file}")


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
