import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourcePath = "D:/Downloads/T8 (1).xlsx";
const input = await FileBlob.load(sourcePath);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  include: "id,name,values,formulas",
  maxChars: 24000,
  tableMaxRows: 20,
  tableMaxCols: 20,
  tableMaxCellChars: 120,
});
console.log(summary.ndjson);

const styles = await workbook.inspect({
  kind: "computedStyle",
  sheetId: "Trang tính2",
  range: "A1:BU9",
  maxChars: 30000,
  options: { maxResults: 1000 },
});
console.log("---STYLES---");
console.log(styles.ndjson);

const preview = await workbook.render({
  sheetName: "Trang tính2",
  range: "A1:BU20",
  scale: 1,
  format: "png",
});
await fs.writeFile("t8-sheet-preview.png", new Uint8Array(await preview.arrayBuffer()));
