from pathlib import Path
from openpyxl import load_workbook
import json
path=Path('D:/Downloads/Bao-hoc-phi-2026-10-kem-lich-su (3).xlsx')
wb=load_workbook(path,data_only=True,read_only=True)
print(json.dumps({'source':str(path),'modified':path.stat().st_mtime,'rows':[{'sheet':ws.title,'cell':'C6','name':ws['A6'].value,'balance':ws['C6'].value,'period':ws['A4'].value} for ws in wb]},ensure_ascii=False))
