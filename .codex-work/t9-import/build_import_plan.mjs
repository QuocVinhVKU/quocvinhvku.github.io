import fs from "node:fs/promises";
import crypto from "node:crypto";
import { parseScheduleTimeRange } from "../../happychild/js/utils.js";

const sourcePath = "D:/Downloads/T9.xlsx";
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
  "BEN KHOA": "ĐĂNG KHOA",
  "D KHANG": "DUY KHANG",
  "KHÁNH NGỌC NA": "NGỌC NA",
  "GIA KHANG 3T": "KHANG 3T",
  "THÀNH": "ĐỨC THÀNH",
  "ĐỨC AN": "BEN AN",
  "DUY THÔNG": "GẤU",
  "BƠ": "VĨNH AN BƠ",
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
const teacherIdByFill = {
  B6D7A8: "teacher-sheet5-tien", D9EAD3: "teacher-sheet5-tien",
  C482D2: "teacher-sheet5-thuy",
  548235: "teacher-sheet5-han", "38761D": "teacher-sheet5-han",
  FBBC04: "teacher-sheet5-duong", FFC000: "teacher-sheet5-duong", E0A31E: "teacher-sheet5-duong",
  FF0000: "teacher-sheet5-mai",
  "134F5C": "teacher-sheet5-ngoc",
  F48E93: "teacher-sheet5-quynh",
};

const rosterByName = new Map(roster.students.map(student => [normalize(student.fullName), student]));
const teacherById = new Map(roster.teachers.map(teacher => [teacher.id, teacher]));
const displayByNormalized = new Map(roster.students.map(student => [normalize(student.fullName), student.fullName]));
const skipped = [];
const dedupe = new Map();

for (const column of schedule.columns) {
  const sourceName = normalize(column.header);
  const targetName = aliases[sourceName] || sourceName;
  const rosterStudent = rosterByName.get(targetName);
  const studentName = rosterStudent?.fullName || String(column.header).trim();

  // T9 có hai cột VY. Cột V chỉ có đúng một ô 15:00–16:00 Thứ Bảy;
  // chủ cơ sở yêu cầu bỏ riêng ô/cột lẻ này, vẫn giữ lịch VY ở cột BR.
  if (sourceName === "VY" && column.schedule.length === 1) {
    skipped.push({ column: column.column, sourceName: column.header, cells: column.schedule.length, reason: "vy_single_slot_removed_by_owner" });
    continue;
  }

  for (const cell of column.schedule) {
    const raw = String(cell.value || "").trim();
    if (/^bù(?:\s|$)/iu.test(raw)) {
      skipped.push({ column: column.column, sourceName: column.header, row: cell.row, value: raw, reason: "makeup_not_fixed" });
      continue;
    }
    const teacherId = teacherIdByFill[cell.fill];
    if (!teacherId) {
      skipped.push({ column: column.column, sourceName: column.header, row: cell.row, value: raw, reason: "uncolored_exception" });
      continue;
    }
    if (!teacherById.has(teacherId)) throw new Error(`Không tìm thấy giáo viên cho màu #${cell.fill} tại ${column.column}${cell.row}`);
    const time = parseScheduleTimeRange(raw);
    if (!time) {
      skipped.push({ column: column.column, sourceName: column.header, row: cell.row, value: raw, reason: "unsupported_time" });
      continue;
    }
    const excelDay = Number(cell.day);
    const dayOfWeek = excelDay >= 2 && excelDay <= 7 ? excelDay - 2 : excelDay === 8 ? 6 : null;
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) throw new Error(`Thứ không hợp lệ tại ${column.column}${cell.row}`);
    const [startTime, endTime] = time;
    const key = `${targetName}|${dayOfWeek}|${startTime}|${endTime}`;
    const current = dedupe.get(key);
    if (current) {
      if (current.teacherId !== teacherId) throw new Error(`Một lịch trùng có hai cô tại ${current.sourceCells.join(", ")} và ${column.column}${cell.row}`);
      current.sourceCells.push(`${column.column}${cell.row}`);
      continue;
    }
    const idHash = crypto.createHash("sha1").update(key).digest("hex").slice(0, 16);
    dedupe.set(key, {
      id: `t9-${idHash}`,
      studentKey: targetName,
      studentName,
      studentIdHint: rosterStudent?.id || "",
      teacherId,
      teacherName: teacherById.get(teacherId).fullName,
      dayOfWeek,
      startTime,
      endTime,
      capacity: 1,
      active: true,
      note: `Nhập từ T9.xlsx · Trang tính2 · ${column.column}${cell.row}`,
      sourceCells: [`${column.column}${cell.row}`],
      sourceColor: `#${cell.fill}`,
    });
  }
}

const templates = [...dedupe.values()].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.dayOfWeek - b.dayOfWeek || a.teacherId.localeCompare(b.teacherId) || a.studentName.localeCompare(b.studentName, "vi"));
for (const template of templates) {
  if (!/^\d{2}:00$/.test(template.startTime) || !/^\d{2}:00$/.test(template.endTime) || template.startTime >= template.endTime) throw new Error(`Giờ không hợp lệ: ${template.id}`);
}

const sourceBytes = await fs.readFile(sourcePath);
const sourceSha256 = crypto.createHash("sha256").update(sourceBytes).digest("hex");
const totalsByTeacher = {};
const totalsByDay = Array(7).fill(0);
for (const template of templates) {
  totalsByTeacher[template.teacherName] = (totalsByTeacher[template.teacherName] || 0) + 1;
  totalsByDay[template.dayOfWeek] += 1;
}
const newStudents = [...new Map(templates.filter(item => !item.studentIdHint).map(item => [item.studentKey, item.studentName])).entries()].map(([studentKey, studentName]) => ({ studentKey, studentName }));
const plan = {
  metadata: {
    sourcePath,
    sourceWorkbook: "T9.xlsx",
    sourceSheet: "Trang tính2",
    sourceRange: "A1:BU8",
    sourceSha256,
    generatedAt: new Date().toISOString(),
    templateCount: templates.length,
    studentCount: new Set(templates.map(template => template.studentKey)).size,
    newStudentCount: newStudents.length,
    skippedCount: skipped.length,
    totalsByTeacher,
    totalsByDay,
  },
  teacherColors,
  templates,
  newStudents,
  skipped,
  aliasDecisions: aliases,
};

await fs.writeFile("t9-template-import-plan.json", JSON.stringify(plan, null, 2));
const browserData = templates.map(({ teacherName, sourceCells, sourceColor, ...item }) => ({
  ...item,
  studentIdHint: item.studentIdHint || `student-t9-${crypto.createHash("sha1").update(item.studentKey).digest("hex").slice(0, 12)}`,
}));
await fs.writeFile("../../happychild/js/t9-templates.js", `export const T9_SOURCE_VERSION=${JSON.stringify(sourceSha256.slice(0, 16))};\nexport const T9_TEMPLATE_SOURCE=${JSON.stringify(browserData)};\n`);
console.log(JSON.stringify({ metadata: plan.metadata, newStudents, skipped }, null, 2));
