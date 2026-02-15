export default function OfflinePage() {
	return (
		<div className='flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center'>
			<h1 className='text-4xl font-bold'>You are offline</h1>
			<p className='text-lg text-muted-foreground'>
				It looks like you&apos;ve lost your internet connection. Please check your connection and try again.
			</p>
		</div>
	)
}
