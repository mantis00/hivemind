// 'use client'

// import { useParams } from 'next/navigation'
// import { generateQrCsv } from '@/hooks/use-generate-qr-csv'

// export default function ExportQR({ orgId }: {orgId: string}) {
//   const params = useParams()
//   const orgId = params.orgId as string

//   const handleExport = async () => {
//     await generateQrCsv(orgId)
//   }

//   return (
//     <button
//       onClick={handleExport}
//       className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
//     >
//       Export QR CSV
//     </button>
//   )
// }

'use client'

import { useParams } from 'next/navigation'
import { generateQrCsv } from '@/hooks/use-generate-qr-csv'

export default function ExportQR() {
	const params = useParams()

	console.log('Params:', params)

	const orgId = params?.orgId as string

	const handleExport = async () => {
		console.log('Exporting with orgId:', orgId)

		if (!orgId) {
			console.error('orgId is undefined')
			return
		}

		await generateQrCsv(orgId)
	}

	return (
		<button onClick={handleExport} className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'>
			Export QR CSV
		</button>
	)
}
