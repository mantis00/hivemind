// 'use client'

// import * as React from 'react'
// import { useState } from 'react'
// import { Button } from '@/components/ui/button'
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
// import { CreateTaskDialogue } from '@/components/tasks/form-create'

// export function TaskDropdownMenu() {
// 	// const router = useRouter()
// 	const [isDialogOpen, setIsDialogOpen] = useState(false)

// 	return (
// 		<>
// 			<DropdownMenu>
// 				<DropdownMenuTrigger asChild>
// 					<Button
// 						// variant='default'
// 						className='justify-center h-8 px-8 text-lg text-bg-black min-w-[360px bg-green-300 hover:bg-emerald-600'
// 					>
// 						Open Menu
// 					</Button>
// 				</DropdownMenuTrigger>

// 				<DropdownMenuContent>
// 					<DropdownMenuItem
// 						onSelect={(e) => {
// 							e.preventDefault()
// 							//   setTimeout(() => {
// 							setIsDialogOpen(true)
// 							//   }, 0);
// 						}}
// 					>
// 						Create Task
// 					</DropdownMenuItem>

// 					<DropdownMenuItem>
// 						<CreateTaskDialogue
// 							open={false}
// 							setOpen={function (): void {
// 								throw new Error('Function not implemented.')
// 							}}
// 						/>
// 					</DropdownMenuItem>

// 					<DropdownMenuItem>
// 						<CaseHistoryDialogue />
// 					</DropdownMenuItem>

// 					<DropdownMenuItem>
// 						<CaseHistoryDialogue />
// 					</DropdownMenuItem>

// 					<DropdownMenuItem>
// 						<CaseHistoryDialogue />
// 					</DropdownMenuItem>

// 					<DropdownMenuItem>
// 						<CaseHistoryDialogue />
// 					</DropdownMenuItem>
// 				</DropdownMenuContent>
// 			</DropdownMenu>

// 			<CreateTaskDialogue open={isDialogOpen} setOpen={setIsDialogOpen} />
// 		</>
// 	)
// }
