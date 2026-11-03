import csv
import io
from datetime import datetime, timezone
from typing import List, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models.execution import TestExecution

def generate_csv_report(executions: List[TestExecution]) -> str:
    """
    Generates a CSV string containing execution results and assertion summaries.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Execution ID",
        "Test Name",
        "HTTP Method",
        "Endpoint URL",
        "Status Code",
        "Result",
        "Response Time (ms)",
        "Response Size (bytes)",
        "Error Details",
        "Executed At (UTC)",
        "Passed Assertions",
        "Failed Assertions",
    ])

    for ex in executions:
        passed_assertions = sum(1 for a in ex.assertion_results if a.passed)
        failed_assertions = sum(1 for a in ex.assertion_results if not a.passed)
        
        writer.writerow([
            ex.id,
            ex.test_name,
            ex.http_method,
            ex.endpoint_url,
            ex.status_code if ex.status_code is not None else "N/A",
            "PASS" if ex.is_success else "FAIL",
            f"{ex.response_time_ms:.1f}",
            ex.response_size_bytes,
            ex.error_message or "",
            ex.executed_at.strftime("%Y-%m-%d %H:%M:%S") if ex.executed_at else "",
            passed_assertions,
            failed_assertions,
        ])

    return output.getvalue()


def generate_pdf_report(executions: List[TestExecution], title: str = "API TestLab Execution Report") -> bytes:
    """
    Generates a professional PDF report with summary metrics, data tables, and failure breakdowns.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=15,
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=14,
        spaceAfter=8,
    )
    cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#334155"),
    )
    header_cell_style = ParagraphStyle(
        "TableHeaderCell",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
        fontName="Helvetica-Bold",
        textColor=colors.white,
    )

    story = []

    # Title & Subtitle
    story.append(Paragraph(title, title_style))
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    story.append(Paragraph(f"Generated on: {now_str} | Powered by API TestLab", subtitle_style))

    # Calculate statistics
    total = len(executions)
    passed = sum(1 for e in executions if e.is_success)
    failed = total - passed
    success_rate = (passed / total * 100.0) if total > 0 else 0.0
    avg_latency = (sum(e.response_time_ms for e in executions) / total) if total > 0 else 0.0

    # Summary Table
    story.append(Paragraph("1. Executive Summary", section_heading))
    summary_data = [
        [
            Paragraph("<b>Total Executions</b>", cell_style),
            Paragraph("<b>Passed</b>", cell_style),
            Paragraph("<b>Failed</b>", cell_style),
            Paragraph("<b>Success Rate</b>", cell_style),
            Paragraph("<b>Avg Latency</b>", cell_style),
        ],
        [
            Paragraph(str(total), cell_style),
            Paragraph(f"<font color='#16a34a'><b>{passed}</b></font>", cell_style),
            Paragraph(f"<font color='#dc2626'><b>{failed}</b></font>", cell_style),
            Paragraph(f"<b>{success_rate:.1f}%</b>", cell_style),
            Paragraph(f"{avg_latency:.1f} ms", cell_style),
        ],
    ]
    summary_table = Table(summary_data, colWidths=[108, 108, 108, 108, 108])
    summary_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(summary_table)
    story.append(Spacer(1, 15))

    # Executions Table
    story.append(Paragraph("2. Test Executions Breakdown", section_heading))
    table_headers = [
        Paragraph("<b>Name</b>", header_cell_style),
        Paragraph("<b>Method</b>", header_cell_style),
        Paragraph("<b>Endpoint</b>", header_cell_style),
        Paragraph("<b>Status</b>", header_cell_style),
        Paragraph("<b>Time</b>", header_cell_style),
        Paragraph("<b>Result</b>", header_cell_style),
    ]

    exec_rows = [table_headers]
    for ex in executions[:100]: # Cap table at 100 rows for PDF layout
        status_code_str = str(ex.status_code) if ex.status_code else "ERR"
        result_color = "#16a34a" if ex.is_success else "#dc2626"
        result_text = "PASS" if ex.is_success else "FAIL"

        url_short = ex.endpoint_url if len(ex.endpoint_url) < 36 else (ex.endpoint_url[:33] + "...")
        name_short = ex.test_name if len(ex.test_name) < 24 else (ex.test_name[:21] + "...")

        exec_rows.append([
            Paragraph(name_short, cell_style),
            Paragraph(ex.http_method, cell_style),
            Paragraph(url_short, cell_style),
            Paragraph(status_code_str, cell_style),
            Paragraph(f"{ex.response_time_ms:.0f}ms", cell_style),
            Paragraph(f"<font color='{result_color}'><b>{result_text}</b></font>", cell_style),
        ])

    exec_table = Table(exec_rows, colWidths=[120, 48, 212, 45, 55, 60])
    exec_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    story.append(exec_table)

    # Failed Assertions Breakdown
    failed_executions = [e for e in executions if not e.is_success]
    if failed_executions:
        story.append(Spacer(1, 15))
        story.append(Paragraph("3. Failed Assertions & Errors", section_heading))
        fail_rows = [
            [
                Paragraph("<b>Test Name</b>", header_cell_style),
                Paragraph("<b>Failure Detail / Error Message</b>", header_cell_style),
            ]
        ]
        for fe in failed_executions[:30]:
            messages = []
            if fe.error_message:
                messages.append(f"<b>Error:</b> {fe.error_message}")
            for ar in fe.assertion_results:
                if not ar.passed:
                    messages.append(f"<b>Assertion [{ar.assertion_type}]:</b> {ar.message}")
            detail_str = "<br/>".join(messages) if messages else "Request failed without explicit assertion message."
            fail_rows.append([
                Paragraph(fe.test_name, cell_style),
                Paragraph(detail_str, cell_style),
            ])

        fail_table = Table(fail_rows, colWidths=[140, 400])
        fail_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#b91c1c")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#fecaca")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ])
        )
        story.append(fail_table)

    doc.build(story)
    return buffer.getvalue()
