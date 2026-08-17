import fs from "node:fs/promises";

const schedule = JSON.parse(await fs.readFile("schedule_raw.json", "utf8"));
const payload = JSON.parse(await fs.readFile("../../../.codex/visualizations/2026/08/10/019feb26-42a0-7b03-a2b4-d63974183667/happychild-sheet5-import-work/happychild-sheet5-import.json", "utf8"));

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

const studentByName = new Map(payload.students.map(student => [normalize(student.fullName), student]));
const teachers = new Map(payload.teachers.map(teacher => [teacher.id, teacher]));
const forms = new Map(payload.studentForms.map(form => [form.studentId, form]));
const matches = [];
const unmatchedColumns = [];

for (const column of schedule.columns) {
  const sourceName = normalize(column.header);
  const targetName = aliases[sourceName] || sourceName;
  const student = studentByName.get(targetName);
  if (!student) {
    unmatchedColumns.push({ column: column.column, header: column.header, scheduleCount: column.schedule.length });
    continue;
  }
  const teacherId = forms.get(student.id)?.teacherId || student.primaryTeacherId;
  const colorCounts = {};
  for (const item of column.schedule.filter(item => !/^bù\b/i.test(String(item.value).trim()))) {
    const fill = item.fill || "NONE";
    colorCounts[fill] = (colorCounts[fill] || 0) + 1;
  }
  matches.push({ column: column.column, header: column.header, studentId: student.id, student: student.fullName, teacherId, teacher: teachers.get(teacherId)?.fullName, colorCounts, scheduleCount: column.schedule.length });
}

const matchedStudentIds = new Set(matches.map(match => match.studentId));
const missingStudents = payload.students.filter(student => !matchedStudentIds.has(student.id)).map(student => ({ student: student.fullName, teacher: teachers.get(forms.get(student.id)?.teacherId || student.primaryTeacherId)?.fullName }));
const colorsByTeacher = {};
for (const match of matches) {
  colorsByTeacher[match.teacher] ||= {};
  for (const [color, count] of Object.entries(match.colorCounts)) colorsByTeacher[match.teacher][color] = (colorsByTeacher[match.teacher][color] || 0) + count;
}

console.log(JSON.stringify({ matchedColumns: matches.length, matchedStudents: matchedStudentIds.size, unmatchedColumns, missingStudents, colorsByTeacher, matches }, null, 2));
