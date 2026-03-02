import express from "express";
import cors from "cors";
import multer from "multer";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const PORT = process.env.PORT || 4000;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_TO = "diego.aguirre@verum.mx";
const TIMEZONE = "America/Mexico_City";

function formatLocalDateForICS(date) {
  const pad = (num) => String(num).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

function formatUtcDateForICS(date) {
  const pad = (num) => String(num).padStart(2, "0");
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

if (!EMAIL_USER || !EMAIL_PASS) {
  console.warn(
    "Warning: EMAIL_USER or EMAIL_PASS is not set in the environment."
  );
}

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.post("/send-email", upload.single("pdf"), async (req, res) => {
  try {
    const { subject, date, time } = req.body;
    const file = req.file;

    if (!subject || !date || !time || !file) {
      return res
        .status(400)
        .json({ error: "Subject, date, time and PDF file are required." });
    }

    if (!EMAIL_USER || !EMAIL_PASS) {
      return res
        .status(500)
        .json({ error: "Email credentials are not configured on the server." });
    }

    const startLocal = new Date(`${date}T${time}:00`);
    const endLocal = new Date(startLocal.getTime() + 60 * 60 * 1000);

    const dtStartLocal = formatLocalDateForICS(startLocal);
    const dtEndLocal = formatLocalDateForICS(endLocal);
    const dtStamp = formatUtcDateForICS(new Date());
    const uid = `${Date.now()}@verum-mail`;

    const icsContent = [
      "BEGIN:VCALENDAR",
      "PRODID:-//Verum Mail//EN",
      "VERSION:2.0",
      "CALSCALE:GREGORIAN",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;TZID=${TIMEZONE}:${dtStartLocal}`,
      `DTEND;TZID=${TIMEZONE}:${dtEndLocal}`,
      `SUMMARY:Meeting: ${subject}`,
      `DESCRIPTION:Meeting scheduled via Verum Mail.`,
      `ORGANIZER;CN=Verum Committee:mailto:${EMAIL_USER}`,
      `ATTENDEE;CN=Diego Aguirre;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${EMAIL_TO}`,
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ].join("\r\n");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: EMAIL_USER,
      to: EMAIL_TO,
      subject: `${subject}`,
      text: `You have a meeting scheduled.\n\nSubject: ${subject}\nDate: ${date}\nTime: ${time}`,
      icalEvent: {
        filename: "invite.ics",
        method: "REQUEST",
        content: icsContent,
      },
      attachments: [
        {
          filename: file.originalname,
          content: file.buffer,
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    return res.json({ success: true });
  } catch (error) {
    console.error("Error sending email:", error);
    return res.status(500).json({ error: "Failed to send email." });
  }
});

app.listen(PORT, () => {
  console.log(`Email server listening on http://localhost:${PORT}`);
});

