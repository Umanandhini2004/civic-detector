import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def send_status_email(receiver_email: str, complaint_text: str, status: str) -> None:
    """Send an email to a citizen when a complaint status changes (Gmail SMTP).

    Expected environment variables:
      - GMAIL_SENDER_EMAIL
      - GMAIL_APP_PASSWORD

    If you use a local `.env`, this function will try to load it (if python-dotenv is installed).
    """

    # Optional: load .env (won't fail if python-dotenv isn't installed)
    try:
        from dotenv import load_dotenv  # type: ignore

        load_dotenv()
    except Exception:
        pass

    sender_email = os.getenv("GMAIL_SENDER_EMAIL")
    app_password = os.getenv("GMAIL_APP_PASSWORD")

    if not sender_email or not app_password:
        raise RuntimeError(
            "Missing Gmail SMTP credentials. Set GMAIL_SENDER_EMAIL and GMAIL_APP_PASSWORD in environment (or .env)."
        )

    # You can customize message based on status
    if status == "In Progress":
        message_line = "Your complaint is currently being worked on."
    elif status == "Resolved":
        message_line = "Your complaint has been resolved." 
    else:
        message_line = f"Your complaint status has been updated to {status}."

    subject = f"Complaint Status Updated - {status}"

    body_html = f"""
    <h2>Complaint Status Update</h2>

    <p>{message_line}</p>

    <p><b>Current Status:</b> {status}</p>

    <p><b>Complaint:</b> {complaint_text}</p>

    <p>Thank you for using Civic Issue Detector.</p>

    <p>
        Regards,<br>
        Municipal Corporation
    </p>
    """

    body_text = (
        "Complaint Status Update\n\n"
        f"{message_line}\n\n"
        f"Current Status: {status}\n\n"
        "Complaint:\n"
        f"{complaint_text}\n\n"
        "Thank you for using Civic Issue Detector.\n\n"
        "Regards,\nMunicipal Corporation\n"
    )

    msg = MIMEMultipart("alternative")
    msg["From"] = sender_email
    msg["To"] = receiver_email
    msg["Subject"] = subject

    msg.attach(MIMEText(body_text, "plain"))
    msg.attach(MIMEText(body_html, "html"))

    server = smtplib.SMTP("smtp.gmail.com", 587)
    try:
        server.starttls()
        server.login(sender_email, app_password)
        server.sendmail(sender_email, receiver_email, msg.as_string())
        print(f"✅ Email sent successfully to {receiver_email}")
        print(f"✅ Status notification: {status}")
    finally:
        server.quit()

