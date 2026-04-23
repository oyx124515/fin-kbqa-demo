"use client";

import { ArrowUp, Plus } from "lucide-react";

type ComposerProps = {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	placeholder?: string;
};

export function Composer({
	value,
	onChange,
	onSubmit,
	placeholder = "发送消息...（按 Enter 发送，Shift + Enter 换行）",
}: ComposerProps) {
	return (
		<div className="composer-shell">
			<div className="composer">
				<textarea
					value={value}
					onChange={(event) => onChange(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter" && !event.shiftKey) {
							event.preventDefault();
							onSubmit();
						}
					}}
					placeholder={placeholder}
				/>
				<div className="composer-actions">
					<div className="composer-plus">
						<Plus size={18} />
					</div>
					<button
						className="send-button"
						type="button"
						aria-label="发送"
						onClick={onSubmit}
					>
						<ArrowUp size={18} />
					</button>
				</div>
			</div>
			<div className="composer-footnote">
				内容由 AI 生成，仅供参考，不构成投资建议
			</div>
		</div>
	);
}
