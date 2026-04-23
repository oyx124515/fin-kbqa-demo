"use client";

import { Graph, type GraphData, type NodeData } from "@antv/g6";
import { PanelRightClose, PanelRightOpen, Route } from "lucide-react";
import {
	type CSSProperties,
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import type { GraphPayload } from "@/components/finkg/types";
import { buildG6GraphData } from "@/components/finkg/utils";

type GraphPanelProps = {
	graphData: GraphPayload | null;
	visible: boolean;
	onToggle: () => void;
};

const DEFAULT_PANEL_WIDTH = 560;
const MIN_PANEL_WIDTH = 440;
const MAX_PANEL_WIDTH = 920;
type GraphPanelStyle = CSSProperties & {
	"--graph-panel-width"?: string;
};

function getNodeStyle(datum: NodeData) {
	const nodeData = (datum.data ?? {}) as {
		label?: string;
		degree?: number;
		isReasoning?: boolean;
		isFocus?: boolean;
	};
	const isFocus = Boolean(nodeData.isFocus);
	const isReasoning = Boolean(nodeData.isReasoning);

	if (isFocus) {
		return {
			fill: "#ffad28",
			stroke: "#006aff",
			lineWidth: 2.4,
			shadowColor: "rgba(32, 55, 88, 0.22)",
			shadowBlur: 24,
			labelText: String(nodeData.label ?? datum.id),
			labelFill: "#ffffff",
			labelFontWeight: 700,
			labelMaxWidth: 120,
		};
	}

	if (isReasoning) {
		return {
			fill: "#ffad28",
			stroke: "#006aff",
			lineWidth: 2,
			shadowColor: "rgba(95, 132, 103, 0.16)",
			shadowBlur: 18,
			labelText: String(nodeData.label ?? datum.id),
			labelFill: "#355444",
			labelFontWeight: 600,
			labelMaxWidth: 120,
		};
	}

	return {
		fill: "#e4f0f8",
		stroke: "#7da4bf",
		lineWidth: 1.8,
		shadowColor: "rgba(84, 115, 140, 0.14)",
		shadowBlur: 16,
		labelText: String(nodeData.label ?? datum.id),
		labelFill: "#264863",
		labelFontWeight: 600,
		labelMaxWidth: 120,
	};
}

export function GraphPanel({ graphData, visible, onToggle }: GraphPanelProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const graphRef = useRef<Graph | null>(null);
	const resizeStateRef = useRef({
		pointerId: -1,
		startX: 0,
		startWidth: DEFAULT_PANEL_WIDTH,
	});
	const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
	const [isResizing, setIsResizing] = useState(false);
	const panelStyle: GraphPanelStyle | undefined = visible
		? { "--graph-panel-width": `${panelWidth}px` }
		: undefined;
	const elements = useMemo<GraphData>(
		() =>
			graphData
				? buildG6GraphData(graphData.subgraph, graphData.reasoningPath)
				: { nodes: [], edges: [] },
		[graphData],
	);

	useEffect(() => {
		if (!isResizing) {
			return;
		}

		const handlePointerMove = (event: PointerEvent) => {
			const { pointerId, startWidth, startX } = resizeStateRef.current;
			if (event.pointerId !== pointerId) {
				return;
			}

			const nextWidth = Math.min(
				MAX_PANEL_WIDTH,
				Math.max(MIN_PANEL_WIDTH, startWidth - (event.clientX - startX)),
			);
			setPanelWidth(nextWidth);
		};

		const handlePointerUp = (event: PointerEvent) => {
			if (event.pointerId !== resizeStateRef.current.pointerId) {
				return;
			}

			setIsResizing(false);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [isResizing]);

	useEffect(() => {
		if (!graphData || !visible) {
			graphRef.current?.stopLayout();
			graphRef.current?.destroy();
			graphRef.current = null;
			return;
		}

		if (!containerRef.current) {
			return;
		}

		graphRef.current?.stopLayout();
		graphRef.current?.destroy();

		const graph = new Graph({
			autoResize: true,
			background: "transparent",
			container: containerRef.current,
			data: elements,
			transforms: [
				{
					type: "process-parallel-edges",
					key: "my-process-parallel-edges",
					distance: 30, // 调整平行边之间的间距，默认为 15
				},
			],
			edge: {
				type: "line",

				style: (datum) => {
					const edgeData = (datum.data ?? {}) as {
						label?: string;
						isReasoning?: boolean;
					};
					const isReasoning = Boolean(edgeData.isReasoning);
					return {
						endArrow: true,
						endArrowFill: isReasoning ? "#0091ff" : "#c6b59e",
						endArrowSize: 8,
						label: true,
						labelAutoRotate: true,
						labelBackground: true,
						labelBackgroundFill: isReasoning ? "#d9eaf6" : "#f3ece2",
						labelFill: isReasoning ? "#008cff" : "#766d61",
						labelFontSize: 11,
						labelFontWeight: 700,
						labelPadding: [4, 6],
						labelPlacement: "center",
						labelText: String(edgeData.label ?? ""),
						lineDash: isReasoning ? undefined : [6, 5],
						lineWidth: isReasoning ? 2.6 : 1.5,
						opacity: isReasoning ? 1 : 0.82,
						stroke: isReasoning ? "#ff5e00" : "#cfbfa9",
					};
				},
			},
			layout: {
				type: "d3-force",
				collideStrength: 0.9,
				linkDistance: (edge) =>
					(edge.data as { isReasoning?: boolean } | undefined)?.isReasoning
						? 320
						: 520,
				nodeStrength: (node) => {
					const nodeData = (node.data ?? {}) as {
						isReasoning?: boolean;
						isFocus?: boolean;
					};
					if (nodeData.isFocus) {
						return -2200;
					}
					return nodeData.isReasoning ? -1500 : -1200;
				},
				preventOverlap: true,
			},
			node: {
				type: "circle",
				style: getNodeStyle,
			},
			behaviors: ["drag-canvas", "zoom-canvas", "drag-element-force"],
		});

		graphRef.current = graph;
		void graph.render();

		return () => {
			graph.stopLayout();
			graph.destroy();
			if (graphRef.current === graph) {
				graphRef.current = null;
			}
		};
	}, [elements, graphData, visible]);

	useEffect(() => {
		return () => {
			graphRef.current?.stopLayout();
			graphRef.current?.destroy();
			graphRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (!visible) {
			return;
		}

		void panelWidth;

		const graph = graphRef.current;
		if (!graph) {
			return;
		}

		const timeout = window.setTimeout(
			() => {
				graph.resize();
			},
			visible ? 260 : 0,
		);

		return () => window.clearTimeout(timeout);
	}, [panelWidth, visible]);

	const handleResizeStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
		if (!visible) {
			return;
		}

		resizeStateRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startWidth: panelWidth,
		};
		setIsResizing(true);
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	return (
		<aside
			className={["graph-panel", visible ? "open" : ""]
				.filter(Boolean)
				.join(" ")}
			data-resizing={isResizing ? "true" : "false"}
			style={panelStyle}
		>
			{visible ? (
				<button
					aria-label="调整知识图谱面板宽度"
					className="graph-panel-resizer"
					onPointerDown={handleResizeStart}
					type="button"
				/>
			) : null}
			<div className="graph-panel-inner">
				<div className="graph-panel-header">
					<div>
						<div className="section-title">知识图谱</div>
						<div className="graph-panel-subtitle">
							当前问题相关子图与高亮推理路径
						</div>
					</div>
					<button className="icon-button" type="button" onClick={onToggle}>
						{visible ? (
							<PanelRightClose size={16} />
						) : (
							<PanelRightOpen size={16} />
						)}
						{visible ? "收起面板" : "展开面板"}
					</button>
				</div>

				<div className="legend-row">
					<div className="legend-item">
						<span className="legend-dot" style={{ background: "#2f4f7c" }} />
						焦点实体
					</div>
					<div className="legend-item">
						<span className="legend-dot" style={{ background: "#dcefdc" }} />
						推理路径节点
					</div>
					<div className="legend-item">
						<span className="legend-dot" style={{ background: "#e4f0f8" }} />
						普通实体
					</div>
					<div className="legend-item">
						<span className="legend-dot" style={{ background: "#2f6e9d" }} />
						推理路径边
					</div>
				</div>

				<div className="graph-canvas">
					{graphData ? (
						<div className="g6-container" ref={containerRef} />
					) : (
						<div className="empty-graph">暂无可展示的图谱。</div>
					)}
				</div>

				<div className="routes-card">
					<div className="section-head">
						<Route size={18} />
						路径详情
					</div>
					<div className="routes-list">
						{graphData?.reasoningPath.map(
							([source, relation, target], index) => (
								<div
									className="route-item"
									key={`${source}-${relation}-${target}`}
								>
									<strong>路径 {index + 1}:</strong> {source} → {relation} →{" "}
									{target}
								</div>
							),
						) ?? <div className="route-item">暂无推理路径。</div>}
					</div>
				</div>
			</div>
		</aside>
	);
}
