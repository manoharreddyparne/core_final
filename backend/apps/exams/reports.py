import pandas as pd
from io import BytesIO
from .models import ExamAttempt, ExamAntiCheatLog

class ExamForensicReporter:
    """
    ASEP Forensic Utility: Generates categorical cheat reports for faculty.
    """
    
    @staticmethod
    def generate_excel_report(exam_id):
        """
        Creates a multi-sheet Excel report for a specific exam.
        Sheet 1: Summary (Scores + Violation Totals)
        Sheet 2: Detailed Violations (Timestamped events per student)
        """
        attempts = ExamAttempt.objects.filter(exam_id=exam_id).select_related('student')
        
        # 1. Summary Data
        summary_data = []
        for att in attempts:
            summary_data.append({
                'Student Email': att.student.email,
                'Raw Score': att.raw_score,
                'Status': att.status,
                'Violation Score': att.violation_score,
                'Security Blocked': 'YES' if att.is_blocked else 'NO',
            })
        
        df_summary = pd.DataFrame(summary_data)
        
        # 2. Forensic Event Data
        logs = ExamAntiCheatLog.objects.filter(attempt__exam_id=exam_id).select_related('attempt__student')
        forensic_data = []
        for log in logs:
            forensic_data.append({
                'Student Email': log.attempt.student.email,
                'Event Type': log.event_type,
                'Timestamp': log.timestamp,
                'Details': str(log.details),
                'Evidence URL': log.evidence_image_url or 'N/A'
            })
            
        df_forensics = pd.DataFrame(forensic_data)
        
        # 3. Write to BytesIO for response
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df_summary.to_excel(writer, sheet_name='Student Summary', index=False)
            df_forensics.to_excel(writer, sheet_name='Forensic Logs', index=False)
            
        return output.getvalue()
