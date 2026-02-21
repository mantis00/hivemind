export type ReportSummary = {
	id: string
	title: string
	overdueTasks: number
	notesAdded: number
	speciesAdded: number
	enclosuresAdded: number
	criticalAlerts: number
}

export type ReportDetail = {
	id: string
	title: string
	subtitle: string
	sections: { title: string; items: string[] }[]
}
