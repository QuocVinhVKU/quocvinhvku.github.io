import fs from "node:fs/promises";

const planPath = "D:/2DUnityGame/.codex/visualizations/2026/08/10/019feb26-42a0-7b03-a2b4-d63974183667/happychild-t8-import-work/t8-template-import-plan.json";
const backupPath = "D:/2DUnityGame/.codex/visualizations/2026/08/10/019feb26-42a0-7b03-a2b4-d63974183667/happychild-backups/happychild-before-t8-templates-20260814-172516.json";

// Workbook fill colors that represent the teacher teaching that individual cell.
// The three alternate shades are used by the same teacher in adjacent source columns.
const teacherBySourceColor = {
  "#B6D7A8": "teacher-sheet5-tien",
  "#D9EAD3": "teacher-sheet5-tien",
  "#C482D2": "teacher-sheet5-thuy",
  "#548235": "teacher-sheet5-han",
  "#38761D": "teacher-sheet5-han",
  "#FBBC04": "teacher-sheet5-duong",
  "#FFC000": "teacher-sheet5-duong",
  "#E0A31E": "teacher-sheet5-duong",
  "#FF0000": "teacher-sheet5-mai",
  "#134F5C": "teacher-sheet5-ngoc",
  "#F48E93": "teacher-sheet5-quynh",
};

const plan = JSON.parse(await fs.readFile(planPath, "utf8"));
const backup = JSON.parse(await fs.readFile(backupPath, "utf8"));
const teacherNames = Object.fromEntries(
  backup.documents.teachers.map(document => [
    document.name.split("/").at(-1),
    document.fields.fullName?.stringValue || document.name.split("/").at(-1),
  ]),
);

const colorUsage = {};
const conflicts = [];
const unresolved = [];
const changes = [];
const unchanged = [];
const colorSets = {};
const multiSourceTemplates = [];

for (const template of plan.templates) {
  const sourceColors = [...new Set(template.sourceColors || [])];
  const colorSet = sourceColors.slice().sort().join(",");
  colorSets[colorSet] = (colorSets[colorSet] || 0) + 1;
  if ((template.sourceCells || []).length > 1) {
    multiSourceTemplates.push({
      id: template.id,
      studentName: template.studentName,
      sourceCells: template.sourceCells,
      sourceColors: template.sourceColors,
    });
  }
  const mappedTeachers = [...new Set(sourceColors.map(color => teacherBySourceColor[color]).filter(Boolean))];
  for (const color of sourceColors) {
    colorUsage[color] ||= { templateCount: 0, currentTeachers: {}, targetTeacherId: teacherBySourceColor[color] || null };
    colorUsage[color].templateCount += 1;
    colorUsage[color].currentTeachers[template.teacherId] = (colorUsage[color].currentTeachers[template.teacherId] || 0) + 1;
  }
  const snapshot = {
    id: template.id,
    studentId: template.studentId,
    studentName: template.studentName,
    dayOfWeek: template.dayOfWeek,
    startTime: template.startTime,
    endTime: template.endTime,
    sourceCells: template.sourceCells,
    sourceColors,
    currentTeacherId: template.teacherId,
    currentTeacherName: teacherNames[template.teacherId] || template.teacherName,
  };
  if (sourceColors.some(color => !teacherBySourceColor[color])) {
    unresolved.push(snapshot);
    continue;
  }
  if (mappedTeachers.length !== 1) {
    conflicts.push({ ...snapshot, mappedTeachers });
    continue;
  }
  const targetTeacherId = mappedTeachers[0];
  const compared = {
    ...snapshot,
    targetTeacherId,
    targetTeacherName: teacherNames[targetTeacherId] || targetTeacherId,
  };
  (targetTeacherId === template.teacherId ? unchanged : changes).push(compared);
}

const changesByPair = {};
const changesByStudent = {};
for (const change of changes) {
  const pair = `${change.currentTeacherName} -> ${change.targetTeacherName}`;
  changesByPair[pair] = (changesByPair[pair] || 0) + 1;
  changesByStudent[change.studentName] ||= [];
  changesByStudent[change.studentName].push({
    id: change.id,
    dayOfWeek: change.dayOfWeek,
    startTime: change.startTime,
    endTime: change.endTime,
    sourceCells: change.sourceCells,
    sourceColors: change.sourceColors,
    from: change.currentTeacherName,
    to: change.targetTeacherName,
  });
}

const targetTotals = {};
for (const template of [...changes, ...unchanged]) {
  const name = template.targetTeacherName || template.currentTeacherName;
  targetTotals[name] = (targetTotals[name] || 0) + 1;
}

const correctedTemplates = [...changes, ...unchanged].map(template => ({
  ...template,
  correctedTeacherId: template.targetTeacherId || template.currentTeacherId,
}));
const correctedTeacherConflicts = [];
const correctedByTeacherDay = new Map();
for (const template of correctedTemplates) {
  const key = `${template.correctedTeacherId}|${template.dayOfWeek}`;
  correctedByTeacherDay.set(key, [...(correctedByTeacherDay.get(key) || []), template]);
}
for (const [key, templates] of correctedByTeacherDay) {
  for (let index = 0; index < templates.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < templates.length; otherIndex += 1) {
      const left = templates[index];
      const right = templates[otherIndex];
      const overlaps = left.startTime < right.endTime && right.startTime < left.endTime;
      const sameSlot = left.startTime === right.startTime && left.endTime === right.endTime;
      if (overlaps && !sameSlot) correctedTeacherConflicts.push({ key, left: left.id, right: right.id });
    }
  }
}

console.log(JSON.stringify({
  templateCount: plan.templates.length,
  preImportBackupCounts: backup.counts,
  importPlanTotalsByTeacher: plan.metadata.totalsByTeacher,
  targetTotalsBySourceColor: targetTotals,
  changeCount: changes.length,
  unchangedCount: unchanged.length,
  conflictCount: conflicts.length,
  unresolvedCount: unresolved.length,
  correctedTeacherConflictCount: correctedTeacherConflicts.length,
  changesByPair,
  colorUsage,
  colorSets,
  multiSourceTemplates,
  conflicts,
  unresolved,
  correctedTeacherConflicts,
  changesByStudent,
}, null, 2));
