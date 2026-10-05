import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { DriveFileView, DriveKind } from "../components/drive/DriveParts";
import { RefreshIcon, SearchIcon } from "../components/icons";
import { useDrive } from "../hooks/useDrive";
import { allFiles, countFiles, driveHref, fileTitle, folderAt, formatSize, niceName, updatedAgo } from "../lib/drive";
import type { DriveFile } from "../lib/driveTypes";

/** Everything in the class's Google Drive, folder by folder, for signed-in students. */
export function ClassDrive() {
  const drive = useDrive();
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const path = params.getAll("f");
  const fileId = params.get("file");

  const tree = drive.status === "ready" ? drive.tree : null;
  const everything = useMemo(() => (tree ? allFiles(tree.root) : []), [tree]);
  const folder = tree ? folderAt(tree.root, path) : null;
  const selected = fileId ? everything.find((f) => f.file.id === fileId) : undefined;
  const q = query.trim().toLowerCase();
  const found = q.length >= 2 ? everything.filter(({ file }) => file.name.toLowerCase().includes(q)).slice(0, 60) : null;

  const head = (
    <header className="drive-head">
      <div>
        <h1>Class Drive</h1>
        <p className="subtitle">
          Everything in the class's Google Drive: slides, recordings, tutorials and exams. Files added to the Drive show up
          here within a few minutes.
        </p>
      </div>
      {drive.status === "ready" && (
        <div className="drive-status">
          <span>Updated {updatedAgo(drive.tree.updatedAt)}</span>
          <button type="button" className="btn btn-secondary btn-small" onClick={drive.refresh} disabled={drive.refreshing}>
            <RefreshIcon />
            {drive.refreshing ? "Checking…" : "Refresh"}
          </button>
        </div>
      )}
    </header>
  );

  if (drive.status !== "ready") {
    return (
      <section className="page drive-page">
        {head}
        {drive.status === "loading" && <p className="drive-loading">Loading the class Drive…</p>}
        {drive.status === "signed-out" && (
          <EmptyState title="Sign in to open the class Drive">
            <p>The class's slides, recordings and exams are for signed-in students.</p>
            <Link to="/account" className="btn btn-primary">
              Sign in
            </Link>
          </EmptyState>
        )}
        {drive.status === "off" && (
          <EmptyState title="The class Drive isn't connected">
            <p>
              This site doesn't have a Google Drive folder set up. The <Link to="/modules">modules</Link> are still here.
            </p>
          </EmptyState>
        )}
        {drive.status === "error" && (
          <EmptyState title="Couldn't load the class Drive">
            <p>{drive.message}</p>
            <button type="button" className="btn btn-secondary" onClick={drive.refresh}>
              Try again
            </button>
          </EmptyState>
        )}
      </section>
    );
  }

  const fileRow = (file: DriveFile, filePath: readonly string[], showPath = false) => (
    <li key={file.id}>
      <Link
        to={driveHref(filePath, file.id)}
        className={file.id === fileId ? "drive-row active" : "drive-row"}
        onClick={() => {
          if (window.matchMedia("(max-width: 960px)").matches) {
            requestAnimationFrame(() => document.getElementById("drive-viewer")?.scrollIntoView({ behavior: "smooth", block: "start" }));
          }
        }}
      >
        <DriveKind kind={file.kind} />
        <span className="drive-row-name">
          {fileTitle(file.name)}
          {showPath && <small>{filePath.map(niceName).join(" › ") || "Class Drive"}</small>}
        </span>
        <span className="drive-row-meta">{formatSize(file.size)}</span>
      </Link>
    </li>
  );

  return (
    <section className="page drive-page">
      {head}
      <div className="drive-toolbar">
        <nav className="drive-crumbs" aria-label="Folder">
          <Link to="/drive">Class Drive</Link>
          {path.map((name, i) => (
            <span key={`${i}-${name}`}>
              <span aria-hidden="true"> › </span>
              {i === path.length - 1 ? <span aria-current="page">{niceName(name)}</span> : <Link to={driveHref(path.slice(0, i + 1))}>{niceName(name)}</Link>}
            </span>
          ))}
        </nav>
        <label className="drive-search">
          <SearchIcon />
          <span className="sr-only">Find a file in the class Drive</span>
          <input type="search" placeholder="Find a file" value={query} onChange={(e) => { setQuery(e.target.value); }} />
        </label>
      </div>
      {!drive.tree.complete && <p className="drive-note">Part of the Drive couldn't be read this time, so a few files may be missing.</p>}

      <div className={selected || fileId ? "drive-layout has-file" : "drive-layout"}>
        <div className="drive-list">
          {found ? (
            found.length === 0 ? (
              <p className="drive-empty">No file names match “{query.trim()}”.</p>
            ) : (
              <ul aria-label="Matching files">{found.map(({ file, path: p }) => fileRow(file, p, true))}</ul>
            )
          ) : !folder ? (
            <p className="drive-empty">
              That folder isn't in the Drive any more. <Link to="/drive">Back to the top</Link>
            </p>
          ) : folder.folders.length === 0 && folder.files.length === 0 ? (
            <p className="drive-empty">This folder is empty.</p>
          ) : (
            <ul aria-label={path.length ? niceName(path[path.length - 1] ?? "") : "Class Drive"}>
              {folder.folders.map((f) => {
                const n = countFiles(f);
                return (
                  <li key={f.name}>
                    <Link to={driveHref([...path, f.name])} className="drive-row">
                      <DriveKind kind="folder" />
                      <span className="drive-row-name">{niceName(f.name)}</span>
                      <span className="drive-row-meta">
                        {n} file{n === 1 ? "" : "s"}
                      </span>
                    </Link>
                  </li>
                );
              })}
              {folder.files.map((file) => fileRow(file, path))}
            </ul>
          )}
        </div>

        {selected ? (
          <DriveFileView file={selected.file} />
        ) : (
          fileId && (
            <div className="drive-viewer-missing" id="drive-viewer">
              <p>That file isn't in the class Drive any more.</p>
            </div>
          )
        )}
      </div>
    </section>
  );
}
