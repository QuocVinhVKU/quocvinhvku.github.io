import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load("D:/Downloads/T8 (1).xlsx"));
const sheet = workbook.worksheets.getItem("Trang tính2");
console.log(JSON.stringify({ values: sheet.getRange("AC1:AC6").values }, null, 2));
const styles = await workbook.inspect({
  kind: "computedStyle",
  sheetId: "Trang tính2",
  range: "AC1:AC6",
  maxChars: 6000,
  options: { maxResults: 10 },
});
console.log(styles.ndjson);
