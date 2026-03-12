'use client'

import { useParams } from 'next/navigation'
import type { UUID } from 'crypto'

import { DashboardPage } from '@/components/features/dashboard/dashboard-page'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDashboardData } from '@/lib/react-query/queries'

export function DashboardShell() {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const { data, isLoading, loadError } = useDashboardData(orgId)

	if (isLoading) {
		return (
			<div className='mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
				{['Active Enclosures', 'Tasks Due Today', 'Upcoming Tasks', 'Alerts'].map((title) => (
					<section key={title} className='min-h-[136px] animate-pulse rounded-xl border bg-muted/20' />
				))}
			</div>
		)
	}

	if (!orgId) {
		return (
			<Card className='mx-auto w-full max-w-7xl border-destructive/30'>
				<CardHeader>
					<CardTitle>Dashboard Could Not Load</CardTitle>
					<CardDescription>Organization context is missing for this route.</CardDescription>
				</CardHeader>
				<CardContent className='text-sm text-muted-foreground'>Missing `orgId` route parameter.</CardContent>
			</Card>
		)
	}

	return <DashboardPage orgId={String(orgId)} data={data} loadError={loadError} />
}
