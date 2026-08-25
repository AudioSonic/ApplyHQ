const PROFILE_TYPE = "applyhq-profile";
const CURRENT_PROFILE_VERSION = 1;

function createDefaultProfile() {
    return {
        version: CURRENT_PROFILE_VERSION,
        personal: { firstName: "", lastName: "", email: "", phone: "", location: "", website: "", github: "", linkedin: "" },
        summary: "",
        education: [],
        experience: [],
        skills: {
            programmingLanguages: [], frontend: [], backend: [], frameworks: [], databases: [], tools: [], methods: []
        },
        projects: [],
        additional: { languages: [], certifications: [], interests: [] }
    };
}

function normalizeProfile(profile) {
    const base = createDefaultProfile();
    const source = profile && typeof profile === "object" ? profile : {};
    const skills = source.skills && typeof source.skills === "object" ? source.skills : {};
    return {
        ...base,
        ...source,
        version: CURRENT_PROFILE_VERSION,
        personal: { ...base.personal, ...(source.personal || {}) },
        education: Array.isArray(source.education) ? source.education : [],
        experience: Array.isArray(source.experience) ? source.experience : [],
        skills: Object.fromEntries(Object.keys(base.skills).map(category => [category, Array.isArray(skills[category]) ? skills[category] : []])),
        projects: Array.isArray(source.projects) ? source.projects : [],
        additional: { ...base.additional, ...(source.additional || {}) }
    };
}

function migrateProfile(profile) {
    let migrated = profile && typeof profile === "object" ? structuredClone(profile) : createDefaultProfile();
    const version = Number(migrated.version || 0);
    if (version > CURRENT_PROFILE_VERSION) throw new Error("Das Profil stammt aus einer nicht unterstützten Version.");
    if (version < 1) migrated = normalizeProfile(migrated);
    return normalizeProfile(migrated);
}

function isValidId(value) {
    return typeof value === "string" && /^[a-z0-9][a-z0-9-]{1,119}$/i.test(value);
}

function validateProfile(profile) {
    const errors = [];
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) return ["Profil muss ein Objekt sein."];
    if (profile.version !== CURRENT_PROFILE_VERSION) errors.push("Ungültige oder nicht unterstützte Profilversion.");
    if (!profile.personal || typeof profile.personal !== "object" || Array.isArray(profile.personal)) errors.push("Persönliche Daten fehlen.");
    if (typeof profile.summary !== "string") errors.push("Die Zusammenfassung muss Text sein.");
    ["education", "experience", "projects"].forEach(key => {
        if (!Array.isArray(profile[key])) errors.push(`${key} muss ein Array sein.`);
        else profile[key].forEach((item, index) => { if (!isValidId(item?.id)) errors.push(`${key}[${index}] besitzt keine gültige ID.`); });
    });
    const categories = ["programmingLanguages", "frontend", "backend", "frameworks", "databases", "tools", "methods"];
    if (!profile.skills || typeof profile.skills !== "object") errors.push("Skills fehlen.");
    else categories.forEach(category => {
        if (!Array.isArray(profile.skills[category])) errors.push(`skills.${category} muss ein Array sein.`);
        else profile.skills[category].forEach((skill, index) => { if (!isValidId(skill?.id)) errors.push(`skills.${category}[${index}] besitzt keine gültige ID.`); });
    });
    return errors;
}

function assertValidProfile(profile) {
    const errors = validateProfile(profile);
    if (errors.length) throw new Error(errors.join(" "));
    return profile;
}
