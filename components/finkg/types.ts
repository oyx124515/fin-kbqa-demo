export type GraphTriple = [string, string, string];

export type QaItem = {
	id: string;
	question: string;
	thinking_process: string;
	answers: string[];
	reasoning_path: GraphTriple[];
	subgraph: GraphTriple[];
};

export type ChatListItem = {
	id: string;
	question: string;
	source: "example" | "recommended" | "manual";
	updatedAt: number;
};

export type UserMessage = {
	id: string;
	role: "user";
	content: string;
};

export type AssistantMessage = {
	id: string;
	role: "assistant";
	qaId: string;
	steps: string[];
	visibleStepChars: number[];
	answerText: string;
	visibleAnswerChars: number;
	answers: string[];
	streaming: boolean;
	showAnswer: boolean;
};

export type ChatMessage = UserMessage | AssistantMessage;

export type ChatSession = {
	id: string;
	title: string;
	source: ChatListItem["source"];
	messages: ChatMessage[];
};

export type GraphPayload = {
	qaId: string;
	question: string;
	subgraph: GraphTriple[];
	reasoningPath: GraphTriple[];
};
