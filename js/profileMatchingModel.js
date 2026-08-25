const PROFILE_MATCHING_VERSION = 1;
const MATCHING_WEIGHTS = { mustHave: 0.40, skills: 0.20, experience: 0.15, education: 0.10, projects: 0.10, softSkills: 0.05 };
const MATCHING_THRESHOLDS = { veryGood: 80, good: 60, partial: 40 };

function createEmptyProfileMatching() { return { version: PROFILE_MATCHING_VERSION, score: null, rating: "", requirements: { mustHave: { matched: 0, total: 0, items: [] }, niceToHave: { matched: 0, total: 0, items: [] } }, skills: { matched: [], partial: [], missing: [] }, experience: { status: "unclear", rating: "", explanation: "" }, education: { status: "unclear", rating: "", explanation: "" }, projects: { status: "unclear", rating: "", relevant: [] }, softSkills: { status: "unclear", rating: "", explanation: "" }, languages: { status: "unclear", rating: "", explanation: "" }, missing: [], strengths: [], summary: "", matchedAt: "" }; }

// A data gap is not proof of absence: unclear receives neutral half credit,
// while contradicted represents an explicit negative profile statement.
function matchingStatusValue(status) { return { matched: 1, partial: 0.5, unclear: 0.5, missing: 0, contradicted: 0 }[status] ?? 0; }
function matchingRating(score) { if (score >= MATCHING_THRESHOLDS.veryGood) return "Sehr gute Passung"; if (score >= MATCHING_THRESHOLDS.good) return "Gute Passung"; if (score >= MATCHING_THRESHOLDS.partial) return "Teilweise passende Stelle"; return "Geringe Passung"; }
function calculateProfileMatchingScore(matching) {
    const req = matching.requirements?.mustHave || { matched: 0, total: 0 };
    const mustHave = req.total ? req.matched / req.total : 0;
    const skillItems = [...(matching.skills?.matched || []).map(() => 1), ...(matching.skills?.partial || []).map(() => .5), ...(matching.skills?.missing || []).map(() => 0)];
    const skills = skillItems.length ? skillItems.reduce((sum, value) => sum + value, 0) / skillItems.length : 0;
    const score = Math.round(100 * (MATCHING_WEIGHTS.mustHave * mustHave + MATCHING_WEIGHTS.skills * skills + MATCHING_WEIGHTS.experience * matchingStatusValue(matching.experience?.status) + MATCHING_WEIGHTS.education * matchingStatusValue(matching.education?.status) + MATCHING_WEIGHTS.projects * matchingStatusValue(matching.projects?.status) + MATCHING_WEIGHTS.softSkills * matchingStatusValue(matching.softSkills?.status)));
    return Math.max(0, Math.min(100, score));
}
function finalizeProfileMatching(matching) { const result = { ...createEmptyProfileMatching(), ...matching }; result.score = calculateProfileMatchingScore(result); result.rating = matchingRating(result.score); result.matchedAt = result.matchedAt || new Date().toISOString(); return result; }
function validateProfileMatching(matching) {
    const errors = []; if (!matching || typeof matching !== "object" || matching.version !== PROFILE_MATCHING_VERSION) errors.push("Ungültige Matching-Version.");
    if (matching && (!matching.requirements || !matching.requirements.mustHave || !Array.isArray(matching.requirements.mustHave.items) || !matching.requirements.niceToHave || !Array.isArray(matching.requirements.niceToHave.items))) errors.push("Anforderungsmatches fehlen.");
    if (matching && (!matching.skills || !["matched", "partial", "missing"].every(key => Array.isArray(matching.skills[key])))) errors.push("Skill-Matches fehlen.");
    ["experience", "education", "projects", "softSkills", "languages"].forEach(key => { if (matching && !["matched", "partial", "missing", "unclear", "contradicted"].includes(matching[key]?.status)) errors.push(`${key} besitzt keinen gültigen Status.`); });
    if (matching && (matching.score !== null && (!Number.isInteger(matching.score) || matching.score < 0 || matching.score > 100))) errors.push("Score ist ungültig.");
    return errors;
}
function assertValidProfileMatching(matching) { const errors = validateProfileMatching(matching); if (errors.length) throw new Error(errors.join(" ")); return matching; }

function buildMatchingProfile(profile) {
    return { summary: profile.summary || "", skills: profile.skills || {}, experience: profile.experience || [], education: profile.education || [], projects: (profile.projects || []).map(project => ({ id: project.id, name: project.name, shortDescription: project.shortDescription || "", description: project.description || "", type: project.type || "", technologies: project.technologies || [], role: project.role || "", activities: project.activities || [] })), additional: { languages: profile.additional?.languages || [] } };
}
function buildMatchingFingerprint(jobAnalysis, profile) { return JSON.stringify({ jobAnalysis, profile: buildMatchingProfile(profile) }); }
