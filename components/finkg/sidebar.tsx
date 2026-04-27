"use client";

import { Plus, Search, Sparkles, SquarePen } from "lucide-react";

import type { ChatListItem } from "@/components/finkg/types";

type SidebarProps = {
	chatList: ChatListItem[];
	selectedChatId: string | null;
	searchQuery: string;
	onSearchChange: (value: string) => void;
	onSelectChat: (id: string) => void;
	onNewChat: () => void;
};

export function Sidebar({
	chatList,
	selectedChatId,
	searchQuery,
	onSearchChange,
	onSelectChat,
	onNewChat,
}: SidebarProps) {
	return (
		<aside className="sidebar">
			<div className="sidebar-header">
				<div className="brand">
					<div className="brand-mark">
						<Sparkles size={24} />
					</div>
					<div className="brand-copy">
						<div className="brand-title">KBQA</div>
						<div className="brand-subtitle">知识图谱问答系统</div>
					</div>
				</div>
				<button
					className="sidebar-ghost-button"
					type="button"
					aria-label="编辑"
				>
					<SquarePen size={16} />
				</button>
			</div>

			<button className="primary-button" type="button" onClick={onNewChat}>
				<Plus size={18} />
				新建对话
			</button>

			<div className="sidebar-section-title">对话列表</div>

			<label className="sidebar-search" aria-label="搜索对话">
				<Search size={16} color="#8c8378" />
				<input
					value={searchQuery}
					onChange={(event) => onSearchChange(event.target.value)}
					placeholder="搜索对话"
				/>
			</label>

			<div className="chat-list">
				{chatList.length > 0 ? (
					chatList.map((chat) => {
						const isActive = chat.id === selectedChatId;

						return (
							<button
								key={chat.id}
								className={["chat-list-item", isActive ? "active" : ""]
									.filter(Boolean)
									.join(" ")}
								type="button"
								onClick={() => onSelectChat(chat.id)}
							>
								<span className="chat-list-item-icon">
									<Sparkles size={15} />
								</span>
								<span className="chat-list-item-copy">
									<span className="chat-list-item-title" title={chat.question}>
										{chat.question}
									</span>
									{/* <span className="chat-list-item-meta">
										{chat.source === "example"
											? "历史示例"
											: chat.source === "manual"
												? "手动提问"
												: "推荐进入"}
									</span> */}
								</span>
							</button>
						);
					})
				) : (
					<div className="empty-state-small">无对话记录</div>
				)}
			</div>
		</aside>
	);
}
