import os
import json
import base64
import hashlib
import hmac
import time
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import requests

from app.config import STORAGE_DIR

LICENSE_FILE = STORAGE_DIR / "license.dat"
FIREBASE_CONFIG_FILE = STORAGE_DIR / "firebase_config.json"

# Internal salt for local HMAC verification
_SECRET_SALT = "viralclip_ai_studio_node_lock_salt_2026_x99"

def get_hardware_id() -> str:
    """
    Generate a rock-solid, hardware-bound unique identifier for this Windows machine.
    Uses Windows MachineGuid combined with Motherboard UUID.
    """
    guid = ""
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography") as key:
            guid, _ = winreg.QueryValueEx(key, "MachineGuid")
    except Exception:
        pass

    mb_uuid = ""
    try:
        import subprocess
        out = subprocess.check_output("wmic csproduct get uuid", shell=True, text=True, stderr=subprocess.DEVNULL)
        lines = [l.strip() for l in out.splitlines() if l.strip() and "UUID" not in l]
        if lines:
            mb_uuid = lines[0]
    except Exception:
        pass

    raw_seed = f"{guid}|{mb_uuid}|viralclip_hwid_v1"
    digest = hashlib.sha256(raw_seed.encode("utf-8")).hexdigest()[:16].upper()
    return f"{digest[0:4]}-{digest[4:8]}-{digest[8:12]}-{digest[12:16]}"


def check_internet_connectivity(timeout: float = 3.0) -> bool:
    """
    Check if the user currently has an active internet connection.
    Pings fast public DNS/HTTP endpoints.
    """
    test_urls = [
        "https://www.google.com",
        "https://1.1.1.1",
        "https://firestore.googleapis.com"
    ]
    for url in test_urls:
        try:
            res = requests.get(url, timeout=timeout)
            if res.status_code in [200, 204, 301, 302, 404]:
                return True
        except Exception:
            continue
    return False


def get_firebase_config() -> Dict[str, str]:
    """Load Firebase project settings from storage/firebase_config.json or environment."""
    if FIREBASE_CONFIG_FILE.exists():
        try:
            with open(FIREBASE_CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    # Default template
    default_config = {
        "project_id": os.environ.get("FIREBASE_PROJECT_ID", ""),
        "api_key": os.environ.get("FIREBASE_API_KEY", "")
    }
    try:
        with open(FIREBASE_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(default_config, f, indent=2)
    except Exception:
        pass
    return default_config


def compute_signature(key: str, hwid: str, name: str) -> str:
    """Compute HMAC-SHA256 signature for local offline verification."""
    message = f"{key.strip().upper()}:{hwid.strip().upper()}:{name.strip()}"
    return hmac.new(_SECRET_SALT.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()


def get_local_license() -> Optional[Dict[str, Any]]:
    """
    Read and verify local cached license file.
    Works 100% OFFLINE without any network request.
    """
    if not LICENSE_FILE.exists():
        return None

    try:
        with open(LICENSE_FILE, "r", encoding="utf-8") as f:
            encoded_data = f.read().strip()

        raw_json = base64.b64decode(encoded_data).decode("utf-8")
        license_data = json.loads(raw_json)

        key = license_data.get("key", "")
        saved_hwid = license_data.get("hwid", "")
        name = license_data.get("registered_name", "")
        saved_sig = license_data.get("signature", "")

        current_hwid = get_hardware_id()

        # HWID must strictly match this computer
        if saved_hwid != current_hwid:
            return None

        # Signature must match
        expected_sig = compute_signature(key, current_hwid, name)
        if saved_sig != expected_sig:
            return None

        return license_data
    except Exception:
        return None


def save_local_license(key: str, hwid: str, name: str, phone: str = "") -> bool:
    """Save encrypted local license token for 100% offline launches."""
    try:
        sig = compute_signature(key, hwid, name)
        payload = {
            "key": key.strip().upper(),
            "hwid": hwid.strip().upper(),
            "registered_name": name.strip(),
            "registered_phone": phone.strip(),
            "activated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "signature": sig
        }
        raw_json = json.dumps(payload)
        encoded = base64.b64encode(raw_json.encode("utf-8")).decode("utf-8")

        with open(LICENSE_FILE, "w", encoding="utf-8") as f:
            f.write(encoded)
        return True
    except Exception:
        return False


def verify_and_activate_with_firebase(license_key: str, name: str, phone: str = "") -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Validate and bind license key to this machine's HWID using Firebase Firestore REST API.
    Requires one-time internet connection.
    """
    clean_key = license_key.strip().upper()
    current_hwid = get_hardware_id()

    # Step 1: Internet Connectivity Check
    if not check_internet_connectivity():
        return False, "Internet connection required: Please connect to the internet for a one-time activation. Once activated, the software works 100% offline forever.", None

    # Step 2: Firebase Configuration
    fb_config = get_firebase_config()
    project_id = fb_config.get("project_id", "").strip()

    # Dev / Demo Key Bypass (if project is not yet set up by user)
    if not project_id or project_id == "YOUR_FIREBASE_PROJECT_ID":
        # Allow demo master key for local preview / developer testing
        if clean_key.startswith("VC-DEMO") or clean_key == "VC-PRO-2026":
            save_local_license(clean_key, current_hwid, name or "Demo User", phone)
            return True, "Activated via Demo Key (Configure Firebase Project ID in firebase_config.json for live keys)", {
                "key": clean_key,
                "hwid": current_hwid,
                "registered_name": name or "Demo User",
                "registered_phone": phone
            }
        return False, "Firebase Project ID is not configured yet. Please follow FIREBASE_SETUP_GUIDE.md to set your Project ID in storage/firebase_config.json.", None

    # Step 3: Fetch License Document from Firestore REST API
    # Document URL format: https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/licenses/{clean_key}
    url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/licenses/{clean_key}"

    try:
        res = requests.get(url, timeout=7.0)
    except Exception as e:
        return False, f"Could not reach Firebase server: {str(e)}", None

    if res.status_code == 404:
        return False, "Invalid License Key: This key does not exist in the database. Please verify and try again.", None

    if res.status_code != 200:
        return False, f"Firebase server error ({res.status_code}): Please check Firestore Security Rules.", None

    doc_data = res.json()
    fields = doc_data.get("fields", {})

    existing_hwid = fields.get("hwid", {}).get("stringValue", "").strip()
    status = fields.get("status", {}).get("stringValue", "active").strip().lower()

    if status == "banned":
        return False, "This license key has been suspended or revoked. Please contact support.", None

    # Case A: Key is fresh and unassigned (FIRST-TIME ACTIVATION)
    if not existing_hwid:
        patch_url = f"{url}?updateMask.fieldPaths=hwid&updateMask.fieldPaths=registered_name&updateMask.fieldPaths=registered_phone&updateMask.fieldPaths=activated_at&updateMask.fieldPaths=status"
        patch_payload = {
            "fields": {
                "hwid": {"stringValue": current_hwid},
                "registered_name": {"stringValue": name.strip()},
                "registered_phone": {"stringValue": phone.strip()},
                "activated_at": {"stringValue": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())},
                "status": {"stringValue": "active"}
            }
        }
        try:
            patch_res = requests.patch(patch_url, json=patch_payload, timeout=7.0)
            if patch_res.status_code not in [200, 204]:
                return False, "Failed to lock hardware ID to Firebase. Please check Firestore write permissions.", None
        except Exception as e:
            return False, f"Network error during hardware lock: {str(e)}", None

        # Successfully locked to this HWID! Save offline token
        save_local_license(clean_key, current_hwid, name, phone)
        return True, "License successfully activated and locked to this machine!", {
            "key": clean_key,
            "hwid": current_hwid,
            "registered_name": name,
            "registered_phone": phone
        }

    # Case B: Key was already activated on THIS SAME machine
    if existing_hwid == current_hwid:
        save_local_license(clean_key, current_hwid, name or fields.get("registered_name", {}).get("stringValue", ""), phone)
        return True, "License validated successfully for this machine!", {
            "key": clean_key,
            "hwid": current_hwid,
            "registered_name": name or fields.get("registered_name", {}).get("stringValue", ""),
            "registered_phone": phone
        }

    # Case C: Key is already locked to a DIFFERENT machine (PIRACY PREVENTED)
    return False, f"Device Mismatch: This key is already registered to another computer. 1 License Key is locked to 1 PC only.", None
