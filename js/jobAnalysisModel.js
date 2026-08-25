const JOB_ANALYSIS_VERSION = 1;
const JOB_ANALYSIS_SKILL_CATEGORIES = ["programmingLanguages", "frontend", "backend", "frameworks", "databases", "tools", "methods"];

function createEmptyJobAnalysis() {
    return { version: JOB_ANALYSIS_VERSION, analyzedAt: "", position: { title: "", seniority: "", employmentType: "" }, company: { name: "" }, tasks: [], requirements: { mustHave: [], niceToHave: [] }, skills: Object.fromEntries(JOB_ANALYSIS_SKILL_CATEGORIES.map(key => [key, []])), softSkills: [], experience: { requiredYears: null, preferredYears: null, required: "", preferred: "" }, education: [], languages: [], workModel: { remote: null, hybrid: null, onsite: null }, location: { city: "", region: "" }, salary: { mentioned: false, text: null, source: null }, travel: { required: null, description: "" }, benefits: [], additionalRequirements: [], summary: "" };
}

function validateJobAnalysis(analysis) {
    const errors = [];
    if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) return ["Analyse muss ein Objekt sein."];
    if (analysis.version !== JOB_ANALYSIS_VERSION) errors.push("Nicht unterstützte Analyseversion.");
    ["position", "company", "requirements", "skills", "experience", "workModel", "location", "salary", "travel"].forEach(key => { if (!analysis[key] || typeof analysis[key] !== "object" || Array.isArray(analysis[key])) errors.push(`${key} fehlt oder ist ungültig.`); });
    ["tasks", "softSkills", "education", "languages", "benefits", "additionalRequirements"].forEach(key => { if (!Array.isArray(analysis[key])) errors.push(`${key} muss ein Array sein.`); });
    if (analysis.requirements) ["mustHave", "niceToHave"].forEach(key => { if (!Array.isArray(analysis.requirements[key])) errors.push(`requirements.${key} muss ein Array sein.`); });
    if (analysis.skills) JOB_ANALYSIS_SKILL_CATEGORIES.forEach(key => { if (!Array.isArray(analysis.skills[key])) errors.push(`skills.${key} muss ein Array sein.`); });
    if (analysis.salary && (typeof analysis.salary.mentioned !== "boolean" || !(analysis.salary.text === null || typeof analysis.salary.text === "string"))) errors.push("salary ist ungültig.");
    if (analysis.experience && ((!Number.isInteger(analysis.experience.requiredYears) && analysis.experience.requiredYears !== null) || (!Number.isInteger(analysis.experience.preferredYears) && analysis.experience.preferredYears !== null))) errors.push("Erfahrungsjahre müssen Ganzzahlen oder null sein.");
    return errors;
}

function assertValidJobAnalysis(analysis) { const errors = validateJobAnalysis(analysis); if (errors.length) throw new Error(errors.join(" ")); return analysis; }
