import React, { useEffect, useState } from "react";

/** Subject = everything before the first "_" in the filename (e.g. "Actinver Fiduciario_Presentación...") */
function subjectFromFilename(filename: string): string {
  const base = filename.replace(/\.pdf$/i, "");
  const idx = base.indexOf("_");
  if (idx === -1) return base.trim();
  return base.slice(0, idx).trim();
}

/** Month names (Spanish + English) for date parsing */
const MONTHS: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6,
  jul: 7, ago: 8, aug: 8, sep: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

const DEFAULT_RECIPIENTS = ["diego1992aguirre@gmail.com"];

/** Parse date from filename: "25.Oct.2019" or "Feb.23.2026" → yyyy-mm-dd */
function dateFromFilename(filename: string): string {
  const base = filename.replace(/\.pdf$/i, "");
  // DD.Mon.YYYY (e.g. 25.Oct.2019)
  const ddm = base.match(/(\d{1,2})\.(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic|Jan|Apr|Aug|Dec)\.(\d{4})/i);
  if (ddm) {
    const day = parseInt(ddm[1], 10);
    const month = MONTHS[ddm[2].toLowerCase().slice(0, 3)];
    const year = parseInt(ddm[3], 10);
    if (month && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  // Mon.DD.YYYY (e.g. Feb.23.2026)
  const mdy = base.match(/(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic|Jan|Apr|Aug|Dec)\.(\d{1,2})\.(\d{4})/i);
  if (mdy) {
    const month = MONTHS[mdy[1].toLowerCase().slice(0, 3)];
    const day = parseInt(mdy[2], 10);
    const year = parseInt(mdy[3], 10);
    if (month && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  return "";
}

function App() {
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [view, setView] = useState<"compose" | "manage">("compose");

  // Load saved recipients from localStorage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("verum-mail-recipients");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecipients(parsed.filter((v) => typeof v === "string"));
          return;
        }
      }
      // If nothing stored, seed with default recipient list
      setRecipients(DEFAULT_RECIPIENTS);
      window.localStorage.setItem(
        "verum-mail-recipients",
        JSON.stringify(DEFAULT_RECIPIENTS)
      );
    } catch {
      // ignore parse errors
    }
  }, []);

  const persistRecipients = (next: string[]) => {
    setRecipients(next);
    try {
      window.localStorage.setItem("verum-mail-recipients", JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPdfFile(file);
    if (file) {
      const name = file.name;
      const parsedSubject = subjectFromFilename(name);
      const parsedDate = dateFromFilename(name);
      if (parsedSubject) setSubject(parsedSubject);
      if (parsedDate) setDate(parsedDate);
    }
  };

  const handleAddRecipient = () => {
    const trimmed = newRecipient.trim();
    if (!trimmed) return;
    if (recipients.includes(trimmed)) {
      setNewRecipient("");
      return;
    }
    persistRecipients([...recipients, trimmed]);
    setNewRecipient("");
  };

  const handleRemoveRecipient = (email: string) => {
    persistRecipients(recipients.filter((r) => r !== email));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (!subject.trim() || !date || !time || !pdfFile) {
      setError("Please fill in all fields and attach a PDF.");
      setSuccess(null);
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSending(true);

    try {
      const apiBase = import.meta.env.VITE_API_URL ?? "";
      const useVercelApi = !apiBase;

      let response: Response;
      if (useVercelApi) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(",")[1] ?? "";
            resolve(base64);
          };
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(pdfFile);
        });
        response = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: subject.trim(),
            date,
            time,
            message: message.trim(),
            pdfBase64: base64,
            pdfFilename: pdfFile.name,
            recipients,
          }),
        });
      } else {
        const formData = new FormData();
        formData.append("subject", subject.trim());
        formData.append("date", date);
        formData.append("time", time);
        formData.append("message", message.trim());
        formData.append("pdf", pdfFile);
        formData.append("recipients", JSON.stringify(recipients));
        response = await fetch(`${apiBase}/send-email`, {
          method: "POST",
          body: formData,
        });
      }

      const data = await response.json().catch(() => ({ success: response.ok }));

      if (!response.ok || !data?.success) {
        const message =
          (data && typeof data.error === "string" && data.error) ||
          "Failed to send email. Please try again.";
        throw new Error(message);
      }

      setSuccess("Email sent successfully.");
      setSubject("");
      setDate("");
      setTime("");
      setMessage("");
      setPdfFile(null);

      const pdfInput = form.elements.namedItem("pdf") as HTMLInputElement | null;
      if (pdfInput) {
        pdfInput.value = "";
      }
    } catch (sendError: unknown) {
      console.error(sendError);
      const message =
        sendError instanceof Error
          ? sendError.message
          : "Failed to send email. Please try again.";
      setError(message);
      setSuccess(null);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Verum Mail</h1>
          <p>Create meeting email drafts with attachments.</p>
        </div>
        <button
          type="button"
          className="settings-button"
          onClick={() => setView(view === "compose" ? "manage" : "compose")}
          aria-label={view === "compose" ? "Manage recipients" : "Back to form"}
        >
          {view === "compose" ? (
            <>
              <span className="icon-gear" aria-hidden="true">
                ⚙
              </span>
            </>
          ) : (
            "Back to form"
          )}
        </button>
      </header>

      <main className="app-main">
        {view === "compose" ? (
          <section className="card">
            <h2>Create a meeting</h2>

            <form onSubmit={handleSubmit} className="form">
              <label className="field">
                <span>PDF attachment</span>
                <input
                  type="file"
                  name="pdf"
                  accept="application/pdf,.pdf"
                  onChange={handleFileChange}
                />
              </label>

              {pdfFile && (
                <p className="hint">
                  Selected file: <strong>{pdfFile.name}</strong>
                </p>
              )}

              <label className="field">
                <span>Subject</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="e.g. Project kickoff meeting"
                />
              </label>

              <label className="field">
                <span>Email body</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Leave empty to use the default committee message, or type your own email text for testing."
                  rows={5}
                  className="field-input"
                />
              </label>

              <div className="field-grid">
                <label className="field">
                  <span>Date</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Time</span>
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                  />
                </label>
              </div>

              {error && <p className="error">{error}</p>}
              {success && <p className="success">{success}</p>}

              <button type="submit" className="primary-button" disabled={isSending}>
                {isSending ? "Sending..." : "Send Email"}
              </button>
            </form>
          </section>
        ) : (
          <section className="card">
            <h2>Manage recipients</h2>
            <div className="form">
              <div className="field">
                <span>Add recipient email</span>
                <div className="field-grid">
                  <input
                    type="email"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    placeholder="e.g. manager@verum.com"
                  />
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleAddRecipient}
                  >
                    Add
                  </button>
                </div>
              </div>

              {recipients.length > 0 && (
                <div className="field">
                  <span>Current recipients</span>
                  <ul className="recipient-list">
                    {recipients.map((email) => (
                      <li key={email} className="recipient-item">
                        <span>{email}</span>
                        <button
                          type="button"
                          className="recipient-remove"
                          onClick={() => handleRemoveRecipient(email)}
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
