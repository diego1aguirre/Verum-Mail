# Verum Mail - Meeting Planner

A small web app for your team to prepare meeting email drafts.  
Each draft includes:

- **Subject** of the email
- **PDF attachment**
- **Date and time** for the meeting

Later, this app can be extended to actually send emails through your mail account.

## Getting started

1. **Install dependencies**

```bash
npm install
```

2. **Run the development server**

```bash
npm run dev
```

3. Open the printed URL (usually `http://localhost:5173`) in your browser.

## How it works

- Fill in the subject, meeting date, meeting time, and choose a **PDF file**.
- Click **“Save draft”**.
- Your draft appears in the list on the right, showing:
  - Subject
  - Date and time
  - Attached PDF filename
  - When the draft was created

All data is stored in the browser while the page is open (no backend yet).  
We can later connect this form to your email provider so that saving a draft can also prepare or send a real email.

