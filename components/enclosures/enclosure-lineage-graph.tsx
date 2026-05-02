'use client'

import { useMemo, useCallback, useState } from 'react'
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
import { Loader2, Building2, ChevronDown } from 'lucide-react'

const NODE_W = 176
const STACK_NODE_W = 216
const NODE_H = 68
const H_GAP = 48
const V_GAP = 64
const COLLAPSE_THRESHOLD = 5

type EnclosureNode = {
	kind: 'enclosure'
	id: string
	name: string
	currentCount: number
	location?: string
	isFocus: boolean
	isInactive: boolean
}

type ExternalSourceNode = {
	kind: 'external'
	id: string
	sourceName: string
}

type GroupOverflowNode = {
	kind: 'group'
	id: string
	count: number
	names: string[]
}

type StackOverflowNode = {
	kind: 'stack'
	id: string
	items: Array<{ id: string; name: string; location?: string; currentCount: number; isInactive: boolean }>
}

type GraphNode = EnclosureNode | ExternalSourceNode | GroupOverflowNode | StackOverflowNode

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

	// BFS to collect all connected nodes from focusId (ancestors + descendants)
	const visited = new Set<string>()
	const queue: string[] = [focusId]
	while (queue.length > 0) {
		const id = queue.shift()!
		if (visited.has(id) || !nodeMap.has(id)) continue
		visited.add(id)
		for (const p of parents.get(id) ?? []) queue.push(p)
		for (const c of children.get(id) ?? []) queue.push(c)
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
	const nodeName = (n: GraphNode | undefined): string => {
		if (!n) return ''
		if (n.kind === 'external') return n.sourceName
		if (n.kind === 'enclosure') return n.name
		return ''
	}
	for (const [, ids] of byLayer) {
		ids.sort((a, b) => {
			if (a === focusId) return 0
			if (b === focusId) return 0
			return nodeName(nodeMap.get(a)).localeCompare(nodeName(nodeMap.get(b)))
		})
	}

	// Collapse overflow: group or stack nodes for layers with more than COLLAPSE_THRESHOLD non-focus nodes
	const focusLayer = layers.get(focusId) ?? 0
	const collapsedToOverflow = new Map<string, string>()

	for (const [layer, ids] of byLayer) {
		const focusInLayer = ids.includes(focusId)
		const nonFocusIds = ids.filter((id) => id !== focusId)

		if (nonFocusIds.length <= COLLAPSE_THRESHOLD) continue

		const visibleIds = nonFocusIds.slice(0, COLLAPSE_THRESHOLD - 1)
		const overflowIds = nonFocusIds.slice(COLLAPSE_THRESHOLD - 1)
		const overflowId = `overflow::${layer}`
		const isDirectLayer = layer === focusLayer - 1 || layer === focusLayer + 1

		const enclosureItems = overflowIds
			.map((id) => nodeMap.get(id))
			.filter((n): n is EnclosureNode => n?.kind === 'enclosure')
			.map((n) => ({
				id: n.id,
				name: n.name,
				location: n.location,
				currentCount: n.currentCount,
				isInactive: n.isInactive
			}))

		if (isDirectLayer && enclosureItems.length > 0) {
			nodeMap.set(overflowId, { kind: 'stack', id: overflowId, items: enclosureItems })
		} else {
			const names = overflowIds.map((id) => nodeName(nodeMap.get(id))).filter(Boolean)
			nodeMap.set(overflowId, { kind: 'group', id: overflowId, count: overflowIds.length, names })
		}

		for (const id of overflowIds) collapsedToOverflow.set(id, overflowId)
		byLayer.set(layer, focusInLayer ? [focusId, ...visibleIds, overflowId] : [...visibleIds, overflowId])
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
	for (const [, ids] of byLayer) {
		for (const id of ids) {
			const node = nodeMap.get(id)
			if (!node) continue
			const pos = positions.get(id) ?? { x: 0, y: 0 }
			const sharedStyle = { width: NODE_W, padding: 0, border: 'none', background: 'transparent' }
			if (node.kind === 'external') {
				rfNodes.push({ id, position: pos, type: 'externalSourceNode', data: { label: node }, style: sharedStyle })
			} else if (node.kind === 'group') {
				rfNodes.push({ id, position: pos, type: 'groupNode', data: { label: node }, style: sharedStyle })
			} else if (node.kind === 'stack') {
				rfNodes.push({
					id,
					position: pos,
					type: 'stackNode',
					data: { label: node },
					style: { width: STACK_NODE_W, padding: 0, border: 'none', background: 'transparent', overflow: 'visible' }
				})
			} else {
				rfNodes.push({ id, position: pos, type: 'enclosureNode', data: { label: node }, style: sharedStyle })
			}
		}
	}

	const renderedIds = new Set(rfNodes.map((n) => n.id))
	const edgeKeySet = new Set<string>()
	const rfEdges: Edge[] = []
	for (const { source, target } of edges) {
		if (!visited.has(source) || !visited.has(target)) continue
		const actualSource = collapsedToOverflow.get(source) ?? source
		const actualTarget = collapsedToOverflow.get(target) ?? target
		if (actualSource === actualTarget) continue
		if (!renderedIds.has(actualSource) || !renderedIds.has(actualTarget)) continue
		const key = `${actualSource}->${actualTarget}`
		if (edgeKeySet.has(key)) continue
		edgeKeySet.add(key)
		rfEdges.push({
			id: key,
			source: actualSource,
			target: actualTarget,
			markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
			style: { strokeWidth: 1.5 }
		})
	}

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
			<Handle type='source' position={Position.Bottom} className='bg-border! border-border!' />
		</div>
	)
}

function GroupNodeCard({ data }: { data: { label: GroupOverflowNode } }) {
	const { count, names } = data.label
	return (
		<div className='min-h-14 rounded-md border-2 border-dashed border-muted-foreground/40 bg-muted/30 text-center flex flex-col justify-center px-3 py-2 gap-1 text-sm relative'>
			<Handle type='target' position={Position.Top} className='bg-border! border-border!' />
			<span className='font-medium text-muted-foreground'>+{count} more</span>
			{names.length > 0 && (
				<span className='text-xs text-muted-foreground/70 truncate' title={names.join(', ')}>
					{names.slice(0, 2).join(', ')}
					{names.length > 2 ? ', …' : ''}
				</span>
			)}
			<Handle type='source' position={Position.Bottom} className='bg-border! border-border!' />
		</div>
	)
}

function StackNodeCard({ data }: { data: { label: StackOverflowNode } }) {
	const [index, setIndex] = useState(0)
	const { items } = data.label
	const current = items[index]

	const prev = (e: React.MouseEvent) => {
		e.stopPropagation()
		setIndex((index - 1 + items.length) % items.length)
	}
	const next = (e: React.MouseEvent) => {
		e.stopPropagation()
		setIndex((index + 1) % items.length)
	}

	if (!current) return null

	const btnClass =
		'nodrag nopan flex items-center justify-center h-5 w-5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded cursor-pointer'

	return (
		<div className='relative' style={{ width: STACK_NODE_W }}>
			{items.length > 2 && (
				<div
					className='absolute rounded-md border bg-card'
					style={{ top: 8, left: 8, bottom: -8, right: -8, zIndex: 1 }}
				/>
			)}
			{items.length > 1 && (
				<div
					className='absolute rounded-md border bg-card'
					style={{ top: 4, left: 4, bottom: -4, right: -4, zIndex: 2 }}
				/>
			)}
			<div
				className={[
					'relative rounded-md border text-left flex flex-col justify-center px-3 py-2 gap-0.5 text-sm',
					current.isInactive
						? 'bg-muted/50 text-muted-foreground border-border/50 opacity-70'
						: 'bg-card text-card-foreground border-border'
				].join(' ')}
				style={{ zIndex: 3 }}
			>
				<Handle type='target' position={Position.Top} className='bg-border! border-border!' />
				<div className='flex items-center justify-between gap-1'>
					<span className='font-semibold leading-tight break-words flex-1'>{current.name}</span>
					{items.length > 1 && (
						<div className='nodrag nopan shrink-0 flex items-center gap-0.5' style={{ pointerEvents: 'all' }}>
							<button onClick={prev} title='Previous' className={btnClass}>
								<ChevronDown className='h-3 w-3 rotate-90' />
							</button>
							<span className='text-xs text-muted-foreground tabular-nums'>
								{index + 1}/{items.length}
							</span>
							<button onClick={next} title='Next' className={btnClass}>
								<ChevronDown className='h-3 w-3 -rotate-90' />
							</button>
						</div>
					)}
				</div>
				<span className='text-xs text-muted-foreground truncate'>
					{current.location ?? 'Unknown location'} · {current.currentCount} specimen
				</span>
				<Handle type='source' position={Position.Bottom} className='bg-border! border-border!' />
			</div>
		</div>
	)
}

const nodeTypes = {
	enclosureNode: EnclosureNodeCard,
	externalSourceNode: ExternalSourceNodeCard,
	groupNode: GroupNodeCard,
	stackNode: StackNodeCard
}

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
	const { data: orgEnclosures, isLoading: encsLoading } = useOrgEnclosures(orgId, 'all')
	const { data: lineageEdges, isLoading: edgesLoading } = useOrgEnclosureLineage(orgId)

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

		if (!nodeMap.has(enclosureId)) return { nodes: [], edges: [] }

		return computeLayout(nodeMap, edgeList, enclosureId)
	}, [orgEnclosures, lineageEdges, enclosureId])

	if (encsLoading || edgesLoading) {
		return (
			<div className='flex items-center justify-center h-full'>
				<Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
			</div>
		)
	}

	if (nodes.length === 0) {
		return (
			<div className='flex items-center justify-center h-full text-sm text-muted-foreground'>
				No lineage data available.
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
