import { useRive } from "@rive-app/react-webgl2";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import riveSrc from "@/assets/arvo-animation.riv?url";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const { rive, RiveComponent } = useRive({
		src: riveSrc,
		autoplay: true,
		autoBind: true,
		stateMachines: "State Machine 1",
	});

	useEffect(() => {}, [rive]);

	return (
		<div className="h-full w-full items-center justify-center bg-amber-50">
			<RiveComponent className="h-full w-full" />
		</div>
	);
}
