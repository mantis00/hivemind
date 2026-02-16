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
				<DialogContent className={cn('sm:max-w-[425px] p-6', className)}>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
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
			<DrawerContent className={cn('p-3', className)}>
				<DrawerHeader className='text-left pt-6'>
					<DrawerTitle>{title}</DrawerTitle>
					<DrawerDescription>{description}</DrawerDescription>
				</DrawerHeader>
				{children}
				{footer && <DrawerFooter>{footer}</DrawerFooter>}
			</DrawerContent>
		</Drawer>
	)
}
