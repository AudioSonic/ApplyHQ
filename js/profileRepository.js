const PROFILE_STORAGE_KEY = "applicantProfile";

function getProfile() {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!stored) return createDefaultProfile();
    try {
        const profile = migrateProfile(JSON.parse(stored));
        assertValidProfile(profile);
        return profile;
    } catch (error) {
        console.error("Profil konnte nicht geladen werden.", error);
        return createDefaultProfile();
    }
}

function saveProfile(profile) {
    const normalized = migrateProfile(profile);
    assertValidProfile(normalized);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
}

function resetProfile() {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    return createDefaultProfile();
}

function exportProfileData(profile = getProfile()) {
    const normalized = saveProfile(profile);
    return { type: PROFILE_TYPE, version: CURRENT_PROFILE_VERSION, profile: normalized };
}

function importProfileData(data) {
    if (!data || data.type !== PROFILE_TYPE || !data.profile) throw new Error("Die Datei ist kein gültiger ApplyHQ-Profil-Export.");
    if (Number(data.version) > CURRENT_PROFILE_VERSION) throw new Error("Die Profilversion wird von dieser App nicht unterstützt.");
    const profile = migrateProfile({ ...data.profile, version: Number(data.version || data.profile.version || 0) });
    assertValidProfile(profile);
    return saveProfile(profile);
}
