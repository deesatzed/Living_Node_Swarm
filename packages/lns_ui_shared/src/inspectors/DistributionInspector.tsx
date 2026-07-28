export function DistributionInspector({ family, parameters, support, asOf, provenance }: { family: string; parameters: Record<string, number>; support: string; asOf: string; provenance: string }) {
  return <section aria-label="Distribution inspector"><h2>{family}</h2><p>Support: {support}</p><p>As of: {asOf}</p><p>Provenance: <span>{provenance}</span></p><dl>{Object.entries(parameters).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></section>;
}
