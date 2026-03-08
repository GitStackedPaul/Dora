/**
 * DORA Compliance Gap Analyzer (Node.js – no Python required)
 *
 * Performs gap analysis on Level 1 DORA Regulation (EU 2022/2554) obligations.
 * Run: node dora_gap_analyzer.js --policies-path "C:\path\to\policies" --output-json dora_gap_output.json
 */

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname);

const TAG_MAP = {
  informatiebeveiliging: ["security", "ict", "access"],
  "information security": ["security", "ict", "access"],
  bedrijfscontinu: ["bcp", "continuity", "drp"],
  "business continuity": ["bcp", "continuity", "drp"],
  "derde aanbieders": ["third party", "outsourcing", "procurement"],
  outsourcing: ["third party", "outsourcing", "procurement"],
  incident: ["incident"],
  risk: ["risk", "ict"],
  training: ["training", "awareness"],
  backup: ["backup", "recovery", "bcp"],
  recovery: ["backup", "recovery", "bcp"],
  procurement: ["third party", "outsourcing", "procurement"],
  audit: ["audit", "risk", "ict"],
  testing: ["testing", "resilience"],
  communication: ["communication", "incident"],
};

function loadObligations(obligationsPath) {
  const data = fs.readFileSync(obligationsPath, "utf8");
  return JSON.parse(data);
}

function scanPolicyDocuments(baseDir) {
  const documents = [];
  const ext = [".pdf", ".docx", ".doc", ".xlsx", ".xlsb", ".pptx"];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const rel = path.relative(baseDir, full);
      const lower = rel.toLowerCase();
      if (e.isDirectory()) {
        walk(full);
      } else if (ext.some((x) => e.name.toLowerCase().endsWith(x))) {
        const inferredTags = [];
        for (const [key, tags] of Object.entries(TAG_MAP)) {
          if (lower.includes(key)) inferredTags.push(...tags);
        }
        documents.push({
          ref: `[${documents.length + 1}]`,
          filename: e.name,
          relative_path: rel.replace(/\\/g, "\\"),
          inferred_tags: [...new Set(inferredTags)].sort(),
        });
      }
    }
  }

  walk(baseDir);
  return documents;
}

function getApplicability(obligation, clientProfile) {
  const microVal = obligation.micro_entity || "applicable";
  if (clientProfile === "micro_entity") {
    if (microVal === "not_applicable") {
      return ["Not Applicable", "Exempt for micro enterprises under DORA Article 4 proportionality.", "Vrijgesteld voor micro-ondernemingen onder DORA Artikel 4 proportionaliteit."];
    }
    const notes = obligation.micro_entity_notes || "";
    return ["Applicable", `Applies with proportionality exemptions. ${notes}`, `Van toepassing met proportionaliteitsvrijstellingen. ${notes}`];
  }
  return ["Applicable", "Full requirement applies under standard regime.", "Volledige vereiste van toepassing onder standaardregime."];
}

function getRoadmapSuggestion(item) {
  const code = item.item_code || "";
  const label = item.item_label_en || "";
  const prefix = item.gap === "Gap" ? "" : "Review and strengthen existing documentation. ";
  if (/[567]/.test(code)) return `${prefix}Establish or document ICT risk management framework covering governance, identification and protection. Align with DORA Article 5 and RTS on ICT risk management (EU 2024/1774).`;
  if (/9/.test(code)) return `${prefix}Implement user access management policy with least-privilege principle and quarterly access reviews (DORA Article 9(2)(d)).`;
  if (/1[12]/.test(code)) return `${prefix}Document business continuity and backup/recovery plans. Test regularly and update based on lessons learned.`;
  if (/13/.test(code)) return `${prefix}Implement ICT security awareness programme and annual training for staff.`;
  if (/1[57]/.test(code)) return `${prefix}Implement incident management process: detection, classification, response and reporting to competent authorities. See RTS (EU) 2025/301 for reporting content.`;
  if (/2[56]|30/.test(code)) return `${prefix}Maintain register of ICT third-party arrangements; ensure contracts include key provisions per DORA Article 30. See RTS (EU) 2024/1773 and ITS (EU) 2024/2956.`;
  return `${prefix}Address documentation gap for ${label}. Review DORA requirements and RTS/ITS for this obligation.`;
}

function getRoadmapSuggestionNl(item) {
  const code = item.item_code || "";
  const label = item.item_label_nl || "";
  const prefix = item.gap === "Gap" ? "" : "Beoordeel en versterk bestaande documentatie. ";
  if (/[567]/.test(code)) return `${prefix}Stel een ICT-risicobeheerkader op of documenteer dit, inclusief governance, identificatie en bescherming. Sluit aan bij DORA Artikel 5 en RTS (EU 2024/1774).`;
  if (/9/.test(code)) return `${prefix}Implementeer beleid voor gebruikersrechtenbeheer met least-privilege en kwartaalrecensies (DORA Artikel 9(2)(d)).`;
  if (/1[12]/.test(code)) return `${prefix}Documenteer bedrijfscontinuïte- en back-up/herstelplannen. Test regelmatig en werk bij op basis van geleerde lessen.`;
  if (/13/.test(code)) return `${prefix}Implementeer bewustwordingsprogramma en jaarlijkse training voor ICT-beveiliging.`;
  if (/1[57]/.test(code)) return `${prefix}Implementeer incidentbeheerproces: detectie, classificatie, respons en rapportage aan bevoegde autoriteiten. Zie RTS (EU) 2025/301.`;
  if (/2[56]|30/.test(code)) return `${prefix}Houd register bij van ICT-derdepartijafspraken; zorg dat contracten kernbepalingen bevatten volgens DORA Artikel 30. Zie RTS (EU) 2024/1773 en ITS (EU) 2024/2956.`;
  return `${prefix}Los documentatiekloof op voor ${label}. Raadpleeg DORA-vereisten en RTS/ITS voor deze verplichting.`;
}

function mapDocumentsToDora(obligations, documents, clientProfile = "standard") {
  const results = [];
  const criticalTags = new Set(["risk", "ict", "incident", "third party", "outsourcing", "bcp"]);

  for (const obligation of obligations) {
    const [applicability, reasonEn, reasonNl] = getApplicability(obligation, clientProfile);

    if (applicability === "Not Applicable") {
      results.push({
        legislation: obligation.legislation || "DORA",
        item_code: obligation.item_code,
        item_label_en: obligation.item_label_en,
        item_label_nl: obligation.item_label_nl,
        applicability,
        applicability_reason_en: reasonEn,
        applicability_reason_nl: reasonNl,
        documentation: [],
        gap: "N/A",
        gap_severity: "N/A",
        gap_reason: "Not applicable",
        gap_reason_en: "Not applicable",
        gap_reason_nl: "Niet van toepassing",
        improvement_step_en: "",
        improvement_step_nl: "",
      });
      continue;
    }

    const obligationTags = new Set((obligation.tags || []).map((t) => t.toLowerCase()));
    const matchedDocs = [];
    const partialMatchDocs = [];

    for (const doc of documents) {
      const docTags = new Set((doc.inferred_tags || []).map((t) => t.toLowerCase()));
      const overlap = [...obligationTags].filter((t) => docTags.has(t));
      if (overlap.length === 0) continue;
      const strongMatch = overlap.length >= 2 || overlap.some((t) => criticalTags.has(t));
      if (strongMatch) matchedDocs.push(doc);
      else partialMatchDocs.push(doc);
    }

    let hasDocs = matchedDocs.length > 0;
    const hasPartial = partialMatchDocs.length > 0 && !hasDocs;
    const hasWeakPartial = partialMatchDocs.length > 0 && hasDocs && matchedDocs.length === 1;

    let gap;
    if (hasDocs && !hasWeakPartial) gap = "No gap";
    else if (hasDocs && hasWeakPartial && obligation.criticality === "High") gap = "Partial gap";
    else if (hasPartial || (hasDocs && hasWeakPartial)) gap = "Partial gap";
    else gap = "Gap";

    let gapSeverity = "Low";
    if (gap === "Gap") gapSeverity = obligation.criticality === "High" ? "High" : "Medium";
    else if (gap === "Partial gap") gapSeverity = obligation.criticality === "High" ? "Medium" : "Low";

    const docsToUse = partialMatchDocs.length && !matchedDocs.length ? partialMatchDocs : matchedDocs;
    const documentation = docsToUse.map((d) => ({
      ref: d.ref,
      title_en: d.filename,
      title_nl: d.filename,
      filename: d.filename,
      relative_path: d.relative_path,
    }));

    let gapReasonEn, gapReasonNl;
    if (gap === "No gap") {
      gapReasonEn = "Relevant documentation was found that appears to address this obligation.";
      gapReasonNl = "Relevante documentatie gevonden die deze verplichting lijkt te dekken.";
    } else if (gap === "Partial gap") {
      gapReasonEn = "Some documentation found but coverage may be incomplete. Recommend review against DORA requirements and RTS.";
      gapReasonNl = "Enige documentatie gevonden, maar dekking kan onvolledig zijn. Aanbevolen: toetsen aan DORA-vereisten en RTS.";
    } else {
      gapReasonEn = "No documentation with matching tags was found for this obligation.";
      gapReasonNl = "Geen documentatie met overeenkomende tags gevonden voor deze verplichting.";
    }

    let improvementStepEn = "";
    let improvementStepNl = "";
    if (gap === "Gap" || gap === "Partial gap") {
      const item = { ...obligation, gap, gap_severity: gapSeverity };
      improvementStepEn = getRoadmapSuggestion(item);
      improvementStepNl = getRoadmapSuggestionNl(item);
    }

    results.push({
      legislation: obligation.legislation || "DORA",
      item_code: obligation.item_code,
      item_label_en: obligation.item_label_en,
      item_label_nl: obligation.item_label_nl,
      applicability,
      applicability_reason_en: reasonEn,
      applicability_reason_nl: reasonNl,
      documentation,
      gap,
      gap_severity: gapSeverity,
      gap_reason: gapReasonEn,
      gap_reason_en: gapReasonEn,
      gap_reason_nl: gapReasonNl,
      improvement_step_en: improvementStepEn,
      improvement_step_nl: improvementStepNl,
    });
  }

  return results;
}

function generateRoadmap(gapResults) {
  const gapsOnly = gapResults.filter(
    (r) => ["Gap", "Partial gap"].includes(r.gap) && r.applicability === "Applicable"
  );
  const order = { High: 0, Medium: 1, Low: 2 };
  gapsOnly.sort((a, b) => {
    const sa = order[a.gap_severity] ?? 2;
    const sb = order[b.gap_severity] ?? 2;
    if (sa !== sb) return sa - sb;
    return (a.item_code || "").localeCompare(b.item_code || "");
  });
  return gapsOnly.map((item, i) => ({
    phase: i + 1,
    item_code: item.item_code,
    item_label_en: item.item_label_en,
    gap_severity: item.gap_severity,
    suggestion_en: getRoadmapSuggestion(item),
    suggestion_nl: getRoadmapSuggestionNl(item),
  }));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--policies-path" && args[i + 1]) out.policiesPath = args[++i];
    else if (args[i] === "--output-json" && args[i + 1]) out.outputJson = args[++i];
    else if (args[i] === "--roadmap-json" && args[i + 1]) out.roadmapJson = args[++i];
    else if (args[i] === "--client-profile" && args[i + 1]) out.clientProfile = args[++i];
    else if (args[i] === "--obligations" && args[i + 1]) out.obligations = args[++i];
  }
  return out;
}

function main() {
  const args = parseArgs();
  const obligationsPath = path.resolve(args.obligations || path.join(PROJECT_ROOT, "dora_level1_obligations.json"));
  const policiesPath = args.policiesPath ? path.resolve(args.policiesPath) : PROJECT_ROOT;
  const outputJson = args.outputJson || "dora_gap_output.json";
  const roadmapJson = args.roadmapJson || "dora_roadmap_output.json";
  const clientProfile = args.clientProfile || "standard";

  if (!fs.existsSync(obligationsPath)) {
    console.error("Obligations file not found:", obligationsPath);
    process.exit(1);
  }
  if (args.policiesPath && !fs.existsSync(policiesPath)) {
    console.error("Policies path does not exist:", policiesPath);
    process.exit(1);
  }

  const obligations = loadObligations(obligationsPath);
  const documents = scanPolicyDocuments(policiesPath);
  const gapResults = mapDocumentsToDora(obligations, documents, clientProfile);
  const roadmap = generateRoadmap(gapResults);

  const outPath = path.resolve(outputJson);
  fs.writeFileSync(outPath, JSON.stringify(gapResults, null, 2), "utf8");
  console.log(`Wrote DORA gap table with ${gapResults.length} rows to ${outPath}`);

  const roadmapPath = path.resolve(roadmapJson);
  fs.writeFileSync(roadmapPath, JSON.stringify(roadmap, null, 2), "utf8");
  console.log(`Wrote improvement roadmap with ${roadmap.length} items to ${roadmapPath}`);
}

main();
