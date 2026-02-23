from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def create_jd_pdf():
    c = canvas.Canvas("/app/Tech_JD_Role.pdf", pagesize=letter)
    width, height = letter
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, height - 100, "Placement Drive: Software Development Engineer 1")
    
    c.setFont("Helvetica", 12)
    text = c.beginText(100, height - 130)
    lines = [
        "Company: Apex Technologies Inc.",
        "Role: Software Development Engineer I",
        "Salary / Package: 18.5 LPA (Fixed) + 2 LPA Joining Bonus",
        "",
        "Eligibility Criteria:",
        "- Minimum CGPA requirement: 8.00 at graduation",
        "- Class 10th and 12th percentage: Minimum 75% in both",
        "- Active Backlogs / Arrears: Maximum 0 backlogs allowed at the time of drive",
        "- Eligible Branches: Computer Science (CSE), Information Technology (IT), ",
        "  Electronics and Communication (ECE)",
        "- Eligible Batches: 2024 graduates only",
        "",
        "Job Description & Requirements:",
        "- Proficient in Python, Java, or C++ and basic Data Structures & Algorithms",
        "- Excellent problem solving capabilities",
        "- Familiarity with Cloud architectures (AWS/GCP) is a plus",
        "- Good communication and teamwork skills",
        "",
        "Process:",
        "1. Online Assessment (Aptitude & Technical)",
        "2. Technical Interview 1 (System Design & Core CS)",
        "3. Technical Interview 2 (Coding & Algorithms)",
        "4. HR Discussion"
    ]
    
    for line in lines:
        text.textLine(line)
        
    c.drawText(text)
    c.save()
    print("PDF generated at /app/Tech_JD_Role.pdf")

if __name__ == "__main__":
    create_jd_pdf()
