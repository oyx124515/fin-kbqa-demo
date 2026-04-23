import qaAll from "@/app/data/qa_all.json";
import qaExamples from "@/app/data/qa_examples.json";
import { FinKgApp } from "@/components/finkg/finkg-app";
import type { QaItem } from "@/components/finkg/types";

export const dynamic = "force-dynamic";

function pickRecommendedQuestions(allQa: QaItem[], examples: QaItem[]) {
	const exampleIds = new Set(examples.map((item) => item.id));
	const preferred = allQa.filter((item) => !exampleIds.has(item.id));
	const shuffled = [...preferred];

	for (let index = shuffled.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		[shuffled[index], shuffled[swapIndex]] = [
			shuffled[swapIndex],
			shuffled[index],
		];
	}

	return (shuffled.length > 0 ? shuffled : allQa).slice(0, 6);
}

export default function HomePage() {
	const allQa = qaAll as QaItem[];
	const exampleQa = qaExamples as QaItem[];
	const recommendedQa = pickRecommendedQuestions(allQa, exampleQa);

	return (
		<FinKgApp
			allQa={allQa}
			exampleQa={exampleQa}
			recommendedQa={recommendedQa}
		/>
	);
}
