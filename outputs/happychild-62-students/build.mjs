import fs from "node:fs/promises";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";
import { T9_TEACHER_SOURCE, T9_STUDENT_PROFILE_SOURCE, T9_MAKEUP_BALANCE_SOURCE, T9_TEMPLATE_SOURCE } from "../../happychild/js/t9-templates.js";
import { canonicalRosterKey } from "../../happychild/js/roster-reconcile.js";

const outDir = new URL("./", import.meta.url).pathname.replace(/^\/(.:)/, "$1");
const teacherNames = new Map(T9_TEACHER_SOURCE.map(x => [x.id, x.fullName]));
const birthdays = new Map(T9_STUDENT_PROFILE_SOURCE.map(x => [canonicalRosterKey(x.studentKey), x.birthday]));
const balances = new Map(T9_MAKEUP_BALANCE_SOURCE.map(x => [canonicalRosterKey(x.studentKey), Number(x.balance) || 0]));
const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const groups = new Map();

for (const item of T9_TEMPLATE_SOURCE) {
  const key = canonicalRosterKey(item.studentKey);
  if (!groups.has(key)) groups.set(key, { key, name: item.studentName, id: item.studentIdHint, sessions: [] });
  groups.get(key).sessions.push(item);
}

const students = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "vi"));
const rows = students.map((student, index) => {
  const teachers = [...new Set(student.sessions.map(x => teacherNames.get(x.teacherId) || x.teacherId))].sort((a,b)=>a.localeCompare(b,"vi"));
  const schedule = student.sessions.slice().sort((a,b)=>a.dayOfWeek-b.dayOfWeek||a.startTime.localeCompare(b.startTime)).map(x => `${days[x.dayOfWeek]} ${x.startTime}–${x.endTime} (${teacherNames.get(x.teacherId)||x.teacherId})`).join("; ");
  const birth = birthdays.get(student.key);
  return [index + 1, student.name, birth ? new Date(`${birth}T12:00:00`) : null, teachers.join(", "), schedule, balances.get(student.key) || 0, birth ? "Đủ ngày sinh" : "Thiếu ngày sinh"];
});

if (rows.length !== 62) throw new Error(`Danh sách phải có 62 học sinh, hiện có ${rows.length}.`);

const wb = Workbook.create();
const ws = wb.worksheets.add("Danh sách học sinh");
ws.showGridLines = false;
ws.tabColor = "#2E8B57";
ws.getRange("A2:G2").merge();
ws.getRange("A2").values = [["DANH SÁCH 62 HỌC SINH HAPPY CHILD"]];
ws.getRange("A2:G2").format = { font: { name: "Arial", size: 15, bold: true, color: "#214E34" }, verticalAlignment: "center" };
ws.getRange("A3:G3").merge();
ws.getRange("A3").values = [["Danh sách tổng hợp từ lịch tháng 9 và dữ liệu hiện có trên website"]];
ws.getRange("A3:G3").format = { font: { name: "Arial", size: 10, italic: true, color: "#64748B" } };
ws.getRange("A5:G5").values = [["STT", "Học sinh", "Ngày sinh", "Giáo viên đang dạy", "Lịch học mặc định", "Cần bù (buổi)", "Tình trạng hồ sơ"]];
ws.getRange(`A6:G${5 + rows.length}`).values = rows;
ws.getRange(`A5:G${5 + rows.length}`).format.font = { name: "Arial", size: 10, color: "#1F2937" };
ws.getRange("A5:G5").format = { fill: "#214E34", font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "outside", style: "thin", color: "#214E34" } };
ws.getRange(`A6:G${5 + rows.length}`).format.verticalAlignment = "center";
ws.getRange(`A6:A${5 + rows.length}`).format.horizontalAlignment = "center";
ws.getRange(`C6:C${5 + rows.length}`).format.horizontalAlignment = "center";
ws.getRange(`F6:F${5 + rows.length}`).format.horizontalAlignment = "center";
ws.getRange(`C6:C${5 + rows.length}`).format.numberFormat = "dd/mm/yyyy";
ws.getRange(`E6:E${5 + rows.length}`).format.wrapText = true;
ws.getRange(`D6:D${5 + rows.length}`).format.wrapText = true;
ws.getRange(`G6:G${5 + rows.length}`).format.wrapText = true;
ws.getRange(`A6:G${5 + rows.length}`).format.borders = { insideHorizontal: { style: "thin", color: "#E2E8F0" }, bottom: { style: "thin", color: "#CBD5E1" } };
ws.getRange(`A6:G${5 + rows.length}`).conditionalFormats.add("Custom", { formula: `=$G6="Thiếu ngày sinh"`, format: { fill: "#FDE8E8", font: { color: "#B42318", bold: true } } });
ws.getRange(`F6:F${5 + rows.length}`).conditionalFormats.add("cellIs", { operator: "greaterThan", formula: 0, format: { fill: "#FFF3CD", font: { color: "#8A5A00", bold: true } } });
ws.getRange("A1:G67").format.rowHeight = 20;
ws.getRange("A2:G2").format.rowHeight = 28;
ws.getRange("A5:G5").format.rowHeight = 32;
ws.getRange("A:A").format.columnWidth = 7;
ws.getRange("B:B").format.columnWidth = 22;
ws.getRange("C:C").format.columnWidth = 14;
ws.getRange("D:D").format.columnWidth = 26;
ws.getRange("E:E").format.columnWidth = 62;
ws.getRange("F:F").format.columnWidth = 15;
ws.getRange("G:G").format.columnWidth = 19;
ws.freezePanes.freezeRows(5);
const table = ws.tables.add(`A5:G${5 + rows.length}`, true, "DanhSachHocSinh");
table.style = "TableStyleMedium4";
table.showBandedRows = true;
table.showFilterButton = true;

wb.recalculate();
const check = await wb.inspect({ kind: "table", range: "Danh sách học sinh!A2:G67", include: "values,formulas", tableMaxRows: 70, tableMaxCols: 7, maxChars: 12000 });
console.log(check.ndjson);
const errors = await wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
console.log(errors.ndjson);
const preview = await wb.render({ sheetName: "Danh sách học sinh", range: "A1:G24", scale: 1.2, format: "png" });
await fs.writeFile(`${outDir}/preview.png`, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(wb);
await output.save(`${outDir}/Danh-sach-62-hoc-sinh-HappyChild.xlsx`);
