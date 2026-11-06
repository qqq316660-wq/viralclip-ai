# 🔥 Firebase License & Hardware-Lock (Node-Lock) Setup Guide
> **ViralClip AI Studio — 0 to Z Complete Step-by-Step Guide**
> 100% Free Forever • Zero Server Cost • 1 Key = 1 PC • Works 100% Offline After Activation

---

## 📌 Yeh System Kaise Kaam Karta Hai? (Architecture Summary)

1. **Aapka Dashboard / Database (Google Firebase Firestore):**
   * Google Firebase ka **Spark Plan (Free Tier)** life-time bilkul FREE hai (koi Credit Card nahi lagta).
   * Isme 50,000 reads/day aur 20,000 writes/day free milte hain (100-500 customers ke liye yeh 1% bhi use nahi hoga).
2. **Customer Onboarding & Activation:**
   * Customer software download karega aur open karega.
   * Usse pehle **Feature Showcase Onboarding** dikhega (AI Shorts engine, Kaggle/Colab GPU bridge, Hormozi karaoke subtitles, etc.).
   * Phir Registration screen par customer apna **Name**, **WhatsApp/Phone**, aur **License Key** daalega.
   * **Sirf pehli baar activate karte waqt 5 second ke liye internet chahiye hoga.**
3. **Hardware Node-Locking (Piracy Prevention):**
   * Software customer ke PC ka **Motherboard UUID + Windows Machine GUID** combine karke ek unique Hardware ID (`HWID`) generate karega.
   * Firebase database mein us key ke saamne woh `HWID` permanently lock ho jayega.
   * **Agar customer wahi key apne dost ko dega:** Dost ke computer ka HWID alag hoga, toh software turant bol dega:
     > *"Device Mismatch: This key is already registered to another computer. 1 Key is locked to 1 PC only."*
4. **100% Offline Launch:**
   * Activation ke baad computer par cryptographically signed license file (`storage/license.dat`) save ho jati hai.
   * Iske baad customer internet **hamesha ke liye band** kar sakta hai. Software **100% offline** chalega!

---

## 🛠️ Step-by-Step Setup Guide (0 to Z)

---

### Step 1: Free Firebase Project Banayein (2 Minutes)

1. Apne browser mein jao: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Apne Google Account se Sign In karo.
3. **"Add project"** (ya Create a project) button par click karo.
4. Project ka naam rakho: e.g. `viralclip-license`
5. **Google Analytics** toggle ko chahe toh **OFF** kar do (is project mein zaroorat nahi hai, fast setup hoga).
6. **"Create project"** par click karo. 10 second mein project ready ho jayega!
7. **"Continue"** par click karo.

---

### Step 2: Cloud Firestore Database Create Karein

1. Left sidebar mein menu dekho: **Build** par click karo -> **Firestore Database** choose karo.
2. **"Create database"** button par click karo.
3. **Database location**: Nearest region select kar lo (e.g. `asia-south1` for Mumbai, ya `us-central1`).
4. **Secure rules**: **"Start in test mode"** select karo aur **Next** -> **Enable** par click karo.
   *(Fikar mat karo, Step 3 mein hum iski secure production rules daalenge).*
5. Database create hone ke baad aapko blank Firestore screen dikhegi.

---

### Step 3: Database Security Rules Set Karein (Very Important)

Security rules isliye zaroori hain taaki koi bhi unauthorized user saari keys chori na kar sake, aur sirf apni di hui key ko verify/lock kar sake.

1. Firestore screen par upar **"Rules"** tab par click karo.
2. Jo default code wahan likha hai, usse hata kar yeh **exact rules** paste kar do:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /licenses/{licenseKey} {
      // 1. Koi bhi user sirf apni di hui specific key check kar sakta hai (puri database list nahi dekh sakta)
      allow get: if true;
      allow list: if false;

      // 2. Generator script ko nayi keys create karne do
      allow create: if true;

      // 3. HWID lock update tabhi hoga jab pehle se khali ho ya wahi same PC ho
      allow update: if request.resource.data.status == 'active'
                    && (resource.data.hwid == '' || resource.data.hwid == request.resource.data.hwid);

      // 4. Koi bhi key delete nahi kar sakta
      allow delete: if false;
    }
  }
}
```

3. Upar **"Publish"** button par click karo. 
   *(Ab aapka database 100% secure ho gaya!)*

---

### Step 4: Apne ViralClip Software ko Firebase se Connect Karein

1. Firebase Console mein left top corner par gear icon ⚙️ (**Project settings**) par click karo.
2. **General** tab ke andar aapko **Project ID** dikhegi (e.g. `viralclip-license-89a1f`).
3. Us **Project ID** ko copy kar lo.
4. Apne project folder mein is file ko open karo:
   👉 `storage/firebase_config.json`
5. Usme apna `project_id` paste kar do:

```json
{
  "project_id": "viralclip-license-89a1f",
  "api_key": ""
}
```
6. File save kar do! Bas, aapka backend Firebase se connect ho chuka hai!

---

### Step 5: 1-Click Mein 100 Keys Generate & Upload Karein

Aapko Firebase console mein ek-ek karke 100 keys type karne ki koi zaroorat nahi hai. Humne aapke liye ek automated script bana di hai:

1. Terminal ya Command Prompt kholo aur run karo:
```bash
python tools/license_manager.py
```
*(Ya fir agar aap bundled python use kar rahe ho):*
```powershell
& "C:\Users\Akash\AppData\Local\Programs\Autoclip v2\python\python.exe" tools/license_manager.py
```

2. Menu aayega:
```
=================================================================
   🚀 VIRALCLIP AI STUDIO - LICENSE KEY MANAGER & GENERATOR
=================================================================
 Connected Firebase Project: viralclip-license-89a1f

Select an action:
 [1] Generate 100 Keys (Save to text file)
 [2] Generate Custom Number of Keys & Upload to Firebase
 [3] Check Status of a License Key
 [4] Reset PC-Lock (HWID) for a Customer
 [5] Exit
```

3. Press **`2`** aur hit Enter.
4. Pucha jayega kitni keys banani hain (e.g., `100` daal kar Enter daba do).
5. Script turant:
   * 100 unique keys generate karegi (jaise `VC-7K9A-3M2W-8X1L`).
   * Ek-ek karke Firebase Firestore ke `licenses` collection mein upload kar degi.
   * Saari keys ki ek clean text file `tools/uploaded_keys_100_XXXX.txt` mein save kar degi!

---

### Step 6: Customer ko Software aur Key Kaise Dein?

1. Jab bhi koi customer software khareede ya maange:
   * `tools/uploaded_keys_100_XXXX.txt` file kholo.
   * Top se ek unused key copy karo (e.g. `VC-4B8Y-9N1P-7D2X`).
   * Customer ko installer (`ViralClip-AI-Studio-Setup.exe`) aur yeh **Key** de do.
2. **Customer ka Experience:**
   * Customer setup install karega aur app kholega.
   * Usko sabse pehle **Feature Showcase Slides** dikhengi.
   * Phir Registration screen par woh apna **Name**, **WhatsApp No.** aur **Key** daalega.
   * **"Activate Studio License"** par click karega (5 second mein activate ho jayega).
   * Ab woh apna Wi-Fi/Internet band karke zindagi bhar offline chala sakta hai!

---

### Step 7: Live Customers Dekhna & PC Reset Karna (Customer Support)

#### Firebase Console par dekhna:
* Firebase console mein **Firestore Database** -> **`licenses`** collection kholo.
* Wahan aapko har key ke saamne dikhega:
  * Customer ka Name
  * Customer ka Phone / WhatsApp
  * PC ka Hardware ID (`hwid`)
  * Date & Time

#### Agar customer laptop change kare ya format kare:
Customer aapko bolega: *"Bhai maine laptop format kar diya hai, meri key nahi chal rahi."*
* Option A: `python tools/license_manager.py` run karo -> Select **`[4] Reset PC-Lock`** -> Key enter karo. Turant reset!
* Option B: Firebase Console mein jao -> Us key ke document par click karo -> `hwid` field ko delete ya empty `""` kar do.
* Ab customer wahi key apne naye laptop par activate kar sakega!

---

### Step 8: Production Installer Re-build Karna

Jab bhi aap sab test kar lo aur distribution ke liye fresh setup installer banana chaho:
1. Frontend build:
```bash
cd frontend
npm run build
```
2. Inno Setup Compiler (`ISCC.exe`) se compile karo:
```powershell
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" "d:\ns1\ViralClip-Installer.iss"
```
3. Naya setup `installer_output\ViralClip-AI-Studio-Setup.exe` ready ho jayega jisme yeh poora licensing system built-in hoga!

---

## 🔒 Security Note (Developer Pro-Tip)
* Development aur testing ke waqt agar Firebase configure na ho, toh master demo key `VC-DEMO-2026` se app test ki ja sakti hai.
* Real users ke liye hamesha apna `project_id` daal kar `tools/license_manager.py` se generate ki gayi keys hi distribute karein.
* Sabhi generated keys cryptographically randomized hoti hain, isiliye koi bhi banda randomly key guess nahi kar sakta.
