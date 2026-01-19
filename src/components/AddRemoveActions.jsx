export function AddRemoveActions({ canRemove, canAdd, onRemove, onAdd, removeTitle, addTitle }) {
  return (
    <>
      {canRemove && (
        <button
          className="btn-remove"
          onClick={onRemove}
          title={removeTitle}
        >
          -
        </button>
      )}
      {canAdd && (
        <button
          className="btn-add"
          onClick={onAdd}
          title={addTitle}
        >
          +
        </button>
      )}
    </>
  );
}
