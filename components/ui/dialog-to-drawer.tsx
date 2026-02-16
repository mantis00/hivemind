'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/use-media-query'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger
} from '@/components/ui/drawer'

interface BaseProps {
	children: React.ReactNode
}

interface RootCredenzaProps extends BaseProps {
	open?: boolean
	onOpenChange?: (open: boolean) => void
}

interface CredenzaProps extends BaseProps {
	className?: string
	asChild?: true
	[key: string]: unknown
}

const CredenzaContext = React.createContext<{ isDesktop: boolean }>({
	isDesktop: false
})

const useCredenzaContext = () => {
	const context = React.useContext(CredenzaContext)
	if (!context) {
		throw new Error('Credenza components cannot be rendered outside the Credenza Context')
	}
	return context
}

const Credenza = ({ children, ...props }: RootCredenzaProps) => {
	const isDesktop = useMediaQuery('(min-width: 768px)')
	const Component = isDesktop ? Dialog : Drawer

	React.useEffect(() => {
		const handleResize = () => {
			const dialogElement = document.querySelector('[data-slot="dialog-content"]') as HTMLElement
			if (dialogElement) {
				dialogElement.style.transform = 'translateY(0)'
			}
		}

		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [])

	return (
		<CredenzaContext.Provider value={{ isDesktop }}>
			<Component {...props}>{children}</Component>
		</CredenzaContext.Provider>
	)
}

const CredenzaTrigger = ({ className, children, ...props }: CredenzaProps) => {
	const { isDesktop } = useCredenzaContext()
	const [mounted, setMounted] = React.useState(false)

	React.useEffect(() => {
		setMounted(true)
	}, [])

	if (!mounted) {
		return null
	}

	const Component = isDesktop ? DialogTrigger : DrawerTrigger

	return (
		<Component className={className} {...props}>
			{children}
		</Component>
	)
}

const CredenzaClose = ({ className, children, ...props }: CredenzaProps) => {
	const { isDesktop } = useCredenzaContext()
	const Component = isDesktop ? DialogClose : DrawerClose

	return (
		<Component className={className} {...props}>
			{children}
		</Component>
	)
}

const CredenzaContent = ({ className, children, ...props }: CredenzaProps) => {
	const { isDesktop } = useCredenzaContext()
	const contentRef = React.useRef<HTMLDivElement>(null)

	React.useEffect(() => {
		if (!isDesktop) {
			const updateHeight = () => {
				if (contentRef.current) {
					contentRef.current.style.height = `${window.innerHeight}px`
				}
			}

			updateHeight()
			window.addEventListener('resize', updateHeight)
			return () => window.removeEventListener('resize', updateHeight)
		}
	}, [isDesktop])

	if (isDesktop) {
		return (
			<DialogContent className={className} {...props}>
				{children}
			</DialogContent>
		)
	}

	return (
		<DrawerContent className={className} onOpenAutoFocus={(e) => e.preventDefault()} {...props}>
			<div ref={contentRef} className='overflow-y-auto'>
				{children}
			</div>
		</DrawerContent>
	)
}

const CredenzaDescription = ({ className, children, ...props }: CredenzaProps) => {
	const { isDesktop } = useCredenzaContext()
	const Component = isDesktop ? DialogDescription : DrawerDescription

	return (
		<Component className={className} {...props}>
			{children}
		</Component>
	)
}

const CredenzaHeader = ({ className, children, ...props }: CredenzaProps) => {
	const { isDesktop } = useCredenzaContext()
	const Component = isDesktop ? DialogHeader : DrawerHeader

	return (
		<Component className={className} {...props}>
			{children}
		</Component>
	)
}

const CredenzaTitle = ({ className, children, ...props }: CredenzaProps) => {
	const { isDesktop } = useCredenzaContext()
	const Component = isDesktop ? DialogTitle : DrawerTitle

	return (
		<Component className={className} {...props}>
			{children}
		</Component>
	)
}

const CredenzaBody = ({ className, children, ...props }: CredenzaProps) => {
	return (
		<div className={cn('px-4 md:px-0', className)} {...props}>
			{children}
		</div>
	)
}

const CredenzaFooter = ({ className, children, ...props }: CredenzaProps) => {
	const { isDesktop } = useCredenzaContext()
	const Component = isDesktop ? DialogFooter : DrawerFooter

	return (
		<Component className={className} {...props}>
			{children}
		</Component>
	)
}

export {
	Credenza as Dialog,
	CredenzaTrigger as DialogTrigger,
	CredenzaClose as DialogClose,
	CredenzaContent as DialogContent,
	CredenzaDescription as DialogDescription,
	CredenzaHeader as DialogHeader,
	CredenzaTitle as DialogTitle,
	CredenzaBody as DialogBody,
	CredenzaFooter as DialogFooter
}
