/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

const CATEGORIES = ["All", "Appliance Repair", "Auto Sales", "Auto Services", "Bar & Entertainment", "Bar/Restaurant", "Cleaning Services", "Coffee Shop", "Construction", "Entertainment", "Food & Bakery", "Hair & Beauty", "Home Improvement", "Home Services", "HVAC", "Landscaping", "Nail Salon", "Plumbing", "Recreation", "Restaurant", "Restaurant/Bar", "Retail", "Tech Services", "Transportation"];
const STATUS_OPTIONS = ["Uncontacted", "Contacted", "Interested", "Not Interested", "Closed Deal"];
const STATUS_COLORS = { "Uncontacted": "#94a3b8", "Contacted": "#f59e0b", "Interested": "#3b82f6", "Not Interested": "#ef4444", "Closed Deal": "#10b981" };
const OUTREACH_TYPES = ["Cold Email", "Phone Script", "Door Knock Script", "SMS / Text", "Facebook DM"];
const VERIFY_OPTIONS = ["Unverified", "✅ Active — No Website", "🌐 Has Website", "🚫 Permanently Closed"];
const VERIFY_COLORS = { "Unverified": "#475569", "✅ Active — No Website": "#10b981", "🌐 Has Website": "#f59e0b", "🚫 Permanently Closed": "#ef4444" };

const SEED_BUSINESSES = [
  { name: "River City Cab Co", category: "Transportation" },
  { name: "Granny Goodwitch Bakery", category: "Food & Bakery" },
  { name: "Jay Cee's Salon", category: "Hair & Beauty" },
  { name: "Joes Auto Detailing", category: "Auto Services" },
  { name: "Carvey Painting & Decorating", category: "Home Services" },
  { name: "Grand Village Buffet", category: "Restaurant" },
  { name: "Better Way Siding & Windows Inc", category: "Home Improvement" },
  { name: "Tubbys Tubs", category: "Home Services" },
  { name: "A-Aaa Pool Table Repair", category: "Recreation" },
  { name: "East Peoria Jewelry & Trade", category: "Retail" },
  { name: "Pete George & Son Blacktop Driveway Service", category: "Home Services" },
  { name: "Walters Woodworking & Construction", category: "Construction" },
  { name: "New Life Construction Co", category: "Construction" },
  { name: "Kull Scape Landscaping Inc", category: "Landscaping" },
  { name: "Reeser Lawn Care & Landscaping", category: "Landscaping" },
  { name: "Designer Concepts Landscaping", category: "Landscaping" },
  { name: "Arlyn Ray Construction", category: "Construction" },
  { name: "Blumenshine Construction", category: "Construction" },
  { name: "Mr Masonry Contractor & Company", category: "Construction" },
  { name: "McDaniel Plumbing Co", category: "Plumbing" },
  { name: "Kern Plumbing", category: "Plumbing" },
  { name: "Diamond Climate Control Systems", category: "HVAC" },
  { name: "C&C Affordable Appliance Service", category: "Appliance Repair" },
  { name: "Steamliner Carpet & Upholstery Cleaning", category: "Cleaning Services" },
  { name: "Tip Top Nails", category: "Nail Salon" },
  { name: "Palace Nails", category: "Nail Salon" },
  { name: "Breathe Vapor LLC", category: "Retail" },
  { name: "Bg's Gaming Cafe", category: "Entertainment" },
  { name: "Baker Classic Cars Inc", category: "Auto Services" },
  { name: "Lairmore Auto Sales", category: "Auto Sales" },
  { name: "Country Saloon", category: "Bar & Entertainment" },
  { name: "Tin Lizard Bar & Grill", category: "Restaurant/Bar" },
  { name: "Davis Brothers Pizza", category: "Restaurant" },
  { name: "Wonderdog Restaurant", category: "Restaurant" },
  { name: "Eysals Coffee Roaster", category: "Coffee Shop" },
  { name: "Silver Bullet", category: "Bar/Restaurant" },
  { name: "Dixon's Seafood Shoppe", category: "Restaurant" },
  { name: "Sombrerito Mexican Restaurant", category: "Restaurant" },
  { name: "Lorena's Mexican Restaurant", category: "Restaurant" },
  { name: "East Peoria Computer Works", category: "Tech Services" },
];

export default function App() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [verifyFilter, setVerifyFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [showPitch, setShowPitch] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [outreachType, setOutreachType] = useState("Cold Email");
  const [yourName, setYourName] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showScrubbed, setShowScrubbed] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: true });
    if (!error && data.length === 0) {
      await seedLeads();
    } else if (!error) {
      setLeads(data);
    }
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  async function seedLeads() {
    const rows = SEED_BUSINESSES.map(b => ({
      name: b.name,
      category: b.category,
      status: "Uncontacted",
      priority: "Medium",
      verify_status: "Unverified",
      notes: ""
    }));
    const { data } = await supabase.from("leads").insert(rows).select();
    if (data) setLeads(data);
  }

  async function updateLead(id, field, value) {
    const dbField = field === "verifyStatus" ? "verify_status" : field;
    setLeads(prev => prev.map(l => l.id === id ? { ...l, [field]: value, [dbField]: value } : l));
    if (selected?.id === id) setSelected(prev => ({ ...prev, [field]: value, [dbField]: value }));
    await supabase.from("leads").update({ [dbField]: value }).eq("id", id);
  }

  async function saveNotes(id, notes) {
    setSaving(true);
    await supabase.from("leads").update({ notes }).eq("id", id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, notes } : l));
    if (selected?.id === id) setSelected(prev => ({ ...prev, notes }));
    setSaving(false);
  }

  async function importLeads() {
    setImportError("");
    setImporting(true);
    try {
      const parsed = JSON.parse(importText);
      if (!Array.isArray(parsed)) throw new Error("Must be a JSON array");
      const rows = parsed.map(b => ({
        name: b.name,
        category: b.category || "General",
        status: "Uncontacted",
        priority: "Medium",
        verify_status: "Unverified",
        notes: ""
      }));
      const { data, error } = await supabase.from("leads").insert(rows).select();
      if (error) throw new Error(error.message);
      setLeads(prev => [...prev, ...data]);
      setImportText("");
      setShowImport(false);
    } catch (e) {
      setImportError(e.message);
    } finally {
      setImporting(false);
    }
  }

  function exportCSV() {
    const active = leads.filter(l => (l.verify_status || l.verifyStatus) === "✅ Active — No Website");
    const headers = ["Name", "Category", "Status", "Priority", "Notes"];
    const rows = active.map(l => [l.name, l.category, l.status, l.priority, l.notes].map(v => `"${v || ""}"`).join(","));
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "clean-leads.csv";
    a.click();
  }

  function openDetail(lead) {
    setSelected(lead);
    setNoteText(lead.notes || "");
    setAiMessage("");
    setAiError("");
  }

  function getVerify(lead) {
    return lead.verify_status || lead.verifyStatus || "Unverified";
  }

  const activeLeads = leads.filter(l => getVerify(l) !== "🌐 Has Website" && getVerify(l) !== "🚫 Permanently Closed");

  const filtered = leads.filter(b => {
    const v = getVerify(b);
    if (!showScrubbed && (v === "🌐 Has Website" || v === "🚫 Permanently Closed")) return false;
    const matchCat = filter === "All" || b.category === filter;
    const matchStatus = statusFilter === "All" || b.status === statusFilter;
    const matchVerify = verifyFilter === "All" || v === verifyFilter;
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase()) || b.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchStatus && matchVerify && matchSearch;
  });

  const stats = {
    confirmed: activeLeads.filter(l => getVerify(l) === "✅ Active — No Website").length,
    unverified: activeLeads.filter(l => getVerify(l) === "Unverified").length,
    hasWebsite: leads.filter(l => getVerify(l) === "🌐 Has Website").length,
    closed: leads.filter(l => getVerify(l) === "🚫 Permanently Closed").length,
  };

  const progressPct = leads.length ? Math.round((leads.length - stats.unverified) / leads.length * 100) : 0;

  async function generateOutreach() {
    if (!selected) return;
    setAiLoading(true);
    setAiError("");
    setAiMessage("");

    const businessName = selected.name;
    const businessCategory = selected.category;

    const channelInstructions = {
      "Cold Email":
`Write a cold email. Use this exact structure:
Line 1: Subject: [write a compelling subject line]
Line 2: blank
Line 3-end: the email body

Rules:
- Open by referencing a real challenge for ${businessCategory} businesses specifically
- Mention that they have no website and what that costs them daily
- Keep it under 150 words total
- End with one clear ask: a 15-minute call this week
- Sign off with ${yourName || "[Your Name]"}
- Warm and local, not corporate`,

      "Phone Script":
`Write a phone call script. Use this exact structure with these exact labels on separate lines:

OPENER:
[what to say in the first 5 seconds]

VALUE STATEMENT:
[one sentence on what you do and why it matters to them]

QUESTION:
[one open question to get them talking about their business]

OBJECTION 1 - "I don't need a website":
[your response]

OBJECTION 2 - "I can't afford it":
[your response]

CLOSE:
[how to book the next step]

Make it natural and conversational for a ${businessCategory} business owner in East Peoria.`,

      "Door Knock Script":
`Write a door knock script for visiting ${businessName} in person.

Rules:
- Sound like a neighbor, not a salesperson
- Open with something you "noticed" about their ${businessCategory} business
- Ask one question that makes them think about customers they might be missing
- Keep it short — under 60 seconds to read aloud
- Include what to say if they're busy and you need to leave
- No pitch language, no jargon, just real talk`,

      "SMS / Text":
`Write exactly 3 SMS text messages. Use this exact format:

TEXT 1 (Curiosity angle):
[message under 160 characters]

TEXT 2 (Social proof angle):
[message under 160 characters]

TEXT 3 (Direct offer angle):
[message under 160 characters]

Rules:
- Each must be under 160 characters
- Sound like a real person, not a marketing blast
- No links
- Sign with ${yourName || "[Your Name]"}`,

      "Facebook DM":
`Write a Facebook DM to send to ${businessName}.

Rules:
- Open like you've seen their Facebook page — reference it naturally
- Keep it casual, like messaging someone you kind of know
- Mention one specific pain point for ${businessCategory} businesses with no website
- End with a soft question like "would you be open to a quick chat?"
- Under 100 words
- Sign with just a first name: ${yourName || "[Your Name]"}
- No formal language, no bullet points, just natural sentences`,
    };

    const prompt = `You are an expert local business sales copywriter who specializes in helping people sell website design services to small businesses in East Peoria, Illinois. East Peoria is a working class river town — people value straight talk, local connection, and no corporate nonsense.

You are writing outreach for this specific business:
- Business Name: ${businessName}
- Industry: ${businessCategory}
- Location: East Peoria, IL
- Website status: ZERO online presence — no website at all
- Person reaching out: ${yourName || "[Your Name]"}
${extraContext ? `- Additional context about this business: ${extraContext}` : ""}

The goal is to start a conversation and get 10 minutes of their time — NOT to close a sale on the first contact.

Core pain points to weave in naturally:
- Their competitors show up on Google, they do not
- People search online before visiting any local business
- Every day without a website is customers going to someone else
- Word of mouth alone has a hard ceiling on growth

${channelInstructions[outreachType]}

IMPORTANT: Write ONLY the requested script or message. Do not include any introduction, explanation, or commentary before or after. Start directly with the content.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }]
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content.map(c => c.text || "").join("\n").trim();
      setAiMessage(text);
    } catch (err) {
      setAiError("Generation failed — check your connection and try again.");
    } finally {
      setAiLoading(false);
    }
  }

  function copyMsg() {
    navigator.clipboard.writeText(aiMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const S = {
    btn: (bg, ex = {}) => ({ background: bg, color: "#e2e8f0", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontFamily: "inherit", cursor: "pointer", fontWeight: 600, ...ex }),
    inp: { background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "8px 12px", color: "#e2e8f0", fontSize: 12, fontFamily: "inherit", outline: "none" },
    sel: { background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "6px 10px", color: "#e2e8f0", fontSize: 12, fontFamily: "inherit", outline: "none", cursor: "pointer" },
    lbl: { display: "block", fontSize: 9, letterSpacing: "0.25em", color: "#475569", marginBottom: 4 },
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#080c14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", color: "#6366f1", fontSize: 14 }}>
      ⟳ Loading leads from database...
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", fontFamily: "'DM Mono','Courier New',monospace", color: "#e2e8f0" }}>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1e1b4b)", borderBottom: "1px solid #1e293b", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.35em", color: "#6366f1", fontWeight: 700, marginBottom: 4 }}>◈ LEAD INTELLIGENCE · EAST PEORIA IL</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc" }}>No-Website Business Tracker</div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>{leads.length} total · {stats.confirmed} clean prospects · synced to database</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setShowImport(true)} style={S.btn("#0f766e")}>+ Import Leads</button>
          <button onClick={() => setShowPitch(true)} style={S.btn("#4f46e5")}>📋 Playbook</button>
          <button onClick={exportCSV} style={S.btn("#1e3a5f")}>↓ Export CSV</button>
        </div>
      </div>

      {/* PROGRESS */}
      <div style={{ background: "#0a0e1a", padding: "12px 24px", borderBottom: "1px solid #1e293b" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 10, letterSpacing: "0.2em", color: "#475569" }}>VERIFICATION PROGRESS</span>
          <span style={{ fontSize: 10, color: "#6366f1", fontWeight: 700 }}>{progressPct}% verified</span>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 99, height: 6, overflow: "hidden" }}>
          <div style={{ width: `${progressPct}%`, height: "100%", background: "linear-gradient(90deg,#4f46e5,#10b981)", borderRadius: 99, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: "flex", background: "#0a0e1a", borderBottom: "1px solid #1e293b", overflowX: "auto" }}>
        {[["CLEAN LEADS", stats.confirmed, "#10b981"], ["UNVERIFIED", stats.unverified, "#94a3b8"], ["HAS WEBSITE", stats.hasWebsite, "#f59e0b"], ["PERM CLOSED", stats.closed, "#ef4444"]].map(([l, v, c]) => (
          <div key={l} style={{ padding: "12px 20px", borderRight: "1px solid #1e293b", minWidth: 100 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#334155", marginBottom: 3 }}>{l}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: c }}>{v}</div>
          </div>
        ))}
        <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", marginLeft: "auto" }}>
          <button onClick={() => setShowScrubbed(!showScrubbed)} style={S.btn(showScrubbed ? "#3b0a0a" : "#1e293b", { fontSize: 11, padding: "6px 12px" })}>
            {showScrubbed ? "Hide Scrubbed" : "Show Scrubbed"}
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{ padding: "12px 24px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", borderBottom: "1px solid #1e293b", background: "#0d1117" }}>
        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...S.inp, width: 170 }} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={S.sel}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
        <select value={verifyFilter} onChange={e => setVerifyFilter(e.target.value)} style={S.sel}>
          <option value="All">All Statuses</option>
          {VERIFY_OPTIONS.map(v => <option key={v}>{v}</option>)}
        </select>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#334155" }}>{filtered.length} shown</div>
      </div>

      {/* TABLE */}
      <div style={{ padding: "0 24px 48px", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1e293b" }}>
              {["Business", "Category", "Verify Status", "Quick Tag", ""].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 9, letterSpacing: "0.2em", color: "#334155", fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead, i) => {
              const v = getVerify(lead);
              const isScrubbed = v === "🌐 Has Website" || v === "🚫 Permanently Closed";
              return (
                <tr key={lead.id}
                  style={{ borderBottom: "1px solid #0f172a", background: i % 2 ? "#0b0f1a" : "transparent", opacity: isScrubbed ? 0.4 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = "#131929"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 ? "#0b0f1a" : "transparent"}>
                  <td style={{ padding: "10px 12px" }}>
                    <span onClick={() => openDetail(lead)} style={{ cursor: "pointer", color: isScrubbed ? "#475569" : "#818cf8", fontWeight: 600, fontSize: 13, textDecoration: isScrubbed ? "line-through" : "none" }}>
                      {lead.name}
                    </span>
                    {lead.notes && <span style={{ marginLeft: 5, fontSize: 10 }}>📝</span>}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 11, color: "#64748b" }}>{lead.category}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 10, color: VERIFY_COLORS[v], fontWeight: 700 }}>{v}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <a href={`https://www.google.com/search?q=${encodeURIComponent(lead.name + " East Peoria IL")}`} target="_blank" rel="noopener noreferrer"
                        style={{ ...S.btn("#0f2a1a", { padding: "3px 8px", fontSize: 10, textDecoration: "none" }) }}>🔍</a>
                      <button onClick={() => updateLead(lead.id, "verify_status", "✅ Active — No Website")}
                        style={S.btn(v === "✅ Active — No Website" ? "#064e3b" : "#0f2a1a", { padding: "3px 8px", fontSize: 10 })}>✅</button>
                      <button onClick={() => updateLead(lead.id, "verify_status", "🌐 Has Website")}
                        style={S.btn(v === "🌐 Has Website" ? "#451a03" : "#1a1200", { padding: "3px 8px", fontSize: 10 })}>🌐</button>
                      <button onClick={() => updateLead(lead.id, "verify_status", "🚫 Permanently Closed")}
                        style={S.btn(v === "🚫 Permanently Closed" ? "#3b0a0a" : "#1a0a0a", { padding: "3px 8px", fontSize: 10 })}>🚫</button>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <button onClick={() => openDetail(lead)} style={{ ...S.btn("#1e293b"), padding: "3px 10px", fontSize: 11 }}>→</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ marginTop: 16, padding: "12px 16px", background: "#0d1117", borderRadius: 8, border: "1px solid #1e293b", display: "flex", gap: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "#334155" }}>QUICK TAG →</span>
          {[["✅", "Active, no website"], ["🌐", "Has website"], ["🚫", "Permanently closed"]].map(([icon, label]) => (
            <span key={icon} style={{ fontSize: 11, color: "#475569" }}>{icon} = {label}</span>
          ))}
        </div>
      </div>

      {/* DETAIL PANEL */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", justifyContent: "flex-end", zIndex: 100 }} onClick={() => setSelected(null)}>
          <div style={{ width: 460, background: "#0d1117", borderLeft: "1px solid #1e293b", overflowY: "auto", padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 9, letterSpacing: "0.3em", color: "#6366f1", marginBottom: 5 }}>LEAD DETAIL</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#f8fafc", marginBottom: 2 }}>{selected.name}</div>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 16 }}>{selected.category} · East Peoria, IL</div>

            <div style={{ marginBottom: 16 }}>
              <label style={S.lbl}>VERIFICATION</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {[
                  ["✅ Active — No Website", "#064e3b", "#10b981"],
                  ["🌐 Has Website", "#451a03", "#f59e0b"],
                  ["🚫 Permanently Closed", "#3b0a0a", "#ef4444"]
                ].map(([status, bg, color]) => (
                  <button key={status} onClick={() => updateLead(selected.id, "verify_status", status)}
                    style={{ background: getVerify(selected) === status ? bg : "#1e293b", border: `1px solid ${getVerify(selected) === status ? color : "#334155"}`, borderRadius: 6, padding: "10px 6px", color: getVerify(selected) === status ? color : "#64748b", fontSize: 10, fontFamily: "inherit", cursor: "pointer", fontWeight: 700, lineHeight: 1.4, textAlign: "center" }}>
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <label style={S.lbl}>STATUS</label>
                <select value={selected.status} onChange={e => updateLead(selected.id, "status", e.target.value)} style={{ ...S.sel, width: "100%", padding: "8px 10px" }}>
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={S.lbl}>PRIORITY</label>
                <select value={selected.priority} onChange={e => updateLead(selected.id, "priority", e.target.value)} style={{ ...S.sel, width: "100%", padding: "8px 10px" }}>
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={S.lbl}>NOTES</label>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3} placeholder="Phone, contact name, visit outcome..."
                style={{ ...S.inp, width: "100%", resize: "vertical", boxSizing: "border-box" }} />
              <button onClick={() => saveNotes(selected.id, noteText)} style={{ ...S.btn(saving ? "#1e293b" : "#1e3a5f"), marginTop: 5, width: "100%", fontSize: 11 }}>
                {saving ? "Saving..." : "Save Notes"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              <a href={`https://www.google.com/search?q=${encodeURIComponent(selected.name + " East Peoria IL")}`} target="_blank" rel="noopener noreferrer"
                style={{ ...S.btn("#0f766e"), textDecoration: "none", fontSize: 11, flex: 1, textAlign: "center" }}>🔍 Google</a>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(selected.name + " East Peoria IL")}`} target="_blank" rel="noopener noreferrer"
                style={{ ...S.btn("#1e3a5f"), textDecoration: "none", fontSize: 11, flex: 1, textAlign: "center" }}>📍 Maps</a>
            </div>

            {/* AI GENERATOR */}
            <div style={{ background: "#080c14", border: "1px solid #1e293b", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#6366f1", marginBottom: 12, fontWeight: 700 }}>✦ AI OUTREACH GENERATOR</div>

              <div style={{ marginBottom: 8 }}>
                <label style={S.lbl}>MESSAGE TYPE</label>
                <select value={outreachType} onChange={e => { setOutreachType(e.target.value); setAiMessage(""); }} style={{ ...S.sel, width: "100%", padding: "8px 10px" }}>
                  {OUTREACH_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={S.lbl}>YOUR NAME <span style={{ color: "#334155" }}>(optional)</span></label>
                <input value={yourName} onChange={e => setYourName(e.target.value)} placeholder="e.g. Marcus"
                  style={{ ...S.inp, width: "100%", boxSizing: "border-box" }} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={S.lbl}>EXTRA CONTEXT <span style={{ color: "#334155" }}>(optional)</span></label>
                <input value={extraContext} onChange={e => setExtraContext(e.target.value)} placeholder="e.g. Busy on weekends, family owned since 1998"
                  style={{ ...S.inp, width: "100%", boxSizing: "border-box" }} />
              </div>

              <button onClick={generateOutreach} disabled={aiLoading}
                style={{ ...S.btn(aiLoading ? "#1a1f2e" : "#4f46e5"), width: "100%", fontSize: 12, opacity: aiLoading ? 0.65 : 1 }}>
                {aiLoading ? "⟳  Generating..." : `✦ Generate ${outreachType}`}
              </button>

              {aiError && (
                <div style={{ marginTop: 8, fontSize: 11, color: "#f87171", background: "#1f0a0a", padding: "8px 12px", borderRadius: 6 }}>
                  {aiError}
                </div>
              )}

              {aiMessage && !aiLoading && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderLeft: "3px solid #6366f1", borderRadius: 6, padding: "12px 14px", fontSize: 12, lineHeight: 1.8, color: "#cbd5e1", whiteSpace: "pre-wrap", maxHeight: 280, overflowY: "auto" }}>
                    {aiMessage}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={copyMsg} style={{ ...S.btn(copied ? "#064e3b" : "#4f46e5"), flex: 1, fontSize: 11 }}>
                      {copied ? "✅ Copied!" : "Copy"}
                    </button>
                    <button onClick={generateOutreach} style={{ ...S.btn("#1e293b"), flex: 1, fontSize: 11 }}>↻ Redo</button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => setSelected(null)} style={{ ...S.btn("#1a1f2e"), width: "100%", fontSize: 11 }}>✕ Close</button>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {showImport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowImport(false)}>
          <div style={{ background: "#0f172a", border: "1px solid #0f766e", borderRadius: 12, padding: 28, maxWidth: 500, width: "92%" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#10b981", marginBottom: 10 }}>IMPORT NEW LEADS</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#f8fafc", marginBottom: 8 }}>Paste JSON from Claude</div>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 14, lineHeight: 1.6 }}>
              Ask Claude: <span style={{ color: "#818cf8" }}>"Give me 20 East Peoria businesses with no website in the [category] category as a JSON array with name and category fields"</span> — then paste the result below.
            </div>
            <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={8}
              placeholder={'[\n  { "name": "Smith Roofing", "category": "Roofing" },\n  { "name": "East Peoria Alterations", "category": "Clothing" }\n]'}
              style={{ ...S.inp, width: "100%", resize: "vertical", boxSizing: "border-box", fontSize: 11, lineHeight: 1.6 }} />
            {importError && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#f87171", background: "#1f0a0a", padding: "8px 12px", borderRadius: 6 }}>{importError}</div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={importLeads} disabled={importing} style={{ ...S.btn("#0f766e"), flex: 1, opacity: importing ? 0.6 : 1 }}>
                {importing ? "Importing..." : "Import Leads"}
              </button>
              <button onClick={() => setShowImport(false)} style={{ ...S.btn("#1e293b"), flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* PITCH MODAL */}
      {showPitch && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowPitch(false)}>
          <div style={{ background: "#0f172a", border: "1px solid #4f46e5", borderRadius: 12, padding: 28, maxWidth: 480, width: "92%", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#6366f1", marginBottom: 10 }}>OUTREACH PLAYBOOK</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#f8fafc", marginBottom: 14 }}>5 Rules for Closing Local Businesses</div>
            {[
              ["Lead with curiosity, not a pitch", "Ask 'How are most of your new customers finding you right now?' before mentioning websites. Let them feel the gap."],
              ["The live Google test", "Pull out your phone, search their name in front of them. Blank results. Visual proof closes deals."],
              ["Pain over features", "They don't care about responsive design. They care about losing jobs to the competitor who shows up on Google."],
              ["Drop local social proof", "'I just built a site for a plumber over on Washington Street' — neighborhood names build instant trust."],
              ["Ask for 15 minutes, not money", "Remove all friction from the first yes. A coffee meeting is a yes. A $1,500 deposit is a wall."],
            ].map(([title, tip]) => (
              <div key={title} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #1e293b" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", marginBottom: 3 }}>◈ {title}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.65 }}>{tip}</div>
              </div>
            ))}
            <button onClick={() => setShowPitch(false)} style={{ ...S.btn("#1e293b"), width: "100%", marginTop: 4 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}