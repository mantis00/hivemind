'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogBody,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog-to-drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlusIcon, LoaderCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useCreateOrg } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'

export function CreateOrgButton() {
	const [open, setOpen] = useState(false)
	const [name, setName] = useState('')
	const { data: user } = useCurrentClientUser()
	const createOrgMutation = useCreateOrg()

	useEffect(() => {
		const handleResize = () => {
			const dialogElement = document.querySelector('[data-slot="dialog-content"]') as HTMLElement
			if (dialogElement) {
				dialogElement.style.transform = 'translateY(0)'
			}
		}

		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!user?.id) return

		createOrgMutation.mutate(
			{ name, userId: user.id },
			{
				onSuccess: () => {
					setOpen(false)
					setName('')
				}
			}
		)
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant='secondary'>
					Create Organization <PlusIcon className='w-4 h-4' />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Create Organization</DialogTitle>
						<DialogDescription>Create a new organization. You will be set as the owner.</DialogDescription>
					</DialogHeader>
					<DialogBody>
						<div className='grid gap-4 py-4'>
							<div className='grid gap-2'>
								<Label>Organization Name</Label>
								<Input
									id='name'
									placeholder='My Organization'
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
									disabled={createOrgMutation.isPending}
								/>
							</div>
						</div>
					</DialogBody>
					<DialogFooter>
						<DialogClose asChild>
							<Button type='button' variant='outline' disabled={createOrgMutation.isPending}>
								Close
							</Button>
						</DialogClose>
						<Button type='submit' disabled={createOrgMutation.isPending || !user}>
							{createOrgMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Create Organization'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
