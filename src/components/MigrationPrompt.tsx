interface MigrationPromptProps {
  onMigrate: () => void;
  onSkip: () => void;
}

export function MigrationPrompt({ onMigrate, onSkip }: MigrationPromptProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Welcome!</h2>
        </div>

        <div className="migration-prompt">
          <p>
            You have an existing essay saved locally. Would you like to save it to your account so
            you can access it from anywhere?
          </p>

          <div className="migration-actions">
            <button className="btn-migrate btn-migrate-yes" onClick={onMigrate}>
              Yes, save my essay
            </button>
            <button className="btn-migrate btn-migrate-no" onClick={onSkip}>
              No, start fresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
