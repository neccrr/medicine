import { drivePreviewUrl, driveViewUrl, fileTitle, formatSize } from "../../lib/drive";
import type { DriveFile, DriveFileKind } from "../../lib/driveTypes";

const KIND_LABELS = new Map<DriveFileKind | "folder", string>([
  ["folder", "Folder"],
  ["slides", "PPT"],
  ["pdf", "PDF"],
  ["video", "Video"],
  ["audio", "Audio"],
  ["document", "Doc"],
  ["sheet", "Sheet"],
  ["image", "Image"],
  ["other", "File"],
]);

/** A small tag for what a row is: a folder, slides, a PDF, a recording… */
export function DriveKind({ kind }: { kind: DriveFileKind | "folder" }) {
  return (
    <span className={`drive-kind drive-kind-${kind}`} aria-hidden="true">
      {kind === "folder" ? (
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      ) : (
        KIND_LABELS.get(kind)
      )}
    </span>
  );
}

/** One Drive file in Google's own viewer (it shows slides, PDFs and recordings). */
export function DriveFileView({ file }: { file: DriveFile }) {
  const size = formatSize(file.size);
  return (
    <div className="pdf-viewer drive-viewer" id="drive-viewer">
      <div className="pdf-viewer-bar">
        <p>
          {fileTitle(file.name)}
          <small>
            {KIND_LABELS.get(file.kind)}
            {size && ` · ${size}`}
          </small>
        </p>
        <a href={driveViewUrl(file.id)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
          Open in Drive
          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
            <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
      <iframe
        key={file.id}
        src={drivePreviewUrl(file.id)}
        title={fileTitle(file.name)}
        className="pdf-frame"
        allow="autoplay; fullscreen"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
