import { formatRelativeDate } from '../utils/formatDate';

export function HomePage({
  essays,
  onSelectEssay,
  onNewEssay,
  onDeleteEssay,
  isLoggedIn,
}) {
  const handleDelete = (e, essayId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this essay?')) {
      onDeleteEssay(essayId);
    }
  };

  return (
    <div className="home-page">
      <div className="home-header">
        <h1>Essay Helper</h1>
        <p className="home-subtitle">Structure your arguments, one paragraph at a time</p>
      </div>

      <div className="home-content">
        <button className="btn-new-essay-large" onClick={onNewEssay}>
          + New Essay
        </button>

        {essays.length > 0 && (
          <div className="essays-section">
            <h2>Your Essays</h2>
            <div className="essays-grid">
              {essays.map((essay) => (
                <div
                  key={essay.id}
                  className="essay-card"
                  onClick={() => onSelectEssay(essay.id)}
                >
                  <div className="essay-card-title">
                    {essay.title || 'Untitled Essay'}
                  </div>
                  <div className="essay-card-date">
                    Modified {formatRelativeDate(essay.updatedAt)}
                  </div>
                  <button
                    className="essay-card-delete"
                    onClick={(e) => handleDelete(e, essay.id)}
                    title="Delete essay"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoggedIn && (
          <p className="home-note">
            Sign in to save your essays to the cloud and access them anywhere.
          </p>
        )}
      </div>
    </div>
  );
}
