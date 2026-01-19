import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddRemoveActions } from './AddRemoveActions';

describe('AddRemoveActions', () => {
  it('renders add button when canAdd is true', () => {
    render(
      <AddRemoveActions
        canRemove={false}
        canAdd={true}
        onRemove={() => {}}
        onAdd={() => {}}
        addTitle="Add item"
      />
    );
    expect(screen.getByTitle('Add item')).toBeInTheDocument();
  });

  it('renders remove button when canRemove is true', () => {
    render(
      <AddRemoveActions
        canRemove={true}
        canAdd={false}
        onRemove={() => {}}
        onAdd={() => {}}
        removeTitle="Remove item"
      />
    );
    expect(screen.getByTitle('Remove item')).toBeInTheDocument();
  });

  it('does not render add button when canAdd is false', () => {
    render(
      <AddRemoveActions
        canRemove={false}
        canAdd={false}
        onRemove={() => {}}
        onAdd={() => {}}
        addTitle="Add item"
      />
    );
    expect(screen.queryByTitle('Add item')).not.toBeInTheDocument();
  });

  it('does not render remove button when canRemove is false', () => {
    render(
      <AddRemoveActions
        canRemove={false}
        canAdd={false}
        onRemove={() => {}}
        onAdd={() => {}}
        removeTitle="Remove item"
      />
    );
    expect(screen.queryByTitle('Remove item')).not.toBeInTheDocument();
  });

  it('calls onAdd when add button is clicked', () => {
    const onAdd = vi.fn();
    render(
      <AddRemoveActions
        canRemove={false}
        canAdd={true}
        onRemove={() => {}}
        onAdd={onAdd}
        addTitle="Add item"
      />
    );
    fireEvent.click(screen.getByTitle('Add item'));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = vi.fn();
    render(
      <AddRemoveActions
        canRemove={true}
        canAdd={false}
        onRemove={onRemove}
        onAdd={() => {}}
        removeTitle="Remove item"
      />
    );
    fireEvent.click(screen.getByTitle('Remove item'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('renders both buttons when both canAdd and canRemove are true', () => {
    render(
      <AddRemoveActions
        canRemove={true}
        canAdd={true}
        onRemove={() => {}}
        onAdd={() => {}}
        removeTitle="Remove item"
        addTitle="Add item"
      />
    );
    expect(screen.getByTitle('Remove item')).toBeInTheDocument();
    expect(screen.getByTitle('Add item')).toBeInTheDocument();
  });
});
