export function getOrgIdFromPathname(pathname: string | null): string | null {
	const orgMatch = pathname?.match(
		/^\/protected\/orgs\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/
	)
	return orgMatch?.[1] ?? null
}
