import markdown
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
import re

def create_pdf(markdown_text, output_filename):
    # Convert markdown to basic HTML text
    html = markdown.markdown(markdown_text)
    
    # Very rudimentary conversion for ReportLab
    # ReportLab Paragraphs support basic tags like <b>, <i>, <br/>, <font>
    html = html.replace('<h1>', '<font size="18"><b>').replace('</h1>', '</b></font><br/>')
    html = html.replace('<h2>', '<font size="14"><b>').replace('</h2>', '</b></font><br/>')
    html = html.replace('<h3>', '<font size="12"><b>').replace('</h3>', '</b></font><br/>')
    html = html.replace('<strong>', '<b>').replace('</strong>', '</b>')
    html = html.replace('<em>', '<i>').replace('</em>', '</i>')
    html = html.replace('<li>', '• ').replace('</li>', '<br/>')
    html = html.replace('<ul>', '').replace('</ul>', '')
    html = html.replace('<hr />', '<br/>---<br/>')
    html = html.replace('<p>', '').replace('</p>', '<br/><br/>')
    
    doc = SimpleDocTemplate(output_filename, pagesize=letter)
    styles = getSampleStyleSheet()
    normal_style = styles["Normal"]
    
    # Split the HTML into chunks separated by <br/> to feed into Paragraphs safely, or just use one paragraph.
    # Actually, reportlab's Paragraph can take <br/>.
    
    story = []
    
    for segment in html.split('<br/><br/>'):
        if segment.strip():
            p = Paragraph(segment.strip(), normal_style)
            story.append(p)
            story.append(Spacer(1, 10))

    doc.build(story)

markdown_text = """# I-Tank (ISO Tank Inspection) User Manual

Welcome to the **I-Tank Inspection Application** user manual. This application is designed to streamline the management and inspection of ISO Tanks, providing a comprehensive dashboard to track tank master data, manage certificates, conduct detailed inspections, and generate PowerPoint reports.

---

## 1. Getting Started & Login

To start using the I-Tank application, navigate to the web URL provided by your administrator.
- **Login**: Enter your standard credentials (Username and Password).
- **Authentication**: The system securely verifies your identity and loads your specific role permissions.
- **Restricted Users**: Depending on your role, you may be restricted to viewing specific pages (e.g., only Certificates Master Page).
- **Logout**: To safely end your session, use the **Logout** button available on the left sidebar. 

---

## 2. Tank Management (Tank Master)

The **Tank Master** is the core module of the application. Here you can view and manage the active directory of all ISO Tanks.

### Viewing Tanks
- The main table displays essential tank details such as **Tank Number**, **Manufacturer (MFGR)**, **Capacity (L)**, **MAWP**, **Owner**, **Cabinet**, and **Design Temperature**.
- The **Status** column shows whether a tank is currently Active or Inactive.

### Searching and Filtering
- Use the **Search Bar** at the top right to filter the tank list.
- You can filter by categories like Tank Number, MFGR, Capacity, MAWP, Owner, Cabinet, Design Temperature, and Status.

### Adding and Editing Tanks
- **Add Tank**: Click the **"+ Add Tank"** button at the top right. A modal will appear where you can enter the tank's basic information and save it.
- **Edit Tank**: Click the **Edit (Pencil) Icon** in the *Action* column of an active tank to modify its details. *(Note: Inactive tanks cannot be edited until reactivated)*.
- **Deactivate/Activate**: Toggle the switch in the *Action* column to change the status of the tank. 

### Export to Excel
- Click **"Export to Excel"** to download a complete spreadsheet of the Tank Master data for external reporting.

---

## 3. Master Modules

The application allows authorized users to manage various "Master" data categories that feed into the tank records and inspection reports. These can be accessed via the left sidebar.

- **Cargo Master**: Manage different types of cargo associated with the tanks.
- **Regulations Master**: Keep track of inspection rules and compliance regulations.
- **Tank Code Master**: Manage standard tank codes.
- **Certificates Master**: Upload, view, and organize tank compliance certificates. You can add new certificates or edit existing ones.
- **Drawings Master**: Manage technical drawings and schematics associated with specific tanks.
- **Tank Frame & Outer Shell Master**: Maintain standard data regarding tank frames and shells.

---

## 4. Inspection Report Module

The **Inspection Report** section is a robust workflow designed to guide inspectors step-by-step through a tank inspection.

### Navigating the Inspection Process
The inspection wizard is broken down into intuitive tabs:
1. **Tank Info**: Select a tank and verify its base information (Code, Capacity, Owner, etc.).
2. **Upload Photos**: Attach visual evidence of the tank's condition.
3. **Checklist**: Complete a detailed inspection checklist. If any faults are detected, they are flagged automatically.
4. **To-Do List**: (Appears only if faults are detected in the checklist). Log necessary repairs and actions to be taken.
5. **Review & Submit**: Finalize the inspection report. Review all provided information, photos, and checklists before submitting to the system.

### Viewing Inspection History
- In the Inspection Dashboard, you can view a list of past inspections.
- Use the **View** or **Edit** options to revisit draft inspections or review finalized reports.
- **Print Inspection**: You can print out the finalized inspection report directly from the interface.

---

## 5. Generating PowerPoint Reports

For summary presentations, the application includes a built-in PowerPoint generator.
- Navigate to the **PPT** section from the sidebar.
- Provide the necessary tank details and let the system automatically compile the tank data, photos, and inspection summaries into a downloadable PowerPoint (.pptx) presentation.

---

## 6. Account Management

- **Change Password**: Ensure your account remains secure by regularly updating your password via the "Change Password" page.
"""

create_pdf(markdown_text, 'User_Manual.pdf')
print("PDF successfully generated.")
