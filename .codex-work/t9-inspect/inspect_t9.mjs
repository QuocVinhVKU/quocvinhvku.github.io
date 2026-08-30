import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const source = "D:/Downloads/T9.xlsx";
const outputDir = "D:/2DUnityGame/.codex/visualizations/2026/08/10/019feb26-42a0-7b03-a2b4-d63974183667/t9-inspect";
await fs.mkdir(outputDir, { recursive: true });
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(source));
const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 12000,
  tableMaxRows: 12,
  tableMaxCols: 16,
  tableMaxCellChars: 100,
});
console.log(summary.ndjson);
const sheets = workbook.worksheets.items;
for (const sheet of sheets) {
  const used = sheet.getUsedRange(true);
  if (!used) continue;
  const preview = await workbook.render({ sheetName: sheet.name, autoCrop: "all", scale: 1, format: "png" });
  const safe = sheet.name.replace(/[\\/:*?"<>|]/g, "_");
  await fs.writeFile(`${outputDir}/${safe}.png`, new Uint8Array(await preview.arrayBuffer()));
  console.log(JSON.stringify({ sheet: sheet.name, address: used.address, preview: `${outputDir}/${safe}.png` }));
}
