/**
 * User Manual — main content view (scaffold).
 * Global manual shared across all modules (not per-module).
 *
 * TODO (next implementer):
 * - Load manual content (markdown/HTML from data/manual/ or config path)
 * - Section nav + scrollable body, or embedded PDF viewer
 */

export function UserManualPanel() {
  return (
    <div className="user-manual-view">
      <div className="user-manual-view-inner">
        <p className="user-manual-placeholder">
          User Manual content goes here.
        </p>
        <p className="user-manual-hint">
          Applies to all modules.
        </p>
        <ul className="user-manual-todo">
          <li>Add manual source path to config.json</li>
          <li>Render sections (overview, MAP usage, search, cart)</li>
          <li>Replace this placeholder with real content</li>
        </ul>
      </div>
    </div>
  );
}
