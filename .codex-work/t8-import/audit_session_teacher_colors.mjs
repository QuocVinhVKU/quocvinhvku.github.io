import fs from "node:fs/promises";

const schedule = JSON.parse(await fs.readFile("schedule_raw.json", "utf8"));
const roster = JSON.parse(await fs.readFile(
  "D:/2DUnityGame/.codex/visualizations/2026/08/10/019feb26-42a0-7b03-a2b4-d63974183667/happychild-sheet5-import-work/happychild-sheet5-import.json",
  "utf8",
));
const plan = JSON.parse(await fs.readFile(
  "D:/2DUnityGame/.codex/visualizations/2026/08/10/019feb26-42a0-7b03-a2b4-d63974183667/happychild-t8-import-work/t8-template-import-plan.json",
  "utf8",
));

const normalize = (value) => String(value || "")
  .normalize("NFC")
  .toLocaleUpperCase("vi")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim()
  .replace(/\s+/g, " ");

const aliases = plan.aliasDecisions;
const studentByName = new Map(roster.students.map((student) => [normalize(student.fullName), student]));
const teacherById = new Map(roster.teachers.map((teacher) => [teacher.id, teacher.fullName]));
const formByStudent = new Map(roster.studentForms.map((form) => [form.studentId, form]));

const matrix = {};
const cells = [];
for (const column of schedule.columns) {
  const sourceName = normalize(column.header);
  const student = studentByName.get(aliases[sourceName] || sourceName);
  if (!student) continue;
  const primaryTeacherId = formByStudent.get(student.id)?.teacherId || student.primaryTeacherId;
  const primaryTeacher = teacherById.get(primaryTeacherId);
  for (const cell of column.schedule) {
    if (!cell.fill || /^bù(?:\s|$)/iu.test(String(cell.value || "").trim())) continue;
    const color = `#${cell.fill.toUpperCase()}`;
    matrix[color] ||= {};
    matrix[color][primaryTeacher] = (matrix[color][primaryTeacher] || 0) + 1;
    cells.push({
      cell: `${column.column}${cell.row}`,
      sourceName: column.header,
      student: student.fullName,
      day: cell.day,
      time: cell.value,
      color,
      primaryTeacher,
    });
  }
}

const xoai = cells.filter((item) => normalize(item.student) === "XOÀI");
const sessionTeacherByColor = {
  "#B6D7A8": "Cô Tiên",
  "#D9EAD3": "Cô Tiên",
  "#C482D2": "Cô Thùy",
  "#548235": "Cô Hân",
  "#38761D": "Cô Hân",
  "#FBBC04": "Cô Dương",
  "#FFC000": "Cô Dương",
  "#E0A31E": "Cô Dương",
  "#FF0000": "Cô Mai",
  "#134F5C": "Cô Ngọc",
  "#F48E93": "Cô Quỳnh",
};

const mismatches = plan.templates.flatMap((template) => {
  const inferredTeachers = [...new Set(template.sourceColors.map((color) => sessionTeacherByColor[color.toUpperCase()]).filter(Boolean))];
  if (inferredTeachers.length !== 1 || inferredTeachers[0] === template.teacherName) return [];
  return [{
    student: template.studentName,
    dayOfWeek: template.dayOfWeek,
    time: `${template.startTime}-${template.endTime}`,
    sourceCells: template.sourceCells,
    sourceColors: template.sourceColors,
    importedTeacher: template.teacherName,
    sessionTeacher: inferredTeachers[0],
  }];
});

const correctedTotals = {};
for (const template of plan.templates) {
  const inferred = sessionTeacherByColor[template.sourceColors[0].toUpperCase()];
  correctedTotals[inferred] = (correctedTotals[inferred] || 0) + 1;
}

console.log(JSON.stringify({ matrix, xoai, sessionTeacherByColor, mismatchCount: mismatches.length, mismatches, correctedTotals }, null, 2));
