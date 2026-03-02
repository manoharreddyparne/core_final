# apps/auip_institution/views/_csv_utils.py
# Reusable CSV row-parsing helpers for bulk student upload.
# ─────────────────────────────────────────────────────────────────────────────
from decimal import Decimal, InvalidOperation
from datetime import datetime
from django.utils import timezone


def to_decimal(val) -> Decimal:
    try:
        return Decimal(str(val))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal('0.00')


def to_int_or_none(val):
    try:
        return int(val) if val and str(val).strip().isdigit() else None
    except Exception:
        return None


def to_date_or_none(val):
    if not val or not str(val).strip():
        return None
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
        try:
            return datetime.strptime(str(val).strip(), fmt).date()
        except ValueError:
            pass
    return None


def clean_row(row: dict, depts: dict, progs: dict, sems: dict, secs: dict) -> dict:
    """
    Standardize a CSV row dict into model-ready data using in-memory cache dicts.
    Zero DB calls — all lookups are dictionary O(1).
    """
    data = {
        "full_name": row.get('full_name', 'Unknown Student').strip(),
        "official_email": row.get('official_email', '').strip(),
        "personal_email": row.get('personal_email', '').strip() or None,
        "phone_number": row.get('phone_number', '').strip() or None,
        "program": row.get('program', 'B.Tech').strip(),
        "branch": row.get('branch', 'CSE').strip(),
        "batch_year": (
            int(row['batch_year'])
            if row.get('batch_year') and str(row['batch_year']).strip().isdigit()
            else timezone.now().year
        ),
        "admission_year": to_int_or_none(row.get('admission_year')),
        "passout_year": to_int_or_none(row.get('passout_year')),
        "section": row.get('section', 'A').strip(),
        "cgpa": to_decimal(row['cgpa']) if row.get('cgpa') else Decimal('0.00'),
        "current_semester": (
            int(row['current_semester'])
            if row.get('current_semester') and str(row['current_semester']).strip().isdigit()
            else 1
        ),
        "date_of_birth": to_date_or_none(row.get('date_of_birth')),
        "history_data": {
            "10th_percent": float(row.get("10th_percent", 0)) if str(row.get("10th_percent", "")).replace(".", "", 1).isdigit() else 0.0,
            "12th_percent": float(row.get("12th_percent", 0)) if str(row.get("12th_percent", "")).replace(".", "", 1).isdigit() else 0.0,
            "active_backlogs": int(float(row.get("active_backlogs", 0))) if str(row.get("active_backlogs", "")).replace(".", "", 1).isdigit() else 0,
        }
    }

    # In-memory resolution (0 DB hits)
    dept = depts.get(data['branch'].lower())
    if dept:
        data['department_ref'] = dept

    prog = progs.get(data['program'].lower())
    if prog:
        data['program_ref'] = prog
        sem = sems.get((prog.id, data['current_semester']))
        if sem:
            data['semester_ref'] = sem
        sec = secs.get((prog.id, data['current_semester'], data['section'].lower()))
        if sec:
            data['section_ref'] = sec

    return data
