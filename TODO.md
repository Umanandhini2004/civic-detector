- [x] Implement Gmail SMTP resolution email utility (replaced with generic status email sender) (backend/email_utils.py)
- [x] Trigger email on admin status update for any status (Pending / In Progress / Resolved) (backend/main.py)
- [ ] Ensure backend runtime has required env vars:
  - GMAIL_SENDER_EMAIL
  - GMAIL_APP_PASSWORD
- [ ] Test: set complaint status to In Progress / Resolved and verify email is received

