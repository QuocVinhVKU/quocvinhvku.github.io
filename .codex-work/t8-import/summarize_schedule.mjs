import fs from "node:fs/promises";

const data = JSON.parse(await fs.readFile("schedule_raw.json", "utf8"));
for (const column of data.columns) {
  const counts = new Map();
  for (const item of column.schedule) counts.set(item.fill, (counts.get(item.fill) || 0) + 1);
  const [fill, count] = [...counts].sort((a, b) => b[1] - a[1])[0] || ["", 0];
  console.log(`${column.column.padEnd(3)} | ${String(column.header).padEnd(20)} | ${fill.padEnd(8)} x${count} | ${column.schedule.map(item => item.value).join(", ")}`);
}
