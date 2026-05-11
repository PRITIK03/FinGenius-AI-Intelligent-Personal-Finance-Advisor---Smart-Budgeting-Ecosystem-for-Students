from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from ..database import db_instance, get_mock_expenses
from ..utils.auth import get_current_user
from datetime import datetime
import csv
import io
import json
from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
# Import mock_expenses_list for mock mode
from ..routes.expenses import mock_expenses_list

router = APIRouter()

@router.get("/csv")
async def export_csv(current_user: dict = Depends(get_current_user)):
    """Export expenses to CSV"""
    user_id = current_user.get("_id", "mock_user")
    
    if db_instance.db is not None:
        expenses = await db_instance.db["expenses"].find({"user_id": user_id}).to_list(1000)
    else:
        expenses = await get_mock_expenses()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Description", "Category", "Amount"])
    
    for exp in expenses:
        date_str = exp.get("date", "")
        if isinstance(date_str, datetime):
            date_str = date_str.strftime("%Y-%m-%d")
        writer.writerow([
            date_str,
            exp.get("description", ""),
            exp.get("category", ""),
            exp.get("amount", 0)
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=expenses.csv"}
    )

@router.get("/json")
async def export_json(current_user: dict = Depends(get_current_user)):
    """Export expenses to JSON"""
    user_id = current_user.get("_id", "mock_user")
    
    if db_instance.db is not None:
        expenses = await db_instance.db["expenses"].find({"user_id": user_id}).to_list(1000)
        for exp in expenses:
            exp["_id"] = str(exp["_id"])
    else:
        expenses = await get_mock_expenses()
    
    output = io.BytesIO(json.dumps(expenses, indent=2, default=str).encode())
    return StreamingResponse(
        output,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=expenses.json"}
    )

@router.get("/excel")
async def export_excel(current_user: dict = Depends(get_current_user)):
    """Export expenses to Excel"""
    user_id = current_user.get("_id", "mock_user")
    
    if db_instance.db is not None:
        expenses = await db_instance.db["expenses"].find({"user_id": user_id}).to_list(1000)
    else:
        expenses = await get_mock_expenses()
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Expenses"
    
    # Headers
    ws.append(["Date", "Description", "Category", "Amount"])
    
    # Data
    for exp in expenses:
        date_str = exp.get("date", "")
        if isinstance(date_str, datetime):
            date_str = date_str.strftime("%Y-%m-%d")
        ws.append([
            date_str,
            exp.get("description", ""),
            exp.get("category", ""),
            exp.get("amount", 0)
        ])
    
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=expenses.xlsx"}
    )

@router.get("/pdf")
async def export_pdf(current_user: dict = Depends(get_current_user)):
    """Export expenses report to PDF"""
    user_id = current_user.get("_id", "mock_user")
    
    if db_instance.db is not None:
        expenses = await db_instance.db["expenses"].find({"user_id": user_id}).to_list(1000)
    else:
        expenses = await get_mock_expenses()
    
    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=letter)
    elements = []
    
    styles = getSampleStyleSheet()
    elements.append(Paragraph("FinGenius AI - Expense Report", styles['Title']))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
    elements.append(Paragraph("<br/><br/>", styles['Normal']))
    
    # Table data
    data = [["Date", "Description", "Category", "Amount (₹)"]]
    for exp in expenses[:50]:  # Limit to 50 rows
        date_str = exp.get("date", "")
        if isinstance(date_str, datetime):
            date_str = date_str.strftime("%Y-%m-%d")
        data.append([
            date_str,
            exp.get("description", "")[:30],  # Truncate long descriptions
            exp.get("category", ""),
            str(exp.get("amount", 0))
        ])
    
    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.blue),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=expense_report.pdf"}
    )

@router.post("/import/csv")
async def import_csv(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Import expenses from CSV"""
    user_id = current_user.get("_id", "mock_user")
    
    try:
        contents = await file.read()
        content = contents.decode('utf-8')
        reader = csv.DictReader(io.StringIO(content))
        imported = 0

        for row in reader:
            # Parse date
            date_str = row.get("Date", datetime.now().isoformat())
            try:
                if isinstance(date_str, str):
                    date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00')).replace(tzinfo=None)
                else:
                    date_obj = date_str
            except (ValueError, TypeError):
                date_obj = datetime.now()

            expense = {
                "description": row.get("Description", ""),
                "category": row.get("Category", "Others"),
                "amount": float(row.get("Amount", 0)),
                "date": date_obj,
                "user_id": user_id
            }

            if db_instance.db is not None:
                await db_instance.db["expenses"].insert_one(expense)
            else:
                # Mock mode: add to in-memory list
                expense["_id"] = f"mock_{len(mock_expenses_list) + 1}"
                mock_expenses_list.append(expense)
            imported += 1

        return {"message": f"Successfully imported {imported} expenses"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")
