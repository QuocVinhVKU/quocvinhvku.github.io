import datetime as dt
import getpass
import json
import pathlib
import urllib.error
import urllib.parse
import urllib.request

PROJECT_ID = "happychild-bff96"
API_KEY = "AIzaSyBj14KLG41cxU3swuX7KIfXaH18ZcoeXIU"
ROOT = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"
DOCUMENT_NAME_ROOT = f"projects/{PROJECT_ID}/databases/(default)/documents"
COMMIT_URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents:commit"
BACKUP_ROOT = pathlib.Path(r"D:\2DUnityGame\.codex\visualizations\2026\08\10\019feb26-42a0-7b03-a2b4-d63974183667\happychild-backups")
ACTOR_UID = "EplnbxgWTaal9N5QgflBWaT1LWG3"


class TimestampValue(str):
    pass


def request_json(url, *, method="GET", token=None, payload=None):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = None
    if payload is not None:
        headers["Content-Type"] = "application/json; charset=utf-8"
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            raw = response.read()
            return json.loads(raw.decode("utf-8")) if raw else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Firebase HTTP {error.code}: {detail}") from error


def sign_in(email, password):
    result = request_json(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}",
        method="POST",
        payload={"email": email, "password": password, "returnSecureToken": True},
    )
    return result["idToken"], result.get("localId", "")


def list_documents(token, path):
    documents, page_token = [], ""
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
    for key in ("stringValue", "booleanValue", "timestampValue", "doubleValue"):
        if key in value:
            return value[key]
    if "integerValue" in value:
        return int(value["integerValue"])
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
        "_name": document["name"],
        "_createTime": document.get("createTime"),
        "_updateTime": document.get("updateTime"),
        **{key: decode(value) for key, value in document.get("fields", {}).items()},
    }


def encode(value):
    if isinstance(value, TimestampValue):
        return {"timestampValue": str(value)}
    if value is None:
        return {"nullValue": None}
    if isinstance(value, bool):
        return {"booleanValue": value}
    if isinstance(value, int):
        return {"integerValue": str(value)}
    if isinstance(value, float):
        return {"doubleValue": value}
    if isinstance(value, list):
        return {"arrayValue": {"values": [encode(item) for item in value]}}
    if isinstance(value, dict):
        return {"mapValue": {"fields": {key: encode(item) for key, item in value.items()}}}
    return {"stringValue": str(value)}


def fields(data):
    return {key: encode(value) for key, value in data.items()}


def update_write(document, changes):
    return {
        "update": {"name": document["_name"], "fields": fields(changes)},
        "updateMask": {"fieldPaths": list(changes)},
        "currentDocument": {"updateTime": document["_updateTime"]},
    }


def create_write(path, data):
    return {
        "update": {"name": f"{DOCUMENT_NAME_ROOT}/{path}", "fields": fields(data)},
        "currentDocument": {"exists": False},
    }


email = input("Firebase email: ").strip()
password = getpass.getpass("Firebase password: ")
token, uid = sign_in(email, password)
if uid != ACTOR_UID:
    raise RuntimeError("Tài khoản đăng nhập không đúng chủ sở hữu HappyChild.")

collection_names = (
    "students",
    "teachers",
    "studentForms",
    "scheduleTemplates",
    "weeks",
    "notes",
    "makeupTransactions",
    "auditLogs",
)
raw_collections = {name: list_documents(token, name) for name in collection_names}
collections = {name: [unpack(document) for document in documents] for name, documents in raw_collections.items()}
raw_sessions, sessions = {}, {}
for week in collections["weeks"]:
    path = f"weeks/{week['id']}/sessions"
    raw_sessions[week["id"]] = list_documents(token, path)
    sessions[week["id"]] = [unpack(document) for document in raw_sessions[week["id"]]]

backup = {
    "projectId": PROJECT_ID,
    "createdAt": dt.datetime.now(dt.timezone.utc).isoformat(),
    "collections": raw_collections,
    "weekSessions": raw_sessions,
}
BACKUP_ROOT.mkdir(parents=True, exist_ok=True)
backup_path = BACKUP_ROOT / f"before-identity-schedule-{dt.datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
backup_path.write_text(json.dumps(backup, ensure_ascii=False, indent=2), encoding="utf-8")

students_by_name = {item.get("fullName"): item for item in collections["students"]}
teachers_by_name = {item.get("fullName"): item for item in collections["teachers"]}
required_students = ("Gấu", "VĨNH AN - BƠ", "TRIẾT", "NẾP")
required_teachers = ("Cô Dương", "Cô Hân", "Cô Ngọc")
missing = [name for name in (*required_students, *required_teachers) if name not in students_by_name and name not in teachers_by_name]
if missing:
    raise RuntimeError(f"Thiếu hồ sơ bắt buộc: {', '.join(missing)}")

gau, bo, triet, nep = (students_by_name[name] for name in required_students)
co_duong, co_han, co_ngoc = (teachers_by_name[name] for name in required_teachers)
templates_by_id = {item["id"]: item for item in collections["scheduleTemplates"]}
all_session_ids = {item["id"] for group in sessions.values() for item in group}
now = TimestampValue(dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z"))
writes = []

# Lịch 09:00 đang mang tên TRIẾT thực chất là lịch của Bơ.
old_triet_ids = [f"t8-r25-d{day}-0900-1000" for day in (0, 2, 4)]
for template_id in old_triet_ids:
    document = templates_by_id.get(template_id)
    if not document:
        raise RuntimeError(f"Không tìm thấy lịch mẫu cần chuyển cho Bơ: {template_id}")
    writes.append(update_write(document, {
        "studentId": bo["id"],
        "note": "Hiệu chỉnh 22/08/2026: lịch của Bơ thay cho lịch TRIẾT cũ.",
        "updatedAt": now,
        "updatedBy": ACTOR_UID,
    }))

schedule_rows = []
schedule_rows.extend((f"identity-gau-d{day}-0800-0900", gau, co_duong, day, "08:00", "09:00", "Gộp DUY THÔNG vào Gấu") for day in range(6))
schedule_rows.extend((f"identity-triet-d{day}-1705-1805", triet, co_han, day, "17:05", "18:05", "Gộp DẦN vào TRIẾT") for day in (0, 2, 4))
schedule_rows.extend((f"identity-nep-d{day}-1810-1910", nep, co_ngoc, day, "18:10", "19:10", "Sửa lịch Nếp Thứ 3 và Thứ 5 lúc 18:10") for day in (1, 3))

for template_id, person, teacher, day, start, end, note in schedule_rows:
    if template_id in templates_by_id:
        raise RuntimeError(f"Lịch hiệu chỉnh đã tồn tại, dừng để tránh tạo trùng: {template_id}")
    writes.append(create_write(f"scheduleTemplates/{template_id}", {
        "studentId": person["id"], "teacherId": teacher["id"], "dayOfWeek": day,
        "startTime": start, "endTime": end, "capacity": 1, "active": True,
        "note": note, "createdAt": now, "updatedAt": now,
        "createdBy": ACTOR_UID, "updatedBy": ACTOR_UID,
    }))

for week in collections["weeks"]:
    week_sessions = sessions[week["id"]]
    week_by_id = {item["id"]: item for item in week_sessions}
    for template_id in old_triet_ids:
        session_id = f"template-{template_id}"
        document = week_by_id.get(session_id)
        if document:
            writes.append(update_write(document, {
                "studentId": bo["id"],
                "note": "Hiệu chỉnh 22/08/2026: lịch của Bơ thay cho lịch TRIẾT cũ.",
                "updatedAt": now,
                "updatedBy": ACTOR_UID,
            }))
    start_value = str(week.get("startDate", ""))[:10]
    try:
        monday = dt.date.fromisoformat(start_value)
    except ValueError:
        raise RuntimeError(f"Tuần {week['id']} có startDate không hợp lệ: {week.get('startDate')}")
    for template_id, person, teacher, day, start, end, note in schedule_rows:
        session_id = f"template-{template_id}"
        if session_id in all_session_ids:
            raise RuntimeError(f"Buổi hiệu chỉnh đã tồn tại, dừng để tránh tạo trùng: {session_id}")
        date_value = monday + dt.timedelta(days=day)
        writes.append(create_write(f"weeks/{week['id']}/sessions/{session_id}", {
            "studentId": person["id"], "teacherId": teacher["id"],
            "date": TimestampValue(f"{date_value.isoformat()}T05:00:00.000Z"), "dateKey": date_value.isoformat(),
            "dayOfWeek": day, "startTime": start, "endTime": end, "capacity": 1,
            "type": "regular", "status": "scheduled", "sourceTemplateId": template_id,
            "note": note, "createdAt": now, "updatedAt": now,
            "createdBy": ACTOR_UID, "updatedBy": ACTOR_UID,
        }))

audit_id = f"identity-schedule-{dt.datetime.now().strftime('%Y%m%d%H%M%S')}"
writes.append(create_write(f"auditLogs/{audit_id}", {
    "entityType": "scheduleMigration", "entityId": audit_id, "action": "identity_schedule_corrected",
    "before": {"aliases": ["DUY THÔNG", "DẦN"], "reassignedSchedule": "TRIẾT 09:00"},
    "after": {"students": [gau["id"], bo["id"], triet["id"], nep["id"]], "writes": len(writes) + 1},
    "reason": "Gộp DUY THÔNG = Gấu; lịch Bơ thay lịch TRIẾT; DẦN = TRIẾT; Nếp Thứ 3/5 18:10.",
    "userId": ACTOR_UID, "createdAt": now,
}))

print(json.dumps({
    "backup": str(backup_path),
    "preflight": {
        "writes": len(writes),
        "templateUpdates": 3,
        "templateCreates": len(schedule_rows),
        "weeks": len(collections["weeks"]),
        "expectedSessionUpdates": sum(1 for write in writes if "weeks/" in write["update"]["name"] and write.get("updateMask")),
        "expectedSessionCreates": sum(1 for write in writes if "weeks/" in write["update"]["name"] and not write.get("updateMask")),
    },
}, ensure_ascii=False, indent=2))

confirmation = input("Nhập APPLY để thực hiện giao dịch nguyên tử: ").strip()
if confirmation != "APPLY":
    print("Đã dừng sau khi sao lưu; chưa thay đổi Firebase.")
    raise SystemExit(0)

result = request_json(COMMIT_URL, method="POST", token=token, payload={"writes": writes})
print(json.dumps({"status": "committed", "writeResults": len(result.get("writeResults", [])), "commitTime": result.get("commitTime"), "backup": str(backup_path)}, ensure_ascii=False, indent=2))
