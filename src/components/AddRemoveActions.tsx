interface AddRemoveActionsProps {
  canRemove: boolean;
  canAdd: boolean;
  onRemove: () => void;
  onAdd: () => void;
  removeTitle: string;
  addTitle: string;
}

export function AddRemoveActions({
  canRemove,
  canAdd,
  onRemove,
  onAdd,
  removeTitle,
  addTitle,
}: AddRemoveActionsProps) {
  return (
    <>
      {canRemove && (
        <button className="btn-remove" onClick={onRemove} title={removeTitle}>
          -
        </button>
      )}
      {canAdd && (
        <button className="btn-add" onClick={onAdd} title={addTitle}>
          +
        </button>
      )}
    </>
  );
}
