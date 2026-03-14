// @ts-nocheck
export const binarySearchDropIndex = (mouseY, items) => {
  const relativeMouseY = mouseY;

  let low = 0;
  let high = items.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);

    const item = items[mid];

    if (item.itemTop <= relativeMouseY && relativeMouseY <= item.itemBottom) {
      // Check if the mouse is in the top or bottom half of the item
      return relativeMouseY < item.itemTop + item.height / 2
        ? +item.index
        : +item.index + 1;
    } else if (relativeMouseY < item.itemTop) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return +items[low].index;
};

export const binarySearchDropIndexHeader = (mouseX, items) => {
  const relativeMouseX = mouseX;

  let low = 0;
  let high = items.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);

    const item = items[mid];

    if (item.itemLeft <= relativeMouseX && relativeMouseX <= item.itemRight) {
      // Check if the mouse is in the top or bottom half of the item
      return relativeMouseX < item.itemLeft + item.width / 2
        ? +item.index
        : +item.index + 1;
    } else if (relativeMouseX < item.itemLeft) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return +items[low].index;
};

export const isIndexOutOfRange = (index, start, end) => {
  if (start !== undefined && index < start) {
    return true;
  }

  if (end !== undefined && index > end) {
    return true;
  }

  return false; // Within range
};
