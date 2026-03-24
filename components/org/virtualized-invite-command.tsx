'use client'
'use no memo'

import React, { useEffect } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Check } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'

export type InviteOption = {
	value: string
	label: string
	email: string
}

interface VirtualizedInviteCommandProps {
	height: string
	options: InviteOption[]
	placeholder: string
	selectedOption: string
	onSelectOption?: (option: string) => void
}

const FALLBACK_ROW_HEIGHT = 44

export function VirtualizedInviteCommand({
	height,
	options,
	placeholder,
	selectedOption,
	onSelectOption
}: VirtualizedInviteCommandProps) {
	const [filteredOptions, setFilteredOptions] = React.useState<InviteOption[]>(options)
	const [focusedIndex, setFocusedIndex] = React.useState(-1)
	const [hoveredIndex, setHoveredIndex] = React.useState(-1)
	const [isKeyboardNavActive, setIsKeyboardNavActive] = React.useState(false)

	const parentRef = React.useRef<HTMLDivElement | null>(null)

	const virtualizer = useVirtualizer({
		count: filteredOptions.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => FALLBACK_ROW_HEIGHT,
		overscan: 6
	})

	const virtualOptions = virtualizer.getVirtualItems()

	const scrollToIndex = (index: number) => {
		virtualizer.scrollToIndex(index, {
			align: 'center'
		})
	}

	const handleSearch = (search: string) => {
		setIsKeyboardNavActive(false)
		setHoveredIndex(-1)
		const normalizedSearch = search.trim().toLowerCase()
		if (!normalizedSearch) {
			setFilteredOptions(options)
			return
		}

		setFilteredOptions(
			options.filter((option) => {
				const label = option.label.toLowerCase()
				const email = option.email.toLowerCase()
				return label.includes(normalizedSearch) || email.includes(normalizedSearch)
			})
		)
	}

	const handleKeyDown = (event: React.KeyboardEvent) => {
		switch (event.key) {
			case 'ArrowDown': {
				event.preventDefault()
				setIsKeyboardNavActive(true)
				setFocusedIndex((prev) => {
					const newIndex = prev === -1 ? 0 : Math.min(prev + 1, filteredOptions.length - 1)
					scrollToIndex(newIndex)
					return newIndex
				})
				break
			}
			case 'ArrowUp': {
				event.preventDefault()
				setIsKeyboardNavActive(true)
				setFocusedIndex((prev) => {
					const newIndex = prev === -1 ? filteredOptions.length - 1 : Math.max(prev - 1, 0)
					scrollToIndex(newIndex)
					return newIndex
				})
				break
			}
			case 'Enter': {
				event.preventDefault()
				if (filteredOptions[focusedIndex]) {
					onSelectOption?.(filteredOptions[focusedIndex].value)
				}
				break
			}
			default:
				break
		}
	}

	useEffect(() => {
		setFilteredOptions(options)
		if (!selectedOption) {
			setFocusedIndex(-1)
			return
		}

		const selectedIndex = options.findIndex((entry) => entry.value === selectedOption)
		setFocusedIndex(selectedIndex >= 0 ? selectedIndex : -1)
	}, [options, selectedOption])

	useEffect(() => {
		if (selectedOption) {
			const option = filteredOptions.find((entry) => entry.value === selectedOption)
			if (option) {
				const index = filteredOptions.indexOf(option)
				setFocusedIndex(index)
				virtualizer.scrollToIndex(index, {
					align: 'center'
				})
			}
		}
	}, [selectedOption, filteredOptions, virtualizer])

	return (
		<Command shouldFilter={false} onKeyDown={handleKeyDown}>
			<CommandInput onValueChange={handleSearch} placeholder={placeholder} />
			<CommandList
				ref={parentRef}
				style={{
					height,
					width: '100%',
					overflow: 'auto'
				}}
				onMouseDown={() => {
					setIsKeyboardNavActive(false)
					setHoveredIndex(-1)
				}}
				onMouseMove={() => setIsKeyboardNavActive(false)}
				onMouseLeave={() => setHoveredIndex(-1)}
			>
				<CommandEmpty>No eligible users found.</CommandEmpty>
				<CommandGroup>
					<div
						style={{
							height: `${virtualizer.getTotalSize()}px`,
							width: '100%',
							position: 'relative'
						}}
					>
						{virtualOptions.map((virtualOption) => {
							const option = filteredOptions[virtualOption.index]
							if (!option) return null

							const isHighlighted = isKeyboardNavActive
								? focusedIndex === virtualOption.index
								: hoveredIndex === virtualOption.index

							return (
								<CommandItem
									key={option.value}
									disabled={isKeyboardNavActive}
									className={cn(
										'absolute left-0 top-0 w-full bg-transparent data-[selected=true]:bg-transparent data-[selected=true]:text-foreground aria-selected:bg-transparent aria-selected:text-foreground',
										isHighlighted && 'bg-accent! text-accent-foreground!',
										isKeyboardNavActive &&
											focusedIndex !== virtualOption.index &&
											'aria-selected:bg-transparent aria-selected:text-primary'
									)}
									style={{
										height: `${virtualOption.size}px`,
										transform: `translateY(${virtualOption.start}px)`
									}}
									value={option.value}
									onMouseEnter={() => !isKeyboardNavActive && setHoveredIndex(virtualOption.index)}
									onMouseLeave={() => !isKeyboardNavActive && setHoveredIndex(-1)}
									onSelect={onSelectOption}
								>
									<Check
										className={cn('mr-2 h-4 w-4', selectedOption === option.value ? 'opacity-100' : 'opacity-0')}
									/>
									<div className='flex min-w-0 flex-col'>
										<span className='truncate'>{option.label || '—'}</span>
										<span className='truncate text-xs text-muted-foreground'>{option.email || '—'}</span>
									</div>
								</CommandItem>
							)
						})}
					</div>
				</CommandGroup>
			</CommandList>
		</Command>
	)
}
