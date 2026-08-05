interface Props {
  warnings: string[];
}

export function DataWarningsBanner({ warnings }: Props) {
  if (warnings.length === 0) return null;
  return (
    <div className="data-warnings-banner" role="status">
      <strong>Missing data</strong>
      <ul>
        {warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
