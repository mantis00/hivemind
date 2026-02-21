'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SpeciesDetail } from './types'

export function SpeciesDetailPanel({ species }: { species: SpeciesDetail }) {
	return (
		<div className='rounded-xl border bg-muted/20 p-4 flex flex-col gap-4'>
			<div className='flex flex-wrap items-start justify-between gap-4'>
				<div>
					<h2 className='text-xl font-semibold'>{species.commonName}</h2>
					<p className='text-sm text-muted-foreground italic'>{species.scientificName}</p>
					<p className='text-xs text-muted-foreground'>
						Difficulty: {species.difficulty} | {species.grouping} | Origin: {species.origin}
					</p>
					home
				</div>
				<div className='flex h-28 w-28 items-center justify-center rounded-lg border bg-background text-xs text-muted-foreground'>
					species image
				</div>
			</div>

			<div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]'>
				<Card className='bg-background'>
					<CardHeader className='pb-2'>
						<CardTitle className='text-sm'>General Information</CardTitle>
					</CardHeader>
					<CardContent className='space-y-3 text-sm text-muted-foreground'>
						<ul className='list-disc pl-4'>
							{species.generalInfo.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
						<div>
							<div className='text-xs font-semibold text-foreground'>Environmental Requirements</div>
							<ul className='list-disc pl-4'>
								{species.environment.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						</div>
						<div>
							<div className='text-xs font-semibold text-foreground'>Diet & Feeding</div>
							<ul className='list-disc pl-4'>
								{species.diet.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						</div>
						<div>
							<div className='text-xs font-semibold text-foreground'>Breeding</div>
							<ul className='list-disc pl-4'>
								{species.breeding.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						</div>
					</CardContent>
				</Card>

				<div className='flex flex-col gap-3'>
					<Card className='bg-background'>
						<CardHeader className='pb-2'>
							<CardTitle className='text-sm'>Notes</CardTitle>
						</CardHeader>
						<CardContent className='text-sm text-muted-foreground'>
							<ul className='list-disc pl-4'>
								{species.notes.map((note) => (
									<li key={note}>{note}</li>
								))}
							</ul>
						</CardContent>
					</Card>
					<Button className='bg-sky-500 text-white hover:bg-sky-400'>Add Note</Button>
					<Button className='bg-red-500 text-white hover:bg-red-400'>Edit Species</Button>
				</div>
			</div>
		</div>
	)
}
