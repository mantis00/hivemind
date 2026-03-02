export default function getPriorityLevelStatus(priorityLevel: string) {
	switch (priorityLevel) {
		case 'high':
			return 'URGENT'
		case 'medium':
			return 'LATE'
		case 'low':
			return 'TO-DO'
	}
}
