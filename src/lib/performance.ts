/**
 * Performance Optimization Utilities for LONIX
 */

// Lazy loading utility for images
export const lazyLoadImage = (imgElement: HTMLImageElement) => {
  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imgElement.src = img.src;
      resolve();
    };
    img.onerror = reject;
    img.src = imgElement.dataset.src || '';
  });
};

// Intersection Observer for lazy loading
export const observeLazyElements = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target as HTMLImageElement;
        if (element.dataset.src) {
          lazyLoadImage(element);
          observer.unobserve(element);
        }
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01
  });

  document.querySelectorAll('img[data-src]').forEach(img => {
    observer.observe(img);
  });
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number | null = null;
  return function executedFunction(...args: Parameters<T>): void {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = window.setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
};

// Throttle utility
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return function executedFunction(...args: Parameters<T>): void {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memoization utility
export const memoize = <T extends (...args: any[]) => any>(func: T): T => {
  const cache = new Map<string, ReturnType<T>>();
  return function (...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key) as ReturnType<T>;
    }
    const result = func.apply(this, args);
    cache.set(key, result);
    return result;
  } as T;
};

// Virtual scrolling container
export class VirtualScroller {
  private container: HTMLElement;
  private items: HTMLElement[];
  private itemHeight: number;
  private visibleItems: number;
  private startIndex: number = 0;

  constructor(container: HTMLElement, items: HTMLElement[], itemHeight: number) {
    this.container = container;
    this.items = items;
    this.itemHeight = itemHeight;
    this.visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2;

    this.setupVirtualScroll();
  }

  private setupVirtualScroll() {
    this.container.style.height = `${this.items.length * this.itemHeight}px`;
    this.container.style.position = 'relative';
    this.container.addEventListener('scroll', this.throttledScroll.bind(this), { passive: true });
    this.renderVisibleItems();
  }

  private throttledScroll = throttle(() => {
    const scrollTop = this.container.scrollTop;
    this.startIndex = Math.floor(scrollTop / this.itemHeight);
    this.renderVisibleItems();
  }, 16); // ~60fps

  private renderVisibleItems() {
    const endIndex = Math.min(this.startIndex + this.visibleItems, this.items.length);
    
    // Clear container
    this.container.innerHTML = '';
    
    // Add visible items with proper positioning
    for (let i = this.startIndex; i < endIndex; i++) {
      const item = this.items[i];
      item.style.position = 'absolute';
      item.style.top = `${i * this.itemHeight}px`;
      item.style.left = '0';
      item.style.right = '0';
      this.container.appendChild(item);
    }
  }
}

// Cache utility
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private keys: K[] = [];

  constructor(private capacity: number) {}

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      this.keys = this.keys.filter(k => k !== key);
      this.keys.push(key);
      return this.cache.get(key);
    }
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // Update existing
      this.cache.set(key, value);
      // Move to end
      this.keys = this.keys.filter(k => k !== key);
      this.keys.push(key);
    } else {
      // Add new
      if (this.cache.size >= this.capacity) {
        // Remove least recently used
        const lruKey = this.keys.shift();
        if (lruKey !== undefined) {
          this.cache.delete(lruKey);
        }
      }
      this.cache.set(key, value);
      this.keys.push(key);
    }
  }

  clear(): void {
    this.cache.clear();
    this.keys = [];
  }
}

// Performance monitoring
export const measurePerformance = (name: string, fn: () => any) => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  console.log(`${name} took ${end - start} milliseconds`);
  return result;
};

// Memory efficient rendering
export const efficientRender = <T>(
  items: T[],
  renderItem: (item: T, index: number) => HTMLElement,
  container: HTMLElement,
  batchSize: number = 10
) => {
  let renderedItems = 0;
  
  const renderBatch = () => {
    const endIndex = Math.min(renderedItems + batchSize, items.length);
    
    for (let i = renderedItems; i < endIndex; i++) {
      const element = renderItem(items[i], i);
      container.appendChild(element);
    }
    
    renderedItems = endIndex;
    
    if (renderedItems < items.length) {
      // Use requestAnimationFrame to yield control back to the browser
      requestAnimationFrame(renderBatch);
    }
  };
  
  renderBatch();
};

// Cleanup unused resources
export const cleanupUnusedResources = () => {
  // Revoke object URLs to prevent memory leaks
  const objectUrls = new Set<string>();
  
  // Track created object URLs
  const originalCreateObjectURL = URL.createObjectURL;
  URL.createObjectURL = function(blob: Blob | MediaSource): string {
    const url = originalCreateObjectURL.call(this, blob);
    objectUrls.add(url);
    return url;
  };
  
  // Cleanup function
  return () => {
    objectUrls.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.warn('Could not revoke object URL:', e);
      }
    });
    objectUrls.clear();
  };
};