# Slab Design instructions

## Boundaries

- Modify application code only in `slab-design/**`.
- Treat Portfolio files outside `slab-design/` as read-only references.
- Do not modify the Portfolio during Slab Design work unless the user explicitly expands scope.

## Engineering

- TCVN 5574:2018 is the design standard.
- `Cemcons_SlabTCVN_Ver1.2.1_UnLockView.xlsm` is the regression benchmark and workflow reference for V1.
- Engineering correctness outranks visual polish.
- Keep engineering formulas separate from UI event handling. Calculation functions must be deterministic and testable.
- Give every engineering value a clear symbol/name, meaning, and explicit unit.
- Do not use unexplained engineering magic numbers.
- Do not alter formulas solely to make tests pass. Report Excel-versus-standard discrepancies.
- Before an engineering change, trace the relevant workbook calculation chain and create or update regression cases with documented tolerances.

## Reinforcement workflows

- Manual selection and future automatic recommendation must use the same underlying calculation engine.
- In recommendation mode, recalculate `h0`, `alpha_m`, `xi`, `As_required`, and all dependent checks for every candidate bar diameter before evaluating spacing and ranking candidates.
- Reject candidate arrangements that violate engineering constraints before optimization or ranking.

## Verification

- Significant engineering changes require independent Reviewer verification. Do not let Implementer self-approve them.
- Significant UI changes require rendered-browser verification on desktop, tablet, and mobile, including console errors, focus states, form behavior, units, and overflow.
- Required sequence for meaningful development: Parent → Implementer → Reviewer → Implementer (if correction is needed) → Reviewer re-check → Parent.
- Do not start Reviewer before reviewable Implementer work exists. Do not allow simultaneous source edits by Implementer and Reviewer.
- Do not complete a meaningful change with unresolved BLOCKER or MAJOR findings. Report intentionally accepted MINOR findings.

## Frontend skill overrides

- **Existing architecture wins.** Keep the existing HTML/CSS/JavaScript architecture. Do not migrate to React, Vite, Next.js, Vue, Svelte, or another framework without explicit user approval.
- **Portfolio design system wins.** `portfolio-design-system` is the primary visual authority. `frontend-app-builder` may improve implementation and hierarchy, but must not replace the established visual identity with a generic design language.
- **Engineering UX wins.** This is engineering software, not a marketing landing page. Prioritize calculation readability, input clarity, units, equations, technical tables, reinforcement results, diagrams, error visibility, and design checks over decorative effects.
- **Image generation is not automatic.** Prefer code-native technical drawings, diagrams, reinforcement schematics, SVG/CSS/canvas graphics, tables, and engineering UI. Use image generation only when the user explicitly asks, or when a genuinely illustrative non-technical asset is needed and the user approves.
- **Do not invent engineering content.** Never invent formulas, material properties, TCVN limits, coefficients, assumptions, reinforcement rules, load values, moments, or calculation outputs. Adapt visual design to engineering data, not the reverse.
- **Existing calculation engine wins.** Frontend refactoring must not change numerical behavior unless calculation logic is explicitly in scope and passes engineering review.
- **Reviewer use.** `web-design-guidelines` is primarily a Reviewer skill. Its findings do not override TCVN or engineering requirements.
- **Testing use.** Use `frontend-testing-debugging` for rendered frontend validation when suitable tooling is available. If Browser tooling is unavailable, use a permitted local fallback already present. Do not install large browser or runtime dependencies without user approval.
