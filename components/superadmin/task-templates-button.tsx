'use client'

import { useState } from 'react'
import { ClipboardListIcon, PlusIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { useTaskTemplatesForSpecies, type Species } from '@/lib/react-query/queries'
import { EditTaskCard } from './edit-task-card'
import { CreateTaskTemplateCard } from './create-task-template-card'

// ─── Types ────────────────────────────────────────────────────────────────────

type View = 'list' | 'create'

// ─── Main Component ───────────────────────────────────────────────────────────

interface TaskTemplatesButtonProps {
	species: Species
	usedTypes?: string[]
}

export function TaskTemplatesButton({ species, usedTypes = [] }: TaskTemplatesButtonProps) {
	const [open, setOpen] = useState(false)
	const [view, setView] = useState<View>('list')

	const { data: templates, isLoading } = useTaskTemplatesForSpecies(species.id)
	const templateCount = templates?.length ?? 0

	// ── Navigation ────────────────────────────────────────────────────────────

	const goToList = () => setView('list')

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) goToList()
		setOpen(isOpen)
	}

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<ResponsiveDialogDrawer
			title={view === 'list' ? 'Task Templates' : 'New Template'}
			description={
				view === 'list' ? `${species.common_name} · ${species.scientific_name}` : `For ${species.common_name}`
			}
			className='sm:max-w-5xl'
			trigger={
				<Button size='sm' variant='outline'>
					<ClipboardListIcon className='h-3.5 w-3.5' />
					Templates
					{templateCount > 0 && (
						<Badge variant='secondary' className='ml-1 h-4 px-1.5 text-[10px]'>
							{templateCount}
						</Badge>
					)}
				</Button>
			}
			open={open}
			onOpenChange={handleOpenChange}
			footer={
				view === 'list' && (
					<div className='w-full'>
						<Button type='button' className='w-full' onClick={() => setView('create')}>
							<PlusIcon className='h-4 w-4' />
							New Template
						</Button>
					</div>
				)
			}
		>
			{/* ── List view ── */}
			{view === 'list' && (
				<div data-vaul-no-drag className='overflow-y-auto flex-1 min-h-0 space-y-2 pr-1'>
					{isLoading ? (
						<div className='space-y-2'>
							{[...Array(3)].map((_, i) => (
								<div key={i} className='rounded-lg border bg-muted/30 h-12 animate-pulse' />
							))}
						</div>
					) : templateCount === 0 ? (
						<div className='rounded-lg border border-dashed p-6 text-center'>
							<p className='text-sm text-muted-foreground'>No templates yet for this species.</p>
						</div>
					) : (
						templates!.map((template) => (
							<EditTaskCard
								key={template.id}
								template={template}
								species={species}
								allTemplateTypes={templates!.map((t) => t.type)}
							/>
						))
					)}
				</div>
			)}

			{/* ── Create view ── */}
			{view === 'create' && (
				<div data-vaul-no-drag className='overflow-y-auto flex-1 min-h-0 pr-1'>
					<CreateTaskTemplateCard
						species={species}
						usedTypes={templates?.map((t) => t.type) ?? usedTypes}
						onSuccess={goToList}
						onCancel={goToList}
					/>
				</div>
			)}
		</ResponsiveDialogDrawer>
	)
}
