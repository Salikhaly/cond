"""Read the supplied workbook without editing it; prepare a traceable historical batch."""
import base64, datetime, gzip, hashlib, json, pathlib, sys
import openpyxl

source, destination = map(pathlib.Path, sys.argv[1:3])
formulas = openpyxl.load_workbook(source, data_only=False)
values = openpyxl.load_workbook(source, data_only=True)
def serial(value):
    return value.isoformat() if isinstance(value, (datetime.date, datetime.datetime)) else value
sheets=[]
for sheet in formulas:
    rows=[]
    for row in sheet:
        cells={c.column_letter: {'value':serial(c.value),'cached':serial(values[sheet.title].cell(c.row,c.column).value)} for c in row if c.value is not None}
        if cells: rows.append({'row':row[0].row,'cells':cells})
    sheets.append({'name':sheet.title,'rowCount':sheet.max_row,'columnCount':sheet.max_column,'rows':rows})
records=[]
for title,kind,date_col,party_col,amount_col,factors in [('продажа','sale','B','A','H',['E','F','G']),('расходы','expense','A','B','G',['D','E','F'])]:
    for row in next(s for s in sheets if s['name']==title)['rows']:
        cells=row['cells']; get=lambda col:cells.get(col,{}).get('cached')
        if not isinstance(get('C'),str) or not isinstance(get(amount_col),(int,float)):continue
        date=get(date_col);amount=get(amount_col)
        if not isinstance(date,str) or not date.startswith('2025-02-'):raise ValueError(f'Unknown date: {title}!{row["row"]}')
        inputs=[get(c) for c in factors]
        if not all(isinstance(v,(int,float)) for v in inputs):raise ValueError('Unknown amount factors')
        calculated=round(inputs[0]*inputs[1]*inputs[2],2)
        if abs(calculated-amount)>.01:raise ValueError(f'Formula mismatch: {title}!{amount_col}{row["row"]}')
        records.append({'key':title+':'+str(row['row']),'kind':kind,'sheet':title,'row':row['row'],'date':date[:10],'party':str(get(party_col)).strip(),'name':get('C').strip(),'amount':round(amount,2),'factor':inputs[0],'price':inputs[1],'count':inputs[2],'unit':get('D') if kind=='sale' else None,'quantity':round(inputs[0]*inputs[2],4) if kind=='sale' else None,'kg':round(inputs[0]*inputs[2],4) if kind=='sale' and get('D')=='кг' else None,'paymentNote':get('J') if kind=='sale' else None})
counts={k:sum(r['kind']==k for r in records) for k in ['sale','expense']}
totals={k:round(sum(r['amount'] for r in records if r['kind']==k),2) for k in counts}
payload={'name':source.name,'period':'2025-02','sourceHash':hashlib.sha256(source.read_bytes()).hexdigest(),'records':records,'sheets':sheets,'counts':counts,'totals':totals,'verifiedAmounts':True}
payload['id']=hashlib.sha256(json.dumps(records,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
destination.parent.mkdir(parents=True,exist_ok=True)
encoded=json.dumps(payload,ensure_ascii=False,separators=(',',':'))
if destination.suffix=='.js':
    compressed=base64.b64encode(gzip.compress(encoded.encode('utf8'),mtime=0)).decode('ascii')
    destination.write_text("module.exports=JSON.parse(require('zlib').gunzipSync(Buffer.from('"+compressed+"','base64')).toString('utf8'));\n",encoding='utf8')
else:
    destination.write_text(encoded,encoding='utf8')
print(json.dumps({'records':counts,'totals':totals,'sheets':len(sheets),'bytes':destination.stat().st_size},ensure_ascii=False))
