// Values for a template's {{n}} variables. The bot refuses any send whose
// values do not match the template exactly; these helpers drive the inputs.
import { useState } from "react";

const VARIABLE_RE = /\{\{\s*([^{}]*?)\s*\}\}/g;
const SAMPLE_NAMES = { first_name: "Priya", name: "Priya Shah" };
const DEFAULT_FALLBACK = "there";

const containerMeta = (template) => {
  try {
    return JSON.parse(template?.containerMeta || "{}") || {};
  } catch {
    return {};
  }
};

export const templateVariableCount = (template) => {
  const body = template?.data || containerMeta(template).data || "";
  return new Set(Array.from(body.matchAll(VARIABLE_RE), (m) => m[1])).size;
};

// {{1}} is nearly always the greeting, so it starts as the first name.
const defaultItems = (count) =>
  Array.from({ length: count }, (_, i) => ({
    type: i === 0 ? "first_name" : "text",
    text: "",
    fallback: DEFAULT_FALLBACK,
  }));

const isFilled = (item) =>
  (item.type === "text" ? item.text : item.fallback).trim() !== "";

const toPayload = (item) =>
  item.type === "text"
    ? item.text.trim()
    : { token: item.type, fallback: item.fallback.trim() };

export const previewMessage = (template, items) => {
  const body =
    containerMeta(template).data || (template?.data || "").split("|")[0];
  return body.trim().replace(VARIABLE_RE, (placeholder, key) => {
    const item = items[Number(key) - 1];
    if (!item) return placeholder;
    if (item.type !== "text") return SAMPLE_NAMES[item.type];
    return item.text.trim() || placeholder;
  });
};

// Short text for the stored values of a schedule.
export const describeParams = (params = []) =>
  params
    .map((p) => {
      if (typeof p === "string") return p;
      const label = p.token === "name" ? "full name" : "first name";
      return `${label} (or "${p.fallback}")`;
    })
    .join(", ");

export const useTemplateParams = (template) => {
  const [draft, setDraft] = useState({ id: null, items: [] });
  const count = templateVariableCount(template);
  // Typed values belong to one template; any other starts from the defaults.
  const items =
    draft.id === template?.id && draft.items.length === count
      ? draft.items
      : defaultItems(count);

  return {
    items,
    complete: items.every(isFilled),
    payload: items.map(toPayload),
    setItem: (index, changes) =>
      setDraft({
        id: template?.id,
        items: items.map((item, i) =>
          i === index ? { ...item, ...changes } : item
        ),
      }),
    reset: () => setDraft({ id: null, items: [] }),
  };
};
