import { describe, expect, it } from "vitest";
import { migratedKey, migrateLegacyProgressKeys } from "./progressMigration";

const subjects = {
  flashcards: [
    { id: "physiology", blockId: "1.2", label: "Physiology" },
    { id: "physiology", blockId: "1.1", label: "Physiology" },
    { id: "histology", blockId: "1.1", label: "Histology" },
  ],
  ebook: [{ id: "physiology", blockId: "1.2", label: "Physiology" }],
};

function memoryStorage(initial: Record<string, string>): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    key: (i: number) => Array.from(data.keys())[i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  };
}

describe("migratedKey", () => {
  it("moves an old subject key to the earliest block that has that content type", () => {
    expect(migratedKey("medicine:flashcards:physiology", subjects)).toBe("medicine:flashcards:1.1/physiology");
    expect(migratedKey("medicine:ebook:physiology", subjects)).toBe("medicine:ebook:1.2/physiology");
  });

  it("leaves new keys, global keys and unknown subjects alone", () => {
    expect(migratedKey("medicine:flashcards:1.1/physiology", subjects)).toBeNull();
    expect(migratedKey("medicine:theme", subjects)).toBeNull();
    expect(migratedKey("medicine:examhistory:1.1", subjects)).toBeNull();
    expect(migratedKey("medicine:flashcards:mystery", subjects)).toBeNull();
  });
});

describe("migrateLegacyProgressKeys", () => {
  it("renames old keys in place, keeping their values", () => {
    const storage = memoryStorage({
      "medicine:flashcards:histology": '{"h1":1}',
      "medicine:theme": '"dark"',
    });
    expect(migrateLegacyProgressKeys(storage)).toBe(1);
    expect(storage.getItem("medicine:flashcards:1.1/histology")).toBe('{"h1":1}');
    expect(storage.getItem("medicine:flashcards:histology")).toBeNull();
    expect(storage.getItem("medicine:theme")).toBe('"dark"');
    expect(migrateLegacyProgressKeys(storage)).toBe(0);
  });
});
