import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const input = await FileBlob.load("D:/Downloads/T8 (1).xlsx");
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("Trang tính2");
const values = sheet.getRange("A1:BU8").values;

const styleByCell = new Map();
for (let row = 1; row <= 8; row += 1) {
  const result = await workbook.inspect({
    kind: "computedStyle",
    sheetId: "Trang tính2",
    range: `A${row}:BU${row}`,
    maxChars: 100000,
    options: { maxResults: 200 },
  });
  for (const line of result.ndjson.split(/\r?\n/).filter(Boolean)) {
    const record = JSON.parse(line);
    if (record.kind === "computedStyle" && record.for) styleByCell.set(record.for, record.style);
  }
}

function colName(index) {
  let value = index + 1;
  let name = "";
  while (value) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

const color = style => ({
  fill: style?.fill?.color?.value || "",
  font: style?.font?.fill?.color?.value || "",
  styleId: style?.styleId ?? null,
});

const columns = [];
for (let col = 2; col < values[0].length; col += 1) {
  const header = values[0][col];
  if (!header) continue;
  const letter = colName(col);
  const schedule = [];
  for (let row = 1; row <= 7; row += 1) {
    const value = values[row][col];
    if (value == null || String(value).trim() === "") continue;
    schedule.push({
      row: row + 1,
      date: values[row][0],
      day: values[row][1],
      value,
      ...color(styleByCell.get(`${letter}${row + 1}`)),
    });
  }
  columns.push({
    column: letter,
    header,
    headerStyle: color(styleByCell.get(`${letter}1`)),
    schedule,
  });
}

const fillCounts = {};
for (const column of columns) {
  for (const item of column.schedule) fillCounts[item.fill] = (fillCounts[item.fill] || 0) + 1;
}
const output = { columns, fillCounts };
await fs.writeFile("schedule_raw.json", JSON.stringify(output, null, 2));
console.log(JSON.stringify({ columnCount: columns.length, fillCounts }, null, 2));
