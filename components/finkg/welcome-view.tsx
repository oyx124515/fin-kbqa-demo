"use client";

import {
	BadgeHelp,
	ChartNoAxesCombined,
	Network,
	RotateCw,
	Sparkles,
	Star,
} from "lucide-react";

import { Composer } from "@/components/finkg/composer";
import type { QaItem } from "@/components/finkg/types";

type WelcomeViewProps = {
	recommendedQa: QaItem[];
	onRefreshRecommended: () => void;
	onSelectQuestion: (qa: QaItem) => void;
	composerValue: string;
	onComposerChange: (value: string) => void;
	onComposerSubmit: () => void;
};

const features = [
	{ icon: Network, label: "知识图谱推理" },
	{ icon: ChartNoAxesCombined, label: "多维度分析" },
	{ icon: Sparkles, label: "可视化展示" },
	{ icon: BadgeHelp, label: "精准问答" },
];

export function WelcomeView({
	recommendedQa,
	onRefreshRecommended,
	onSelectQuestion,
	composerValue,
	onComposerChange,
	onComposerSubmit,
}: WelcomeViewProps) {
	return (
		<div className="welcome-shell">
			<div className="welcome-scroll">
				<div className="hero">
					<div className="hero-card">
						<div className="hero-mark">
							<Sparkles size={34} />
						</div>
						<h1 className="hero-title">欢迎使用</h1>
						<p className="hero-subtitle">知识图谱问答系统</p>
						<p className="hero-description">
							基于知识图谱，支持结构化推理路径展示与子图可视化。
						</p>

						<div className="feature-row">
							{features.map((feature) => {
								const Icon = feature.icon;

								return (
									<div className="feature-card" key={feature.label}>
										<div className="feature-icon">
											<Icon size={24} />
										</div>
										<div>{feature.label}</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			</div>

			<div className="bottom-zone sticky">
				<div className="section-head section-head-between">
					<div className="section-head-label">
						<Star size={18} />
						推荐问题
					</div>
					<button
						className="secondary-button secondary-button-compact"
						type="button"
						onClick={onRefreshRecommended}
					>
						<RotateCw size={15} />
						刷新
					</button>
				</div>
				<div className="chips">
					{recommendedQa.map((qa) => (
						<button
							className="chip-button"
							key={qa.id}
							type="button"
							onClick={() => onSelectQuestion(qa)}
							title={qa.question}
						>
							<span className="chip-label">{qa.question}</span>
						</button>
					))}
				</div>
				<Composer
					value={composerValue}
					onChange={onComposerChange}
					onSubmit={onComposerSubmit}
				/>
			</div>
		</div>
	);
}
