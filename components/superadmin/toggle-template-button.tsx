'use client'

import { LoaderCircle, PowerIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useToggleTaskTemplate } from '@/lib/react-query/mutations'
import type { Species, TaskTemplate } from '@/lib/react-query/queries'

interface ToggleTemplateButtonProps {
	template: TaskTemplate
	species: Species
}

export function ToggleTemplateButton({ template, species }: ToggleTemplateButtonProps) {
	const toggleTemplate = useToggleTaskTemplate()

	const handleToggle = () => {
		toggleTemplate.mutate(
			{ templateId: template.id, speciesId: species.id, is_active: !template.is_active },
			{ onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update template') }
		)
	}

	return (
		<Button
			type='button'
			variant={template.is_active ? 'destructive' : 'secondary'}
			size='xs'
			onClick={handleToggle}
			disabled={toggleTemplate.isPending}
		>
			{toggleTemplate.isPending ? <LoaderCircle className='h-3 w-3 animate-spin' /> : <PowerIcon className='h-3 w-3' />}
			{template.is_active ? 'Disable' : 'Enable'}
		</Button>
	)
}
