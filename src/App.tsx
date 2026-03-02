import React, { useState } from "react";

function App() {
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPdfFile(file);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!subject.trim() || !date || !time || !pdfFile) {
      setError("Please fill in all fields and attach a PDF.");
      setSuccess(null);
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSending(true);

    try {
      const formData = new FormData();
      formData.append("subject", subject.trim());
      formData.append("date", date);
      formData.append("time", time);
      formData.append("pdf", pdfFile);

      const response = await fetch("http://localhost:4000/send-email", {
        method: "POST",
        body: formData,
      });

      const data = await response
        .json()
        .catch(() => ({ success: response.ok }));

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
      setPdfFile(null);

      const pdfInput = event.currentTarget.elements.namedItem(
        "pdf"
      ) as HTMLInputElement | null;
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
      </header>

      <main className="app-main">
        <section className="card">
          <h2>Create a meeting</h2>

          <form onSubmit={handleSubmit} className="form">
            <label className="field">
              <span>Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="e.g. Project kickoff meeting"
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

            <label className="field">
              <span>PDF attachment</span>
              <input
                type="file"
                name="pdf"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
              />
              <small>Only PDF files are accepted.</small>
            </label>

            {pdfFile && (
              <p className="hint">
                Selected file: <strong>{pdfFile.name}</strong>
              </p>
            )}

            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}

            <button type="submit" className="primary-button" disabled={isSending}>
              {isSending ? "Sending..." : "Send Email"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default App;
