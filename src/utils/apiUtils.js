const API_ROOT = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const BASE_URL = `${API_ROOT}/dashboard`;
const DEFAULT_TIMEOUT_MS = 15000;

const api = async (url, method = "GET", body = null, signal, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const options = {
    method,
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
  };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => null);

    if (!res.ok || !data) {
      return {
        success: false,
        message: data?.message || data?.detail || `Request failed (${res.status})`,
      };
    }

    return data;
  } catch (err) {
    if (err?.name === "AbortError") {
      if (timedOut) {
        return {
          success: false,
          aborted: true,
          timedOut: true,
          message: "Request timed out.",
        };
      }
      // Unmount / Strict Mode / navigation — not a hang.
      return { success: false, aborted: true, cancelled: true };
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

export const pingAPI = () => api(`${BASE_URL}/ping`);

export const loginAPI = (username, password) =>
  api(`${BASE_URL}/login`, "POST", { username, password }, null, 8000);

export const getAllDocs = (page = 1, limit = 20, search = "", signal) => {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set("search", search);
  return api(`${BASE_URL}/chat/all?${params.toString()}`, "GET", null, signal);
};

export const getDocById = (id, signal) =>
  api(`${BASE_URL}/chat/${id}`, "GET", null, signal);

export const sendChatMessage = (docId, text) =>
  api(`${BASE_URL}/chat/send`, "POST", { doc_id: docId, text });

export const getAllTemplates = (signal) =>
  api(`${BASE_URL}/chat/template/all`, "GET", null, signal, 20000);

export const deleteTemplate = (templateName) =>
  api(`${BASE_URL}/chat/template/${templateName}`, "DELETE");

export const createTemplate = (formData) =>
  fetch(`${BASE_URL}/chat/template`, {
    method: "POST",
    body: formData,
  }).then((res) => res.json());

const TRIGGER_TIMEOUT_MS = 120000;

const triggerTemplateForm = async (templateId, formData) => {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TRIGGER_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}/template/trigger/${templateId}`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data) {
      return {
        success: false,
        message: data?.message || `Request failed (${res.status})`,
      };
    }

    return data;
  } catch (err) {
    if (err?.name === "AbortError" && timedOut) {
      return {
        success: false,
        message: "Campaign trigger timed out. Try a smaller audience.",
      };
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

export const triggerTemplateWithPhones = (templateId, phones) => {
  const formData = new FormData();
  formData.append(
    "phone_numbers",
    phones.map((p) => p.phone_number).join(",")
  );
  formData.append(
    "phone_codes",
    phones.map((p) => p.phone_code).join(",")
  );
  return triggerTemplateForm(templateId, formData);
};

export const triggerTemplateWithExcel = (templateId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return triggerTemplateForm(templateId, formData);
};

export const triggerTemplateWithCategory = (
  templateId,
  category,
  product = "",
  source = "",
  excludePhoneNumbers = []
) => {
  const formData = new FormData();
  formData.append("category", category);
  if (product) formData.append("sub_category", product);
  if (source) formData.append("source", source);
  if (excludePhoneNumbers.length > 0) {
    formData.append("exclude_phone_numbers", excludePhoneNumbers.join(","));
  }
  return triggerTemplateForm(templateId, formData);
};

export const getAllCampaigns = (limit, signal) => {
  const params = new URLSearchParams();
  if (limit) params.set("limit", limit);
  const qs = params.toString();
  return api(`${BASE_URL}/campaigns${qs ? `?${qs}` : ""}`, "GET", null, signal);
};

export const getCampaignById = (
  campaignId,
  { page = 1, limit = 50, status = "all" } = {},
  signal
) => {
  const params = new URLSearchParams({ page, limit, status });
  return api(
    `${BASE_URL}/campaigns/${campaignId}?${params.toString()}`,
    "GET",
    null,
    signal
  );
};

export const exportCampaignCsv = async (campaignId, status = "all") => {
  const params = new URLSearchParams({ status });
  const res = await fetch(
    `${BASE_URL}/campaigns/${campaignId}/export?${params.toString()}`
  );
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  return { blob, filename: match?.[1] || `${campaignId}.csv` };
};

export const getSchedules = (templateId = null) =>
  api(`${BASE_URL}/schedules${templateId ? `?template_id=${templateId}` : ""}`);

export const createSchedule = ({
  templateId,
  templateName,
  offsetDays,
  sendTime,
  category = null,
  subCategory = null,
  scheduleType = "delay",
  sendDate = null,
  enabled = true,
}) =>
  api(`${BASE_URL}/schedules`, "POST", {
    template_id: templateId,
    template_name: templateName,
    offset_days: offsetDays,
    send_time: sendTime,
    category,
    sub_category: subCategory,
    schedule_type: scheduleType,
    send_date: sendDate,
    enabled,
  });

export const updateSchedule = (scheduleId, fields) =>
  api(`${BASE_URL}/schedules/${scheduleId}`, "PATCH", fields);

export const deleteSchedule = (scheduleId) =>
  api(`${BASE_URL}/schedules/${scheduleId}`, "DELETE");

export const fetchAllLeads = (signal) =>
  api(`${BASE_URL}/leads`, "GET", null, signal);

export const fetchLeadStats = (signal) =>
  api(`${BASE_URL}/leads/stats`, "GET", null, signal);

export const fetchLeadById = (leadId, signal) =>
  api(`${BASE_URL}/leads/${leadId}`, "GET", null, signal);

export const fetchLeadCategoryCounts = () => fetchLeadStats();

export const fetchFilteredLeads = ({
  category,
  pipeline,
  product,
  source,
  masterclassId,
  search = "",
  page = 1,
  limit = 25,
  whatsappReady = true,
  noNumber = false,
  notWhatsappReady = false,
  quizNoMasterclass = false,
  signal,
}) => {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (pipeline) params.set("pipeline", pipeline);
  if (product) params.set("product", product);
  if (source) params.set("source", source);
  if (masterclassId) params.set("masterclass_id", masterclassId);
  if (search) params.set("search", search);
  if (noNumber) params.set("no_number", "true");
  if (notWhatsappReady) params.set("not_whatsapp_ready", "true");
  if (quizNoMasterclass) params.set("quiz_no_masterclass", "true");
  params.set("whatsapp_ready", whatsappReady ? "true" : "false");
  params.set("page", page);
  params.set("limit", limit);
  return api(`${BASE_URL}/leads/filtered?${params.toString()}`, "GET", null, signal);
};

export const fetchMasterclasses = (signal) =>
  api(`${BASE_URL}/masterclasses`, "GET", null, signal);

export const fetchMasterclassRegistrants = (masterclassId, signal) =>
  api(`${BASE_URL}/masterclasses/${masterclassId}/registrants`, "GET", null, signal);

export const createMasterclass = (payload) =>
  api(`${BASE_URL}/masterclasses`, "POST", payload);

export const updateMasterclass = (masterclassId, payload) =>
  api(`${BASE_URL}/masterclasses/${masterclassId}`, "PATCH", payload);

export const activateMasterclass = (masterclassId) =>
  api(`${BASE_URL}/masterclasses/${masterclassId}/activate`, "POST");

export const deleteMasterclass = (masterclassId) =>
  api(`${BASE_URL}/masterclasses/${masterclassId}`, "DELETE");
