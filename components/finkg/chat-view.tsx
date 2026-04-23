"use client";

import { Copy, GitBranch, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

import { Composer } from "@/components/finkg/composer";
import type { ChatMessage, QaItem } from "@/components/finkg/types";

type ChatViewProps = {
	sessionId: string;
	messages: ChatMessage[];
	qaById: Map<string, QaItem>;
	recommendedQa: QaItem[];
	onSelectQuestion: (qa: QaItem) => void;
	onShowGraph: (qaId: string) => void;
	onRetry: (qaId: string) => void;
	composerValue: string;
	onComposerChange: (value: string) => void;
	onComposerSubmit: () => void;
};

export function ChatView({
	sessionId,
	messages,
	qaById,
	recommendedQa,
	onSelectQuestion,
	onShowGraph,
	onRetry,
	composerValue,
	onComposerChange,
	onComposerSubmit,
}: ChatViewProps) {
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const lastAssistantId = [...messages]
		.reverse()
		.find((message) => message.role === "assistant")?.id;
	const lastMessage = messages.at(-1);
	const scrollTrigger =
		lastMessage?.role === "assistant"
			? [
					sessionId,
					messages.length,
					lastMessage.id,
					lastMessage.visibleStepChars.join(","),
					lastMessage.visibleAnswerChars,
					lastMessage.showAnswer ? "shown" : "hidden",
				].join("|")
			: [
					sessionId,
					messages.length,
					lastMessage?.id ?? "empty",
					lastMessage?.role === "user" ? lastMessage.content : "",
				].join("|");

	useEffect(() => {
		void scrollTrigger;

		const scrollElement = scrollRef.current;
		if (!scrollElement) {
			return;
		}

		const frameId = window.requestAnimationFrame(() => {
			scrollElement.scrollTop = scrollElement.scrollHeight;
		});

		return () => window.cancelAnimationFrame(frameId);
	}, [scrollTrigger]);

	return (
		<div className="chat-shell">
			<div className="chat-scroll" ref={scrollRef}>
				{messages.map((message) => {
					if (message.role === "user") {
						return (
							<div className="message-row user" key={message.id}>
								<div className="user-bubble">{message.content}</div>
							</div>
						);
					}

					const isLastAssistant = message.id === lastAssistantId;
					const messageQa = qaById.get(message.qaId) ?? null;
					const visibleSteps = message.steps
						.map((step, index) => ({
							step,
							index,
							charCount: message.visibleStepChars[index] ?? 0,
						}))
						.filter((item) => item.charCount > 0);
					const answerText = message.answerText.slice(
						0,
						message.visibleAnswerChars,
					);
					const isAnswerStreaming =
						message.streaming &&
						message.visibleStepChars.every(
							(charCount, index) => charCount >= message.steps[index].length,
						);

					return (
						<div className="message-row assistant" key={message.id}>
							<div className="assistant-card">
								<div className="step-list">
									{visibleSteps.map(({ step, index, charCount }) => (
										<div
											className="step-card"
											key={`${message.id}-${messageQa?.reasoning_path[index - 1]?.join("-") ?? step.slice(0, 24)}`}
										>
											<div className="step-card-header">
												<div className="step-title">推理步骤 {index + 1}</div>
												<div className="step-status">
													{message.streaming &&
													charCount > 0 &&
													charCount < step.length
														? "生成中"
														: "路径已映射"}
												</div>
											</div>
											<div className="step-content">
												{step.slice(0, charCount)}
											</div>
											{index > 0 &&
											charCount >= step.length &&
											messageQa?.reasoning_path[index - 1] ? (
												<div className="reasoning-line">
													{messageQa.reasoning_path[index - 1][0]} {" → "}
													{messageQa.reasoning_path[index - 1][1]} {" → "}
													{messageQa.reasoning_path[index - 1][2]}
												</div>
											) : null}
										</div>
									))}
								</div>

								{message.streaming && !isAnswerStreaming ? (
									<div className="answer-block">
										<div className="streaming-indicator">
											<span className="streaming-dot" />
											模型推理中
										</div>
									</div>
								) : null}

								{answerText || message.showAnswer ? (
									<div className="answer-block">
										<div className="answer-title">最终结论</div>
										<div className="answer-text">{answerText}</div>
										{isAnswerStreaming ? (
											<div className="streaming-indicator answer-streaming">
												<span className="streaming-dot" />
												模型正在逐字输出最终答案
											</div>
										) : null}
									</div>
								) : null}

								{message.showAnswer ? (
									<div className="message-actions">
										<button
											className="secondary-button"
											type="button"
											onClick={() =>
												navigator.clipboard.writeText(
													`${messageQa?.question ?? ""}\n\n${message.answerText}`,
												)
											}
										>
											<Copy size={16} />
											复制
										</button>
										<button
											className="secondary-button"
											type="button"
											onClick={() => onShowGraph(message.qaId)}
										>
											<GitBranch size={16} />
											展示知识图谱
										</button>
										{isLastAssistant ? (
											<button
												className="secondary-button"
												type="button"
												onClick={() => onRetry(message.qaId)}
											>
												<RotateCcw size={16} />
												重新回答
											</button>
										) : null}
									</div>
								) : null}
							</div>
						</div>
					);
				})}
			</div>

			<div className="bottom-zone sticky">
				<div className="section-head">
					<Sparkles size={18} />
					推荐问题
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
