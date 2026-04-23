import type { GraphData as G6GraphData } from "@antv/g6";

import type {
	AssistantMessage,
	ChatListItem,
	GraphPayload,
	GraphTriple,
	QaItem,
	UserMessage,
} from "@/components/finkg/types";

export function splitThinkingSteps(thinkingProcess: string) {
	return thinkingProcess
		.split("\n\n")
		.map((step) => step.trim())
		.filter(Boolean);
}

export function createThreadId() {
	return `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createMessageId(prefix: "user" | "assistant") {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeChatListItem(
	id: string,
	question: string,
	source: ChatListItem["source"],
): ChatListItem {
	return {
		id,
		question,
		source,
		updatedAt: Date.now(),
	};
}

export function upsertChatList(
	list: ChatListItem[],
	item: ChatListItem,
): ChatListItem[] {
	const next = list.filter((entry) => entry.id !== item.id);
	return [item, ...next];
}

export function makeUserMessage(
	content: string,
	id = createMessageId("user"),
): UserMessage {
	return {
		id,
		role: "user",
		content,
	};
}

export function formatAnswers(answers: string[]) {
	if (answers.length <= 1) {
		return answers[0] ?? "";
	}

	return answers.map((answer, index) => `${index + 1}. ${answer}`).join("\n");
}

export function makeAssistantMessage(
	qa: QaItem,
	options: {
		id?: string;
		visibleStepChars?: number[];
		visibleAnswerChars: number;
		streaming: boolean;
		showAnswer: boolean;
	},
): AssistantMessage {
	const steps = splitThinkingSteps(qa.thinking_process);

	return {
		id: options.id ?? createMessageId("assistant"),
		role: "assistant",
		qaId: qa.id,
		steps,
		visibleStepChars: options.visibleStepChars ?? steps.map(() => 0),
		answerText: formatAnswers(qa.answers),
		visibleAnswerChars: options.visibleAnswerChars,
		answers: qa.answers,
		streaming: options.streaming,
		showAnswer: options.showAnswer,
	};
}

export function makeGraphPayload(qa: QaItem): GraphPayload {
	return {
		qaId: qa.id,
		question: qa.question,
		subgraph: qa.subgraph,
		reasoningPath: qa.reasoning_path,
	};
}

export function getLatestAssistantQaId(
	messages: (AssistantMessage | UserMessage)[],
) {
	return [...messages].reverse().find((message) => message.role === "assistant")
		?.qaId;
}

function normalizeText(value: string) {
	return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function textToTokens(value: string) {
	const normalized = normalizeText(value);
	const words = normalized.split(/[^a-z0-9\u4e00-\u9fa5]+/).filter(Boolean);
	if (words.length > 1) {
		return words;
	}
	return [...normalized].filter((char) => char.trim().length > 0);
}

function overlapScore(left: string[], right: string[]) {
	if (left.length === 0 || right.length === 0) {
		return 0;
	}

	const leftSet = new Set(left);
	const rightSet = new Set(right);
	const common = [...leftSet].filter((token) => rightSet.has(token)).length;
	return common / new Set([...leftSet, ...rightSet]).size;
}

export function findBestQaMatch(
	query: string,
	allQa: QaItem[],
	fallbackQa: QaItem | null,
) {
	const normalizedQuery = normalizeText(query);
	if (!normalizedQuery) {
		return fallbackQa ?? allQa[0] ?? null;
	}

	let bestQa: QaItem | null = fallbackQa;
	let bestScore = fallbackQa ? 0.32 : -1;
	const queryTokens = textToTokens(query);

	for (const qa of allQa) {
		const normalizedQuestion = normalizeText(qa.question);
		if (normalizedQuestion === normalizedQuery) {
			return qa;
		}

		let score = overlapScore(queryTokens, textToTokens(qa.question));
		if (normalizedQuestion.includes(normalizedQuery)) {
			score += 0.45;
		}
		if (normalizedQuery.includes(normalizedQuestion)) {
			score += 0.25;
		}
		if (qa.question.includes(query) || query.includes(qa.question)) {
			score += 0.2;
		}

		if (score > bestScore) {
			bestScore = score;
			bestQa = qa;
		}
	}

	return bestQa ?? fallbackQa ?? allQa[0] ?? null;
}

function buildReasoningNodeOrder(reasoningPath: GraphTriple[]) {
	const ordered: string[] = [];
	for (const [source, , target] of reasoningPath) {
		if (!ordered.includes(source)) {
			ordered.push(source);
		}
		if (!ordered.includes(target)) {
			ordered.push(target);
		}
	}
	return ordered;
}

export function buildG6GraphData(
	triples: GraphTriple[],
	reasoningPath: GraphTriple[],
): G6GraphData {
	const reasoningEdgeSet = new Set(
		reasoningPath.map(
			([source, label, target]) => `${source}|${label}|${target}`,
		),
	);
	const reasoningNodes = new Set(buildReasoningNodeOrder(reasoningPath));
	const focusNode = reasoningPath[0]?.[0];

	const nodeMap = new Map<string, { degree: number }>();
	for (const [source, , target] of triples) {
		nodeMap.set(source, { degree: (nodeMap.get(source)?.degree ?? 0) + 1 });
		nodeMap.set(target, { degree: (nodeMap.get(target)?.degree ?? 0) + 1 });
	}

	const nodes = [...nodeMap.entries()].map(([id, stats]) => {
		const isReasoning = reasoningNodes.has(id);
		const isFocus = id === focusNode;

		return {
			id,
			type: "circle",
			data: {
				label: id,
				degree: stats.degree,
				isReasoning,
				isFocus,
			},
			style: {
				size: isFocus ? 104 : isReasoning ? 84 : 72,
			},
		};
	});

	const edges = triples.map(([source, label, target], index) => {
		const isReasoning = reasoningEdgeSet.has(`${source}|${label}|${target}`);

		return {
			id: `${source}-${target}-${index}`,
			source,
			target,
			type: "line",
			data: {
				label,
				isReasoning,
			},
		};
	});

	return { nodes, edges };
}
