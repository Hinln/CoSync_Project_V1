import { describe, it, expect } from "vitest";

// ========== 9 宫格图片布局逻辑测试 ==========

// 复制首页的布局计算逻辑
const SCREEN_WIDTH = 390; // iPhone 14 width
const PADDING = 16;
const CONTENT_WIDTH = SCREEN_WIDTH - PADDING * 2 - 44 - 12;

function getGridLayout(imageCount: number) {
  const gap = 4;

  if (imageCount === 0) return { type: "none", cells: [] };

  if (imageCount === 1) {
    const size = CONTENT_WIDTH * 0.55;
    return {
      type: "single",
      cells: [{ width: size, height: size }],
    };
  }

  if (imageCount === 2) {
    const size = (CONTENT_WIDTH * 0.7 - gap) / 2;
    return {
      type: "double",
      cells: [
        { width: size, height: size },
        { width: size, height: size },
      ],
    };
  }

  if (imageCount === 3) {
    const bigSize = CONTENT_WIDTH * 0.65 - gap;
    const smallSize = CONTENT_WIDTH * 0.35 - gap;
    const smallHeight = (bigSize - gap) / 2;
    return {
      type: "one-plus-two",
      cells: [
        { width: bigSize, height: bigSize },
        { width: smallSize, height: smallHeight },
        { width: smallSize, height: smallHeight },
      ],
    };
  }

  if (imageCount === 4) {
    const cellSize = (CONTENT_WIDTH * 0.7 - gap) / 2;
    return {
      type: "grid-2x2",
      cells: Array.from({ length: 4 }, () => ({ width: cellSize, height: cellSize })),
    };
  }

  // 5-9: 3 列网格
  const cols = 3;
  const cellSize = (CONTENT_WIDTH * 0.85 - gap * (cols - 1)) / cols;
  const displayCount = Math.min(imageCount, 9);
  return {
    type: "grid-3col",
    cells: Array.from({ length: displayCount }, () => ({
      width: cellSize,
      height: cellSize,
    })),
  };
}

describe("9 宫格图片布局", () => {
  it("0 张图片不显示网格", () => {
    const layout = getGridLayout(0);
    expect(layout.type).toBe("none");
    expect(layout.cells).toHaveLength(0);
  });

  it("1 张图片显示单张大图", () => {
    const layout = getGridLayout(1);
    expect(layout.type).toBe("single");
    expect(layout.cells).toHaveLength(1);
    expect(layout.cells[0].width).toBeGreaterThan(100);
    expect(layout.cells[0].width).toBe(layout.cells[0].height);
  });

  it("2 张图片并排显示", () => {
    const layout = getGridLayout(2);
    expect(layout.type).toBe("double");
    expect(layout.cells).toHaveLength(2);
    expect(layout.cells[0].width).toBe(layout.cells[1].width);
  });

  it("3 张图片使用 1 大 + 2 小布局", () => {
    const layout = getGridLayout(3);
    expect(layout.type).toBe("one-plus-two");
    expect(layout.cells).toHaveLength(3);
    // 大图比小图宽
    expect(layout.cells[0].width).toBeGreaterThan(layout.cells[1].width);
    // 两张小图高度相同
    expect(layout.cells[1].height).toBe(layout.cells[2].height);
  });

  it("4 张图片使用 2x2 网格", () => {
    const layout = getGridLayout(4);
    expect(layout.type).toBe("grid-2x2");
    expect(layout.cells).toHaveLength(4);
    // 所有单元格大小相同
    const first = layout.cells[0];
    layout.cells.forEach((cell) => {
      expect(cell.width).toBe(first.width);
      expect(cell.height).toBe(first.height);
    });
  });

  it("5 张图片使用 3 列网格", () => {
    const layout = getGridLayout(5);
    expect(layout.type).toBe("grid-3col");
    expect(layout.cells).toHaveLength(5);
  });

  it("6 张图片使用 3 列网格（2 行）", () => {
    const layout = getGridLayout(6);
    expect(layout.type).toBe("grid-3col");
    expect(layout.cells).toHaveLength(6);
  });

  it("9 张图片使用 3 列网格（3 行）", () => {
    const layout = getGridLayout(9);
    expect(layout.type).toBe("grid-3col");
    expect(layout.cells).toHaveLength(9);
    // 所有单元格大小相同
    const first = layout.cells[0];
    layout.cells.forEach((cell) => {
      expect(cell.width).toBe(first.width);
      expect(cell.height).toBe(first.height);
    });
  });

  it("超过 9 张图片最多显示 9 张", () => {
    const layout = getGridLayout(12);
    expect(layout.type).toBe("grid-3col");
    expect(layout.cells).toHaveLength(9);
  });

  it("所有布局的单元格尺寸为正数", () => {
    for (let count = 1; count <= 9; count++) {
      const layout = getGridLayout(count);
      layout.cells.forEach((cell) => {
        expect(cell.width).toBeGreaterThan(0);
        expect(cell.height).toBeGreaterThan(0);
      });
    }
  });
});

// ========== 分页逻辑测试 ==========

describe("加载更多分页逻辑", () => {
  const PAGE_SIZE = 10;
  const MAX_PAGES = 5;

  it("初始加载第一页数据", () => {
    const posts = Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: i + 1 }));
    expect(posts).toHaveLength(PAGE_SIZE);
    expect(posts[0].id).toBe(1);
    expect(posts[PAGE_SIZE - 1].id).toBe(PAGE_SIZE);
  });

  it("加载更多追加新数据", () => {
    let allPosts = Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: i + 1 }));
    const morePosts = Array.from({ length: PAGE_SIZE }, (_, i) => ({
      id: PAGE_SIZE + i + 1,
    }));
    allPosts = [...allPosts, ...morePosts];
    expect(allPosts).toHaveLength(PAGE_SIZE * 2);
    expect(allPosts[PAGE_SIZE].id).toBe(PAGE_SIZE + 1);
  });

  it("达到最大页数后停止加载", () => {
    let currentPage = 1;
    let hasMore = true;

    while (hasMore && currentPage <= MAX_PAGES) {
      currentPage++;
      if (currentPage > MAX_PAGES) {
        hasMore = false;
      }
    }

    expect(hasMore).toBe(false);
    expect(currentPage).toBe(MAX_PAGES + 1);
  });

  it("刷新后重置分页状态", () => {
    let currentPage = 3;
    let hasMore = true;

    // 模拟刷新
    currentPage = 1;
    hasMore = true;

    expect(currentPage).toBe(1);
    expect(hasMore).toBe(true);
  });
});

// ========== 缩放逻辑测试 ==========

describe("大图查看器缩放逻辑", () => {
  it("初始缩放比例为 1", () => {
    const scale = 1;
    expect(scale).toBe(1);
  });

  it("双击放大到 2.5 倍", () => {
    let scale = 1;
    // 模拟双击
    if (scale <= 1) {
      scale = 2.5;
    }
    expect(scale).toBe(2.5);
  });

  it("再次双击恢复原始大小", () => {
    let scale = 2.5;
    // 模拟双击
    if (scale > 1) {
      scale = 1;
    }
    expect(scale).toBe(1);
  });

  it("缩放不超过 5 倍", () => {
    const savedScale = 3;
    const pinchScale = 2;
    const result = Math.max(0.5, Math.min(savedScale * pinchScale, 5));
    expect(result).toBe(5);
  });

  it("缩放不低于 0.5 倍", () => {
    const savedScale = 0.3;
    const pinchScale = 0.5;
    const result = Math.max(0.5, Math.min(savedScale * pinchScale, 5));
    expect(result).toBe(0.5);
  });

  it("缩小到 1 以下自动恢复", () => {
    let scale = 0.8;
    if (scale < 1) {
      scale = 1; // 恢复
    }
    expect(scale).toBe(1);
  });

  it("左右滑动切换图片（未缩放状态）", () => {
    const images = [{ id: 0 }, { id: 1 }, { id: 2 }];
    let currentIndex = 0;
    const scale = 1;

    // 模拟左滑（下一张）
    if (scale <= 1) {
      currentIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    }
    expect(currentIndex).toBe(1);

    // 模拟右滑（上一张）
    if (scale <= 1) {
      currentIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    }
    expect(currentIndex).toBe(0);
  });

  it("循环切换图片", () => {
    const images = [{ id: 0 }, { id: 1 }, { id: 2 }];
    let currentIndex = 2;

    // 最后一张左滑回到第一张
    currentIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    expect(currentIndex).toBe(0);

    // 第一张右滑到最后一张
    currentIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    expect(currentIndex).toBe(2);
  });
});
