export interface WorkspaceWarning { id: string; severity: "info" | "warning" | "critical"; message: string }

export function WarningCenter({ warnings }: { warnings: WorkspaceWarning[] }) {
  return <section aria-label="Warnings and limitations"><h2>Warnings and limitations</h2>{warnings.length === 0 ? <p>No unresolved warnings.</p> : <ul>{warnings.map((warning) => <li key={warning.id}><strong>{warning.severity === "warning" ? "Warning" : warning.severity === "critical" ? "Critical" : "Information"}</strong>: {warning.message}</li>)}</ul>}</section>;
}
