import { useState, type ChangeEvent, type FormEvent } from "react";
import type { TargetContractInput } from "../api/types";

const REQUIRED = ["question", "price_basis", "unit", "resolution_at", "missing_source_fallback", "revision_policy"] as const;

export function TargetIntake({ onSubmit }: { onSubmit: (target: Partial<TargetContractInput>) => void }) {
  const [values, setValues] = useState<Partial<TargetContractInput>>({
    product: "neodymium", grade: "private-investor retail series", currency: "USD", geography: "publisher series",
    oracle_url: "https://strategicmetalsinvest.com/neodymium-prices/", target_node_id: "nd_private_retail_price_usd_per_kg",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const set = (key: keyof TargetContractInput) => (event: ChangeEvent<HTMLInputElement>) => setValues({ ...values, [key]: event.target.value });
  function submit(event: FormEvent) {
    event.preventDefault();
    const missing = REQUIRED.filter((key) => !values[key]);
    if (missing.length) { setErrors(missing.map((key) => `${key.replaceAll("_", " ")} is required`)); return; }
    onSubmit(values);
  }
  return <form onSubmit={submit} aria-labelledby="target-intake-title">
    <h2 id="target-intake-title">Define a resolution-grade target</h2>
    <p>The supplied Neodymium page is a <strong>private-investor retail series</strong>; it is not silently treated as bulk, spot, oxide, metal, alloy, or FOB-China pricing.</p>
    {errors.length > 0 && <div role="alert" tabIndex={-1}>{errors.join("; ")}</div>}
    <label>Question<input name="question" value={values.question ?? ""} onChange={set("question")} aria-invalid={errors.some((error) => error.startsWith("question"))} /></label>
    <label>Price basis<input name="price_basis" value={values.price_basis ?? ""} onChange={set("price_basis")} aria-invalid={errors.some((error) => error.startsWith("price basis"))} /></label>
    <label>Unit<input name="unit" value={values.unit ?? ""} onChange={set("unit")} aria-invalid={errors.some((error) => error.startsWith("unit"))} /></label>
    <label>Resolution date<input name="resolution_at" type="datetime-local" value={values.resolution_at ?? ""} onChange={set("resolution_at")} aria-invalid={errors.some((error) => error.startsWith("resolution at"))} /></label>
    <label>Missing-source fallback<input name="missing_source_fallback" value={values.missing_source_fallback ?? ""} onChange={set("missing_source_fallback")} aria-invalid={errors.some((error) => error.startsWith("missing source"))} /></label>
    <label>Revision policy<input name="revision_policy" value={values.revision_policy ?? ""} onChange={set("revision_policy")} aria-invalid={errors.some((error) => error.startsWith("revision policy"))} /></label>
    <button type="submit">Save target contract</button>
  </form>;
}
