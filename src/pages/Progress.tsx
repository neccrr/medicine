import { useRef, useState } from "react";
import { exportAllProgress, importAllProgress } from "../lib/storage";

export function Progress() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  const handleExport = () => {
    const data = exportAllProgress();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medicine-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInput.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      importAllProgress(data);
      setMessage("Progress imported. Reload any open pages to see updated stats.");
    } catch {
      setMessage("Could not read that file — is it a valid export?");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <section className="page">
      <h1>Progress</h1>
      <p className="subtitle">
        Everything lives in this browser's local storage — nothing is sent to a
        server. Export a backup, or move your progress to another device.
      </p>

      <div className="progress-actions">
        <button className="btn" onClick={handleExport}>
          Export progress (JSON)
        </button>
        <button className="btn btn-secondary" onClick={handleImportClick}>
          Import progress
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          hidden
          onChange={handleFileChange}
        />
      </div>

      {message && <p className="progress-message">{message}</p>}

      <p className="fine-print">
        Clearing your browser's site data, or switching browsers/devices, will
        lose progress unless you've exported it first.
      </p>
    </section>
  );
}
