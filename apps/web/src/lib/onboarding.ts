const KEY = "arvo:onboarding-done";

// O onboarding aparece só na primeira vez. O storage pode falhar (aba privada, dados bloqueados):
// nesse caso a pessoa só vê o onboarding de novo, sem erro.
export function hasSeenOnboarding() {
	try {
		return localStorage.getItem(KEY) === "1";
	} catch {
		return false;
	}
}

export function markOnboardingDone() {
	try {
		localStorage.setItem(KEY, "1");
	} catch {}
}
