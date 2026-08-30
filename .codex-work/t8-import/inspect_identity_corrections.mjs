import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const source = await FileBlob.load("D:/Downloads/T8 (1).xlsx");
const workbook = await SpreadsheetFile.importXlsx(source);
const sheet = workbook.worksheets.getItem("Trang tính2");

for (const range of ["G1:G7", "I1:I7", "AM1:AM7"]) {
  const table = await workbook.inspect({
    kind: "table",
    sheetId: sheet.id,
    range,
    include: "values",
    tableMaxRows: 10,
    tableMaxCols: 2,
    maxChars: 3000,
  });
  const styles = await workbook.inspect({
    kind: "computedStyle",
    sheetId: sheet.id,
    range,
    maxChars: 3000,
  });
  console.log(JSON.stringify({ range, values: table.ndjson, styles: styles.ndjson }));
}
