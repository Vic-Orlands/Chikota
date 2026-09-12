export type DragRect = {
  x: number;
  y: number;
  endX: number;
  endY: number;
};

export type DragTarget = {
  id: string;
  element: HTMLElement;
};

export function collectBookmarkTargets(
  root: ParentNode = document
): DragTarget[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-bookmark]')).map(
    (element) => ({
      id: element.dataset.bookmark!,
      element
    })
  );
}

export function bookmarkIdsInRect(targets: DragTarget[], rect: DragRect) {
  const left = Math.min(rect.x, rect.endX);
  const right = Math.max(rect.x, rect.endX);
  const top = Math.min(rect.y, rect.endY);
  const bottom = Math.max(rect.y, rect.endY);
  return targets
    .filter(({ element }) => {
      const bounds = element.getBoundingClientRect();
      return (
        bounds.left < right &&
        bounds.right > left &&
        bounds.top < bottom &&
        bounds.bottom > top
      );
    })
    .map((target) => target.id);
}
