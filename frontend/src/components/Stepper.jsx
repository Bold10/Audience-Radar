const STEPS = ["Describe", "Audience", "Sources", "Pay", "Results", "Launch kit"];

export const Stepper = ({ current }) => (
  <ol className="mb-10 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs sm:text-sm" aria-label="Progress" data-testid="flow-stepper">
    {STEPS.map((s, i) => {
      const state = i < current ? "done" : i === current ? "current" : "todo";
      return (
        <li key={s} className="flex items-center gap-2" aria-current={state === "current" ? "step" : undefined}>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
            state === "current" ? "border-btn bg-btn text-btnink" : state === "done" ? "border-ink" : "border-line text-soft"}`}>
            {i + 1}
          </span>
          <span className={state === "todo" ? "text-soft" : "font-medium"}>{s}</span>
          {i < STEPS.length - 1 && <span className="mx-1 hidden h-px w-6 bg-line sm:block" aria-hidden />}
        </li>
      );
    })}
  </ol>
);
