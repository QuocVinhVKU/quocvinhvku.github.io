import getpass
import json
import sys
import urllib.parse
import urllib.request

PROJECT_ID = "happychild-bff96"
API_KEY = "AIzaSyBj14KLG41cxU3swuX7KIfXaH18ZcoeXIU"
ROOT = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"


def request_json(url, *, method="GET", token=None, payload=None):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = None
    if payload is not None:
        headers["Content-Type"] = "application/json; charset=utf-8"
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=90) as response:
        raw = response.read()
        return json.loads(raw.decode("utf-8")) if raw else {}


def sign_in(email, password):
    result = request_json(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}",
        method="POST",
        payload={"email": email, "password": password, "returnSecureToken": True},
    )
    return result["idToken"]


def list_documents(token, path):
    documents = []
    page_token = ""
    while True:
        params = {"pageSize": "300", "showMissing": "false"}
        if page_token:
            params["pageToken"] = page_token
        result = request_json(f"{ROOT}/{path}?{urllib.parse.urlencode(params)}", token=token)
        documents.extend(result.get("documents", []))
        page_token = result.get("nextPageToken", "")
        if not page_token:
            return documents


def decode(value):
    if "stringValue" in value:
        return value["stringValue"]
    if "integerValue" in value:
        return int(value["integerValue"])
    if "doubleValue" in value:
        return value["doubleValue"]
    if "booleanValue" in value:
        return value["booleanValue"]
    if "timestampValue" in value:
        return value["timestampValue"]
    if "nullValue" in value:
        return None
    if "arrayValue" in value:
        return [decode(item) for item in value["arrayValue"].get("values", [])]
    if "mapValue" in value:
        return {key: decode(item) for key, item in value["mapValue"].get("fields", {}).items()}
    return value


def unpack(document):
    return {
        "id": document["name"].rsplit("/", 1)[-1],
        **{key: decode(value) for key, value in document.get("fields", {}).items()},
    }


email = input("Firebase email (read-only): ").strip()
password = getpass.getpass("Firebase password: ")
token = sign_in(email, password)

collections = {
    name: [unpack(doc) for doc in list_documents(token, name)]
    for name in ("students", "teachers", "studentForms", "scheduleTemplates", "weeks")
}
target_names = {"Gấu", "VĨNH AN - BƠ", "TRIẾT", "NẾP"}
students = [item for item in collections["students"] if item.get("fullName") in target_names]
student_ids = {item["id"] for item in students}
forms = [item for item in collections["studentForms"] if item.get("studentId") in student_ids]
templates = [item for item in collections["scheduleTemplates"] if item.get("studentId") in student_ids]

sessions = []
for week in collections["weeks"]:
    for document in list_documents(token, f"weeks/{week['id']}/sessions"):
        item = unpack(document)
        item["weekId"] = week["id"]
        item["weekLabel"] = week.get("label")
        if item.get("studentId") in student_ids:
            sessions.append(item)

birthday_month = "08"
birthday_students = [
    {"id": item["id"], "fullName": item.get("fullName"), "birthday": item.get("birthday")}
    for item in collections["students"]
    if str(item.get("birthday", ""))[5:7] == birthday_month and item.get("active", True)
]
birthday_teachers = [
    {"id": item["id"], "fullName": item.get("fullName"), "birthday": item.get("birthday")}
    for item in collections["teachers"]
    if str(item.get("birthday", ""))[5:7] == birthday_month and item.get("active", True)
]

result = {
    "counts": {key: len(value) for key, value in collections.items()},
    "students": students,
    "forms": forms,
    "templates": templates,
    "weeks": collections["weeks"],
    "sessions": sessions,
    "birthdaysAugust": {
        "students": birthday_students,
        "teachers": birthday_teachers,
        "total": len(birthday_students) + len(birthday_teachers),
    },
}
print(json.dumps(result["birthdaysAugust"] if "--birthdays" in sys.argv else result, ensure_ascii=False, indent=2))
