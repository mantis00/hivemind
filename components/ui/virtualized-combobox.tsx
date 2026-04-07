'use client'

import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Check, ChevronsUpDown } from 'lucide-react'
import * as React from 'react'

export type VirtualizedOption = {
	value: string
	label: string
	subLabel?: string
}

interface VirtualizedCommandProps {
	height: string
	options: VirtualizedOption[]
	placeholder: string
	selectedOption?: string
	onSelectOption?: (option: string) => void
	emptyMessage?: string
	rowHeight?: number
}

const FALLBACK_ROW_HEIGHT = 44

export function VirtualizedCommand({
	height,
	options,
	placeholder,
	selectedOption = '',
	onSelectOption,
	emptyMessage = 'No item found.',
	rowHeight = FALLBACK_ROW_HEIGHT
}: VirtualizedCommandProps) {
	const [filteredOptions, setFilteredOptions] = React.useState<VirtualizedOption[]>(options)
	const [focusedIndex, setFocusedIndex] = React.useState(-1)
	const [hoveredIndex, setHoveredIndex] = React.useState(-1)
	const [isKeyboardNavActive, setIsKeyboardNavActive] = React.useState(false)

	const parentRef = React.useRef<HTMLDivElement | null>(null)

	// eslint-disable-next-line
	const virtualizer = useVirtualizer({
		count: filteredOptions.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => rowHeight,
		overscan: 6
	})

	const virtualOptions = virtualizer.getVirtualItems()
	const parsedHeight = Number.parseInt(height, 10)
	const maxHeight = Number.isFinite(parsedHeight) ? parsedHeight : 400
	const listHeight = Math.min(
		Math.max(virtualizer.getTotalSize(), rowHeight * (filteredOptions.length > 0 ? 1 : 1.4)),
		maxHeight
	)

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
				const subLabel = option.subLabel?.toLowerCase() ?? ''
				const value = option.value.toLowerCase()
				return (
					label.includes(normalizedSearch) || subLabel.includes(normalizedSearch) || value.includes(normalizedSearch)
				)
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

	React.useEffect(() => {
		setFilteredOptions(options)
		if (!selectedOption) {
			setFocusedIndex(-1)
			return
		}

		const selectedIndex = options.findIndex((entry) => entry.value === selectedOption)
		setFocusedIndex(selectedIndex >= 0 ? selectedIndex : -1)
	}, [options, selectedOption])

	React.useEffect(() => {
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
					height: `${listHeight}px`,
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
				<CommandEmpty>{emptyMessage}</CommandEmpty>
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
									{option.subLabel ? (
										<div className='flex min-w-0 flex-col'>
											<span className='truncate'>{option.label || '—'}</span>
											<span className='truncate text-xs text-muted-foreground'>{option.subLabel}</span>
										</div>
									) : (
										<span className='w-75 truncate'>{option.label || '—'}</span>
									)}
								</CommandItem>
							)
						})}
					</div>
				</CommandGroup>
			</CommandList>
		</Command>
	)
}

interface VirtualizedComboboxProps {
	options: string[]
	searchPlaceholder?: string
	width?: string
	height?: string
}

export function VirtualizedCombobox({
	options,
	searchPlaceholder = 'Search items...',
	width = '400px',
	height = '400px'
}: VirtualizedComboboxProps) {
	const [open, setOpen] = React.useState(false)
	const [selectedOption, setSelectedOption] = React.useState('')

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					role='combobox'
					aria-expanded={open}
					className='justify-between'
					style={{
						width: width
					}}
				>
					<span className='truncate'>
						{selectedOption ? options.find((option) => option === selectedOption) : searchPlaceholder}
					</span>
					<ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
				</Button>
			</PopoverTrigger>
			<PopoverContent className='p-0' style={{ width: width }}>
				<VirtualizedCommand
					height={height}
					options={options.map((option) => ({ value: option, label: option }))}
					placeholder={searchPlaceholder}
					selectedOption={selectedOption}
					emptyMessage='No item found.'
					onSelectOption={(currentValue) => {
						setSelectedOption(currentValue === selectedOption ? '' : currentValue)
						setOpen(false)
					}}
				/>
			</PopoverContent>
		</Popover>
	)
}
