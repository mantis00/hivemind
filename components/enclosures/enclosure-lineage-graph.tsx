'use client'

import { useMemo, useCallback } from 'react'
import {
	ReactFlow,
	Background,
	Controls,
	Handle,
	Position,
	type Node,
	type Edge,
	MarkerType,
	useNodesState,
	useEdgesState,
	useReactFlow,
	ReactFlowProvider
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useOrgEnclosures, useOrgEnclosureLineage } from '@/lib/react-query/queries'
import { UUID } from 'crypto'
import { Loader2, Building2 } from 'lucide-react'

const NODE_W = 176
const NODE_H = 68
const H_GAP = 48
const V_GAP = 64

type EnclosureNode = {
	kind: 'enclosure'
	id: string
	name: string
	currentCount: number
	location?: string
	isFocus: boolean
	isInactive: boolean
	childrenCount?: number
}

type ExternalSourceNode = {
	kind: 'external'
	id: string
	sourceName: string
}

type GraphNode = EnclosureNode | ExternalSourceNode

function computeLayout(
	nodeMap: Map<string, GraphNode>,
	edges: { source: string; target: string }[],
	focusId: string
): { nodes: Node[]; edges: Edge[] } {
	// Build adjacency
	const children = new Map<string, string[]>()
	const parents = new Map<string, string[]>()
	for (const { source, target } of edges) {
		if (!children.has(source)) children.set(source, [])
		children.get(source)!.push(target)
		if (!parents.has(target)) parents.set(target, [])
		parents.get(target)!.push(source)
	}

	// BFS upward only — collect focus node and all ancestors
	const visited = new Set<string>()
	const queue: string[] = [focusId]
	while (queue.length > 0) {
		const id = queue.shift()!
		if (visited.has(id) || !nodeMap.has(id)) continue
		visited.add(id)
		for (const p of parents.get(id) ?? []) queue.push(p)
	}

	// Assign layers via longest-path BFS from roots so oldest ancestors are at top
	const layers = new Map<string, number>()
	const roots = [...visited].filter((id) => {
		const ps = parents.get(id) ?? []
		return ps.every((p) => !visited.has(p))
	})

	const bfsQueue: Array<[string, number]> = roots.map((r) => [r, 0])
	while (bfsQueue.length > 0) {
		const [id, layer] = bfsQueue.shift()!
		if (!visited.has(id)) continue
		if ((layers.get(id) ?? -1) >= layer) continue
		layers.set(id, layer)
		for (const c of children.get(id) ?? []) {
			if (visited.has(c)) bfsQueue.push([c, layer + 1])
		}
	}

	// Group by layer
	const byLayer = new Map<number, string[]>()
	for (const [id, layer] of layers) {
		if (!byLayer.has(layer)) byLayer.set(layer, [])
		byLayer.get(layer)!.push(id)
	}

	// Sort within each layer: focus node centered, others by name
	for (const [, ids] of byLayer) {
		ids.sort((a, b) => {
			if (a === focusId) return 0
			if (b === focusId) return 0
			const nameA = (n: GraphNode | undefined) => (n ? (n.kind === 'external' ? n.sourceName : n.name) : '')
			return nameA(nodeMap.get(a)).localeCompare(nameA(nodeMap.get(b)))
		})
	}

	// Compute canvas width for centering
	let maxLayerWidth = 0
	for (const [, ids] of byLayer) {
		const w = ids.length * NODE_W + (ids.length - 1) * H_GAP
		if (w > maxLayerWidth) maxLayerWidth = w
	}

	const positions = new Map<string, { x: number; y: number }>()
	for (const [layer, ids] of byLayer) {
		const layerW = ids.length * NODE_W + (ids.length - 1) * H_GAP
		const offsetX = (maxLayerWidth - layerW) / 2
		ids.forEach((id, i) => {
			positions.set(id, {
				x: offsetX + i * (NODE_W + H_GAP),
				y: layer * (NODE_H + V_GAP)
			})
		})
	}

	const rfNodes: Node[] = []
	for (const id of visited) {
		const node = nodeMap.get(id)
		if (!node) continue
		const pos = positions.get(id) ?? { x: 0, y: 0 }
		const sharedStyle = { width: NODE_W, padding: 0, border: 'none', background: 'transparent' }
		if (node.kind === 'external') {
			rfNodes.push({ id, position: pos, type: 'externalSourceNode', data: { label: node }, style: sharedStyle })
		} else {
			rfNodes.push({ id, position: pos, type: 'enclosureNode', data: { label: node }, style: sharedStyle })
		}
	}

	const rfEdges: Edge[] = edges
		.filter(({ source, target }) => visited.has(source) && visited.has(target))
		.map(({ source, target }) => ({
			id: `${source}->${target}`,
			source,
			target,
			markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
			style: { strokeWidth: 1.5 }
		}))

	return { nodes: rfNodes, edges: rfEdges }
}

function ExternalSourceNodeCard({ data }: { data: { label: ExternalSourceNode } }) {
	return (
		<div className='min-h-14 rounded-md border-2 border-dashed border-muted-foreground/40 bg-muted/30 text-left flex flex-col justify-center px-3 py-2 gap-1 text-sm relative'>
			<Handle type='target' position={Position.Top} className='bg-border! border-border!' />
			<div className='flex items-center gap-1.5'>
				<Building2 className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
				<span className='text-muted-foreground text-xs font-medium wrap-break-word'>{data.label.sourceName}</span>
			</div>
			<Handle type='source' position={Position.Bottom} className='bg-border! border-border!' />
		</div>
	)
}

function EnclosureNodeCard({ data }: { data: { label: EnclosureNode } }) {
	const enc = data.label
	return (
		<div
			className={[
				'min-h-17 rounded-md border text-left flex flex-col justify-center px-3 py-2 gap-0.5 text-sm relative',
				enc.isFocus
					? 'bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/40'
					: enc.isInactive
						? 'bg-muted/50 text-muted-foreground border-border/50 opacity-70'
						: 'bg-card text-card-foreground border-border'
			].join(' ')}
		>
			<Handle type='target' position={Position.Top} className='bg-border! border-border!' />
			<span className='font-semibold leading-tight wrap-break-word'>{enc.name}</span>
			<span
				className={['text-xs truncate', enc.isFocus ? 'text-primary-foreground/80' : 'text-muted-foreground'].join(' ')}
			>
				{enc.location ?? 'Unknown location'} · {enc.currentCount} specimen
			</span>
			{enc.isFocus && (enc.childrenCount ?? 0) > 0 && (
				<span className='text-xs'>
					{enc.childrenCount} derived {enc.childrenCount === 1 ? 'enclosure' : 'enclosures'}
				</span>
			)}
			<Handle type='source' position={Position.Bottom} className='bg-border! border-border!' />
		</div>
	)
}

const nodeTypes = { enclosureNode: EnclosureNodeCard, externalSourceNode: ExternalSourceNodeCard }

function ReadyFlow({ nodes: initialNodes, edges: initialEdges }: { nodes: Node[]; edges: Edge[] }) {
	const { fitView } = useReactFlow()
	const [nodes, , onNodesChange] = useNodesState(initialNodes)
	const [edges, , onEdgesChange] = useEdgesState(initialEdges)

	const onInit = useCallback(() => {
		setTimeout(() => fitView({ padding: 0.2 }), 50)
	}, [fitView])

	return (
		<ReactFlow
			nodes={nodes}
			edges={edges}
			nodeTypes={nodeTypes}
			onNodesChange={onNodesChange}
			onEdgesChange={onEdgesChange}
			onInit={onInit}
			fitView
			fitViewOptions={{ padding: 0.2 }}
			nodesDraggable={false}
			nodesConnectable={false}
			elementsSelectable={false}
			panOnScroll
			zoomOnScroll={false}
			proOptions={{ hideAttribution: true }}
		>
			<Background gap={20} size={1} className='bg-muted/20!' />
			<Controls showInteractive={false} />
		</ReactFlow>
	)
}

function LineageFlow({ enclosureId, orgId }: { enclosureId: string; orgId: UUID }) {
	const { data: orgEnclosures, isLoading: encsLoading, error: encsError } = useOrgEnclosures(orgId, 'all')
	const { data: lineageEdges, isLoading: edgesLoading, error: edgesError } = useOrgEnclosureLineage(orgId)

	console.log('[LineageFlow]', {
		enclosureId,
		orgId,
		encsLoading,
		edgesLoading,
		encsError: encsError ? JSON.stringify(encsError, Object.getOwnPropertyNames(encsError)) : null,
		edgesError: edgesError ? JSON.stringify(edgesError, Object.getOwnPropertyNames(edgesError)) : null,
		orgEnclosuresCount: orgEnclosures?.length,
		lineageEdgesCount: lineageEdges?.length
	})

	const { nodes, edges } = useMemo(() => {
		if (!orgEnclosures || !lineageEdges) return { nodes: [], edges: [] }

		const nodeMap = new Map<string, GraphNode>(
			orgEnclosures.map((enc) => [
				enc.id,
				{
					kind: 'enclosure' as const,
					id: enc.id,
					name: enc.name,
					currentCount: enc.current_count,
					location: enc.locations?.name,
					isFocus: enc.id === enclosureId,
					isInactive: !enc.is_active
				}
			])
		)

		const edgeList = lineageEdges.map((e) => ({
			source: e.source_enclosure_id,
			target: e.enclosure_id
		}))

		// Inject virtual external source nodes
		for (const enc of orgEnclosures) {
			if (!enc.institutional_external_source) continue
			const sources = enc.institutional_external_source
				.split(',')
				.map((s: string) => s.trim())
				.filter(Boolean)
			for (const src of sources) {
				const extId = `ext::${src}`
				if (!nodeMap.has(extId)) {
					nodeMap.set(extId, { kind: 'external', id: extId, sourceName: src })
				}
				edgeList.push({ source: extId as UUID, target: enc.id })
			}
		}

		if (!nodeMap.has(enclosureId)) {
			console.log('[LineageFlow] focusId not in nodeMap', {
				enclosureId,
				nodeMapKeys: [...nodeMap.keys()].slice(0, 10)
			})
			return { nodes: [], edges: [] }
		}

		// Count direct children of the focus enclosure and store on its node
		const childrenCount = edgeList.filter((e) => e.source === enclosureId).length
		const focusNode = nodeMap.get(enclosureId) as EnclosureNode
		nodeMap.set(enclosureId, { ...focusNode, childrenCount })

		const result = computeLayout(nodeMap, edgeList, enclosureId)
		console.log('[LineageFlow] computed', { nodesCount: result.nodes.length, edgesCount: result.edges.length })
		return result
	}, [orgEnclosures, lineageEdges, enclosureId])

	if (encsLoading || edgesLoading) {
		return (
			<div className='flex items-center justify-center h-full'>
				<Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
			</div>
		)
	}

	if (encsError || edgesError) {
		return (
			<div className='flex items-center justify-center h-full text-sm text-destructive'>
				<pre className='whitespace-pre-wrap max-w-md'>
					{encsError ? `enclosures error: ${JSON.stringify(encsError, null, 2)}` : 'enclosures: OK'}
					{'\n'}
					{edgesError ? `lineage error: ${JSON.stringify(edgesError, null, 2)}` : 'lineage: OK'}
					{'\n'}
					orgId: {orgId}
					{'\n'}
					enclosureId: {enclosureId}
				</pre>
			</div>
		)
	}

	if (nodes.length === 0) {
		return (
			<div className='flex items-center justify-center h-full text-sm text-muted-foreground'>
				No lineage data available. (enc={orgEnclosures?.length}, edges={lineageEdges?.length}, focusInMap=
				{orgEnclosures?.some((e) => e.id === enclosureId) ? 'yes' : 'no'})
			</div>
		)
	}

	return <ReadyFlow nodes={nodes} edges={edges} />
}

export function EnclosureLineageGraph({ enclosureId, orgId }: { enclosureId: string; orgId: UUID }) {
	return (
		<ReactFlowProvider>
			<div
				className='w-full h-96 sm:h-150 rounded-md border overflow-hidden'
				style={
					{
						'--xy-controls-button-background-color': 'hsl(var(--card))',
						'--xy-controls-button-border-color': 'hsl(var(--border))',
						'--xy-controls-button-color': 'hsl(var(--foreground))'
					} as React.CSSProperties
				}
			>
				<LineageFlow enclosureId={enclosureId} orgId={orgId} />
			</div>
		</ReactFlowProvider>
	)
}
