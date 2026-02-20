// 'use client'

// import { Button } from '@/components/ui/button'
// import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
// import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend } from '@/components/ui/field'
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// import { ScrollArea } from '@/components/ui/scroll-area'
// import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog'
// import { Input } from '@/components/ui/input'
// import { LoaderCircle } from 'lucide-react'
// import { useRouter } from 'next/navigation'
// import { useState } from 'react'
// import { useCreateOrg } from '@/lib/react-query/mutations'
// import { useCurrentUser } from '@/lib/react-query/auth'
// import { MultiCondInput } from '../multi-input-cond-create'

// export function CreateTaskDialogue({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
// 	const [schedule, setSchedule] = useState('')
// 	const isCustom = schedule === 'Custom'
// 	// const [open, setOpen] = useState(false)
// 	const [name, setName] = useState('')
// 	const router = useRouter()
// 	const { data: user } = useCurrentUser()
// 	const createTask = useCreateOrg()
// 	const [multiConds, setMultiConds] = useState<string[]>([])
// 	const [cond, setCond] = useState('No')
// 	const isYes = cond === 'Yes'

// 	const handleSubmit = async (e: React.FormEvent) => {
// 		e.preventDefault()
// 		if (!user?.id) return

// 		createTask.mutate(
// 			{ name, userId: user.id },
// 			{
// 				onSuccess: () => {
// 					setOpen(false)
// 					setName('')
// 					router.refresh()
// 				}
// 			}
// 		)
// 	}

// 	return (
// 		<Dialog open={open} onOpenChange={setOpen}>
// 			<DialogContent>
// 				<form onSubmit={handleSubmit} className='my-auto'>
// 					<DialogTitle className='mb-2'> Create Task </DialogTitle>
// 					<FieldGroup>
// 						<ScrollArea className=' h-[400px] w-[465px] rounded-md border'>
// 							<div className='pl-5 pr-5'>
// 								<Field>
// 									<FieldLabel htmlFor='form-name' className='mt-5'>
// 										Task Name{<span className='text-destructive'>*</span>}
// 									</FieldLabel>
// 									<Input className='ml-5' id='form-name' type='text' placeholder='Enter title/task name' required />
// 								</Field>

// 								<FieldSet className='mt-5'>
// 									<FieldLegend variant='label'>Schedule {<span className='text-destructive'>*</span>}</FieldLegend>
// 									<RadioGroup className='ml-5' value={schedule} onValueChange={setSchedule}>
// 										<Field orientation='horizontal'>
// 											<RadioGroupItem value='daily' id='schedule-daily' />
// 											<FieldLabel htmlFor='schedule-monthly' className='font-normal'>
// 												Daily
// 											</FieldLabel>
// 										</Field>
// 										<Field orientation='horizontal'>
// 											<RadioGroupItem value='weekly' id='schedule-weekly' />
// 											<FieldLabel htmlFor='schedule-weekly' className='font-normal'>
// 												Weekly
// 											</FieldLabel>
// 										</Field>
// 										<Field orientation='horizontal'>
// 											<RadioGroupItem value='monthly' id='schedule-monthly' />
// 											<FieldLabel htmlFor='schedule-monthly' className='font-normal'>
// 												Monthly
// 											</FieldLabel>
// 										</Field>
// 										<Field orientation='horizontal'>
// 											<RadioGroupItem value='yearly' id='schedule-yearly' />
// 											<FieldLabel htmlFor='schedule-yearly' className='font-normal'>
// 												Yearly
// 											</FieldLabel>
// 										</Field>
// 										<Field orientation='horizontal'>
// 											<RadioGroupItem value='Custom' id='schedule-custom' />
// 											<FieldLabel htmlFor='schedule-custom' className='font-normal'>
// 												Custom
// 											</FieldLabel>
// 										</Field>
// 									</RadioGroup>
// 								</FieldSet>

// 								<div className={`grid grid-cols-2 gap-4 mt-5 ml-5 ${!isCustom && 'opacity-100 pointer-events-none'}`}>
// 									<Field>
// 										<FieldLabel htmlFor='form-every-custom'>
// 											Every {isCustom && <span className='text-destructive'>*</span>}
// 										</FieldLabel>
// 										<Input
// 											id='form-every-custom'
// 											type='number'
// 											min='1'
// 											placeholder='2'
// 											required={isCustom}
// 											disabled={!isCustom}
// 										/>
// 									</Field>
// 									<Field>
// 										<FieldLabel htmlFor='form-unit'>
// 											Unit {isCustom && <span className='text-destructive'>*</span>}{' '}
// 										</FieldLabel>
// 										<Select disabled={!isCustom} required>
// 											<SelectTrigger id='form-unit'>
// 												<SelectValue placeholder='Days' />
// 											</SelectTrigger>
// 											<SelectContent>
// 												<SelectItem value='D'>Days</SelectItem>
// 												<SelectItem value='W'>Weeks</SelectItem>
// 												<SelectItem value='M'>Months</SelectItem>
// 											</SelectContent>
// 										</Select>
// 									</Field>
// 								</div>

// 								<FieldLegend variant='label' className='mt-5'>
// 									Expected Duration {<span className='text-destructive'>*</span>}
// 								</FieldLegend>

// 								<div className={`grid grid-cols-2 gap-4 -100 ml-5`}>
// 									<Field>
// 										<FieldLabel htmlFor='form-every-custom'>
// 											Takes {<span className='text-destructive'>*</span>}
// 										</FieldLabel>
// 										<Input id='form-every-custom' type='number' min='1' placeholder='3' required />
// 									</Field>
// 									<Field>
// 										<FieldLabel htmlFor='form-unit'>Unit {<span className='text-destructive'>*</span>}</FieldLabel>
// 										<Select required>
// 											<SelectTrigger id='form-unit'>
// 												<SelectValue placeholder='hours' />
// 											</SelectTrigger>
// 											<SelectContent>
// 												<SelectItem value='min'>Minutes</SelectItem>
// 												<SelectItem value='hrs'>Hours</SelectItem>
// 											</SelectContent>
// 										</Select>
// 									</Field>
// 								</div>

// 								<FieldSet className='w-full max-w-xs mt-5'>
// 									<FieldLegend variant='label'>
// 										Special Conditions {<span className='text-destructive'>*</span>}
// 									</FieldLegend>
// 									<RadioGroup className='ml-5' defaultValue='No' value={cond} onValueChange={setCond} required>
// 										<Field orientation='horizontal'>
// 											<RadioGroupItem value='No' id='cond-no' />
// 											<FieldLabel htmlFor='cond-no' className='font-normal'>
// 												No
// 											</FieldLabel>
// 											<RadioGroupItem value='Yes' id='cond-yes' />
// 											<FieldLabel htmlFor='cond-yes' className='font-normal'>
// 												Yes
// 											</FieldLabel>
// 										</Field>
// 									</RadioGroup>

// 									<div className='ml-5'>
// 										<Field>
// 											<FieldLabel> Conditions{isYes && <span className='text-destructive'>*</span>}</FieldLabel>
// 										</Field>
// 									</div>

// 									<div className={`grid grid-cols-2 gap-1 ml-5 ${!isYes && 'opacity-100 pointer-events-none'}`}>
// 										<Field>
// 											<FieldDescription>Press enter or use commas to separate multiple skills.</FieldDescription>
// 										</Field>
// 										{/* <Field className = "ml-5 " > */}
// 										<Field>
// 											<MultiCondInput value={multiConds} onChange={setMultiConds} />
// 											{/* </Field> */}
// 										</Field>
// 									</div>
// 								</FieldSet>
// 							</div>
// 						</ScrollArea>
// 					</FieldGroup>
// 					<DialogFooter className='mt-3'>
// 						<Button type='button' variant='outline' onClick={() => setOpen(false)} disabled={createTask.isPending}>
// 							Cancel
// 						</Button>
// 						<Button type='submit' disabled={createTask.isPending || !user}>
// 							{createTask.isPending ? <LoaderCircle className='animate-spin' /> : 'Create Task'}
// 						</Button>
// 					</DialogFooter>
// 				</form>
// 			</DialogContent>
// 		</Dialog>
// 	)
// }