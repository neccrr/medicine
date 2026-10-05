import { describe, expect, it } from "vitest";
import { blockIdOf, countFiles, driveHref, fileGroups, fileTitle, folderAt, formatSize, isSubjectFolder, niceName, subjectFolderPath, updatedAgo } from "./drive";
import type { DriveFile, DriveFolder } from "./driveTypes";

const file = (id: string, name: string): DriveFile => ({ id, name, kind: "slides", size: 1000, modifiedTime: "" });
const folder = (name: string, folders: DriveFolder[] = [], files: DriveFile[] = []): DriveFolder => ({ name, folders, files });

const root = folder("", [
  folder("SEMESTER 1", [
    folder("BLOCK 1.1 CELL BIOLOGY AND HEMATOLOGY", [folder("BIOCHEMISTRY", [], [file("bio1", "Enzymes.pptx")]), folder("EXAMS", [folder("UB", [], [file("ub1", "UB 2025.pdf")])])]),
    folder("BLOCK 1.2 INTEGUMEN SYSTEM AND MUSKOLOSKELETAL", [
      folder("ANATOMY", [
        folder("LECTURE", [folder("PPTs", [], [file("l2", "L2 - Intro.pptx")]), folder("RECORDINGS")]),
        folder("PRACTICUM", [folder("PPTs", [], [file("p1", "P1.pptx")])], [file("tatib", "TATIB 1.2 .pdf")]),
      ]),
    ]),
    folder("SKILLS", [], [file("sk", "Handwashing.pdf")]),
  ]),
]);

describe("finding folders in the class Drive", () => {
  it("reads the block id from a block folder's name", () => {
    expect(blockIdOf("BLOCK 1.2 INTEGUMEN SYSTEM AND MUSKOLOSKELETAL")).toBe("1.2");
    expect(blockIdOf("Block 1.10 Something")).toBe("1.10");
    expect(blockIdOf("SKILLS")).toBeNull();
  });

  it("matches subject folders by name, in English or Indonesian", () => {
    expect(isSubjectFolder("BIOCHEMISTRY", "biochem")).toBe(true);
    expect(isSubjectFolder("Biokimia", "biochem")).toBe(true);
    expect(isSubjectFolder("ANATOMI", "anatomy")).toBe(true);
    expect(isSubjectFolder("PHYSIOLOGY", "anatomy")).toBe(false);
    expect(isSubjectFolder("constructor", "constructor")).toBe(true);
  });

  it("finds a subject's folder inside its block, at any depth", () => {
    expect(subjectFolderPath(root, "1.2", "anatomy")).toEqual(["SEMESTER 1", "BLOCK 1.2 INTEGUMEN SYSTEM AND MUSKOLOSKELETAL", "ANATOMY"]);
    expect(subjectFolderPath(root, "1.1", "biochem")?.at(-1)).toBe("BIOCHEMISTRY");
    expect(subjectFolderPath(root, "1.2", "biochem")).toBeNull();
    expect(subjectFolderPath(root, "9.9", "anatomy")).toBeNull();
    expect(folderAt(root, ["SEMESTER 1", "nope"])).toBeNull();
  });

  it("groups a subject's files by the folder they're in", () => {
    const anatomy = folderAt(root, subjectFolderPath(root, "1.2", "anatomy") ?? []);
    expect(anatomy && countFiles(anatomy)).toBe(3);
    expect(anatomy && fileGroups(anatomy).map((g) => [g.label, g.files.map((f) => f.id)])).toEqual([
      ["Lecture · PPTs", ["l2"]],
      ["Practicum", ["tatib"]],
      ["Practicum · PPTs", ["p1"]],
    ]);
  });
});

describe("Drive labels and links", () => {
  it("tidies shouted folder names but keeps abbreviations", () => {
    expect(niceName("BLOCK 1.2 INTEGUMEN SYSTEM AND MUSKOLOSKELETAL")).toBe("Block 1.2 Integumen System And Muskoloskeletal");
    expect(niceName("UB 1.2 ASTERION 2025")).toBe("UB 1.2 Asterion 2025");
    expect(niceName("PPTs")).toBe("PPTs");
    expect(fileTitle("L2 - Intro.pptx")).toBe("L2 - Intro");
  });

  it("links to a folder by its names, and a file in it", () => {
    expect(driveHref([])).toBe("/drive");
    expect(driveHref(["SEMESTER 1", "A&B"], "id1")).toBe("/drive?f=SEMESTER+1&f=A%26B&file=id1");
  });

  it("formats sizes and ages", () => {
    expect(formatSize(null)).toBe("");
    expect(formatSize(500)).toBe("1 KB");
    expect(formatSize(7_404_733)).toBe("7.1 MB");
    expect(formatSize(26_836_841)).toBe("26 MB");
    expect(updatedAgo(0, 30_000)).toBe("just now");
    expect(updatedAgo(0, 4 * 60_000)).toBe("4 min ago");
    expect(updatedAgo(0, 3 * 3_600_000)).toBe("3 h ago");
  });
});
