'use client'

import * as React from 'react'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Bug, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useCreateFeedback } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { usePathname } from 'next/navigation'
import { getOrgIdFromPathname } from '@/context/verify-org-path'
import { type UUID } from 'crypto'

type FeedbackType = 'bug' | 'feedback'

interface FeedbackDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
	const [type, setType] = React.useState<FeedbackType>('feedback')
	const [title, setTitle] = React.useState('')
	const [description, setDescription] = React.useState('')
	const [showSuccess, setShowSuccess] = React.useState(false)
	const createFeedbackMutation = useCreateFeedback()
	const { data: currentUser } = useCurrentClientUser()
	const pathname = usePathname()
	const orgId = getOrgIdFromPathname(pathname)

	const resetForm = () => {
		setType('feedback')
		setTitle('')
		setDescription('')
	}

	const handleSubmit = async () => {
		if (!title.trim() || !description.trim()) return
		const userId = currentUser?.id
		if (!userId || !orgId) {
			toast.error('Unable to submit feedback', {
				description: 'Missing user or organization context.'
			})
			return
		}
		createFeedbackMutation.mutate(
			{
				type,
				title: title.trim(),
				description: description.trim(),
				userId,
				orgId: orgId as UUID
			},
			{
				onSuccess: () => {
					setShowSuccess(true)
					toast.success(type === 'bug' ? 'Bug report submitted!' : 'Feedback submitted!', {
						description: 'Thank you for helping us improve.'
					})
					setTimeout(() => {
						resetForm()
						onOpenChange(false)
						setShowSuccess(false)
					}, 1200)
				},
				onError: (error) => {
					toast.error('Failed to submit', {
						description: 'Please try again later.'
					})
					console.error('Failed to submit feedback:', error)
				}
			}
		)
	}

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen && !createFeedbackMutation.isPending) {
			resetForm()
			setShowSuccess(false)
		}
		onOpenChange(isOpen)
	}

	const isValid = title.trim().length > 0 && description.trim().length > 0

	const feedbackOptions = [
		{
			type: 'bug' as const,
			label: 'Bug Report',
			description: 'Report an issue',
			icon: Bug
		},
		{
			type: 'feedback' as const,
			label: 'Feedback',
			description: 'Share your thoughts',
			icon: MessageSquare
		}
	]

	return (
		<ResponsiveDialogDrawer
			open={open}
			onOpenChange={handleOpenChange}
			trigger={null}
			title={type === 'bug' ? 'Report a Bug' : 'Send Feedback'}
			description={
				type === 'bug'
					? 'Help us improve by reporting issues you encounter.'
					: 'Share your thoughts and suggestions with us.'
			}
			footer={
				<div className='flex flex-col-reverse sm:flex-row gap-2 sm:justify-end w-full'>
					<Button
						variant='outline'
						onClick={() => handleOpenChange(false)}
						disabled={createFeedbackMutation.isPending}
						className='sm:w-auto'
					>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={!isValid || createFeedbackMutation.isPending || showSuccess}
						className='sm:w-auto min-w-28'
					>
						{showSuccess ? (
							<>
								<CheckCircle2 className='size-4' />
								Sent!
							</>
						) : createFeedbackMutation.isPending ? (
							<>
								<Loader2 className='size-4 animate-spin' />
								Sending...
							</>
						) : (
							'Submit'
						)}
					</Button>
				</div>
			}
		>
			<div className='flex flex-col gap-5 py-2'>
				{/* Type Selection */}
				<div className='flex flex-col gap-2.5'>
					<Label className='text-sm font-medium'>Type</Label>
					<div className='grid grid-cols-2 gap-3'>
						{feedbackOptions.map((option) => {
							const Icon = option.icon
							const isSelected = type === option.type
							return (
								<button
									key={option.type}
									type='button'
									onClick={() => setType(option.type)}
									disabled={createFeedbackMutation.isPending}
									className={cn(
										'flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all duration-200',
										'hover:border-primary/50 hover:bg-accent/50',
										'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
										'disabled:opacity-50 disabled:cursor-not-allowed',
										isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background'
									)}
								>
									<div
										className={cn(
											'flex items-center justify-center size-10 rounded-full transition-colors',
											isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
										)}
									>
										<Icon className='size-5' />
									</div>
									<div className='text-center'>
										<p
											className={cn(
												'text-sm font-medium transition-colors',
												isSelected ? 'text-foreground' : 'text-muted-foreground'
											)}
										>
											{option.label}
										</p>
										<p className='text-xs text-muted-foreground mt-0.5 hidden sm:block'>{option.description}</p>
									</div>
								</button>
							)
						})}
					</div>
				</div>

				{/* Title Input */}
				<div className='flex flex-col gap-2'>
					<Label htmlFor='feedback-title' className='text-sm font-medium'>
						{type === 'bug' ? 'What went wrong?' : 'Subject'}
					</Label>
					<input
						id='feedback-title'
						type='text'
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder={type === 'bug' ? 'Brief summary of the issue' : 'What is your feedback about?'}
						className={cn(
							'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-base md:text-sm',
							'ring-offset-background placeholder:text-muted-foreground',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
							'disabled:cursor-not-allowed disabled:opacity-50',
							'transition-colors'
						)}
						disabled={createFeedbackMutation.isPending}
						maxLength={100}
					/>
				</div>

				{/* Description Textarea */}
				<div className='flex flex-col gap-2'>
					<Label htmlFor='feedback-description' className='text-sm font-medium'>
						{type === 'bug' ? 'Steps to reproduce' : 'Details'}
					</Label>
					<Textarea
						id='feedback-description'
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder={
							type === 'bug'
								? 'Please describe the steps that led to this issue...'
								: 'Share your thoughts, suggestions, or ideas...'
						}
						rows={4}
						className='resize-none rounded-lg text-base md:text-sm'
						disabled={createFeedbackMutation.isPending}
						maxLength={1000}
					/>
					<div className='flex justify-between items-center'>
						<p className='text-xs text-muted-foreground'>
							{type === 'bug'
								? 'Include any relevant details that might help us fix the issue.'
								: 'Your feedback helps us improve the experience for everyone.'}
						</p>
						<span className='text-xs text-muted-foreground tabular-nums'>{description.length}/1000</span>
					</div>
				</div>
			</div>
		</ResponsiveDialogDrawer>
	)
}
