import { useState, useRef } from "react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const currency = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const emptyProject = () => ({
  meta: {
    title: "", subtitle: "", rfpNumber: "", dueDate: "",
    clientName: "", clientDescription: "",
    clientStats: [{ label: "", value: "" }],
    projectType: "", projectSubtype: "",
    projectDetails: [{ label: "", value: "" }],
    contractType: "", contractDescription: "",
    contractDetails: [{ label: "", value: "" }],
    locations: [{ name: "", description: "" }],
    notices: [{ text: "", type: "warning" }],
    contacts: [{ name: "", role: "", email: "", phone: "" }],
    submissionMethod: { name: "", details: "" },
  },
  scope: [{ id: uid(), title: "Scope Area 1", duration: "", metrics: [{ label: "", value: "" }], details: [""], notes: [] }],
  checklist: [{ id: uid(), text: "", category: "Technical", completed: false }],
  timeline: {
    totalDuration: "",
    phases: [{ id: uid(), name: "", weeks: "", duration: "", tasks: [""] }],
    milestones: [{ label: "", value: "", note: "" }],
  },
  pricing: {
    tables: [{ id: uid(), title: "Base Pricing", lineItems: [{ id: uid(), label: "", amount: 0 }] }],
    optionalServices: [{ id: uid(), title: "", typeOfWork: "", quantity: 1, unitPrice: 0, included: false }],
    pricingNotes: [],
  },
  notes: { scopeNotes: "", technicalApproach: "", teamComposition: "", differentiators: "", riskMitigation: "", questionsForClient: "" },
});

// ─── AI Extraction Prompt ────────────────────────────────────────────────────
const EXTRACTION_PROMPT = `You are an expert RFP analyst. Extract all relevant information from this RFP document into a structured JSON format. Be thorough and capture every detail.

Return ONLY valid JSON (no markdown fences, no commentary) matching this exact structure:

{
  "meta": {
    "title": "RFP title or project name",
    "subtitle": "Brief description",
    "rfpNumber": "RFP/solicitation number if present",
    "dueDate": "Response due date",
    "clientName": "Issuing organization name",
    "clientDescription": "Brief description of the organization",
    "clientStats": [{"label": "stat name", "value": "stat value"}],
    "projectType": "Type of work requested",
    "projectSubtype": "Specific category",
    "projectDetails": [{"label": "detail name", "value": "detail value"}],
    "contractType": "Contract structure (fixed price, T&M, etc)",
    "contractDescription": "Contract term summary",
    "contractDetails": [{"label": "term name", "value": "term value"}],
    "locations": [{"name": "Location name", "description": "Details about this location"}],
    "notices": [{"text": "Important notice or constraint", "type": "warning"}],
    "contacts": [{"name": "Contact name", "role": "Title/Role", "email": "email", "phone": "phone"}],
    "submissionMethod": {"name": "How to submit", "details": "Submission instructions"}
  },
  "scope": [
    {
      "title": "Scope area name",
      "duration": "Estimated duration",
      "metrics": [{"label": "metric name", "value": "metric value (use short form like 68K, 150, etc)"}],
      "details": ["Individual scope item or requirement"],
      "notes": ["Important notes about this scope area"]
    }
  ],
  "checklist": [
    {"text": "Specific requirement or deliverable to track", "category": "Technical|Deliverables|Timeline|Contract|Compliance|Administrative", "completed": false}
  ],
  "timeline": {
    "totalDuration": "Overall project duration",
    "phases": [
      {"name": "Phase name", "weeks": "Week range (e.g. Weeks 1-2)", "duration": "Duration (e.g. 2 weeks)", "tasks": ["Task description"]}
    ],
    "milestones": [{"label": "Milestone name", "value": "Date or deadline", "note": "Additional context"}]
  },
  "pricing": {
    "tables": [
      {"title": "Pricing table name", "lineItems": [{"label": "Line item", "amount": 0}]}
    ],
    "optionalServices": [
      {"title": "Service name", "typeOfWork": "Category", "quantity": 1, "unitPrice": 0, "included": false}
    ],
    "pricingNotes": ["Any pricing-related notes, constraints, or escalation terms"]
  },
  "notes": {
    "scopeNotes": "Key observations about scope that a bid team should consider",
    "technicalApproach": "Suggested technical approach based on RFP requirements",
    "teamComposition": "Suggested team roles based on requirements",
    "differentiators": "Potential differentiators or win themes identified in the RFP",
    "riskMitigation": "Risks identified in the RFP and mitigation suggestions",
    "questionsForClient": "Ambiguities or items needing clarification from the client"
  }
}

IMPORTANT RULES:
- Extract EVERY requirement, deliverable, and constraint into the checklist
- Group scope items logically (e.g. by work area, phase, or domain)
- Capture all dates, deadlines, and milestones
- Extract all pricing structures, contract terms, and extension options
- For the notes section, provide your analysis and recommendations as a bid advisor
- If the RFP mentions evaluation criteria, capture them in the checklist under "Compliance"
- If pricing amounts are not specified, leave amounts as 0 (the team will fill in estimates)
- Be specific with metrics (asset counts, IP ranges, user counts, etc)
- Capture submission requirements, format requirements, and any restrictions`;

// ─── Icons ───────────────────────────────────────────────────────────────────
const I = {
  Shield: () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Clock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Download: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Upload: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Plus: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Building: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>,
  Target: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  FileText: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  MapPin: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  AlertTriangle: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Mail: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  Globe: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  DollarSign: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Calendar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  Folder: () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#E8792F" strokeWidth="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  FileUp: () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1F3864" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="12 18 12 12"/><polyline points="9 15 12 12 15 15"/></svg>,
  Pdf: () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 12h4M10 16h4M10 20h4"/></svg>,
  Sparkle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.09 6.26L20.18 10l-6.09 1.74L12 18l-2.09-6.26L3.82 10l6.09-1.74z"/></svg>,
  Loader: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
      <path d="M21 12a9 9 0 11-6.219-8.56"/>
    </svg>
  ),
};

// ─── Theme ───────────────────────────────────────────────────────────────────
const C = {
  navy: "#483D8B", navyLight: "#5a4fa0", orange: "#E8792F", orangeLight: "#2a1d10",
  green: "#22c55e", greenLight: "#0d2618", red: "#ef4444", blue: "#3b82f6", blueLight: "#111a2e",
  g50: "#0f1525", g100: "#131829", g200: "#1e2a40", g300: "#2a3754", g400: "#5a6780",
  g500: "#7a8aaa", g600: "#8b98b0", g700: "#a8b5cc", g800: "#d0d8e8", g900: "#e8edf5",
  white: "#161d2f", surface: "#131829", deep: "#0c1021", header: "#080d1a",
  warnBg: "#2a2010", warnBorder: "#b8860b", warnText: "#f0c040",
  textPrimary: "#e2e8f0", textSecondary: "#8b98b0", textMuted: "#5a6780",
  font: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
};
const TAB_C = [C.navy, C.green, C.g600, C.orange, C.blue, "#7c3aed"];
const TABS = ["Overview", "Scope", "Checklist", "Timeline", "Pricing", "Notes"];

// ─── Tiny reusable UI ────────────────────────────────────────────────────────
const Card = ({ children, style, bl }) => (
  <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.g200}`, borderLeft: bl ? `4px solid ${bl}` : undefined, padding: "20px 24px", ...style }}>{children}</div>
);
const Inp = ({ label, value, onChange, placeholder, type = "text", style }) => (
  <div style={{ marginBottom: 12, ...style }}>
    {label && <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</label>}
    <input type={type} value={value || ""} onChange={(e) => onChange(type === "number" ? Number(e.target.value) || 0 : e.target.value)} placeholder={placeholder}
      style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.g200}`, borderRadius: 6, fontSize: 14, fontFamily: C.font, color: C.textPrimary, background: C.g50, boxSizing: "border-box", outline: "none" }}
      onFocus={(e) => (e.target.style.borderColor = C.navy)} onBlur={(e) => (e.target.style.borderColor = C.g200)} />
  </div>
);
const TA = ({ label, value, onChange, placeholder, rows = 5 }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>{label}</label>}
    <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.g200}`, borderRadius: 8, fontSize: 14, fontFamily: C.font, color: C.textPrimary, background: C.g50, boxSizing: "border-box", resize: "vertical", outline: "none", lineHeight: 1.5 }}
      onFocus={(e) => (e.target.style.borderColor = C.navy)} onBlur={(e) => (e.target.style.borderColor = C.g200)} />
  </div>
);
const Btn = ({ children, onClick, v = "default", sm, style, disabled }) => {
  const vs = {
    default: { background: C.g200, color: C.textSecondary, border: `1px solid ${C.g300}` },
    primary: { background: C.navy, color: "#e2e8f0", border: "none" },
    orange: { background: C.orange, color: "#ffffff", border: "none" },
    danger: { background: "transparent", color: C.red, border: `1px solid ${C.g200}` },
    ghost: { background: "transparent", color: C.textMuted, border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...vs[v], padding: sm ? "4px 10px" : "8px 16px", borderRadius: 6, fontSize: sm ? 12 : 13, fontWeight: 600, fontFamily: C.font,
      cursor: disabled ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 6, opacity: disabled ? 0.5 : 1, ...style,
    }}>{children}</button>
  );
};
const Sec = ({ icon, children, right }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.textPrimary, display: "flex", alignItems: "center", gap: 8 }}>{icon}{children}</h3>
    {right}
  </div>
);

// ─── TAB: Overview ───────────────────────────────────────────────────────────
function OverviewTab({ data, set }) {
  const m = data.meta;
  const up = (f, v) => set((d) => ({ ...d, meta: { ...d.meta, [f]: v } }));
  const uA = (f, i, k, v) => { const a = [...m[f]]; a[i] = { ...a[i], [k]: v }; up(f, a); };
  const aA = (f, t) => up(f, [...m[f], t]);
  const rA = (f, i) => up(f, m[f].filter((_, j) => j !== i));

  const infoCard = (title, icon, color, nameField, descField, statsField) => (
    <Card bl={color}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>{icon}<span style={{ fontWeight: 700, fontSize: 15, color: C.textPrimary }}>{title}</span></div>
      <Inp label="Name/Type" value={m[nameField]} onChange={(v) => up(nameField, v)} placeholder={`Enter ${title.toLowerCase()}`} />
      <Inp label="Description" value={m[descField]} onChange={(v) => up(descField, v)} placeholder="Details" />
      {(m[statsField] || []).map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <Inp label={i === 0 ? "Label" : ""} value={s.label} onChange={(v) => uA(statsField, i, "label", v)} placeholder="Label" style={{ flex: 1 }} />
          <Inp label={i === 0 ? "Value" : ""} value={s.value} onChange={(v) => uA(statsField, i, "value", v)} placeholder="Value" style={{ flex: 1 }} />
          <Btn sm v="ghost" onClick={() => rA(statsField, i)} style={{ marginBottom: 12 }}><I.Trash /></Btn>
        </div>
      ))}
      <Btn sm onClick={() => aA(statsField, { label: "", value: "" })}><I.Plus /> Add</Btn>
    </Card>
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        {infoCard("Client", <I.Building />, C.navy, "clientName", "clientDescription", "clientStats")}
        {infoCard("Project Type", <I.Target />, C.green, "projectType", "projectSubtype", "projectDetails")}
        {infoCard("Contract Terms", <I.FileText />, C.orange, "contractType", "contractDescription", "contractDetails")}
      </div>
      <Card style={{ marginBottom: 24 }}>
        <Sec icon={<span style={{ color: C.red }}><I.MapPin /></span>} right={<Btn sm onClick={() => aA("locations", { name: "", description: "" })}><I.Plus /> Location</Btn>}>
          Target Locations ({m.locations.length})
        </Sec>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {m.locations.map((l, i) => (
            <div key={i} style={{ background: C.g50, borderRadius: 8, padding: 14, border: `1px solid ${C.g200}`, position: "relative" }}>
              <Btn sm v="ghost" onClick={() => rA("locations", i)} style={{ position: "absolute", top: 6, right: 6 }}><I.Trash /></Btn>
              <Inp label="Name" value={l.name} onChange={(v) => uA("locations", i, "name", v)} placeholder="City, State" />
              <Inp label="Description" value={l.description} onChange={(v) => uA("locations", i, "description", v)} placeholder="Site details" />
            </div>
          ))}
        </div>
      </Card>
      <Card style={{ marginBottom: 24 }}>
        <Sec icon={<span style={{ color: C.warnText }}><I.AlertTriangle /></span>} right={<Btn sm onClick={() => aA("notices", { text: "", type: "warning" })}><I.Plus /> Notice</Btn>}>Important Notices</Sec>
        {m.notices.map((n, i) => (
          <div key={i} style={{ background: C.warnBg, borderRadius: 8, padding: "10px 14px", marginBottom: 8, display: "flex", gap: 10, alignItems: "center", border: `1px solid ${C.warnBorder}33` }}>
            <input style={{ flex: 1, background: "transparent", border: "none", fontSize: 14, fontFamily: C.font, color: C.warnText, outline: "none", background: "transparent" }}
              value={n.text} onChange={(e) => uA("notices", i, "text", e.target.value)} placeholder="Notice text..." />
            <Btn sm v="ghost" onClick={() => rA("notices", i)}><I.Trash /></Btn>
          </div>
        ))}
      </Card>
      <Card>
        <Sec icon={<I.Mail />} right={<Btn sm onClick={() => aA("contacts", { name: "", role: "", email: "", phone: "" })}><I.Plus /> Contact</Btn>}>Key Contacts</Sec>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {m.contacts.map((c, i) => (
            <div key={i} style={{ background: C.g50, borderRadius: 8, padding: 14, border: `1px solid ${C.g200}`, position: "relative" }}>
              <Btn sm v="ghost" onClick={() => rA("contacts", i)} style={{ position: "absolute", top: 6, right: 6 }}><I.Trash /></Btn>
              <Inp label="Name" value={c.name} onChange={(v) => uA("contacts", i, "name", v)} placeholder="Name" />
              <Inp label="Role" value={c.role} onChange={(v) => uA("contacts", i, "role", v)} placeholder="Role" />
              <Inp label="Email" value={c.email} onChange={(v) => uA("contacts", i, "email", v)} placeholder="Email" />
              <Inp label="Phone" value={c.phone} onChange={(v) => uA("contacts", i, "phone", v)} placeholder="Phone" />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <Inp label="Submission Method" value={m.submissionMethod?.name} onChange={(v) => up("submissionMethod", { ...m.submissionMethod, name: v })} placeholder="How to submit" />
          <Inp label="Details" value={m.submissionMethod?.details} onChange={(v) => up("submissionMethod", { ...m.submissionMethod, details: v })} placeholder="Instructions" />
        </div>
      </Card>
    </div>
  );
}

// ─── TAB: Scope ──────────────────────────────────────────────────────────────
function ScopeTab({ data, set }) {
  const sc = data.scope;
  const upS = (i, f, v) => { const a = [...sc]; a[i] = { ...a[i], [f]: v }; set((d) => ({ ...d, scope: a })); };
  const add = () => set((d) => ({ ...d, scope: [...d.scope, { id: uid(), title: "New Scope Area", duration: "", metrics: [{ label: "", value: "" }], details: [""], notes: [] }] }));
  const rm = (i) => set((d) => ({ ...d, scope: d.scope.filter((_, j) => j !== i) }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}><Btn onClick={add}><I.Plus /> Add Scope Area</Btn></div>
      <div style={{ display: "grid", gridTemplateColumns: sc.length > 1 ? "1fr 1fr" : "1fr", gap: 20 }}>
        {sc.map((s, i) => (
          <Card key={s.id} bl={i % 2 === 0 ? C.blue : C.green}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <I.Globe />
                <input value={s.title} onChange={(e) => upS(i, "title", e.target.value)}
                  style={{ fontSize: 17, fontWeight: 700, border: "none", background: "transparent", outline: "none", fontFamily: C.font, color: C.textPrimary, width: "100%" }} />
              </div>
              <Btn sm v="danger" onClick={() => rm(i)}><I.Trash /></Btn>
            </div>
            <Inp label="Duration" value={s.duration} onChange={(v) => upS(i, "duration", v)} placeholder="e.g., 4 Weeks" />
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.g600, marginBottom: 6, textTransform: "uppercase" }}>Key Metrics</label>
            {s.metrics.map((m, mi) => (
              <div key={mi} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <input value={m.value} onChange={(e) => { const a = [...s.metrics]; a[mi] = { ...a[mi], value: e.target.value }; upS(i, "metrics", a); }}
                  style={{ width: 90, padding: "8px 10px", textAlign: "center", fontSize: 20, fontWeight: 800, color: C.blue, border: `1px solid ${C.g200}`, borderRadius: 6, background: C.blueLight, fontFamily: C.font, outline: "none" }} placeholder="68K" />
                <input value={m.label} onChange={(e) => { const a = [...s.metrics]; a[mi] = { ...a[mi], label: e.target.value }; upS(i, "metrics", a); }}
                  style={{ flex: 1, padding: "8px 10px", fontSize: 13, border: `1px solid ${C.g200}`, borderRadius: 6, background: C.g50, fontFamily: C.font, outline: "none", color: C.textSecondary }} placeholder="Label" />
                <Btn sm v="ghost" onClick={() => upS(i, "metrics", s.metrics.filter((_, j) => j !== mi))}><I.Trash /></Btn>
              </div>
            ))}
            <Btn sm onClick={() => upS(i, "metrics", [...s.metrics, { label: "", value: "" }])} style={{ marginBottom: 14 }}><I.Plus /> Metric</Btn>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.g600, marginBottom: 6, textTransform: "uppercase" }}>Details</label>
            {s.details.map((d, di) => (
              <div key={di} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                <span style={{ color: C.green }}>&#10003;</span>
                <input value={d} onChange={(e) => { const a = [...s.details]; a[di] = e.target.value; upS(i, "details", a); }}
                  style={{ flex: 1, padding: "6px 10px", fontSize: 13, border: `1px solid ${C.g200}`, borderRadius: 6, background: C.g50, fontFamily: C.font, outline: "none", color: C.textPrimary }} placeholder="Detail" />
                <Btn sm v="ghost" onClick={() => upS(i, "details", s.details.filter((_, j) => j !== di))}><I.Trash /></Btn>
              </div>
            ))}
            <Btn sm onClick={() => upS(i, "details", [...s.details, ""])} style={{ marginBottom: 12 }}><I.Plus /> Detail</Btn>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.g600, marginBottom: 6, textTransform: "uppercase" }}>Notes</label>
            {(s.notes || []).map((n, ni) => (
              <div key={ni} style={{ background: C.blueLight, borderRadius: 6, padding: 10, marginBottom: 6, display: "flex", gap: 8, border: `1px solid ${C.blue}33` }}>
                <input value={n} onChange={(e) => { const a = [...s.notes]; a[ni] = e.target.value; upS(i, "notes", a); }}
                  style={{ flex: 1, background: "transparent", border: "none", fontSize: 13, fontFamily: C.font, color: C.blue, outline: "none" }} placeholder="Note..." />
                <Btn sm v="ghost" onClick={() => upS(i, "notes", s.notes.filter((_, j) => j !== ni))}><I.Trash /></Btn>
              </div>
            ))}
            <Btn sm onClick={() => upS(i, "notes", [...(s.notes || []), ""])}><I.Plus /> Note</Btn>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── TAB: Checklist ──────────────────────────────────────────────────────────
function ChecklistTab({ data, set }) {
  const items = data.checklist;
  const cats = [...new Set(items.map((c) => c.category))];
  const toggle = (i) => { const a = [...items]; a[i] = { ...a[i], completed: !a[i].completed }; set((d) => ({ ...d, checklist: a })); };
  const upI = (i, f, v) => { const a = [...items]; a[i] = { ...a[i], [f]: v }; set((d) => ({ ...d, checklist: a })); };
  const add = (cat) => set((d) => ({ ...d, checklist: [...d.checklist, { id: uid(), text: "", category: cat || "General", completed: false }] }));
  const rm = (i) => set((d) => ({ ...d, checklist: d.checklist.filter((_, j) => j !== i) }));
  const [nc, setNc] = useState("");
  const done = items.filter((c) => c.completed).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <div>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>Requirements Checklist</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, background: C.g200, padding: "4px 12px", borderRadius: 20 }}>{pct}% Complete</span>
        </div>
        <div style={{ height: 6, background: C.g200, borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? C.green : C.navy, borderRadius: 3, transition: "width 0.3s" }} />
        </div>
      </Card>
      {cats.map((cat) => {
        const ci = items.map((c, oi) => ({ ...c, _oi: oi })).filter((c) => c.category === cat);
        return (
          <div key={cat} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.orange }}>{cat}</span>
              <span style={{ fontSize: 13, color: C.textMuted }}>{ci.filter((c) => c.completed).length}/{ci.length}</span>
            </div>
            {ci.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", marginBottom: 6, background: C.white, borderRadius: 8, border: `1px solid ${C.g200}`, opacity: c.completed ? 0.6 : 1 }}>
                <div onClick={() => toggle(c._oi)} style={{
                  width: 22, height: 22, borderRadius: 4, border: `2px solid ${c.completed ? C.green : C.g300}`,
                  background: c.completed ? C.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, color: C.white,
                }}>{c.completed && <I.Check />}</div>
                <input value={c.text} onChange={(e) => upI(c._oi, "text", e.target.value)} placeholder="Requirement..." style={{
                  flex: 1, border: "none", background: "transparent", fontSize: 14, fontFamily: C.font, outline: "none",
                  textDecoration: c.completed ? "line-through" : "none", color: c.completed ? C.textMuted : C.textPrimary,
                }} />
                <Btn sm v="ghost" onClick={() => rm(c._oi)}><I.Trash /></Btn>
              </div>
            ))}
            <Btn sm onClick={() => add(cat)} style={{ marginTop: 4 }}><I.Plus /> Add</Btn>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16 }}>
        <input value={nc} onChange={(e) => setNc(e.target.value)} placeholder="New category..."
          style={{ padding: "8px 12px", border: `1px solid ${C.g200}`, borderRadius: 6, fontSize: 13, fontFamily: C.font, outline: "none", background: C.g50, color: C.textPrimary }} />
        <Btn sm v="primary" onClick={() => { if (nc.trim()) { add(nc.trim()); setNc(""); } }}><I.Plus /> Add Category</Btn>
      </div>
    </div>
  );
}

// ─── TAB: Timeline ───────────────────────────────────────────────────────────
function TimelineTab({ data, set }) {
  const tl = data.timeline;
  const up = (f, v) => set((d) => ({ ...d, timeline: { ...d.timeline, [f]: v } }));
  const uP = (i, f, v) => { const p = [...tl.phases]; p[i] = { ...p[i], [f]: v }; up("phases", p); };

  return (
    <div>
      <Card style={{ marginBottom: 20 }}>
        <Sec icon={<I.Calendar />}>Project Timeline</Sec>
        <Inp label="Total Duration" value={tl.totalDuration} onChange={(v) => up("totalDuration", v)} placeholder="e.g., 12 to 16 Week Engagement" />
      </Card>
      {tl.phases.map((p, i) => (
        <div key={p.id} style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: C.white, background: TAB_C[i % TAB_C.length], flexShrink: 0 }}>{i + 1}</div>
            {i < tl.phases.length - 1 && <div style={{ width: 2, flex: 1, background: C.g200, marginTop: 4 }} />}
          </div>
          <Card style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ flex: 1, marginRight: 12 }}>
                <Inp label="Phase Name" value={p.name} onChange={(v) => uP(i, "name", v)} placeholder="Phase name" />
                <div style={{ display: "flex", gap: 8 }}>
                  <Inp label="Weeks" value={p.weeks} onChange={(v) => uP(i, "weeks", v)} placeholder="Weeks 1-2" style={{ flex: 1 }} />
                  <Inp label="Duration" value={p.duration} onChange={(v) => uP(i, "duration", v)} placeholder="2 weeks" style={{ flex: 1 }} />
                </div>
              </div>
              <Btn sm v="danger" onClick={() => up("phases", tl.phases.filter((_, j) => j !== i))} style={{ marginTop: 4 }}><I.Trash /></Btn>
            </div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.g600, marginBottom: 4, textTransform: "uppercase" }}>Tasks</label>
            {p.tasks.map((t, ti) => (
              <div key={ti} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                <span style={{ color: C.g400, fontSize: 12 }}>&bull;</span>
                <input value={t} onChange={(e) => { const a = [...p.tasks]; a[ti] = e.target.value; uP(i, "tasks", a); }}
                  style={{ flex: 1, padding: "5px 8px", fontSize: 13, border: `1px solid ${C.g200}`, borderRadius: 4, background: C.g50, fontFamily: C.font, outline: "none", color: C.textPrimary }} placeholder="Task" />
                <Btn sm v="ghost" onClick={() => uP(i, "tasks", p.tasks.filter((_, j) => j !== ti))}><I.Trash /></Btn>
              </div>
            ))}
            <Btn sm onClick={() => uP(i, "tasks", [...p.tasks, ""])} style={{ marginTop: 4 }}><I.Plus /> Task</Btn>
          </Card>
        </div>
      ))}
      <Btn onClick={() => up("phases", [...tl.phases, { id: uid(), name: "", weeks: "", duration: "", tasks: [""] }])} style={{ marginBottom: 24 }}><I.Plus /> Add Phase</Btn>
      <Card>
        <Sec icon={<I.AlertTriangle />} right={<Btn sm onClick={() => up("milestones", [...tl.milestones, { label: "", value: "", note: "" }])}><I.Plus /> Milestone</Btn>}>Key Milestones</Sec>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {tl.milestones.map((ms, i) => (
            <div key={i} style={{ background: C.orangeLight, borderRadius: 8, padding: 14, border: `1px solid ${C.orange}22`, position: "relative" }}>
              <Btn sm v="ghost" onClick={() => up("milestones", tl.milestones.filter((_, j) => j !== i))} style={{ position: "absolute", top: 6, right: 6 }}><I.Trash /></Btn>
              <Inp label="Label" value={ms.label} onChange={(v) => { const a = [...tl.milestones]; a[i] = { ...a[i], label: v }; up("milestones", a); }} placeholder="Milestone" />
              <Inp label="Date" value={ms.value} onChange={(v) => { const a = [...tl.milestones]; a[i] = { ...a[i], value: v }; up("milestones", a); }} placeholder="Date" />
              <Inp label="Note" value={ms.note} onChange={(v) => { const a = [...tl.milestones]; a[i] = { ...a[i], note: v }; up("milestones", a); }} placeholder="Note" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── TAB: Pricing ────────────────────────────────────────────────────────────
function PricingTab({ data, set }) {
  const pr = data.pricing;
  const up = (f, v) => set((d) => ({ ...d, pricing: { ...d.pricing, [f]: v } }));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: pr.tables.length > 1 ? "1fr 1fr" : "1fr", gap: 20, marginBottom: 28 }}>
        {pr.tables.map((tbl, ti) => {
          const total = tbl.lineItems.reduce((s, li) => s + (li.amount || 0), 0);
          const uTbl = (f, v) => { const a = [...pr.tables]; a[ti] = { ...a[ti], [f]: v }; up("tables", a); };
          return (
            <Card key={tbl.id} bl={ti === 0 ? C.navy : C.green}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <I.DollarSign />
                  <input value={tbl.title} onChange={(e) => uTbl("title", e.target.value)}
                    style={{ fontSize: 17, fontWeight: 700, border: "none", background: "transparent", outline: "none", fontFamily: C.font, color: C.textPrimary }} placeholder="Table title" />
                </div>
                <Btn sm v="danger" onClick={() => up("tables", pr.tables.filter((_, j) => j !== ti))}><I.Trash /></Btn>
              </div>
              {tbl.lineItems.map((li, li_i) => (
                <div key={li.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <input value={li.label} onChange={(e) => { const items = [...tbl.lineItems]; items[li_i] = { ...items[li_i], label: e.target.value }; uTbl("lineItems", items); }}
                    placeholder="Line item" style={{ flex: 1, padding: "8px 10px", border: `1px solid ${C.g200}`, borderRadius: 6, fontSize: 14, fontFamily: C.font, outline: "none", background: C.g50, color: C.textPrimary }} />
                  <span style={{ color: C.g400 }}>$</span>
                  <input type="number" value={li.amount || ""} onChange={(e) => { const items = [...tbl.lineItems]; items[li_i] = { ...items[li_i], amount: Number(e.target.value) || 0 }; uTbl("lineItems", items); }}
                    style={{ width: 110, padding: "8px 10px", border: `1px solid ${C.g200}`, borderRadius: 6, fontSize: 14, fontFamily: C.font, outline: "none", textAlign: "right", background: C.g50 }} />
                  <Btn sm v="ghost" onClick={() => uTbl("lineItems", tbl.lineItems.filter((_, j) => j !== li_i))}><I.Trash /></Btn>
                </div>
              ))}
              <Btn sm onClick={() => uTbl("lineItems", [...tbl.lineItems, { id: uid(), label: "", amount: 0 }])} style={{ marginTop: 4, marginBottom: 12 }}><I.Plus /> Line Item</Btn>
              <div style={{ borderTop: `2px solid ${C.g200}`, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, color: C.textPrimary }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: 20, color: ti === 0 ? C.navy : C.green }}>{currency(total)}</span>
              </div>
            </Card>
          );
        })}
      </div>
      <Btn onClick={() => up("tables", [...pr.tables, { id: uid(), title: "New Pricing Table", lineItems: [{ id: uid(), label: "", amount: 0 }] }])} style={{ marginBottom: 28 }}><I.Plus /> Add Pricing Table</Btn>

      <Card bl={C.orange}>
        <Sec icon={<I.FileText />} right={<Btn sm onClick={() => up("optionalServices", [...pr.optionalServices, { id: uid(), title: "", typeOfWork: "", quantity: 1, unitPrice: 0, included: false }])}><I.Plus /> Service</Btn>}>
          Optional Services
        </Sec>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.g200}` }}>
                {["#", "Title", "Type of Work", "Qty", "Unit Price", "Total", "Incl.", ""].map((h, hi) => (
                  <th key={hi} style={{ textAlign: hi < 3 ? "left" : hi === 6 ? "center" : "right", padding: "8px 6px", color: C.textMuted, fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pr.optionalServices.map((svc, si) => {
                const uS = (f, v) => { const a = [...pr.optionalServices]; a[si] = { ...a[si], [f]: v }; up("optionalServices", a); };
                const inpS = { width: "100%", padding: "6px 8px", border: `1px solid ${C.g200}`, borderRadius: 4, fontSize: 13, fontFamily: C.font, outline: "none", background: "transparent", color: C.textPrimary };
                return (
                  <tr key={svc.id} style={{ borderBottom: `1px solid ${C.g100}`, background: svc.included ? C.greenLight : "transparent" }}>
                    <td style={{ padding: "8px 6px", color: C.textMuted }}>{si + 1}</td>
                    <td style={{ padding: "6px 4px" }}><input value={svc.title} onChange={(e) => uS("title", e.target.value)} style={inpS} placeholder="Title" /></td>
                    <td style={{ padding: "6px 4px" }}><input value={svc.typeOfWork} onChange={(e) => uS("typeOfWork", e.target.value)} style={inpS} placeholder="Type" /></td>
                    <td style={{ padding: "6px 4px", textAlign: "center" }}><input type="number" value={svc.quantity || ""} onChange={(e) => uS("quantity", Number(e.target.value) || 0)} style={{ ...inpS, width: 50, textAlign: "center" }} /></td>
                    <td style={{ padding: "6px 4px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
                        <span style={{ color: C.g400, fontSize: 12 }}>$</span>
                        <input type="number" value={svc.unitPrice || ""} onChange={(e) => uS("unitPrice", Number(e.target.value) || 0)} style={{ ...inpS, width: 80, textAlign: "right" }} />
                      </div>
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 600 }}>{currency(svc.quantity * svc.unitPrice)}</td>
                    <td style={{ padding: "8px 6px", textAlign: "center" }}><input type="checkbox" checked={svc.included} onChange={(e) => uS("included", e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer", accentColor: C.green }} /></td>
                    <td><Btn sm v="ghost" onClick={() => up("optionalServices", pr.optionalServices.filter((_, j) => j !== si))}><I.Trash /></Btn></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pr.optionalServices.length > 0 && (() => {
          const incl = pr.optionalServices.filter((s) => s.included);
          return (
            <div style={{ marginTop: 12, textAlign: "right", fontSize: 14 }}>
              <span style={{ fontWeight: 700, color: C.textPrimary }}>Included Total: </span>
              <span style={{ fontWeight: 800, fontSize: 18, color: C.green }}>{currency(incl.reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0))}</span>
              <span style={{ color: C.textMuted, marginLeft: 8 }}>{incl.length} of {pr.optionalServices.length}</span>
            </div>
          );
        })()}
      </Card>
      <Card style={{ marginTop: 20 }}>
        <Sec icon={<I.Edit />} right={<Btn sm onClick={() => up("pricingNotes", [...(pr.pricingNotes || []), ""])}><I.Plus /> Note</Btn>}>Pricing Notes</Sec>
        {(pr.pricingNotes || []).map((n, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={n} onChange={(e) => { const a = [...pr.pricingNotes]; a[i] = e.target.value; up("pricingNotes", a); }}
              style={{ flex: 1, padding: "8px 12px", border: `1px solid ${C.g200}`, borderRadius: 6, fontSize: 13, fontFamily: C.font, outline: "none", background: C.g50, color: C.textPrimary }} placeholder="Pricing note..." />
            <Btn sm v="ghost" onClick={() => up("pricingNotes", pr.pricingNotes.filter((_, j) => j !== i))}><I.Trash /></Btn>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── TAB: Notes ──────────────────────────────────────────────────────────────
function NotesTab({ data, set }) {
  const n = data.notes;
  const up = (f, v) => set((d) => ({ ...d, notes: { ...d.notes, [f]: v } }));
  const fields = [
    { key: "scopeNotes", label: "Scope Understanding & Approach", ph: "Document your understanding of the scope..." },
    { key: "technicalApproach", label: "Technical Methodology", ph: "Testing methodology, tools, techniques..." },
    { key: "teamComposition", label: "Team Composition", ph: "Key team members, qualifications, roles..." },
    { key: "differentiators", label: "Competitive Differentiators", ph: "What sets your proposal apart?" },
    { key: "riskMitigation", label: "Risk Mitigation", ph: "Risk minimization strategies..." },
    { key: "questionsForClient", label: "Questions for Client", ph: "Clarifying questions..." },
  ];
  return (
    <Card>
      <Sec icon={<I.Edit />}>Bid Preparation Notes</Sec>
      {fields.map((f) => <TA key={f.key} label={f.label} value={n[f.key]} onChange={(v) => up(f.key, v)} placeholder={f.ph} />)}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [error, setError] = useState("");
  const jsonRef = useRef();
  const pdfRef = useRef();

  const progress = project ? (() => {
    const t = project.checklist.length, d = project.checklist.filter((c) => c.completed).length;
    return { total: t, done: d, pct: t ? Math.round((d / t) * 100) : 0 };
  })() : null;

  const handleJsonImport = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target.result);
        if (raw.checklist && raw.pricingYear1 && !raw.meta) setProject(convertLegacy(raw));
        else if (raw.meta) setProject(raw);
        else alert("Unrecognized format");
      } catch (err) { alert("Error: " + err.message); }
    };
    reader.readAsText(file); e.target.value = "";
  };

  const handlePdfImport = async (e) => {
    const file = e.target.files[0]; if (!file) return; e.target.value = "";
    setLoading(true); setError("");
    const msgs = ["Reading RFP document...", "Extracting requirements and scope...", "Identifying timeline and milestones...", "Analyzing pricing structure...", "Building checklist from deliverables...", "Generating bid preparation notes...", "Finalizing structured data..."];
    let mi = 0; setLoadMsg(msgs[0]);
    const interval = setInterval(() => { mi = Math.min(mi + 1, msgs.length - 1); setLoadMsg(msgs[mi]); }, 4000);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = () => rej(new Error("Failed to read file"));
        r.readAsDataURL(file);
      });
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          messages: [{
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
              { type: "text", text: EXTRACTION_PROMPT },
            ],
          }],
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API returned ${response.status}`);
      }
      const data = await response.json();
      const text = data.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      const clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(clean);
      setProject(hydrateIds(parsed));
    } catch (err) {
      console.error("PDF extraction error:", err);
      setError(`Failed to extract RFP data: ${err.message}. You can try again or start with a blank workspace.`);
    } finally { clearInterval(interval); setLoading(false); setLoadMsg(""); }
  };

  const hydrateIds = (raw) => {
    const p = emptyProject();
    if (raw.meta) {
      p.meta = { ...p.meta, ...raw.meta };
      ["clientStats", "projectDetails", "contractDetails", "locations", "notices", "contacts"].forEach((k) => {
        if (raw.meta[k] && raw.meta[k].length) p.meta[k] = raw.meta[k];
      });
      if (raw.meta.submissionMethod) p.meta.submissionMethod = raw.meta.submissionMethod;
    }
    if (raw.scope) p.scope = raw.scope.map((s) => ({ id: uid(), ...s, metrics: s.metrics || [], details: s.details || [], notes: s.notes || [] }));
    if (raw.checklist) p.checklist = raw.checklist.map((c) => ({ id: uid(), completed: false, ...c }));
    if (raw.timeline) {
      p.timeline = {
        totalDuration: raw.timeline.totalDuration || "",
        phases: (raw.timeline.phases || []).map((ph) => ({ id: uid(), ...ph, tasks: ph.tasks || [] })),
        milestones: raw.timeline.milestones || [],
      };
    }
    if (raw.pricing) {
      p.pricing = {
        tables: (raw.pricing.tables || []).map((t) => ({ id: uid(), ...t, lineItems: (t.lineItems || []).map((li) => ({ id: uid(), ...li })) })),
        optionalServices: (raw.pricing.optionalServices || []).map((s) => ({ id: uid(), ...s })),
        pricingNotes: raw.pricing.pricingNotes || [],
      };
    }
    if (raw.notes) p.notes = { ...p.notes, ...raw.notes };
    return p;
  };

  const convertLegacy = (raw) => {
    const p = emptyProject();
    if (raw.checklist) p.checklist = raw.checklist.map((c) => ({ id: c.id || uid(), text: c.text, category: c.category || "General", completed: c.completed || false }));
    if (raw.pricingYear1) {
      p.pricing.tables = [{ id: uid(), title: "1-Year Pricing", lineItems: Object.entries(raw.pricingYear1).map(([k, v]) => ({ id: uid(), label: k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()), amount: v })) }];
      if (raw.pricingYear3) p.pricing.tables.push({ id: uid(), title: "3-Year Pricing (Annual)", lineItems: Object.entries(raw.pricingYear3).map(([k, v]) => ({ id: uid(), label: k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()), amount: v })) });
    }
    if (raw.clientPricing) p.pricing.optionalServices = raw.clientPricing.map((cp) => ({ id: uid(), title: cp.title, typeOfWork: cp.typeOfWork || "", quantity: cp.quantity || 1, unitPrice: cp.unitPrice || 0, included: cp.included || false }));
    if (raw.notes) p.notes = { ...p.notes, ...raw.notes };
    return p;
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${(project.meta.clientName || "rfp").toLowerCase().replace(/\s+/g, "-")}-rfp-scope-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ═══ LANDING ════════════════════════════════════════════════
  if (!project) {
    return (
      <div style={{ fontFamily: C.font, minHeight: "100vh", background: `linear-gradient(160deg, ${C.deep} 0%, #0e1328 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }`}</style>
        <input ref={jsonRef} type="file" accept=".json" onChange={handleJsonImport} style={{ display: "none" }} />
        <input ref={pdfRef} type="file" accept=".pdf" onChange={handlePdfImport} style={{ display: "none" }} />
        <div style={{ textAlign: "center", maxWidth: 700, padding: 40 }}>
          <img src="data:image/webp;base64,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" alt="NTS" style={{ height: 52, objectFit: "contain", margin: "0 auto 20px", display: "block" }} />
          <h1 style={{ fontSize: 28, fontWeight: 800, color: C.textPrimary, margin: "0 0 8px" }}>RFP Scope & Bid Preparation</h1>
          <p style={{ color: C.textMuted, fontSize: 15, margin: "0 0 40px", lineHeight: 1.5 }}>
            Upload an RFP document and let AI extract the requirements, scope, timeline, and pricing structure. Or start from scratch.
          </p>
          {loading ? (
            <div style={{ background: C.surface, borderRadius: 16, padding: 48, border: `1px solid ${C.g200}`, maxWidth: 400, margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}><div style={{ color: C.orange }}><I.Loader size={40} /></div></div>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: "0 0 8px" }}>Analyzing RFP Document</p>
              <p style={{ fontSize: 14, color: C.textMuted, margin: 0, animation: "pulse 2s ease-in-out infinite" }}>{loadMsg}</p>
            </div>
          ) : (
            <>
              {error && <div style={{ background: "#2a1015", border: "1px solid #5c2020", borderRadius: 10, padding: 16, marginBottom: 24, color: "#f87171", fontSize: 14, textAlign: "left" }}>{error}</div>}
              <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
                <div onClick={() => pdfRef.current?.click()}
                  style={{ width: 190, padding: 28, background: C.surface, borderRadius: 12, border: `2px solid ${C.g200}`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#dc2626"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.g200; e.currentTarget.style.transform = "translateY(0)"; }}>
                  <I.Pdf />
                  <span style={{ fontWeight: 700, fontSize: 15, color: C.textPrimary }}>Upload RFP</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: C.orange, fontSize: 11, fontWeight: 600 }}><I.Sparkle /> AI-Powered</div>
                  <span style={{ fontSize: 11, color: C.textMuted, textAlign: "center" }}>Upload a PDF and auto-extract all details</span>
                </div>
                <div onClick={() => setProject(emptyProject())}
                  style={{ width: 190, padding: 28, background: C.surface, borderRadius: 12, border: `2px solid ${C.g200}`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.orange; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.g200; e.currentTarget.style.transform = "translateY(0)"; }}>
                  <I.Folder />
                  <span style={{ fontWeight: 700, fontSize: 15, color: C.textPrimary }}>New RFP</span>
                  <span style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 14 }}>Start a blank workspace</span>
                </div>
                <div onClick={() => jsonRef.current?.click()}
                  style={{ width: 190, padding: 28, background: C.surface, borderRadius: 12, border: `2px solid ${C.g200}`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.navy; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.g200; e.currentTarget.style.transform = "translateY(0)"; }}>
                  <I.FileUp />
                  <span style={{ fontWeight: 700, fontSize: 15, color: C.textPrimary }}>Import JSON</span>
                  <span style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 14 }}>Load a previous project</span>
                </div>
              </div>
            </>
          )}
          <div style={{ marginTop: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <img src="data:image/webp;base64,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" alt="NTS" style={{ height: 16, objectFit: "contain", opacity: 0.5 }} />
            <span style={{ fontSize: 12, color: C.textMuted }}>White Hat Cyber Defense &middot; Internal Tool</span>
          </div>
        </div>
      </div>
    );
  }

  // ═══ WORKSPACE ══════════════════════════════════════════════
  return (
    <div style={{ fontFamily: C.font, minHeight: "100vh", background: C.deep }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ background: C.header, color: "#e2e8f0", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, borderBottom: `1px solid ${C.g200}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <img src="data:image/webp;base64,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" alt="NTS" style={{ height: 28, objectFit: "contain" }} />
          </div>
          <div>
            <input value={project.meta.title} onChange={(e) => setProject((d) => ({ ...d, meta: { ...d.meta, title: e.target.value } }))} placeholder="RFP Title"
              style={{ background: "transparent", border: "none", color: "#e2e8f0", fontSize: 17, fontWeight: 700, fontFamily: C.font, outline: "none", width: 400 }} />
            <input value={project.meta.subtitle} onChange={(e) => setProject((d) => ({ ...d, meta: { ...d.meta, subtitle: e.target.value } }))} placeholder="Client - Description"
              style={{ display: "block", background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: C.font, outline: "none", width: 400 }} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {project.meta.dueDate && <div style={{ background: "rgba(255,255,255,0.12)", padding: "6px 14px", borderRadius: 6, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><I.Clock /> Due: {project.meta.dueDate}</div>}
          <input type="text" value={project.meta.dueDate || ""} onChange={(e) => setProject((d) => ({ ...d, meta: { ...d.meta, dueDate: e.target.value } }))} placeholder="Due date"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#e2e8f0", padding: "6px 12px", borderRadius: 6, fontSize: 13, fontFamily: C.font, outline: "none", width: 120 }} />
          <Btn onClick={() => setProject(null)} style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)" }}><I.Upload /> New</Btn>
          <Btn v="orange" onClick={handleExport}><I.Download /> Export</Btn>
        </div>
      </div>
      <div style={{ padding: "16px 28px 0" }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
            <span style={{ color: C.textMuted }}>Bid Preparation Progress</span>
            <span style={{ color: C.textSecondary, fontWeight: 600 }}>{progress.done} of {progress.total} items</span>
          </div>
          <div style={{ height: 8, background: C.g200, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress.pct}%`, background: progress.pct === 100 ? C.green : C.navy, borderRadius: 4, transition: "width 0.4s ease" }} />
          </div>
        </Card>
      </div>
      <div style={{ padding: "20px 28px 40px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{
              flex: 1, padding: "10px 8px", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 600, fontFamily: C.font,
              cursor: "pointer", background: tab === i ? TAB_C[i] : C.g200, color: tab === i ? "#e2e8f0" : C.textMuted, transition: "all 0.2s",
            }}>{t}</button>
          ))}
        </div>
        {tab === 0 && <OverviewTab data={project} set={setProject} />}
        {tab === 1 && <ScopeTab data={project} set={setProject} />}
        {tab === 2 && <ChecklistTab data={project} set={setProject} />}
        {tab === 3 && <TimelineTab data={project} set={setProject} />}
        {tab === 4 && <PricingTab data={project} set={setProject} />}
        {tab === 5 && <NotesTab data={project} set={setProject} />}
      </div>
      <div style={{ textAlign: "center", padding: "20px 28px 30px", color: C.textMuted, fontSize: 12, borderTop: `1px solid ${C.g200}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <img src="data:image/webp;base64,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" alt="NTS" style={{ height: 18, objectFit: "contain", opacity: 0.5 }} />
        <span>RFP Scope & Bid Preparation {project.meta.clientName ? `| ${project.meta.clientName}` : ""} &middot; Data is local, use Export to save</span>
      </div>
    </div>
  );
}
