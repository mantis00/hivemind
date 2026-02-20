'use client'

import * as React from 'react'
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Card, CardContent } from '../ui/card'
import { useState } from 'react'
import { Bug, ChevronRight, FlaskConical } from 'lucide-react'
import { Badge } from '../ui/badge'
import { type Enclosure, useEnclosureIdPriority } from '@/lib/react-query/queries'
import { useParams } from 'next/navigation'
import getPrioritylevelStatus from '@/context/priority-levels'
export default function TasksCollapsible({ orgId, priority }: { orgId: number; priority: string }) {
	const params = useParams()
	// const orgId = params?.orgId as number | undefined

	const [isOpen, setIsOpen] = React.useState(false)

	const enclosureId = params?.enclosureId as number | undefined
	const { data } = useEnclosureIdPriority(enclosureId as number)

	// const { data: priority } = useEnclosureIdPriority(enclosureId as number);

	return (
		<>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<Card className='overflow-hidden'>
					<CollapsibleTrigger asChild>
						<button className='w-full text-left' type='button'>
							<CardContent className='p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors'>
								<ChevronRight
									className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
										isOpen ? 'rotate-90' : ''
									}`}
								/>
								<Bug className='h-5 w-5 shrink-0 text-muted-foreground' />
								<div className='flex-1 min-w-0'>
									<div className='flex items-center gap-2'>
										<p className='font-medium text-sm truncate'>
											{data?.map((priority) => (
												<TasksCollapsible
													priority={getPrioritylevelStatus(priority.priority) as string}
													orgId={orgId as number}
												/>
											))}
										</p>
										<Badge variant='outline' className='shrink-0 text-xs'>
											{useEnclosureIdPriority?.length}{' '}
											{useEnclosureIdPriority?.length === 1 ? 'enclosure' : 'enclosures'}
										</Badge>
									</div>
								</div>
								<FlaskConical className='h-4 w-4 shrink-0 text-muted-foreground' />
							</CardContent>
						</button>
					</CollapsibleTrigger>
				</Card>
			</Collapsible>
		</>
	)
}
