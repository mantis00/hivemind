'use client'

import * as React from 'react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/use-media-query'

interface ResponsiveDialogDrawerProps {
	title: string
	description: string
	trigger: React.ReactNode | null
	children: React.ReactNode
	className?: string
	footer?: React.ReactNode
	titleAction?: React.ReactNode
	open?: boolean
	onOpenChange?: (isOpen: boolean) => void
}

export function ResponsiveDialogDrawer({
	title,
	description,
	trigger,
	children,
	className,
	footer,
	titleAction,
	open: controlledOpen,
	onOpenChange
}: ResponsiveDialogDrawerProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
	const [mounted, setMounted] = React.useState(false)
	const isDesktop = useMediaQuery('(min-width: 768px)')

	React.useEffect(() => {
		setMounted(true)
	}, [])

	const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen
	const setOpen = controlledOpen !== undefined ? onOpenChange : setUncontrolledOpen // Updated to use onOpenChange if provided

	if (!mounted) {
		return null
	}

	if (isDesktop) {
		return (
			<Dialog open={open} onOpenChange={setOpen}>
				{trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
				<DialogContent className={cn('sm:max-w-[425px] p-6 rounded-2xl', className)}>
					<DialogHeader>
						<div className='flex items-center gap-2 pr-6'>
							<DialogTitle className='flex-1'>{title}</DialogTitle>
							{titleAction}
						</div>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>
					{children}
					{footer && <DialogFooter>{footer}</DialogFooter>}
				</DialogContent>
			</Dialog>
		)
	}

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			{trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
			<DrawerContent className={cn('w-full px-4 pb-6', className)}>
				<DrawerHeader className='text-left pt-5 pb-2'>
					<div className='flex items-center gap-2'>
						<DrawerTitle className='flex-1'>{title}</DrawerTitle>
						{titleAction}
					</div>
					<DrawerDescription>{description}</DrawerDescription>
				</DrawerHeader>
				{children}
				{footer && <DrawerFooter>{footer}</DrawerFooter>}
			</DrawerContent>
		</Drawer>
	)
}
