import nodemailer from "nodemailer";

const EMAIL_TO = "diego1992aguirre@gmail.com";
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

export default async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const EMAIL_USER = process.env.EMAIL_USER;
  const EMAIL_PASS = process.env.EMAIL_PASS;

  if (!EMAIL_USER || !EMAIL_PASS) {
    return res
      .status(500)
      .json({ error: "Email credentials are not configured." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { subject, date, time, message: customMessage, pdfBase64, pdfFilename } = body;

    if (!subject || !date || !time || !pdfBase64 || !pdfFilename) {
      return res
        .status(400)
        .json({ error: "Subject, date, time and PDF file are required." });
    }

    const startLocal = new Date(`${date}T${time}:00`);
    const endLocal = new Date(startLocal.getTime() + 60 * 60 * 1000);

    const dayOfMonth = startLocal.getDate();
    const monthIndex = startLocal.getMonth();
    const monthsEs = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ];
    const monthName = monthsEs[monthIndex] ?? "";

    const [hourStr = "0", minuteStr = "00"] = time.split(":");
    let hourNum = Number(hourStr);
    if (Number.isNaN(hourNum)) hourNum = 0;
    const isPM = hourNum >= 12;
    let hour12 = hourNum % 12;
    if (hour12 === 0) hour12 = 12;
    const period = isPM ? "p.m." : "a.m.";
    const formattedTime = `${hour12}:${minuteStr} ${period}`;

    const dtStartLocal = formatLocalDateForICS(startLocal);
    const dtEndLocal = formatLocalDateForICS(endLocal);
    const dtStamp = formatUtcDateForICS(new Date());
    const uid = `${Date.now()}@verum-mail`;

    const fullTitle = `Comité de Calificación - ${subject}`;
    const defaultBody =
      `Estimados miembros del comité,\n\n` +
      `Los estamos convocando el próximo martes ${dayOfMonth} de ${monthName} a las ${formattedTime} ` +
      `con la finalidad de revisar las calificaciones corporativas de ${subject}.`;
    const emailBody =
      customMessage && String(customMessage).trim()
        ? String(customMessage).trim()
        : defaultBody;
    const detailsBlock =
      `\n\nDetalles de la reunión:\n` +
      `Asunto: ${fullTitle}\n` +
      `Fecha: ${date}\n` +
      `Hora: ${formattedTime}`;
    const textForEmail =
      customMessage && String(customMessage).trim()
        ? emailBody + detailsBlock
        : `${defaultBody}${detailsBlock}`;

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
      `SUMMARY:${fullTitle}`,
      `DESCRIPTION:${emailBody.replace(/\n/g, "\\n")}`,
      `ORGANIZER;CN=Verum Committee:mailto:${EMAIL_USER}`,
      `ATTENDEE;CN=Diego Aguirre;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${EMAIL_TO}`,
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ].join("\r\n");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });

    const pdfBuffer = Buffer.from(pdfBase64, "base64");

    const mailOptions = {
      from: EMAIL_USER,
      to: EMAIL_TO,
      subject: fullTitle,
      text: textForEmail,
      icalEvent: {
        filename: "invite.ics",
        method: "REQUEST",
        content: icsContent,
      },
      attachments: [
        { filename: pdfFilename, content: pdfBuffer },
      ],
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error sending email:", error);
    return res.status(500).json({ error: "Failed to send email." });
  }
}
