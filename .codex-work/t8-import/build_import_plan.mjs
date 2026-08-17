import fs from "node:fs/promises";
import crypto from "node:crypto";

const sourcePath = "D:/Downloads/T8 (1).xlsx";
const outputDir = "D:/2DUnityGame/.codex/visualizations/2026/08/10/019feb26-42a0-7b03-a2b4-d63974183667/happychild-t8-import-work";
const rosterPath = "../../../.codex/visualizations/2026/08/10/019feb26-42a0-7b03-a2b4-d63974183667/happychild-sheet5-import-work/happychild-sheet5-import.json";
const schedule = JSON.parse(await fs.readFile("schedule_raw.json", "utf8"));
const roster = JSON.parse(await fs.readFile(rosterPath, "utf8"));

const normalize = value => String(value || "")
  .normalize("NFC").toLocaleUpperCase("vi")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim().replace(/\s+/g, " ");

const aliases = {
  "HUY BẮP": "GIA HUY BẮP",
  "MON": "MON NGUYÊN",
  "M HOÀNG MON": "MINH HOÀNG MON",
  "HY": "NAM HY",
  "BEN 9H": "BEN SÁNG",
  "XÁ XÍU": "XÍU",
  "MINH": "KHẢI MINH",
  "MINH KEN ALN": "MINH KEN",
  "PHÚC LỚN": "THIÊN PHÚC",
  "THƯ": "QUỲNH THƯ",
  "BUN": "KHẢI BUN",
  "D KHANG": "DUY KHANG",
  "KHÁNH NGỌC NA": "NGỌC NA",
  "GIA KHANG 3T": "KHANG 3T",
  "THÀNH": "ĐỨC THÀNH",
  "ĐỨC AN": "BEN AN",
};

const teacherColors = {
  "teacher-sheet5-tien": "#B6D7A8",
  "teacher-sheet5-thuy": "#C482D2",
  "teacher-sheet5-han": "#548235",
  "teacher-sheet5-duong": "#FBBC04",
  "teacher-sheet5-mai": "#FF0000",
  "teacher-sheet5-ngoc": "#134F5C",
  "teacher-sheet5-quynh": "#F48E93",
};

// Màu nằm trên từng ô giờ mới là giáo viên thực dạy. Một học sinh có thể
// học với nhiều cô trong tuần, vì vậy không được lấy primaryTeacherId/Form.
const teacherIdByFill = {
  "B6D7A8": "teacher-sheet5-tien",
  "D9EAD3": "teacher-sheet5-tien",
  "C482D2": "teacher-sheet5-thuy",
  "548235": "teacher-sheet5-han",
  "38761D": "teacher-sheet5-han",
  "FBBC04": "teacher-sheet5-duong",
  "FFC000": "teacher-sheet5-duong",
  "E0A31E": "teacher-sheet5-duong",
  "FF0000": "teacher-sheet5-mai",
  "134F5C": "teacher-sheet5-ngoc",
  "F48E93": "teacher-sheet5-quynh",
};
const coloredFills = new Set(Object.keys(teacherIdByFill));
const studentByName = new Map(roster.students.map(student => [normalize(student.fullName), student]));
const teacherById = new Map(roster.teachers.map(teacher => [teacher.id, teacher]));
const formByStudent = new Map(roster.studentForms.map(form => [form.studentId, form]));

function parseTime(value) {
  const compact = String(value || "").toLocaleUpperCase("vi").replace(/\s+/g, "");
  const known = {
    "8H-9H": ["08:00", "09:00"],
    "8H": ["08:00", "09:00"],
    "9H": ["09:00", "10:00"],
    "3H-4H": ["15:00", "16:00"],
    "3H": ["15:00", "16:00"],
    "4-5H": ["16:00", "17:00"],
    "4H-5H": ["16:00", "17:00"],
    "5H5-6H5": ["17:05", "18:05"],
    "5H": ["17:00", "18:00"],
    "6H10-7H10": ["18:10", "19:10"],
    "7H15-8H15": ["19:15", "20:15"],
  };
  return known[compact] || null;
}

const skipped = [];
const dedupe = new Map();
const matchedStudents = new Set();

for (const column of schedule.columns) {
  const sourceName = normalize(column.header);
  const targetName = aliases[sourceName] || sourceName;
  const student = studentByName.get(targetName);
  if (!student) {
    skipped.push({ column: column.column, sourceName: column.header, reason: "student_not_in_current_roster", cells: column.schedule.length });
    continue;
  }
  matchedStudents.add(student.id);
  for (const cell of column.schedule) {
    const raw = String(cell.value || "").trim();
    if (/^bù(?:\s|$)/iu.test(raw)) {
      skipped.push({ column: column.column, sourceName: column.header, row: cell.row, value: raw, reason: "makeup_not_fixed" });
      continue;
    }
    if (!coloredFills.has(cell.fill)) {
      skipped.push({ column: column.column, sourceName: column.header, row: cell.row, value: raw, reason: "uncolored_exception" });
      continue;
    }
    const teacherId = teacherIdByFill[cell.fill];
    if (!teacherById.has(teacherId)) throw new Error(`Không tìm thấy giáo viên cho màu #${cell.fill} tại ${column.column}${cell.row}`);
    const time = parseTime(raw);
    if (!time) {
      skipped.push({ column: column.column, sourceName: column.header, row: cell.row, value: raw, reason: "unsupported_time" });
      continue;
    }
    const excelDay = Number(cell.day);
    const dayOfWeek = excelDay >= 2 && excelDay <= 7 ? excelDay - 2 : excelDay === 8 ? 6 : null;
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) throw new Error(`Thứ không hợp lệ tại ${column.column}${cell.row}`);
    const [startTime, endTime] = time;
    const key = `${student.id}|${dayOfWeek}|${startTime}|${endTime}`;
    const current = dedupe.get(key);
    if (current) {
      if (current.teacherId !== teacherId) throw new Error(`Một lịch trùng có hai màu giáo viên tại ${current.sourceCells.join(", ")} và ${column.column}${cell.row}`);
      current.sourceColumns.push(column.column);
      current.sourceCells.push(`${column.column}${cell.row}`);
      current.sourceColors.push(`#${cell.fill}`);
      continue;
    }
    const id = `t8-${student.id.replace(/^student-sheet5-/, "")}-d${dayOfWeek}-${startTime.replace(":", "")}-${endTime.replace(":", "")}`;
    dedupe.set(key, {
      id,
      studentId: student.id,
      studentName: student.fullName,
      teacherId,
      teacherName: teacherById.get(teacherId).fullName,
      dayOfWeek,
      startTime,
      endTime,
      capacity: 1,
      active: true,
      note: `Nhập từ T8 (1).xlsx · Trang tính2 · ${column.column}${cell.row}`,
      sourceColumns: [column.column],
      sourceCells: [`${column.column}${cell.row}`],
      sourceColors: [`#${cell.fill}`],
    });
  }
}

const templates = [...dedupe.values()].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime) || a.teacherId.localeCompare(b.teacherId) || a.studentName.localeCompare(b.studentName, "vi"));

for (const template of templates) {
  if (!/^#[0-9A-F]{6}$/i.test(teacherColors[template.teacherId] || "")) throw new Error(`Thiếu màu giáo viên ${template.teacherName}`);
  if (!/^\d{2}:\d{2}$/.test(template.startTime) || template.startTime >= template.endTime) throw new Error(`Giờ không hợp lệ: ${template.id}`);
}

const byStudentDay = new Map();
const byTeacherDay = new Map();
for (const template of templates) {
  const studentKey = `${template.studentId}|${template.dayOfWeek}`;
  const teacherKey = `${template.teacherId}|${template.dayOfWeek}`;
  if (!byStudentDay.has(studentKey)) byStudentDay.set(studentKey, []);
  if (!byTeacherDay.has(teacherKey)) byTeacherDay.set(teacherKey, []);
  byStudentDay.get(studentKey).push(template);
  byTeacherDay.get(teacherKey).push(template);
}
for (const [key, items] of byStudentDay) {
  items.sort((a, b) => a.startTime.localeCompare(b.startTime));
  for (let i = 1; i < items.length; i += 1) if (items[i].startTime < items[i - 1].endTime) throw new Error(`Học sinh trùng giờ ${key}: ${items[i - 1].id} / ${items[i].id}`);
}
for (const [key, items] of byTeacherDay) {
  for (let i = 0; i < items.length; i += 1) for (let j = i + 1; j < items.length; j += 1) {
    const a = items[i], b = items[j], overlap = a.startTime < b.endTime && b.startTime < a.endTime, same = a.startTime === b.startTime && a.endTime === b.endTime;
    if (overlap && !same) throw new Error(`Giáo viên có hai khung giao nhau ${key}: ${a.id} / ${b.id}`);
  }
}

const sourceBytes = await fs.readFile(sourcePath);
const sourceSha256 = crypto.createHash("sha256").update(sourceBytes).digest("hex");
const missingCurrentStudents = roster.students.filter(student => !matchedStudents.has(student.id)).map(student => ({ id: student.id, fullName: student.fullName, teacherId: formByStudent.get(student.id)?.teacherId || student.primaryTeacherId }));
const totalsByTeacher = {};
const totalsByDay = Array(7).fill(0);
for (const template of templates) {
  totalsByTeacher[template.teacherName] = (totalsByTeacher[template.teacherName] || 0) + 1;
  totalsByDay[template.dayOfWeek] += 1;
}
const plan = {
  metadata: {
    sourcePath,
    sourceWorkbook: "T8 (1).xlsx",
    sourceSheet: "Trang tính2",
    sourceRange: "A1:BU35",
    sourceSha256,
    generatedAt: new Date().toISOString(),
    templateCount: templates.length,
    matchedStudentCount: new Set(templates.map(template => template.studentId)).size,
    skippedCount: skipped.length,
    totalsByTeacher,
    totalsByDay,
  },
  teacherColors,
  templates,
  skipped,
  missingCurrentStudents,
  aliasDecisions: aliases,
};

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(`${outputDir}/t8-template-import-plan.json`, JSON.stringify(plan, null, 2));
console.log(JSON.stringify({ metadata: plan.metadata, skipped, missingCurrentStudents }, null, 2));
