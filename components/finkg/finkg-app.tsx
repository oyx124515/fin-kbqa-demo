"use client";

import { GitBranch, PanelRightOpen } from "lucide-react";
import { startTransition, useDeferredValue, useEffect, useState } from "react";

import { ChatView } from "@/components/finkg/chat-view";
import { GraphPanel } from "@/components/finkg/graph-panel";
import { Sidebar } from "@/components/finkg/sidebar";
import type {
	ChatListItem,
	ChatMessage,
	ChatSession,
	GraphPayload,
	QaItem,
} from "@/components/finkg/types";
import {
	createThreadId,
	findBestQaMatch,
	getLatestAssistantQaId,
	makeAssistantMessage,
	makeChatListItem,
	makeGraphPayload,
	makeUserMessage,
	upsertChatList,
} from "@/components/finkg/utils";
import { WelcomeView } from "@/components/finkg/welcome-view";

type FinKgAppProps = {
	allQa: QaItem[];
	exampleQa: QaItem[];
	recommendedQa: QaItem[];
};

type ActiveStream = {
	chatId: string;
	assistantId: string;
	qa: QaItem;
	runId: number;
};

const STREAM_TICK_MS = 28;
const STREAM_CHARS_PER_TICK = 6;

function buildInitialSessions(exampleQa: QaItem[]) {
	return Object.fromEntries(
		exampleQa.map((qa) => {
			const assistant = makeAssistantMessage(qa, {
				visibleStepChars: undefined,
				visibleAnswerChars: 0,
				streaming: false,
				showAnswer: true,
			});

			const session: ChatSession = {
				id: qa.id,
				title: qa.question,
				source: "example",
				messages: [
					makeUserMessage(qa.question, `user-${qa.id}`),
					{
						...assistant,
						visibleStepChars: assistant.steps.map((step) => step.length),
						visibleAnswerChars: assistant.answerText.length,
					},
				],
			};

			return [qa.id, session];
		}),
	) as Record<string, ChatSession>;
}

function buildInitialChatList(exampleQa: QaItem[]) {
	return exampleQa.map((qa) => makeChatListItem(qa.id, qa.question, "example"));
}

function getLatestGraphPayload(
	messages: ChatMessage[],
	qaById: Map<string, QaItem>,
): GraphPayload | null {
	const latestQaId = getLatestAssistantQaId(messages);
	if (!latestQaId) {
		return null;
	}

	const qa = qaById.get(latestQaId);
	return qa ? makeGraphPayload(qa) : null;
}

export function FinKgApp({ allQa, exampleQa, recommendedQa }: FinKgAppProps) {
	const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
	const [chatList, setChatList] = useState<ChatListItem[]>(() =>
		buildInitialChatList(exampleQa),
	);
	const [chatSessions, setChatSessions] = useState<Record<string, ChatSession>>(
		() => buildInitialSessions(exampleQa),
	);
	const [graphData, setGraphData] = useState<GraphPayload | null>(null);
	const [graphVisible, setGraphVisible] = useState(false);
	const [activeStream, setActiveStream] = useState<ActiveStream | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [composerValue, setComposerValue] = useState("");

	const deferredQuery = useDeferredValue(searchQuery.trim().toLowerCase());
	const filteredChatList = chatList.filter((chat) =>
		deferredQuery ? chat.question.toLowerCase().includes(deferredQuery) : true,
	);

	const qaById = new Map<string, QaItem>();
	for (const qa of allQa) {
		qaById.set(qa.id, qa);
	}

	const currentSession = selectedChatId
		? (chatSessions[selectedChatId] ?? null)
		: null;
	const currentMessages = currentSession?.messages ?? [];
	const latestQaId = getLatestAssistantQaId(currentMessages);
	const selectedQa = latestQaId ? (qaById.get(latestQaId) ?? null) : null;

	useEffect(() => {
		if (!activeStream) {
			return;
		}

		const draftMessage = makeAssistantMessage(activeStream.qa, {
			visibleAnswerChars: 0,
			streaming: true,
			showAnswer: false,
			id: activeStream.assistantId,
		});
		const steps = draftMessage.steps;
		const answerText = draftMessage.answerText;
		let stepIndex = 0;
		let stepCharCount = 0;
		let answerCharCount = 0;
		const interval = window.setInterval(() => {
			let nextVisibleStepChars = steps.map(() => 0);
			let nextVisibleAnswerChars = 0;
			let nextShowAnswer = false;
			let nextStreaming = true;

			if (stepIndex < steps.length) {
				stepCharCount += STREAM_CHARS_PER_TICK;
				nextVisibleStepChars = steps.map((step, index) => {
					if (index < stepIndex) {
						return step.length;
					}
					if (index === stepIndex) {
						return Math.min(stepCharCount, step.length);
					}
					return 0;
				});

				if (stepCharCount >= steps[stepIndex].length) {
					stepIndex += 1;
					stepCharCount = 0;
				}
			} else {
				nextVisibleStepChars = steps.map((step) => step.length);
				answerCharCount += STREAM_CHARS_PER_TICK;
				nextVisibleAnswerChars = Math.min(answerCharCount, answerText.length);
				nextShowAnswer = nextVisibleAnswerChars >= answerText.length;
				nextStreaming = nextVisibleAnswerChars < answerText.length;
			}

			setChatSessions((previous) => {
				const session = previous[activeStream.chatId];
				if (!session) {
					return previous;
				}

				return {
					...previous,
					[activeStream.chatId]: {
						...session,
						messages: session.messages.map((message) =>
							message.id === activeStream.assistantId &&
							message.role === "assistant"
								? {
										...message,
										visibleStepChars: nextVisibleStepChars,
										visibleAnswerChars: nextVisibleAnswerChars,
										streaming: nextStreaming,
										showAnswer: nextShowAnswer,
									}
								: message,
						),
					},
				};
			});

			if (!nextStreaming && nextShowAnswer) {
				window.clearInterval(interval);
				setGraphVisible(true);
				setGraphData(makeGraphPayload(activeStream.qa));
				setActiveStream((current) =>
					current?.runId === activeStream.runId ? null : current,
				);
			}
		}, STREAM_TICK_MS);

		return () => window.clearInterval(interval);
	}, [activeStream]);

	const openSession = (chatId: string) => {
		const session = chatSessions[chatId];
		if (!session) {
			return;
		}

		startTransition(() => {
			setSelectedChatId(chatId);
			setGraphVisible(false);
			setGraphData(getLatestGraphPayload(session.messages, qaById));
			setActiveStream(null);
		});
	};

	const createSession = (
		question: string,
		qa: QaItem,
		source: ChatListItem["source"],
	) => {
		const chatId = createThreadId();
		const assistant = makeAssistantMessage(qa, {
			visibleAnswerChars: 0,
			streaming: true,
			showAnswer: false,
		});
		const session: ChatSession = {
			id: chatId,
			title: question,
			source,
			messages: [makeUserMessage(question), assistant],
		};

		startTransition(() => {
			setChatSessions((previous) => ({
				...previous,
				[chatId]: session,
			}));
			setChatList((previous) =>
				upsertChatList(previous, makeChatListItem(chatId, question, source)),
			);
			setSelectedChatId(chatId);
			setGraphData(makeGraphPayload(qa));
			setGraphVisible(false);
			setActiveStream({
				chatId,
				assistantId: assistant.id,
				qa,
				runId: Date.now(),
			});
		});
	};

	const appendTurnToSession = (
		chatId: string,
		question: string,
		qa: QaItem,
	) => {
		const session = chatSessions[chatId];
		if (!session) {
			createSession(question, qa, "manual");
			return;
		}

		const assistant = makeAssistantMessage(qa, {
			visibleAnswerChars: 0,
			streaming: true,
			showAnswer: false,
		});

		startTransition(() => {
			setChatSessions((previous) => {
				const current = previous[chatId];
				if (!current) {
					return previous;
				}

				return {
					...previous,
					[chatId]: {
						...current,
						messages: [
							...current.messages,
							makeUserMessage(question),
							assistant,
						],
					},
				};
			});
			setChatList((previous) =>
				upsertChatList(
					previous,
					makeChatListItem(chatId, session.title, session.source),
				),
			);
			setSelectedChatId(chatId);
			setGraphData(makeGraphPayload(qa));
			setGraphVisible(false);
			setActiveStream({
				chatId,
				assistantId: assistant.id,
				qa,
				runId: Date.now(),
			});
		});
	};

	const submitQuestion = (question: string, source: ChatListItem["source"]) => {
		const trimmed = question.trim();
		if (!trimmed) {
			return;
		}

		const matchedQa = findBestQaMatch(trimmed, allQa, selectedQa);
		if (!matchedQa) {
			return;
		}

		setComposerValue("");
		if (selectedChatId && currentSession) {
			appendTurnToSession(selectedChatId, trimmed, matchedQa);
			return;
		}

		createSession(trimmed, matchedQa, source);
	};

	const handleSelectRecommended = (qa: QaItem) => {
		setComposerValue("");
		if (selectedChatId && currentSession) {
			appendTurnToSession(selectedChatId, qa.question, qa);
			return;
		}

		createSession(qa.question, qa, "recommended");
	};

	const handleSelectHistoryChat = (id: string) => {
		openSession(id);
	};

	const handleShowGraph = (qaId: string) => {
		const qa = qaById.get(qaId);
		if (!qa) {
			return;
		}

		setGraphData(makeGraphPayload(qa));
		setGraphVisible(true);
	};

	const handleRetry = (qaId: string) => {
		if (!selectedChatId) {
			return;
		}

		const qa = qaById.get(qaId);
		const session = chatSessions[selectedChatId];
		if (!qa || !session) {
			return;
		}

		let assistantIndex = -1;
		for (let index = session.messages.length - 1; index >= 0; index -= 1) {
			const message = session.messages[index];
			if (message.role === "assistant") {
				assistantIndex = index;
				break;
			}
		}

		if (assistantIndex === -1) {
			return;
		}

		const assistant = makeAssistantMessage(qa, {
			visibleAnswerChars: 0,
			streaming: true,
			showAnswer: false,
		});

		startTransition(() => {
			setChatSessions((previous) => {
				const current = previous[selectedChatId];
				if (!current) {
					return previous;
				}

				const nextMessages = [...current.messages];
				nextMessages[assistantIndex] = assistant;

				return {
					...previous,
					[selectedChatId]: {
						...current,
						messages: nextMessages,
					},
				};
			});
			setGraphVisible(false);
			setGraphData(makeGraphPayload(qa));
			setActiveStream({
				chatId: selectedChatId,
				assistantId: assistant.id,
				qa,
				runId: Date.now(),
			});
		});
	};

	const handleToggleGraphPanel = () => {
		if (graphVisible) {
			setGraphVisible(false);
			return;
		}

		if (selectedQa) {
			setGraphData(makeGraphPayload(selectedQa));
			setGraphVisible(true);
		}
	};

	const resetToWelcome = () => {
		startTransition(() => {
			setSelectedChatId(null);
			setGraphData(null);
			setGraphVisible(false);
			setActiveStream(null);
			setComposerValue("");
		});
	};

	return (
		<div className="app-shell">
			<Sidebar
				chatList={filteredChatList}
				selectedChatId={selectedChatId}
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				onSelectChat={handleSelectHistoryChat}
				onNewChat={resetToWelcome}
			/>

			<div className="content-panel">
				<div className="content-frame">
					<div className="workspace">
						<div className="main-pane">
							{selectedQa && !graphVisible ? (
								<div className="graph-toggle-floating">
									<button
										className="icon-button"
										type="button"
										onClick={handleToggleGraphPanel}
									>
										<PanelRightOpen size={16} />
										<GitBranch size={16} />
										展示知识图谱
									</button>
								</div>
							) : null}

							<main className="main-body">
								{currentSession ? (
									<ChatView
										composerValue={composerValue}
										messages={currentMessages}
										onComposerChange={setComposerValue}
										onComposerSubmit={() =>
											submitQuestion(composerValue, "manual")
										}
										onRetry={handleRetry}
										onSelectQuestion={handleSelectRecommended}
										onShowGraph={handleShowGraph}
										qaById={qaById}
										recommendedQa={recommendedQa}
										sessionId={currentSession.id}
									/>
								) : (
									<WelcomeView
										composerValue={composerValue}
										onComposerChange={setComposerValue}
										onComposerSubmit={() =>
											submitQuestion(composerValue, "manual")
										}
										recommendedQa={recommendedQa}
										onSelectQuestion={handleSelectRecommended}
									/>
								)}
							</main>
						</div>

						<GraphPanel
							graphData={graphData}
							visible={currentSession ? graphVisible : false}
							onToggle={handleToggleGraphPanel}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
