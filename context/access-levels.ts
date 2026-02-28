export default function getAccessLevelName(accessLevel: number) {
	switch (accessLevel) {
		case 1:
			return 'Caretaker'
		case 2:
			return 'Owner'
		case 3:
			return 'Superadmin'
		default:
			return 'Caretaker'
	}
}
