import getpass
import json
import urllib.error
import urllib.request

PROJECT_ID = "happychild-bff96"
API_KEY = "AIzaSyBj14KLG41cxU3swuX7KIfXaH18ZcoeXIU"
UID = "EplnbxgWTaal9N5QgflBWaT1LWG3"
FORM_ID = "student-form-sheet5-r25"
DOCUMENT_NAME = f"projects/{PROJECT_ID}/databases/(default)/documents/studentForms/{FORM_ID}"
DOCUMENT_URL = f"https://firestore.googleapis.com/v1/{DOCUMENT_NAME}"
COMMIT_URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents:commit"


def request_json(url, *, method="GET", token=None, payload=None):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = None
    if payload is not None:
        headers["Content-Type"] = "application/json; charset=utf-8"
        body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Firebase HTTP {error.code}: {detail}") from error


email = input("Firebase email: ").strip()
password = getpass.getpass("Firebase password: ")
auth = request_json(
    f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}",
    method="POST",
    payload={"email": email, "password": password, "returnSecureToken": True},
)
if auth.get("localId") != UID:
    raise RuntimeError("Sai tài khoản chủ sở hữu.")
token = auth["idToken"]
document = request_json(DOCUMENT_URL, token=token)
existing_history = document.get("fields", {}).get("linkHistory", {"arrayValue": {}})
write = {
    "update": {
        "name": DOCUMENT_NAME,
        "fields": {
            "linkHistory": existing_history,
            "updatedBy": {"stringValue": UID},
        },
    },
    "updateMask": {"fieldPaths": ["linkHistory", "updatedBy"]},
    "updateTransforms": [{"fieldPath": "updatedAt", "setToServerValue": "REQUEST_TIME"}],
    "currentDocument": {"updateTime": document["updateTime"]},
}
result = request_json(COMMIT_URL, method="POST", token=token, payload={"writes": [write]})
print(json.dumps({"status": "rules_accept_linkHistory", "formId": FORM_ID, "commitTime": result.get("commitTime")}, ensure_ascii=False))
