const APPLICATION_SCHEMA_VERSION = 2;
const JOB_POSTING_SCHEMA_VERSION = 1;

function createJobPosting(data = {}, legacy = {}) {
    return {
        version: JOB_POSTING_SCHEMA_VERSION,
        id: data.id || legacy.externalId || `job-${Date.now()}`,
        rawText: typeof data.rawText === "string" && data.rawText.trim() ? data.rawText : (legacy.description || ""),
        sourceUrl: data.sourceUrl || legacy.url || "",
        source: data.source || legacy.source || "manual",
        capturedAt: data.capturedAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
    };
}

function normalizeContact(application = {}) {
    const contact = application.contact && typeof application.contact === "object" ? application.contact : {};
    const clean = value => { const text = typeof value === "string" ? value.trim() : ""; return text === "[object Object]" ? "" : text; };
    const legacyName = clean(application.contactName);
    return {
        salutation: clean(contact.salutation) || clean(application.salutation),
        firstName: clean(contact.firstName),
        lastName: clean(contact.lastName) || (!clean(contact.firstName) ? legacyName : ""),
        position: clean(contact.position)
    };
}

function normalizeCompanyAddress(address = {}) {
    return { street: address.street || "", houseNumber: address.houseNumber || "", postalCode: address.postalCode || "", city: address.city || "", country: address.country || "" };
}

function migrateApplication(application) {
    const source = application && typeof application === "object" ? application : {};
    const jobPosting = createJobPosting(source.jobPosting || {}, source);
    const canonicalDescription = jobPosting.rawText || source.description || "";
    const contact = normalizeContact(source);
    return {
        ...source,
        schemaVersion: APPLICATION_SCHEMA_VERSION,
        jobPosting,
        companyAddress: normalizeCompanyAddress(source.companyAddress),
        contact,
        // Legacy fields remain as a compatibility projection for the existing UI/imports.
        description: canonicalDescription,
        url: source.url || jobPosting.sourceUrl,
        source: source.source || jobPosting.source,
        salutation: contact.salutation,
        contactName: [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.lastName
    };
}

function validateJobPosting(jobPosting) {
    const errors = [];
    if (!jobPosting || typeof jobPosting !== "object") return ["Stellenanzeige fehlt."];
    if (jobPosting.version !== JOB_POSTING_SCHEMA_VERSION) errors.push("Ungültige Stellenanzeigenversion.");
    if (typeof jobPosting.rawText !== "string") errors.push("Der Stellenanzeigentext muss Text sein.");
    ["sourceUrl", "source", "capturedAt", "updatedAt"].forEach(key => { if (typeof jobPosting[key] !== "string") errors.push(`Stellenanzeige.${key} muss Text sein.`); });
    if (jobPosting.sourceUrl && !/^https?:\/\/[^\s]+$/i.test(jobPosting.sourceUrl)) errors.push("Die Stellenanzeigen-URL ist ungültig.");
    ["capturedAt", "updatedAt"].forEach(key => { if (Number.isNaN(new Date(jobPosting[key]).getTime())) errors.push(`Stellenanzeige.${key} ist kein gültiges Datum.`); });
    return errors;
}

function validateApplication(application) {
    const errors = [];
    if (!application || typeof application !== "object") return ["Bewerbung muss ein Objekt sein."];
    if (application.schemaVersion !== APPLICATION_SCHEMA_VERSION) errors.push("Ungültige Bewerbungsversion.");
    if (typeof application.company !== "string" || !application.company.trim()) errors.push("Unternehmen fehlt.");
    if (typeof application.position !== "string" || !application.position.trim()) errors.push("Position fehlt.");
    errors.push(...validateJobPosting(application.jobPosting));
    if (!application.companyAddress || typeof application.companyAddress !== "object") errors.push("Unternehmensanschrift fehlt.");
    if (!application.contact || typeof application.contact !== "object") errors.push("Ansprechpartner fehlt.");
    return errors;
}

function buildApplicationContext(application, profile) {
    const current = migrateApplication(application);
    return {
        application: { id: current.id, company: current.company, position: current.position, city: current.city, state: current.state, date: current.date, status: current.status, tag: current.tag },
        company: { name: current.company, address: current.companyAddress },
        contact: current.contact,
        jobPosting: current.jobPosting,
        details: current.details || "",
        profile: profile || null
    };
}

function hasMeaningfulProfile(profile) {
    return Boolean(profile && (profile.personal?.firstName || profile.personal?.lastName || profile.summary || profile.experience?.length || profile.skills && Object.values(profile.skills).some(items => items.length) || profile.projects?.length));
}
